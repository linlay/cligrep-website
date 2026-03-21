import { useTranslation } from "react-i18next";

export default function TrendingGrid({ trending, onSelectCli }) {
  const { t } = useTranslation();

  return (
    <section className="cards-section">
      <div className="section-heading">
        <span>{t("trending_title")}</span>
        <small>{t("trending_subtitle")}</small>
      </div>
      <div className="trending-list">
        {trending.map((cli) => (
          <CliCard key={cli.slug} cli={cli} onSelect={() => onSelectCli(cli)} />
        ))}
      </div>
    </section>
  );
}

function CliCard({ cli, onSelect }) {
  const typeClass = cli.type === "builtin" ? "builtin" : "cli";

  return (
    <button
      type="button"
      className={`cli-card ${typeClass}`}
      onClick={onSelect}
    >
      <span className="card-name">{cli.displayName}</span>
      <span className="card-summary">{cli.summary}</span>
      <span className="card-stats">
        <span className="star-stat">
          <span className="star-icon" aria-hidden="true">★</span>
          <span>{cli.favoriteCount}</span>
        </span>
      </span>
    </button>
  );
}
