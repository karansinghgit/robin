import path from "node:path";
import { app, BrowserWindow, Menu, Tray, nativeImage, screen } from "electron";

export interface PlatformShellOptions {
  windowUrl: string;
  defaultShortcut: string;
  onShortcutChange: (shortcut: string) => Promise<boolean>;
  hideOnBlur?: boolean;
  trayTitle?: string;
}

function trimTransparentPadding(image: Electron.NativeImage): Electron.NativeImage {
  const { width, height } = image.getSize();
  if (width <= 0 || height <= 0) {
    return image;
  }

  const pixels = image.toBitmap();
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return image;
  }

  return image.crop({
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  });
}

function createTrayImage() {
  const assetCandidates = [
    { path: path.join(app.getAppPath(), "assets", "trayTemplate.png"), template: true },
    { path: path.join(app.getAppPath(), "assets", "image.png"), template: false },
    { path: path.join(process.cwd(), "assets", "trayTemplate.png"), template: true },
    { path: path.join(process.cwd(), "assets", "image.png"), template: false }
  ];

  for (const candidate of assetCandidates) {
    const image = nativeImage.createFromPath(candidate.path);
    if (!image.isEmpty()) {
      const trimmedImage = trimTransparentPadding(image);
      const size = trimmedImage.getSize();
      const targetHeight = 18;
      const targetWidth = size.width > 0 && size.height > 0
        ? Math.max(18, Math.round((size.width / size.height) * targetHeight))
        : 18;
      const resizedImage = trimmedImage.resize({ width: targetWidth, height: targetHeight, quality: "best" });
      if (process.platform === "darwin" && candidate.template) {
        resizedImage.setTemplateImage(true);
      }
      return resizedImage;
    }
  }

  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path d="M10 2.5c-.7 1.3-1.5 2.1-2.4 2.5-1.1.4-2.2.2-3.5-.6-.2 1-.7 1.9-1.4 2.6-.8.8-1.6 1.2-2.5 1.2.4.9.5 1.9.2 2.8-.2.9-.8 1.8-1.5 2.6 1.3-.2 2.4 0 3.4.4 1 .5 1.8 1.3 2.4 2.6.9-1 2-1.4 3.3-1.4 1.3 0 2.4.4 3.4 1.4.6-1.3 1.4-2.1 2.4-2.6 1-.4 2.1-.6 3.4-.4-.8-.8-1.3-1.7-1.6-2.6-.2-.9-.2-1.9.2-2.8-.9 0-1.8-.4-2.5-1.2-.8-.8-1.2-1.6-1.4-2.6-1.3.8-2.4 1-3.5.6-.9-.4-1.7-1.2-2.4-2.5Z" fill="black"/>
    </svg>
  `.trim();

  const fallbackImage = nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString("base64")}`)
    .resize({ width: 18, height: 18, quality: "best" });

  if (process.platform === "darwin") {
    fallbackImage.setTemplateImage(true);
  }

  return fallbackImage;
}

export class PlatformShell {
  private tray: Tray | null = null;
  private panel: BrowserWindow | null = null;
  private appWindow: BrowserWindow | null = null;
  private shortcut = "";
  private readyToShow = false;
  private pendingTrayBounds?: Electron.Rectangle;
  private lastTrayToggleAt = 0;

  constructor(private readonly options: PlatformShellOptions) { }

  create(): BrowserWindow {
    this.panel = new BrowserWindow({
      width: 560,
      height: 470,
      show: false,
      frame: false,
      movable: false,
      fullscreenable: false,
      minimizable: false,
      maximizable: false,
      resizable: false,
      skipTaskbar: true,
      transparent: false,
      backgroundColor: "#050507",
      hasShadow: true,
      alwaysOnTop: true,
      vibrancy: undefined,
      visualEffectState: undefined,
      autoHideMenuBar: true,
      roundedCorners: process.platform === "darwin",
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true,
        backgroundThrottling: false
      }
    });

