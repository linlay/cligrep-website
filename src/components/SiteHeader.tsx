import type { ResolvedTheme } from "../types";

interface SiteHeaderProps {
  brandText: string;
  typedBrand: string;
  isBrandTyping: boolean;
  resolvedTheme: ResolvedTheme;
  languageLabel: string;
  isAnonymous: boolean;
  sessionLabel: string;
  searchLabel: string;
  statusLabel: string;
  docsLabel: string;
  loginLabel: string;
  onSearchHome: () => void;
  onOpenStatusPanel: () => void;
  onOpenDocs: () => void;
  onCycleTheme: () => void;
  onToggleLanguage: () => void;
  onOpenSession: () => void;
}

export default function SiteHeader({
  brandText,
  typedBrand,
  isBrandTyping,
  resolvedTheme,
  languageLabel,
  isAnonymous,
  sessionLabel,
  searchLabel,
  statusLabel,
  docsLabel,
  loginLabel,
  onSearchHome,
  onOpenStatusPanel,
  onOpenDocs,
  onCycleTheme,
  onToggleLanguage,
  onOpenSession,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <h1 className="site-brand" aria-label={brandText}>
        <span className="brand-title-shell">
          <span className="brand-title-sizer" aria-hidden="true">
            {brandText}
          </span>
          <span className="brand-title" aria-hidden="true">
            {typedBrand}
            <span
              className="brand-caret"
              aria-hidden="true"
              style={{ opacity: isBrandTyping ? 1 : 0 }}
            >
              _
            </span>
          </span>
        </span>
      </h1>

      <div className="site-flat-actions">
        <button type="button" className="flat-action-button" onClick={onSearchHome}>
          {searchLabel}
        </button>
        <button
          type="button"
          className="flat-action-button"
          onClick={onOpenStatusPanel}
        >
          {statusLabel}
        </button>
        <button type="button" className="flat-action-button" onClick={onOpenDocs}>
          {docsLabel}
        </button>
      </div>

      <div className="site-bracket-actions">
        <button
          type="button"
          className="bracket-action-button"
          onClick={onCycleTheme}
        >
          [{resolvedTheme === "dark" ? "moon" : "sun"}]
        </button>
        <button
          type="button"
          className="bracket-action-button"
          onClick={onToggleLanguage}
        >
          [{languageLabel}]
        </button>
        <button
          type="button"
          className="bracket-action-button accent"
          onClick={onOpenSession}
        >
          [$ {isAnonymous ? loginLabel : sessionLabel}]
        </button>
      </div>
    </header>
  );
}
