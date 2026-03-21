import { useTranslation } from "react-i18next";
import { sourceTypeLabel } from "../lib/cliView.js";

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

  return (
    <button
      type="button"
      className={`result-row ${isActive ? "active" : ""}`.trim()}
      onClick={onSelect}
      role="option"
      aria-selected={isActive}
    >
      <span className="result-index">[{index + 1}]</span>
      <span className="result-type">{cli.environmentKind}</span>
      <span className="result-slug">{cli.command}</span>
      <span className="result-summary">{cli.description}</span>
      <span className="result-stats">
        ★ {cli.favoriteCount} / ▶ {cli.runCount} / {sourceTypeLabel(cli.sourceType, t)}
      </span>
    </button>
  );
}