    this.panel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    if (process.platform === "darwin") {
      this.panel.setWindowButtonVisibility(false);
    }
    this.panel.setMenuBarVisibility(false);
    this.panel.loadURL(this.options.windowUrl);
    this.panel.once("ready-to-show", () => {
      this.readyToShow = true;
      if (this.pendingTrayBounds) {
        const nextBounds = this.pendingTrayBounds;
        this.pendingTrayBounds = undefined;
        this.showPanel(nextBounds);
      }
    });
    const shouldHideOnBlur = this.options.hideOnBlur ?? true;
    this.panel.on("blur", () => {
      if (shouldHideOnBlur && !this.panel?.webContents.isDevToolsOpened()) {
        this.hidePanel();
      }
    });
    this.panel.webContents.on("before-input-event", (_event, input) => {
      if (input.type === "keyDown" && input.key === "Escape") {
        this.hidePanel();
      }
    });
    this.panel.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    this.tray = new Tray(createTrayImage());
    this.tray.setToolTip("Robin");
    if (this.options.trayTitle) {
      this.tray.setTitle(this.options.trayTitle);
    }
    const trayMenu = Menu.buildFromTemplate([
      { label: "Open Robin", click: () => this.openPanel(this.tray?.getBounds()) },
      { type: "separator" },
      { label: "Quit", role: "quit" }
    ]);

    if (process.platform === "darwin") {
      this.tray.setContextMenu(null);
      this.tray.on("click", (_event, bounds) => {
        this.togglePanelFromTray(bounds);
      });
      this.tray.on("right-click", () => {
        this.tray?.popUpContextMenu(trayMenu);
      });
    } else {
      this.tray.setContextMenu(trayMenu);
      this.tray.on("click", (_event, bounds) => this.togglePanelFromTray(bounds));
    }

    this.shortcut = this.options.defaultShortcut;

    return this.panel;
  }

  async updateShortcut(shortcut: string): Promise<{ success: boolean; shortcut: string }> {
    const success = await this.options.onShortcutChange(shortcut);
    if (success) {
      this.shortcut = shortcut;
    }
    return {
      success,
      shortcut: success ? shortcut : this.shortcut
    };
  }

  togglePanel(trayBounds?: Electron.Rectangle): void {
    if (!this.panel) {
      return;
    }
    if (this.panel.isVisible()) {
      this.hidePanel();
      return;
    }
    this.showPanel(trayBounds ?? this.tray?.getBounds());
  }

  openPanel(trayBounds?: Electron.Rectangle): void {
    if (!this.panel) {
      return;
    }
    if (this.panel.isVisible()) {
      this.panel.focus();
      return;
    }
    this.showPanel(trayBounds ?? this.tray?.getBounds());
  }

  hidePanel(): void {
    this.panel?.hide();
  }

  openAppWindow(): void {
    if (this.appWindow && !this.appWindow.isDestroyed()) {
      this.appWindow.show();
      this.appWindow.focus();
      return;
    }

    this.appWindow = new BrowserWindow({
      width: 1060,
      height: 760,
      minWidth: 860,
      minHeight: 620,
      show: false,
      frame: true,
      title: "Robin",
      movable: true,
      fullscreenable: true,
      minimizable: true,
      maximizable: true,
      resizable: true,
      skipTaskbar: false,
      backgroundColor: "#050507",
      autoHideMenuBar: true,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true,
        backgroundThrottling: false
      }
    });

    this.appWindow.setMenuBarVisibility(false);
    this.appWindow.loadURL(this.options.windowUrl);
    this.appWindow.once("ready-to-show", () => {
      this.appWindow?.show();
      this.appWindow?.focus();
    });
    this.appWindow.on("closed", () => {
      this.appWindow = null;
    });

    this.hidePanel();
  }

  private togglePanelFromTray(trayBounds?: Electron.Rectangle): void {
    const now = Date.now();
    if (now - this.lastTrayToggleAt < 180) {
      return;
    }
    this.lastTrayToggleAt = now;
    this.togglePanel(trayBounds);
  }

  private showPanel(trayBounds?: Electron.Rectangle): void {
    if (!this.panel) {
      return;
    }

    if (!this.readyToShow) {
      this.pendingTrayBounds = trayBounds;
      return;
    }

    if (process.platform === "darwin" && trayBounds) {
      const { width, height } = this.panel.getBounds();
      const display = screen.getDisplayNearestPoint({
        x: Math.round(trayBounds.x),
        y: Math.round(trayBounds.y)
      });
      const x = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2);
      const y = Math.round(trayBounds.y + trayBounds.height);
      this.panel.setPosition(
        Math.min(Math.max(x, display.workArea.x + 12), display.workArea.x + display.workArea.width - width - 12),
        y
      );
      this.panel.show();
      this.panel.focus();
      return;
    }

    this.panel.center();
    this.panel.show();
    this.panel.focus();
  }
}
