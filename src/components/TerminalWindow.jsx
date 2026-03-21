export default function TerminalWindow({ title, badge, badgeTheme, children }) {
  return (
    <section className="terminal-window">
      <div className="terminal-topbar">
        <div className="traffic-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="terminal-title">{title}</div>
        <div className={`mode-badge ${badgeTheme}`}>{badge}</div>
      </div>
      {children}
    </section>
  );
}
