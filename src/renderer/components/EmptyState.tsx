export function EmptyState({ displayName }: { displayName: string }) {
  return (
    <div className="new-tab-state">
      <h1 className="greeting-hi">
        Hi, <span className="greeting-name">{displayName}</span>
      </h1>
      <p className="greeting-question">What&apos;s up?</p>
    </div>
  );
}
