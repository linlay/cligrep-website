import { useEffect, useRef } from "react";

export default function OutputPanel({ historyBuffer, activeUser }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historyBuffer]);

  return (
    <div className="history-buffer" role="log" aria-live="polite">
      {historyBuffer.map((entry, i) => (
        <div key={i} className="history-entry">
          {entry.prompt && (
            <div className="history-prompt-echo">
              <span className="echo-user">{activeUser.username}</span>
              <span className="echo-at">@</span>
              <span className="echo-ip">{activeUser.ip}</span>
              <span className="echo-path">:~$ </span>
              <span className="echo-cmd">{entry.command}</span>
            </div>
          )}
          {entry.output && <div className="history-output">{entry.output}</div>}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
