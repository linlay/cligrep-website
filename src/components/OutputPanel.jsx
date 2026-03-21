function HistoryEntry({ entry, activeUser }) {
  return (
    <div className="history-entry">
      {entry.prompt ? (
        <div className="history-prompt-echo">
          <span className="echo-user">{activeUser.username}</span>
          <span className="echo-at">@</span>
          <span className="echo-ip">{activeUser.ip}</span>
          <span className="echo-path">:~$ </span>
          <span className="echo-cmd">{entry.command}</span>
        </div>
      ) : null}
      {entry.output ? <div className="history-output">{entry.output}</div> : null}
    </div>
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
}) {
  return (
    <div className="output-stack">
      <section className="current-output-panel" role="log" aria-live="polite">
        {currentEntry ? (
          <HistoryEntry entry={currentEntry} activeUser={activeUser} />
        ) : (
          <div className="current-output-empty">{emptyLabel}</div>
        )}
      </section>

      {historyEntries.length > 0 ? (
        <section className="history-section">
          <button
            type="button"
            className="history-toggle"
            onClick={onToggleHistory}
            aria-expanded={historyExpanded}
          >
            <span>{historyLabel}</span>
            <span>{historyExpanded ? "[-]" : "[+]"}</span>
          </button>

          {historyExpanded ? (
            <div className="history-buffer" role="log" aria-live="polite">
              {historyEntries.map((entry, index) => (
                <HistoryEntry key={`${entry.command}-${index}`} entry={entry} activeUser={activeUser} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
