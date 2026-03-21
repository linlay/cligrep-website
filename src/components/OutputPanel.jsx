function HistoryEntry({ entry, activeUser }) {
  return (
    <article className="history-entry">
      {entry.prompt ? (
        <div className="history-prompt-echo">
          <span className="echo-user">{activeUser.username}</span>
          <span className="echo-at">@</span>
          <span className="echo-ip">{activeUser.ip}</span>
          <span className="echo-path">:~$</span>
          <span className="echo-cmd">{entry.command}</span>
        </div>
      ) : null}
      {entry.output ? <pre className="history-output">{entry.output}</pre> : null}
    </article>
  );
}

export default function OutputPanel({
  currentEntry,
  activeUser,
  emptyLabel,
  historyPositionLabel,
  durationLabel,
  modeLabel,
  onShowOlder,
  onShowNewer,
  canShowOlder,
  canShowNewer,
  olderLabel,
  newerLabel,
}) {
  return (
    <section className="console-output-panel">
      <div className="console-output-header">
        <span>{durationLabel}</span>
        <span>{modeLabel}</span>
        <div className="history-nav-inline" aria-label={historyPositionLabel}>
          <button type="button" className="history-nav-button" onClick={onShowOlder} disabled={!canShowOlder}>
            {olderLabel}
          </button>
          <span className="history-position-label">{historyPositionLabel}</span>
          <button type="button" className="history-nav-button" onClick={onShowNewer} disabled={!canShowNewer}>
            {newerLabel}
          </button>
        </div>
      </div>

      <div className="current-output-panel" role="log" aria-live="polite">
        {currentEntry ? (
          <HistoryEntry entry={currentEntry} activeUser={activeUser} />
        ) : (
          <div className="current-output-empty">{emptyLabel}</div>
        )}
      </div>
    </section>
  );
}
