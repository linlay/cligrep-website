import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCliDate, normalizeCliView, sourceTypeLabel } from "../lib/cliView";
import type { CliDetailPayload, CliRelease, CliReleaseAsset } from "../types";

interface DetailPanelProps {
  detail: CliDetailPayload | null;
  onToggleFavorite: () => void;
  isFavoriteActive: boolean;
  onComment: () => void;
  onFillHelp: () => void;
  onFillExample: (example: string) => void;
}

interface MetadataProps {
  label: string;
  value: string;
}

export default function DetailPanel({
  detail,
  onToggleFavorite,
  isFavoriteActive,
  onComment,
  onFillHelp,
  onFillExample,
}: DetailPanelProps) {
  const { t, i18n } = useTranslation();
  const [selectedVersion, setSelectedVersion] = useState("");
  const cli = detail?.cli ? normalizeCliView(detail.cli, { examples: detail.examples ?? [] }) : null;
  const releases = normalizeReleases(detail.releases ?? []);
  const latestRelease = normalizeRelease(detail.latestRelease) ?? releases.find((release) => release.isCurrent) ?? releases[0] ?? null;
  const activeRelease = releases.find((release) => release.version === selectedVersion) ?? latestRelease;
  const activeAssets = activeRelease?.assets ?? [];
  const releaseChecksumURL = activeAssets.find((asset) => asset.checksumUrl)?.checksumUrl ?? "";
  const metadataVersion = latestRelease?.version || cli?.version || "N/A";

  useEffect(() => {
    setSelectedVersion(latestRelease?.version ?? "");
  }, [latestRelease?.version, detail?.cli?.slug]);

  if (!detail?.cli || !cli) return null;

  const promptCommands = (detail.examples ?? cli.promptCommands).slice(0, 6);
  const repoLinks = [
    cli.officialUrl ? { label: t("link_official"), href: cli.officialUrl } : null,
    cli.giteeUrl ? { label: "Gitee", href: cli.giteeUrl } : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

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
          <Metadata label={t("detail_version")} value={metadataVersion} />
          <Metadata label={t("detail_source_type")} value={sourceTypeLabel(cli.sourceType, t)} />
        </div>
      </div>

      {releases.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-title">{t("detail_version_status")}</div>
          <div className="detail-release-stack">
            <div className="detail-release-summary">
              <strong>{activeRelease?.version ?? metadataVersion}</strong>
              <span>
                {activeRelease?.isCurrent ? t("detail_current_release") : t("detail_previous_release")}
                {" · "}
                {formatCliDate(activeRelease?.publishedAt ?? "", i18n.language) || t("meta_na")}
              </span>
            </div>
            <div className="detail-link-row">
              {releases.map((release) => (
                <button
                  key={release.version}
                  type="button"
                  className={`prompt-command-button ${activeRelease?.version === release.version ? "is-active" : ""}`.trim()}
                  onClick={() => setSelectedVersion(release.version)}
                >
                  {release.version}
                  {release.isCurrent ? ` ${t("detail_current_short")}` : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeRelease && activeAssets.length > 0 ? (
        <div className="detail-section">
          <div className="detail-section-title">{t("detail_downloads")}</div>
          <div className="detail-download-grid">
            {activeAssets.map((asset) => (
              <a key={asset.fileName} href={asset.downloadUrl} target="_blank" rel="noreferrer" className="detail-download-card">
                <strong>{asset.fileName}</strong>
                <span>{asset.os}/{asset.arch}</span>
                <span>{formatFileSize(asset.sizeBytes)}</span>
              </a>
            ))}
          </div>
          {releaseChecksumURL ? (
            <div className="detail-link-row">
              <a href={releaseChecksumURL} target="_blank" rel="noreferrer">
                {t("detail_checksums")}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

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
        {cli.officialUrl ? (
          <a href={cli.officialUrl} target="_blank" rel="noreferrer" className="detail-action-link">
            {t("action_open_official")}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function Metadata({ label, value }: MetadataProps) {
  return (
    <div className="detail-metadata-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normalizeRelease(release: CliRelease | null | undefined) {
  if (!release?.version) return null;

  return {
    version: release.version,
    publishedAt: typeof release.publishedAt === "string" ? release.publishedAt : "",
    isCurrent: release.isCurrent === true,
    assets: normalizeAssets(release.assets ?? []),
  };
}

function normalizeReleases(releases: CliRelease[]) {
  return releases
    .map((release) => normalizeRelease(release))
    .filter((release): release is NonNullable<ReturnType<typeof normalizeRelease>> => Boolean(release));
}

function normalizeAssets(assets: CliReleaseAsset[]) {
  return assets
    .filter((asset) => typeof asset.fileName === "string" && typeof asset.downloadUrl === "string")
    .map((asset) => ({
      fileName: asset.fileName as string,
      downloadUrl: asset.downloadUrl as string,
      os: typeof asset.os === "string" ? asset.os : "unknown",
      arch: typeof asset.arch === "string" ? asset.arch : "unknown",
      sizeBytes: Number(asset.sizeBytes ?? 0),
      checksumUrl: typeof asset.checksumUrl === "string" ? asset.checksumUrl : "",
    }));
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "N/A";
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  if (sizeBytes >= 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${sizeBytes} B`;
}
