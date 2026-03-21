import { useEffect, useState } from "react";
import { IconClose } from "./icons";

const RADIUS = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TransientWarning({
  message,
  startedAt,
  durationMs,
  onClose
}: {
  message: string;
  startedAt: number;
  durationMs: number;
  onClose: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      const nextRemaining = Math.max(
        0,
        startedAt + durationMs - performance.now()
      );
      setRemainingMs(nextRemaining);
      if (nextRemaining > 0) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, startedAt]);

  const progress = durationMs > 0 ? remainingMs / durationMs : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));

  return (
    <div className="transient-warning" role="status" aria-live="polite">
      <div className="transient-warning-copy">
        <p className="transient-warning-label">Warning</p>
        <p className="transient-warning-text">{message}</p>
      </div>
      <div className="transient-warning-actions">
        <div
          className="transient-warning-countdown"
          aria-label={`Dismisses in ${seconds} seconds`}
        >
          <svg viewBox="0 0 32 32" className="transient-warning-ring">
            <circle
              className="transient-warning-ring-track"
              cx="16"
              cy="16"
              r={RADIUS}
            />
            <circle
              className="transient-warning-ring-progress"
              cx="16"
              cy="16"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="transient-warning-count">{seconds}</span>
        </div>
        <button
          type="button"
          className="transient-warning-close"
          aria-label="Dismiss warning"
          title="Dismiss"
          onClick={onClose}
        >
          <IconClose />
        </button>
      </div>
    </div>
  );
}
