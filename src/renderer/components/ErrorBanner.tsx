import { StatusBanner } from "./StatusBanner";

export function ErrorBanner({
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
      variant="error"
      label="Error"
      message={message}
      onClose={onClose}
      role="alert"
      ariaLive="assertive"
      startedAt={startedAt}
      durationMs={durationMs}
      fullWidth
    />
  );
}
