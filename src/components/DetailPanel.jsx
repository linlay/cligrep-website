import { useTranslation } from "react-i18next";
import { formatCliDate, normalizeCliView, sourceTypeLabel } from "../lib/cliView.js";

export default function DetailPanel({ detail, onToggleFavorite, isFavoriteActive, onComment, onFillHelp, onFillExample }) {
  const { t, i18n } = useTranslation();
  if (!detail?.cli) return null;

  const cli = normalizeCliView(detail.cli, { examples: detail.examples });
  const promptCommands = (detail.examples ?? cli.promptCommands).slice(0, 6);
  const repoLinks = [
    cli.githubUrl ? { label: "GitHub", href: cli.githubUrl } : null,
    cli.giteeUrl ? { label: "Gitee", href: cli.giteeUrl } : null,
  ].filter(Boolean);

  return (
    <section className="detail-panel">
      <div className="section-heading">
        <span>{t("detail_title")}</span>
        <small>{cli.environmentKind}</small>
      </div>

      <div className="detail-section detail-hero-section">
        <div className="detail-section-title">{t("detail_name")}</div>
        <div className="detail-section-body">
          <div className="detail-name-line">
            <span className="cli-name">{cli.command}</span>
            <span className="detail-inline-badge">{cli.environmentKind}</span>
            <span className="detail-inline-badge">{sourceTypeLabel(cli.sourceType, t)}</span>
            {!cli.executable ? <span className="detail-inline-badge">{t("tag_help_only")}</span> : null}
          </div>
          <p className="detail-description">{cli.description}</p>
          {!cli.executable ? <p className="detail-warning">{t("detail_text_warning")}</p> : null}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">{t("detail_metadata")}</div>
        <div className="detail-metadata-grid">
          <Metadata label={t("meta_command")} value={cli.command} />
          <Metadata label={t("meta_raw_command")} value={cli.originalCommand || t("meta_na")} />
          <Metadata label={t("meta_sandbox")} value={cli.environmentKind} />
          <Metadata label={t("meta_author")} value={cli.author || t("meta_na")} />
          <Metadata label={t("meta_license")} value={cli.license || t("meta_na")} />
          <Metadata label={t("meta_created")} value={formatCliDate(cli.createdAt, i18n.language) || t("meta_na")} />
          <Metadata label={t("meta_favorites")} value={String(cli.favoriteCount)} />
          <Metadata label={t("meta_runs")} value={String(cli.runCount)} />
          <Metadata label={t("detail_version")} value={cli.version} />
          <Metadata label={t("detail_source_type")} value={sourceTypeLabel(cli.sourceType, t)} />
        </div>
      </div>

      {repoLinks.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-title">{t("detail_links")}</div>
          <div className="detail-link-row">
            {repoLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {promptCommands.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-title">{t("detail_prompt_commands")}</div>
          <div className="detail-link-row">
            {promptCommands.map((command) => (
              <button key={command} type="button" className="prompt-command-button" onClick={() => onFillExample(command)}>
                {command}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="action-row">
        <button type="button" className={isFavoriteActive ? "favorite-active" : ""} onClick={onToggleFavorite}>
          {isFavoriteActive ? t("action_favorited") : t("action_favorite")}
        </button>
        <button type="button" onClick={onComment}>{t("action_comment")}</button>
        <button type="button" onClick={onFillHelp}>{t("action_help")}</button>
      </div>
    </section>
  );
}

function Metadata({ label, value }) {
  return (
    <div className="detail-metadata-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
