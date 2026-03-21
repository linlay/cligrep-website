import { useTranslation } from "react-i18next";

export default function DetailPanel({ detail, currentCli, isFavoriteActive, onToggleFavorite, onComment, onFillHelp, onFillExample }) {
  const { t } = useTranslation();

  if (!currentCli || !detail?.cli) return null;

  const cli = detail.cli;
  const comments = detail.comments ?? [];
  const examples = detail.examples ?? [];
  const favoriteCount = cli.favoriteCount ?? 0;

  return (
    <section className="detail-panel">
      <div className="section-heading">
        <span>{t("detail_title")}</span>
        <small>{cli.runtimeImage}</small>
      </div>

      {/* NAME */}
      <div className="detail-section">
        <div className="detail-section-title">{t("detail_name")}</div>
        <div className="detail-section-body">
          <div className="detail-name-line">
            <span className="cli-name">{cli.displayName}</span>
            <span className="cli-dash">--</span>
            <span className="cli-summary-text">{cli.summary}</span>
          </div>
        </div>
      </div>

      {/* VERSION */}
      <div className="detail-section">
        <div className="detail-section-title">{t("detail_version")}</div>
        <div className="detail-section-body">{cli.versionText}</div>
      </div>

      {/* TAGS */}
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

      {/* Actions */}
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

      {/* EXAMPLES */}
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

      {/* COMMENTS */}
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

      {/* Stats footer */}
      <div className="detail-meta">
        <span className="star-stat">
          <span className="star-icon" aria-hidden="true">★</span>
          <span>{favoriteCount}</span>
        </span>
        <span>{t("comments_count", { count: comments.length })}</span>
      </div>
    </section>
  );
}
