import { app, globalShortcut, ipcMain, shell as electronShell } from "electron";
import os from "node:os";
import { AppStorage } from "./storage";
import { SecureConfig } from "./secureConfig";
import { PlatformShell } from "./platformShell";
import { ProviderService } from "./providerService";
import { ChatStreamEvent, ChatStreamRequest, CloudProviderId, SaveConfigInput, UpdateCheckResult } from "../shared/contracts";

const IPC_CHANNELS = {
  togglePanel: "app:toggle-panel",
  openWindow: "app:open-window",
  setShortcut: "app:set-shortcut",
  profile: "app:get-profile",
  version: "app:get-version",
  checkUpdates: "app:check-updates",
  openExternal: "app:open-external",
  listThreads: "chat:list-threads",
  loadThread: "chat:load-thread",
  deleteThread: "chat:delete-thread",
  startStream: "chat:stream-start",
  streamEvent: "chat:stream-event",
  providerStatus: "providers:get-status",
  saveConfig: "providers:save-config",
  listCloudModels: "providers:list-cloud-models",
  ollamaDetect: "ollama:detect",
  ollamaCatalog: "ollama:list-catalog",
  ollamaPull: "ollama:pull-model",
  ollamaDelete: "ollama:delete-model"
} as const;

let shell: PlatformShell;
let activeShortcut = "";
const DEFAULT_UPDATES_REPO = "karansinghgit/robin";

function normalizeVersion(raw: string): string {
  const candidate = raw.trim().replace(/^v/i, "");
  return /^[0-9]+\.[0-9]+\.[0-9]+$/.test(candidate) ? candidate : "0.0.0";
}

function compareVersions(leftRaw: string, rightRaw: string): number {
  const left = normalizeVersion(leftRaw).split(".").map(Number);
  const right = normalizeVersion(rightRaw).split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

function resolveUpdatesRepo(): string {
  const fromEnv = process.env.ROBIN_UPDATES_REPO?.trim();
  if (fromEnv && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fromEnv)) {
    return fromEnv;
  }
  return DEFAULT_UPDATES_REPO;
}

function findPreferredDownloadUrl(assets: Array<{ browser_download_url?: string; name?: string }>): string | undefined {
  const candidates = assets
    .map((asset) => asset.browser_download_url)
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0);

  if (candidates.length === 0) {
    return undefined;
  }

  const lowered = candidates.map((url) => ({ url, lower: url.toLowerCase() }));

  if (process.platform === "darwin") {
    return lowered.find((entry) => entry.lower.endsWith(".dmg"))?.url
      ?? lowered.find((entry) => entry.lower.endsWith(".zip"))?.url
      ?? lowered[0].url;
  }

  if (process.platform === "win32") {
    return lowered.find((entry) => entry.lower.endsWith(".exe"))?.url
      ?? lowered.find((entry) => entry.lower.endsWith(".msi"))?.url
      ?? lowered[0].url;
  }

  return lowered.find((entry) => entry.lower.endsWith(".appimage"))?.url
    ?? lowered.find((entry) => entry.lower.endsWith(".deb"))?.url
    ?? lowered.find((entry) => entry.lower.endsWith(".rpm"))?.url
    ?? lowered[0].url;
}

async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = normalizeVersion(app.getVersion());
  const repo = resolveUpdatesRepo();
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Robin-App"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not check updates (${response.status}).`);
  }

  const payload = await response.json() as {
    tag_name?: string;
    html_url?: string;
    published_at?: string;
    assets?: Array<{ browser_download_url?: string; name?: string }>;
  };
  const latestVersion = normalizeVersion(payload.tag_name ?? "");
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
  const assets = Array.isArray(payload.assets) ? payload.assets : [];

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    releaseUrl: payload.html_url,
    downloadUrl: findPreferredDownloadUrl(assets),
    publishedAt: typeof payload.published_at === "string" ? payload.published_at : undefined,
    checkedAt: new Date().toISOString()
  };
}

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
  ipcMain.handle(IPC_CHANNELS.openWindow, async () => {
    shell.openAppWindow();
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
  ipcMain.handle(IPC_CHANNELS.version, async () => normalizeVersion(app.getVersion()));
  ipcMain.handle(IPC_CHANNELS.checkUpdates, async () => checkForUpdates());
  ipcMain.handle(IPC_CHANNELS.openExternal, async (_event, url: string) => {
    await electronShell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.listThreads, async () => storage.listThreads());
  ipcMain.handle(IPC_CHANNELS.loadThread, async (_event, id: string) => storage.loadThread(id));
  ipcMain.handle(IPC_CHANNELS.deleteThread, async (_event, id: string) => storage.deleteThread(id));
  ipcMain.handle(IPC_CHANNELS.providerStatus, async () => providerService.getStatus());
  ipcMain.handle(IPC_CHANNELS.saveConfig, async (_event, config: SaveConfigInput) => providerService.saveConfig(config));
  ipcMain.handle(IPC_CHANNELS.listCloudModels, async (_event, provider: CloudProviderId) => {
    return providerService.listCloudModels(provider);
  });
  ipcMain.handle(IPC_CHANNELS.ollamaDetect, async () => providerService.detectOllama());
  ipcMain.handle(IPC_CHANNELS.ollamaCatalog, async (_event, limit?: number) => providerService.listOllamaCatalog(limit));
  ipcMain.handle(IPC_CHANNELS.ollamaPull, async (_event, model: string) => providerService.pullOllamaModel(model));
  ipcMain.handle(IPC_CHANNELS.ollamaDelete, async (_event, model: string) => providerService.deleteOllamaModel(model));

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
