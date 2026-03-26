import { useTranslation } from "react-i18next";
import AuthOverlay from "./components/AuthOverlay";
import CommandConsole from "./components/CommandConsole";
import CommandPalette from "./components/CommandPalette";
import CommentsPanel from "./components/CommentsPanel";
import DetailPanel from "./components/DetailPanel";
import InfoOverlay from "./components/InfoOverlay";
import ResultsPanel from "./components/ResultsPanel";
import SiteHeader from "./components/SiteHeader";
import TrendingGrid from "./components/TrendingGrid";
import { useAppShell } from "./hooks/useAppShell";
import { useBrandTyping } from "./hooks/useBrandTyping";
import { useSeo } from "./hooks/useSeo";
import {
  BRAND_TEXT,
  BRAND_TYPING_INTERVAL_MS,
  BRAND_TYPING_STEP_MS,
} from "./lib/appShell";

function App() {
  const { t, i18n } = useTranslation();
  const app = useAppShell({ t, i18n });
  useSeo({
    language: i18n.language,
    items: app.homeFeed.items,
    total: app.homeFeed.total,
  });
  const { typedText, isTyping } = useBrandTyping({
    text: BRAND_TEXT,
    intervalMs: BRAND_TYPING_INTERVAL_MS,
    stepMs: BRAND_TYPING_STEP_MS,
  });

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <SiteHeader
        brandText={BRAND_TEXT}
        typedBrand={typedText}
        isBrandTyping={isTyping}
        {...app.siteHeaderProps}
      />

      {app.authOverlayProps ? <AuthOverlay {...app.authOverlayProps} /> : null}

      <main className="main-grid stacked-grid">
        <CommandConsole {...app.commandConsoleProps} />

        {app.mode === "home" ? (
          <TrendingGrid
            feed={app.homeFeed}
            onSelectCli={app.onSelectCli}
            onSortChange={app.onSortChange}
          />
        ) : null}

        {app.mode === "search-results" ? (
          <ResultsPanel
            searchResults={app.searchResults}
            selectedResultIndex={app.selectedResultIndex}
            onSelectCli={app.onSelectCli}
          />
        ) : null}

        {app.showDetailPanels ? (
          <section className="detail-stack">
            <DetailPanel
              detail={app.detail}
              onToggleFavorite={app.onToggleFavorite}
              isFavoriteActive={app.isFavoriteActive}
              onComment={app.onComment}
              onFillHelp={app.onFillHelp}
              onFillExample={app.onFillExample}
            />
            <CommentsPanel
              comments={app.detail?.comments ?? []}
              onComment={app.onComment}
            />
          </section>
        ) : null}
      </main>

      {app.paletteProps ? <CommandPalette {...app.paletteProps} /> : null}

      {app.docsOverlayProps ? (
        <InfoOverlay
          title={app.docsOverlayProps.title}
          onClose={app.docsOverlayProps.onClose}
        >
          <div className="info-copy">
            <p>{app.docsOverlayProps.intro}</p>
            <p>{app.docsOverlayProps.runtime}</p>
            <p>{app.docsOverlayProps.text}</p>
          </div>
        </InfoOverlay>
      ) : null}

      {app.statusOverlayProps ? (
        <InfoOverlay
          title={app.statusOverlayProps.title}
          onClose={app.statusOverlayProps.onClose}
        >
          <div className="status-grid">
            {Object.entries(app.statusOverlayProps.payload).map(
              ([key, value]) => (
                <div key={key} className="status-grid-item">
                  <span>{key}</span>
                  <strong>
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </strong>
                </div>
              ),
            )}
          </div>
        </InfoOverlay>
      ) : null}
    </div>
  );
}

export default App;
