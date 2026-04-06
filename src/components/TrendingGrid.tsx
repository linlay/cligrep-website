import { type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { formatCliDate, formatOfficialLinkLabel } from "../lib/cliView";
import type { CliView, HomeFeed, HomeFeedSort } from "../types";

const SORTS: HomeFeedSort[] = ["favorites", "newest", "runs"];

interface TrendingGridProps {
	feed: HomeFeed;
	onSelectCli: (cli: CliView) => void;
	onSortChange: (sort: HomeFeedSort) => void;
}

interface CliCardProps {
	cli: CliView;
	locale: string;
	onSelect: () => void;
}

export default function TrendingGrid({
	feed,
	onSelectCli,
	onSortChange,
}: TrendingGridProps) {
	const { t, i18n } = useTranslation();

	return (
		<section
			className="cards-section homepage-cli-section"
			aria-labelledby="homepage-cli-heading"
		>
			<div className="cards-toolbar">
				<div className="cards-toolbar-copy">
					<h2
						id="homepage-cli-heading"
						className="cards-toolbar-title"
					>
						{t("homepage_cli_title")}
					</h2>
					{feed.total > 0 && (
						<small>
							（
							{t("homepage_cli_total", {
								count: feed.total ?? 0,
							})}
							）
						</small>
					)}
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

			<ol className="trending-list">
				{feed.items.map((cli) => (
					<li key={cli.slug} className="trending-card-shell">
						<CliCard
							cli={cli}
							locale={i18n.language}
							onSelect={() => onSelectCli(cli)}
						/>
					</li>
				))}
			</ol>
		</section>
	);
}

function CliCard({ cli, locale, onSelect }: CliCardProps) {
	const { t } = useTranslation();
	const createdAt = formatCliDate(cli.createdAt, locale) ?? t("meta_na");
	const tags = [`[${cli.environmentKind}]`].filter((tag): tag is string =>
		Boolean(tag),
	);
	const identitySeed = (cli.author || cli.command).trim();
	const avatarLabel = identitySeed.slice(0, 2).toUpperCase();
	const authorLabel = cli.author || cli.command;
	const officialLabel = cli.officialUrl
		? formatOfficialLinkLabel(cli.officialUrl)
		: t("meta_na");

	function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onSelect();
		}
	}

	return (
		<article
			className="cli-card cli-card-compact"
			onClick={onSelect}
			onKeyDown={handleCardKeyDown}
			role="button"
			tabIndex={0}
		>
			<div className="cli-card-topbar">
				<div className="traffic-lights" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
				<h3 className="cli-card-title">{cli.command}</h3>
				<div style={{ display: "flex", gap: 8 }}>
					<span className="cli-card-stats-inline">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="#22c55e"
							width="0.82rem"
							height="0.82rem"
						>
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
						{cli.runCount}
					</span>
					<span className="cli-card-stats-inline">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="#fbbf24"
							width="0.82rem"
							height="0.82rem"
						>
							<path
								fillRule="evenodd"
								d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
								clipRule="evenodd"
							/>
						</svg>
						{cli.favoriteCount}
					</span>
				</div>
			</div>

			<div className="cli-card-body compact">
				<div className="cli-card-identity-row">
					<div className="cli-card-avatar" aria-hidden="true">
						{avatarLabel}
					</div>
					<div className="cli-card-identity-copy">
						{/* <span className="cli-card-author">{authorLabel}</span> */}
						{cli.officialUrl ? (
							<a
								href={cli.officialUrl}
								className="cli-card-github-link"
								target="_blank"
								rel="noreferrer"
								onClick={(event) => event.stopPropagation()}
							>
								<span style={{ color: "#22c55e" }}>{t("card_source_prefix")} </span>
								{officialLabel}
							</a>
						) : (
							<span className="cli-card-github-link cli-card-github-empty">
								{officialLabel}
							</span>
						)}
					</div>
				</div>
				<p className="card-summary">{cli.description}</p>

				<div className="cli-card-tag-row">
					{tags.map((tag) => (
						<span key={tag} className="compact-tag">
							{tag}
						</span>
					))}
					{cli.license && cli.license !== "N/A" ? (
						<span className="compact-tag">[{cli.license}]</span>
					) : null}
				</div>

				{/* <div className="compact-meta-grid">
					<span>{createdAt}</span>
					<span className="card-runing">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="#22c55e"
							width="0.82rem"
							height="0.82rem"
						>
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
						{cli.runCount}
					</span>
				</div> */}
			</div>

			{/* <div className="cli-card-footer">
				<span>{createdAt}</span>
				<span className="card-runing">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="#22c55e"
						width="0.82rem"
						height="0.82rem"
					>
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					{cli.runCount}
				</span>
			</div> */}
		</article>
	);
}
