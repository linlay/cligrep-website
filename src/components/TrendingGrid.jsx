import { useTranslation } from "react-i18next";

export default function TrendingGrid({ trending, onSelectCli }) {
  const { t } = useTranslation();
  const subtitle = t("trending_subtitle");

  return (
    <section className="cards-section trending-section">
      <div className="section-heading">
        <span>{t("trending_title")}</span>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
      <div className="trending-list">
        {trending.map((cli, index) => (
          <CliCard key={cli.slug} cli={cli} rank={index + 1} onSelect={() => onSelectCli(cli)} />
        ))}
      </div>
    </section>
  );
}

function CliCard({ cli, rank, onSelect }) {
  const typeClass = cli.type === "builtin" ? "builtin" : "cli";

  return (
    <button
      type="button"
      className={`cli-card ${typeClass}`}
      onClick={onSelect}
    >
      <span className="card-rank">#{rank}</span>
      <div className="card-main">
        <div className="card-head">
          <span className="card-name">{cli.displayName}</span>
          <span className={`card-type ${typeClass}`}>{cli.type}</span>
        </div>
        <span className="card-summary">{cli.summary}</span>
      </div>
      <span className="card-stats">
        <span className="star-stat">
          <span className="star-icon" aria-hidden="true">★</span>
          <span>{cli.favoriteCount}</span>
        </span>
      </span>
    </button>
  );
}
