import { useTranslation } from "react-i18next";
import { formatCliDate, sourceTypeLabel } from "../lib/cliView.js";

const SORTS = ["favorites", "newest", "runs"];

export default function TrendingGrid({ feed, onSelectCli, onSortChange }) {
  const { t, i18n } = useTranslation();

  return (
    <section className="cards-section homepage-cli-section">
      <div className="cards-toolbar">
        <div className="cards-toolbar-copy">
          <span>{t("homepage_cli_title")}</span>
          <small>{t("homepage_cli_total", { count: feed.total ?? 0 })}</small>
        </div>

        <div className="cards-sort-row">
          {SORTS.map((sort) => (
            <button
              key={sort}
              type="button"
              className={`cards-sort-button ${feed.sort === sort ? "active" : ""}`.trim()}
              onClick={() => onSortChange(sort)}
            >
              {t(`sort_${sort}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="trending-list">
        {feed.items.map((cli) => (
          <div key={cli.slug} className="trending-card-shell">
            <CliCard cli={cli} locale={i18n.language} onSelect={() => onSelectCli(cli)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CliCard({ cli, locale, onSelect }) {
  const { t } = useTranslation();
  const createdAt = formatCliDate(cli.createdAt, locale) ?? t("meta_na");
  const sourceLabel = sourceTypeLabel(cli.sourceType, t);
  const tags = [
    `[${cli.environmentKind}]`,
    `[${sourceLabel}]`,
    cli.executable ? null : `[${t("tag_help_only")}]`,
  ].filter(Boolean);

  return (
    <button type="button" className="cli-card cli-card-compact" onClick={onSelect}>
      <div className="cli-card-topbar">
        <div className="traffic-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="cli-card-title">{cli.command}</span>
        <span className="cli-card-stats-inline">
          ★ {cli.favoriteCount} / ▶ {cli.runCount}
        </span>
      </div>

      <div className="cli-card-body compact">
        <div className="cli-card-tag-row">
          {tags.map((tag) => (
            <span key={tag} className="compact-tag">{tag}</span>
          ))}
          {cli.license && cli.license !== "N/A" ? <span className="compact-tag">[{cli.license}]</span> : null}
        </div>

        <p className="card-summary">{cli.description}</p>

        <div className="compact-meta-grid">
          <span>{t("meta_raw_command")}: {cli.originalCommand || t("meta_na")}</span>
          <span>{t("card_source_prefix")}: {sourceLabel}</span>
          <span>{t("meta_created")}: {createdAt}</span>
          <span>{t("meta_runs")}: {cli.runCount}</span>
        </div>
      </div>
    </button>
  );
}
