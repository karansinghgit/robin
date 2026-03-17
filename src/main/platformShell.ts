import { BrowserWindow, Menu, Tray, nativeImage, screen } from "electron";

export interface PlatformShellOptions {
  windowUrl: string;
  defaultShortcut: string;
  onShortcutChange: (shortcut: string) => Promise<boolean>;
}

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" fill="black"/>
      <path d="M6 13.8V6.2h2.1c1.1 0 1.9.2 2.4.7.5.4.8 1 .8 1.8 0 .7-.2 1.3-.7 1.7-.5.4-1.2.6-2 .6H7.8v3H6Zm1.8-4.5h.6c.5 0 .8-.1 1.1-.3.2-.2.3-.5.3-.8 0-.8-.5-1.2-1.4-1.2h-.6v2.3Z" fill="white"/>
    </svg>
  `.trim();
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

export class PlatformShell {
  private tray: Tray | null = null;
  private panel: BrowserWindow | null = null;
  private shortcut = "";

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
    this.panel.on("blur", () => {
      if (!this.panel?.webContents.isDevToolsOpened()) {
        this.hidePanel();
      }
    });
    this.panel.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    this.tray = new Tray(createTrayImage());
    this.tray.setToolTip("Robin");
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
