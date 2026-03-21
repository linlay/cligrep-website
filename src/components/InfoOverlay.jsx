export default function InfoOverlay({ title, onClose, children }) {
  return (
    <div className="command-palette-overlay" role="presentation" onClick={onClose}>
      <section className="info-overlay-card" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <span>{title}</span>
          <button type="button" className="overlay-close-button" onClick={onClose}>ESC</button>
        </div>
        <div className="info-overlay-body">{children}</div>
      </section>
    </div>
  );
}
