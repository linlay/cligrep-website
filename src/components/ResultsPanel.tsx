import { type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { sourceTypeLabel } from "../lib/cliView";
import type { CliView } from "../types";

interface ResultsPanelProps {
  searchResults: CliView[];
  selectedResultIndex: number;
  onSelectCli: (cli: CliView) => void;
}

interface ResultRowProps {
  cli: CliView;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export default function ResultsPanel({ searchResults, selectedResultIndex, onSelectCli }: ResultsPanelProps) {
  const { t } = useTranslation();

  if (searchResults.length === 0) {
    return (
      <section className="results-panel">
        <div className="empty-state">{t("search_empty")}</div>
      </section>
    );
  }

  return (
    <section className="results-panel" role="listbox" aria-label={t("search_results_aria")}>
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

function ResultRow({ cli, index, isActive, onSelect }: ResultRowProps) {
  const { t } = useTranslation();
  const githubLabel = cli.githubUrl
    ? cli.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    : "";

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <article
      className={`result-row ${isActive ? "active" : ""}`.trim()}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="option"
      aria-selected={isActive}
      tabIndex={0}
    >
      <span className="result-index">[{index + 1}]</span>
      <span className="result-type">{cli.environmentKind}</span>
      <span className="result-slug">{cli.command}</span>
      <span className="result-summary">{cli.description}</span>
      <span className="result-stats">
        <span>★ {cli.favoriteCount} / ▶ {cli.runCount} / {sourceTypeLabel(cli.sourceType, t)}</span>
        {cli.githubUrl ? (
          <a
            href={cli.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="result-github-link"
            onClick={(event) => event.stopPropagation()}
          >
            {t("card_source_prefix")}: {githubLabel}
          </a>
        ) : null}
      </span>
    </article>
  );
}
