import { IconSettings } from "./icons";

export function SidebarFooter({
  settingsActive,
  onOpenSettings,
  onOpenAuthor
}: {
  settingsActive: boolean;
  onOpenSettings: () => void;
  onOpenAuthor: () => void;
}) {
  return (
    <div className="chat-sidebar-footer">
      <button
        className={`chat-sidebar-settings${settingsActive ? " chat-sidebar-settings-active" : ""}`}
        aria-label="Settings"
        title="Settings"
        onClick={onOpenSettings}
      >
        <IconSettings />
      </button>
      <button
        type="button"
        className="chat-sidebar-branding"
        aria-label="Open @karanbuilds on X"
        title="@karanbuilds on X"
        onClick={onOpenAuthor}
      >
        <span className="chat-sidebar-branding-line">2048</span>
        <span className="chat-sidebar-branding-line">LABS</span>
      </button>
    </div>
  );
}
