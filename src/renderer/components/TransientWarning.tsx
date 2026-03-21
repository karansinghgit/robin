import { StatusBanner } from "./StatusBanner";

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
  return (
    <StatusBanner
      variant="warning"
      label="Warning"
      message={message}
      onClose={onClose}
      role="status"
      ariaLive="polite"
      startedAt={startedAt}
      durationMs={durationMs}
    />
  );
}
