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
  historyEntries,
  activeUser,
  historyExpanded,
  onToggleHistory,
  emptyLabel,
  historyLabel,
  durationLabel,
  modeLabel,
}) {
  return (
    <section className="console-output-panel">
      <div className="console-output-header">
        <span>{durationLabel}</span>
        <span>{modeLabel}</span>
        <button type="button" className="history-toggle-inline" onClick={onToggleHistory} aria-expanded={historyExpanded}>
          {historyLabel}
        </button>
      </div>

      <div className="current-output-panel" role="log" aria-live="polite">
        {currentEntry ? (
          <HistoryEntry entry={currentEntry} activeUser={activeUser} />
        ) : (
          <div className="current-output-empty">{emptyLabel}</div>
        )}
      </div>

      {historyExpanded && historyEntries.length > 0 ? (
        <div className="history-buffer" role="log" aria-live="polite">
          {historyEntries.map((entry, index) => (
            <HistoryEntry key={`${entry.command}-${index}`} entry={entry} activeUser={activeUser} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
