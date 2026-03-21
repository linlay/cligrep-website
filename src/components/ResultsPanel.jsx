import { useTranslation } from "react-i18next";

export default function ResultsPanel({ searchResults, selectedResultIndex, onSelectCli }) {
  const { t } = useTranslation();

  if (searchResults.length === 0) {
    return (
      <section className="results-panel">
        <div className="empty-state">{t("search_empty")}</div>
      </section>
    );
  }

  return (
    <section className="results-panel" role="listbox" aria-label="Search results">
      {searchResults.map((cli, index) => (
        <ResultRow
          key={cli.slug}
          cli={cli}
          index={index}
          isActive={index === selectedResultIndex}
          onSelect={() => onSelectCli(cli)}
        />
      ))}
    </section>
  );
}

function ResultRow({ cli, index, isActive, onSelect }) {
  const { t } = useTranslation();
  const typeClass = cli.type === "builtin" ? "builtin" : "cli";

  return (
    <button
      type="button"
      className={`result-row ${typeClass} ${isActive ? "active" : ""}`}
      onClick={onSelect}
      role="option"
      aria-selected={isActive}
    >
      <span className="result-index">[{index + 1}]</span>
      <span className={`result-type ${typeClass}`}>{cli.type}</span>
      <span className="result-slug">{cli.displayName}</span>
      <span className="result-summary">{cli.summary}</span>
      <span className="result-stats">
        <StarStat value={cli.favoriteCount} /> {cli.commentCount} {t("notes")}
      </span>
    </button>
  );
}

function StarStat({ value }) {
  return (
    <span className="star-stat">
      <span className="star-icon" aria-hidden="true">★</span>
      <span>{value}</span>
    </span>
  );
}
