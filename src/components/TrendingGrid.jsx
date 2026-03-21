import { useTranslation } from "react-i18next";
import { formatCliDate } from "../lib/cliView.js";

export default function TrendingGrid({ trending, onSelectCli }) {
  const { t, i18n } = useTranslation();
  const subtitle = t("trending_subtitle");

  return (
    <section className="cards-section trending-section">
      <div className="section-heading">
        <span>{t("trending_title")}</span>
        {subtitle ? <small>{subtitle}</small> : null}
      </div>

      <div className="trending-list">
        {trending.map((cli) => (
          <div key={cli.slug} className="trending-card-shell">
            <CliCard cli={cli} onSelect={() => onSelectCli(cli)} locale={i18n.language} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CliCard({ cli, onSelect, locale }) {
  const { t } = useTranslation();
  const typeClass = cli.type === "builtin" ? "builtin" : "cli";
  const createdAt = formatCliDate(cli.createdAt, locale) ?? t("meta_na");
  const runCount = cli.runCount ?? t("meta_na");
  const license = cli.license ?? t("meta_na");
  const author = cli.author ?? t("meta_na");
  const promptCommands = cli.promptCommands.slice(0, 4);
  const hasOriginalCommand = cli.rawCommand && cli.rawCommand !== cli.command;

  return (
    <button
      type="button"
      className={`cli-card cli-card-masonry ${typeClass}`}
      onClick={onSelect}
    >
      <div className="cli-card-topbar">
        <div className="traffic-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="cli-card-title">{cli.command}</span>
        <span className="card-stats">
          <span className="star-stat">
            <span className="star-icon" aria-hidden="true">★</span>
            <span>{cli.favoriteCount}</span>
          </span>
        </span>
      </div>

      <div className="cli-card-body">
        <div className="cli-card-command-row">
          <span className={`card-sandbox-badge ${typeClass}`}>{cli.sandbox}</span>
          <span className="cli-card-version">{cli.version}</span>
        </div>

        <div className="cli-card-source">
          <span className="cli-card-source-prefix">{t("card_source_prefix")}</span>
          <span>{cli.sourceLabel ?? author}</span>
        </div>

        <p className="card-summary">{cli.description}</p>

        <dl className="cli-card-meta-grid">
          <div>
            <dt>{t("meta_author")}</dt>
            <dd>{author}</dd>
          </div>
          <div>
            <dt>{t("meta_license")}</dt>
            <dd>{license}</dd>
          </div>
          <div>
            <dt>{t("meta_created")}</dt>
            <dd>{createdAt}</dd>
          </div>
          <div>
            <dt>{t("meta_runs")}</dt>
            <dd>{runCount}</dd>
          </div>
        </dl>

        <div className="cli-card-command-block">
          <span className="cli-card-command-label">{t("meta_command")}</span>
          <code>{cli.command}</code>
          {hasOriginalCommand ? (
            <>
              <span className="cli-card-command-label">{t("meta_raw_command")}</span>
              <code>{cli.rawCommand}</code>
            </>
          ) : null}
        </div>

        {promptCommands.length > 0 ? (
          <div className="cli-card-prompts">
            {promptCommands.map((command) => (
              <span key={command} className="prompt-chip">
                {command}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="cli-card-footer">
        <span>{t("meta_sandbox")}: {cli.sandbox}</span>
        <span>{t("meta_favorites")}: {cli.favoriteCount}</span>
      </div>
    </button>
  );
}
