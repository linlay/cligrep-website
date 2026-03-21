import { useTranslation } from "react-i18next";
import { formatCliDate, normalizeCliView } from "../lib/cliView.js";

export default function DetailPanel({ detail, currentCli, isFavoriteActive, onToggleFavorite, onComment, onFillHelp, onFillExample }) {
  const { t, i18n } = useTranslation();

  if (!currentCli || !detail?.cli) return null;

  const cli = normalizeCliView(detail.cli, { examples: detail.examples });
  const comments = detail.comments ?? [];
  const examples = detail.examples ?? [];
  const metadata = [
    { label: t("meta_command"), value: cli.command },
    { label: t("meta_raw_command"), value: cli.rawCommand },
    { label: t("meta_sandbox"), value: cli.sandbox },
    { label: t("meta_author"), value: cli.author },
    { label: t("detail_version"), value: cli.version },
    { label: t("meta_license"), value: cli.license },
    { label: t("meta_created"), value: formatCliDate(cli.createdAt, i18n.language) },
    { label: t("meta_runs"), value: cli.runCount },
  ].filter((item) => item.value);

  const repositoryLinks = [
    cli.githubUrl ? { label: "GitHub", value: cli.githubUrl } : null,
    cli.giteeUrl ? { label: "Gitee", value: cli.giteeUrl } : null,
  ].filter(Boolean);

  return (
    <section className="detail-panel">
      <div className="section-heading">
        <span>{t("detail_title")}</span>
        <small>{cli.runtimeImage ?? cli.sandbox}</small>
      </div>

      <div className="detail-section detail-hero-section">
        <div className="detail-section-title">{t("detail_name")}</div>
        <div className="detail-section-body">
          <div className="detail-name-line">
            <span className="cli-name">{cli.displayName}</span>
            <span className={`detail-inline-badge ${cli.type}`}>{cli.sandbox}</span>
          </div>
          <p className="detail-description">{cli.description}</p>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">{t("detail_metadata")}</div>
        <div className="detail-metadata-grid">
          {metadata.map((item) => (
            <div key={item.label} className="detail-metadata-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {repositoryLinks.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-title">{t("detail_links")}</div>
          <div className="detail-link-row">
            {repositoryLinks.map((link) => (
              <a key={link.label} href={link.value} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {cli.tags.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-title">{t("detail_tags")}</div>
          <div className="detail-section-body">
            <div className="tag-row">
              {cli.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {cli.promptCommands.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-title">{t("detail_prompt_commands")}</div>
          <div className="detail-link-row">
            {cli.promptCommands.map((command) => (
              <button
                key={command}
                type="button"
                className="prompt-command-button"
                onClick={() => onFillExample(command)}
              >
                {command}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="action-row">
        <button
          type="button"
          className={isFavoriteActive ? "favorite-active" : ""}
          onClick={onToggleFavorite}
        >
          {isFavoriteActive ? t("action_favorited") : t("action_favorite")}
        </button>
        <button type="button" onClick={onComment}>
          {t("action_comment")}
        </button>
        <button type="button" onClick={onFillHelp}>
          {t("action_help")}
        </button>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">{t("detail_examples")}</div>
        <div className="examples-block">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              className="example-line"
              onClick={() => onFillExample(example)}
            >
              $ {cli.slug} {example}
            </button>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">{t("detail_comments")} ({comments.length})</div>
        <div className="comments-block">
          {comments.length === 0 ? (
            <p className="comment-empty">{t("detail_no_comments")}</p>
          ) : (
            comments.map((comment) => (
              <article key={comment.id} className="comment-item">
                <header>
                  <span>{comment.username}</span>
                  <time>{new Date(comment.createdAt).toLocaleString()}</time>
                </header>
                <p>{comment.body}</p>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="detail-meta">
        <span className="star-stat">
          <span className="star-icon" aria-hidden="true">★</span>
          <span>{cli.favoriteCount}</span>
        </span>
        <span>{t("meta_runs")}: {cli.runCount ?? t("meta_na")}</span>
        <span>{t("comments_count", { count: comments.length })}</span>
      </div>
    </section>
  );
}
