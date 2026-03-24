import { useTranslation } from "react-i18next";
import type { CliComment } from "../types";

interface CommentsPanelProps {
  comments: CliComment[];
  onComment: () => void;
}

export default function CommentsPanel({ comments, onComment }: CommentsPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="detail-panel comments-panel">
      <div className="section-heading">
        <span>{t("detail_comments")}</span>
        <small>{comments.length}</small>
      </div>

      <div className="detail-section">
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
        <button type="button" onClick={onComment}>{t("action_comment")}</button>
      </div>
    </section>
  );
}
