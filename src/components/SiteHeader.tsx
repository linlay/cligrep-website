import ToolbarMenu from "./ToolbarMenu";
import type { ResolvedTheme, ToolbarMenuItem } from "../types";

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
  sessionMenuLabel: string;
  sessionMenuItems: ToolbarMenuItem[];
  onSearchHome: () => void;
  onOpenStatusPanel: () => void;
  onOpenDocs: () => void;
  onCycleTheme: () => void;
  onToggleLanguage: () => void;
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
  sessionMenuLabel,
  sessionMenuItems,
  onSearchHome,
  onOpenStatusPanel,
  onOpenDocs,
  onCycleTheme,
  onToggleLanguage,
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
        <a
          className="bracket-action-button"
          href="https://github.com/linlay/cligrep-website"
          target="_blank"
          rel="noreferrer"
        >
          [github]
        </a>
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
        <ToolbarMenu
          label={sessionMenuLabel}
          value={isAnonymous ? sessionMenuLabel : sessionLabel}
          items={sessionMenuItems}
          tone="session"
        />
      </div>
    </header>
  );
}
