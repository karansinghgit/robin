import { BrowserWindow, Menu, Tray, nativeImage, screen } from "electron";

export interface PlatformShellOptions {
  windowUrl: string;
  defaultShortcut: string;
  onShortcutChange: (shortcut: string) => Promise<boolean>;
  hideOnBlur?: boolean;
  trayTitle?: string;
}

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path d="M5.5 15V5h4.1c1.5 0 2.7.4 3.5 1.1.8.7 1.2 1.7 1.2 2.9 0 1.2-.4 2.2-1.2 2.9-.8.7-2 1.1-3.5 1.1H7.9V15H5.5Zm2.4-4h1.6c.8 0 1.4-.2 1.8-.5.4-.4.6-.8.6-1.5 0-.7-.2-1.2-.6-1.5-.4-.4-1-.5-1.8-.5H7.9V11Z" fill="black"/>
    </svg>
  `.trim();
  const image = nativeImage
    .createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`)
    .resize({ width: 18, height: 18 });

  if (process.platform === "darwin") {
    image.setTemplateImage(true);
  }

  return image;
}

export class PlatformShell {
  private tray: Tray | null = null;
  private panel: BrowserWindow | null = null;
  private shortcut = "";
  private readyToShow = false;
  private pendingTrayBounds?: Electron.Rectangle;

  constructor(private readonly options: PlatformShellOptions) {}

  create(): BrowserWindow {
    this.panel = new BrowserWindow({
      width: 440,
      height: 660,
      show: false,
      frame: false,
      fullscreenable: false,
      resizable: false,
      transparent: true,
      hasShadow: true,
      alwaysOnTop: true,
      vibrancy: process.platform === "darwin" ? "sidebar" : undefined,
      visualEffectState: process.platform === "darwin" ? "active" : undefined,
      titleBarStyle: process.platform === "darwin" ? "hidden" : "default",
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        contextIsolation: true,
        nodeIntegration: false,
        devTools: true,
        backgroundThrottling: false
      }
    });

    this.panel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
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
    this.panel.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    this.tray = new Tray(createTrayImage());
    this.tray.setToolTip("Robin");
    if (this.options.trayTitle) {
      this.tray.setTitle(this.options.trayTitle);
    }
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open Robin", click: () => this.togglePanel(this.tray?.getBounds()) },
        { type: "separator" },
        { label: "Quit", role: "quit" }
      ])
    );
    this.tray.on("click", (_event, bounds) => this.togglePanel(bounds));

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

  hidePanel(): void {
    this.panel?.hide();
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
      const y = Math.round(display.workArea.y + 28);
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
