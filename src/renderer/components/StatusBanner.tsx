import { useEffect, useState } from "react";
import { IconClose } from "./icons";

type StatusBannerVariant = "warning" | "error";

export function StatusBanner({
  variant,
  label,
  message,
  onClose,
  role,
  ariaLive,
  startedAt,
  durationMs,
  fullWidth = false
}: {
  variant: StatusBannerVariant;
  label: string;
  message: string;
  onClose: () => void;
  role: "alert" | "status";
  ariaLive?: "assertive" | "polite" | "off";
  startedAt?: number;
  durationMs?: number;
  fullWidth?: boolean;
}) {
  const [remainingMs, setRemainingMs] = useState(durationMs ?? 0);

  useEffect(() => {
    if (!startedAt || !durationMs) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      setRemainingMs(Math.max(0, startedAt + durationMs - performance.now()));
    };

    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [durationMs, startedAt]);

  const seconds =
    startedAt && durationMs ? Math.max(1, Math.ceil(remainingMs / 1000)) : null;

  return (
    <div
      className={`status-banner status-banner-${variant}${fullWidth ? " status-banner-full-width" : ""}`}
      role={role}
      aria-live={ariaLive}
    >
      <div className="status-banner-copy">
        <p className="status-banner-label">{label}</p>
        <p className="status-banner-text">{message}</p>
      </div>
      {seconds !== null ? (
        <span
          className="status-banner-countdown"
          aria-label={`Dismisses in ${seconds} seconds`}
        >
          {seconds}
        </span>
      ) : null}
      <button
        type="button"
        className="status-banner-close"
        aria-label={`Dismiss ${label.toLowerCase()}`}
        title="Dismiss"
        onClick={onClose}
      >
        <IconClose />
      </button>
    </div>
  );
}
