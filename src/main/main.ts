import { app, globalShortcut, ipcMain, shell as electronShell } from "electron";
import { AppStorage } from "./storage";
import { SecureConfig } from "./secureConfig";
import { PlatformShell } from "./platformShell";
import { ProviderService } from "./providerService";
import { ChatStreamEvent, ChatStreamRequest, SaveConfigInput } from "../shared/contracts";

const IPC_CHANNELS = {
  togglePanel: "app:toggle-panel",
  setShortcut: "app:set-shortcut",
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

  if (process.platform === "darwin" && app.isPackaged) {
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
    hideOnBlur: app.isPackaged
  });
  shell.create();
  registerShortcut(settings.shortcut);

  if (!app.isPackaged) {
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
  ipcMain.handle("app:open-external", async (_event, url: string) => {
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
    shell.togglePanel();
  });
}

void bootstrap();
