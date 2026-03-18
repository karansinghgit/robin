import { app, globalShortcut, ipcMain, shell as electronShell } from "electron";
import os from "node:os";
import { AppStorage } from "./storage";
import { SecureConfig } from "./secureConfig";
import { PlatformShell } from "./platformShell";
import { ProviderService } from "./providerService";
import { ChatStreamEvent, ChatStreamRequest, SaveConfigInput } from "../shared/contracts";

const IPC_CHANNELS = {
  togglePanel: "app:toggle-panel",
  setShortcut: "app:set-shortcut",
  profile: "app:get-profile",
  openExternal: "app:open-external",
  listThreads: "chat:list-threads",
  loadThread: "chat:load-thread",
  startStream: "chat:stream-start",
  streamEvent: "chat:stream-event",
  providerStatus: "providers:get-status",
  saveConfig: "providers:save-config",
  ollamaDetect: "ollama:detect"
} as const;

let shell: PlatformShell;
let activeShortcut = "";

function toDisplayName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
  const firstPart = cleaned.split(" ")[0] ?? "";

  if (!firstPart) {
    return "there";
  }

  return `${firstPart.charAt(0).toUpperCase()}${firstPart.slice(1).toLowerCase()}`;
}

function getProfileName(): string {
  try {
    const username = os.userInfo().username || process.env.USER || process.env.USERNAME || "";
    return toDisplayName(username);
  } catch {
    return "there";
  }
}

function registerShortcut(shortcut: string): boolean {
  const previousShortcut = activeShortcut;

  try {
    if (previousShortcut) {
      globalShortcut.unregister(previousShortcut);
    }

    const success = globalShortcut.register(shortcut, () => {
      shell.togglePanel();
    });

    if (success) {
      activeShortcut = shortcut;
      return true;
    }

    if (previousShortcut && previousShortcut !== shortcut) {
      globalShortcut.register(previousShortcut, () => {
        shell.togglePanel();
      });
    }

    return false;
  } catch {
    if (previousShortcut && !globalShortcut.isRegistered(previousShortcut)) {
      globalShortcut.register(previousShortcut, () => {
        shell.togglePanel();
      });
    }
    return false;
  }
}

async function bootstrap(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  await app.whenReady();
  app.setName("Robin");

  const hideDockOverride = process.env.ROBIN_HIDE_DOCK;
  const hideOnBlurOverride = process.env.ROBIN_HIDE_ON_BLUR;
  const shouldHideDock = hideDockOverride === "0" ? false : true;
  const shouldHideOnBlur = hideOnBlurOverride === "0" ? false : true;
  const trayTitle = process.env.ROBIN_TRAY_TITLE;
  const openOnLaunch = process.env.ROBIN_OPEN_ON_LAUNCH === "1";

  if (process.platform === "darwin" && shouldHideDock) {
    app.dock?.hide();
  }

  const storage = new AppStorage();
  const secureConfig = new SecureConfig();
  await storage.init();
  await secureConfig.init();

  const providerService = new ProviderService(storage, secureConfig);
  const settings = await storage.getSettings();

  shell = new PlatformShell({
    windowUrl: MAIN_WINDOW_WEBPACK_ENTRY,
    defaultShortcut: settings.shortcut,
    onShortcutChange: async (shortcut) => registerShortcut(shortcut),
    hideOnBlur: shouldHideOnBlur,
    trayTitle
  });
  shell.create();
  registerShortcut(settings.shortcut);

  if (openOnLaunch) {
    shell.togglePanel();
  }

  ipcMain.handle(IPC_CHANNELS.togglePanel, async () => {
    shell.togglePanel();
  });

  ipcMain.handle(IPC_CHANNELS.setShortcut, async (_event, shortcut: string) => {
    const result = await shell.updateShortcut(shortcut);
    if (result.success) {
      await storage.saveSettings((current) => ({
        ...current,
        shortcut
      }));
    }
    return result;
  });
  ipcMain.handle(IPC_CHANNELS.profile, async () => ({
    name: getProfileName()
  }));
  ipcMain.handle(IPC_CHANNELS.openExternal, async (_event, url: string) => {
    await electronShell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.listThreads, async () => storage.listThreads());
  ipcMain.handle(IPC_CHANNELS.loadThread, async (_event, id: string) => storage.loadThread(id));
  ipcMain.handle(IPC_CHANNELS.providerStatus, async () => providerService.getStatus());
  ipcMain.handle(IPC_CHANNELS.saveConfig, async (_event, config: SaveConfigInput) => providerService.saveConfig(config));
  ipcMain.handle(IPC_CHANNELS.ollamaDetect, async () => providerService.detectOllama());

  ipcMain.handle(IPC_CHANNELS.startStream, async (event, request: ChatStreamRequest) => {
    const sender = event.sender;
    void providerService.streamChat(request, (streamEvent: ChatStreamEvent) => {
      if (!sender.isDestroyed()) {
        sender.send(IPC_CHANNELS.streamEvent, streamEvent);
      }
    });
    return request.streamId ?? null;
  });

  app.on("second-instance", () => {
    shell.togglePanel();
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("activate", () => {
    if (process.platform !== "darwin") {
      shell.openPanel();
    }
  });
}

void bootstrap();
