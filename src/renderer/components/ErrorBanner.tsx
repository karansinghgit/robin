import { IconClose } from "./icons";

export function ErrorBanner({
  message,
  onClose
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="error-banner" role="alert">
      <p className="error-banner-text">{message}</p>
      <button
        type="button"
        className="error-banner-close"
        aria-label="Dismiss error"
        title="Dismiss"
        onClick={onClose}
      >
        <IconClose />
      </button>
    </div>
  );
}
