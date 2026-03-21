import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "./lib/api.js";
import { MAX_HISTORY_BUFFER, TAB_COMPLETIONS, THEME_OPTIONS } from "./lib/constants.js";
import { formatBuiltinExecution, formatExecution, isPrintableKey } from "./lib/commands.js";
import { useTheme } from "./hooks/useTheme.js";
import { useAuth } from "./hooks/useAuth.js";
import { useFavorites } from "./hooks/useFavorites.js";
import { useCommandHistory } from "./hooks/useCommandHistory.js";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts.js";
import TerminalWindow from "./components/TerminalWindow.jsx";
import PromptLine from "./components/PromptLine.jsx";
import OutputPanel from "./components/OutputPanel.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import TrendingGrid from "./components/TrendingGrid.jsx";
import DetailPanel from "./components/DetailPanel.jsx";
import CommentsPanel from "./components/CommentsPanel.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import InfoOverlay from "./components/InfoOverlay.jsx";
import { buildBuiltinLine, commandIdentity, environmentTone, normalizeCliView } from "./lib/cliView.js";

const DEFAULT_WEBSITE_COMMAND = normalizeCliView({
  slug: "builtin-grep",
  command: "grep",
  displayName: "grep",
  summary: "Search the CLI GREP registry from the website command line.",
  description: "Search the CLI GREP registry from the website command line.",
  helpText: "Search indexed commands by keyword, tag, summary, or help text.",
  environmentKind: "WEBSITE",
  sourceType: "website_builtin",
  originalCommand: "grep",
  executable: true,
  promptCommands: ["ripgrep", "python script", "mcp bridge"],
  versionText: "website builtin",
  createdAt: "2026-01-01T00:00:00Z",
});

const BUILTIN_SHORTCUTS = {
  "builtin-grep": ["ripgrep", "python script", "mcp bridge"],
  "builtin-create": ['"make a todo cli"', '"build a markdown linter"', '"scan log files"'],
  "builtin-make": ["sandbox grep", "dockerfile rg", "sandbox uv"],
};

function createMeta(meta = {}) {
  return {
    durationMs: meta.durationMs ?? 0,
    modeLabel: meta.modeLabel ?? "WEBSITE",
  };
}

function App() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme, cycleTheme } = useTheme();
  const { user, activeUser, isAnonymous, ensureAnonymousSession, login, logout } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const commandHistory = useCommandHistory();

  const [mode, setMode] = useState("home");
  const [inputValue, setInputValue] = useState("");
  const [homeFeed, setHomeFeed] = useState({ items: [], total: 0, sort: "favorites" });
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [currentCli, setCurrentCli] = useState(null);
  const [activeBuiltinCli, setActiveBuiltinCli] = useState(DEFAULT_WEBSITE_COMMAND);
  const [detail, setDetail] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [hints, setHints] = useState(DEFAULT_WEBSITE_COMMAND.promptCommands);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPalette, setShowPalette] = useState(false);
  const [inlineMode, setInlineMode] = useState("none");
  const [inlineValue, setInlineValue] = useState("");
  const [historyBuffer, setHistoryBuffer] = useState([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [typedBrand, setTypedBrand] = useState("");
  const [infoPanel, setInfoPanel] = useState(null);

  const inputRef = useRef(null);
  const inlineRef = useRef(null);

  const selectedSearchResult = searchResults[selectedResultIndex] ?? null;
  const selectedCommand = currentCli ?? activeBuiltinCli;
  const currentModeTheme = environmentTone(selectedCommand.environmentKind);
  const isFavoriteActive = currentCli ? isFavorite(currentCli.slug) : false;
  const currentOutputEntry = useMemo(
    () => (historyBuffer.length > 0 ? historyBuffer[historyBuffer.length - 1] : null),
    [historyBuffer],
  );
  const historyEntries = useMemo(
    () => (historyBuffer.length > 1 ? historyBuffer.slice(0, -1).reverse() : []),
    [historyBuffer],
  );
  const shortcutCommands = useMemo(
    () => resolveShortcutCommands(selectedCommand, detail, hints),
    [detail, hints, selectedCommand],
  );
  const showDetailPanels = Boolean(
    currentCli &&
    detail?.cli &&
    (currentCli.environmentKind === "SANDBOX" || currentCli.environmentKind === "TEXT"),
  );
  const outputDurationLabel = currentOutputEntry?.meta?.durationMs
    ? t("console_duration", { ms: currentOutputEntry.meta.durationMs })
    : t("console_duration_idle");
  const outputModeLabel = currentOutputEntry?.meta?.modeLabel ?? selectedCommand.environmentKind;

  function appendToBuffer(command, output, showPrompt = true, meta = {}) {
    setHistoryExpanded(false);
    setHistoryBuffer((buf) => {
      const next = [...buf, { prompt: showPrompt, command, output, meta: createMeta(meta) }];
      if (next.length > MAX_HISTORY_BUFFER) {
        return next.slice(next.length - MAX_HISTORY_BUFFER);
      }
      return next;
    });
  }

  function getMotd() {
    return [
      t("motd_line1"),
      "",
      t("motd_line2"),
      t("motd_line3"),
      t("motd_line4"),
      t("motd_line5"),
    ].join("\n");
  }

  const loadHomepage = useCallback(async (sort = homeFeed.sort || "favorites") => {
    const payload = await request(`/api/v1/clis/trending?sort=${encodeURIComponent(sort)}`);
    setHomeFeed({
      items: (payload.items ?? []).map((cli) => normalizeCliView(cli)),
      total: payload.total ?? 0,
      sort: payload.sort ?? sort,
    });
  }, [homeFeed.sort]);

  const loadCliDetail = useCallback(async (cliSlug) => {
    const payload = await request(`/api/v1/clis/${cliSlug}`);
    setDetail(payload);
    const normalized = normalizeCliView(payload.cli, { examples: payload.examples });
    setHints(resolveShortcutCommands(normalized, payload, []));
  }, []);

  useEffect(() => {
    setHistoryBuffer([{ prompt: false, command: "", output: getMotd(), meta: createMeta({ modeLabel: "WEBSITE" }) }]);
    setStatusMessage(t("status_ready"));
    void loadHomepage("favorites");
    if (!user) {
      void ensureAnonymousSession();
    }
  }, []);

  useEffect(() => {
    if (inlineMode !== "none") {
      requestAnimationFrame(() => inlineRef.current?.focus());
    } else {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [inlineMode, mode, currentCli]);

  useEffect(() => {
    const fullText = "CLI GREP";
    let index = 0;
    let deleting = false;

    const timer = window.setInterval(() => {
      if (!deleting) {
        index += 1;
        if (index >= fullText.length) {
          deleting = true;
          window.setTimeout(() => {}, 400);
        }
      } else {
        index -= 1;
        if (index <= 1) {
          deleting = false;
        }
      }
      setTypedBrand(fullText.slice(0, index));
    }, 160);

    return () => window.clearInterval(timer);
  }, []);

  const applyLanguage = useCallback((nextLang, options = {}) => {
    const { record = false, command = `lang ${nextLang}` } = options;
    i18n.changeLanguage(nextLang);
    localStorage.setItem("cligrep-lang", nextLang);
    const message = nextLang === "zh" ? "语言已切换为中文。" : "Language switched to English.";
    if (record) {
      appendToBuffer(command, message, true, { modeLabel: "WEBSITE" });
    }
    setStatusMessage(message);
  }, [i18n]);

  const resetToHome = useCallback(async () => {
    setMode("home");
    setCurrentCli(null);
    setActiveBuiltinCli(DEFAULT_WEBSITE_COMMAND);
    setDetail(null);
    setSearchResults([]);
    setSelectedResultIndex(0);
    setInputValue("");
    setHints(DEFAULT_WEBSITE_COMMAND.promptCommands);
    setStatusMessage(t("status_ready"));
    await loadHomepage(homeFeed.sort || "favorites");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [homeFeed.sort, loadHomepage, t]);

  const handleEscape = useCallback(() => {
    if (infoPanel) {
      setInfoPanel(null);
      return;
    }

    if (inlineMode !== "none") {
      setInlineMode("none");
      setInlineValue("");
      appendToBuffer("", "(cancelled)", false, { modeLabel: selectedCommand.environmentKind });
      return;
    }

    if (mode === "execution") {
      if (searchResults.length > 0) {
        setMode("search-results");
        setCurrentCli(null);
        setDetail(null);
        setActiveBuiltinCli(DEFAULT_WEBSITE_COMMAND);
        setStatusMessage(t("status_search_ready"));
      } else {
        void resetToHome();
      }
      return;
    }

    if (mode === "search-results") {
      void resetToHome();
    }
  }, [infoPanel, inlineMode, mode, resetToHome, searchResults.length, selectedCommand.environmentKind, t]);

  const handleShowHelp = useCallback(() => {
    appendToBuffer("help", [
      t("help_shortcuts"),
      t("help_shortcut_enter"),
      t("help_shortcut_esc"),
      t("help_shortcut_updown"),
      t("help_shortcut_tab"),
      t("help_shortcut_alt"),
    ].join("\n"), true, { modeLabel: selectedCommand.environmentKind });
    setMode("execution");
  }, [selectedCommand.environmentKind, t]);

  const handleClearTerminal = useCallback(() => {
    setHistoryBuffer([]);
  }, []);

  const handleClearInput = useCallback(() => {
    setInputValue("");
  }, []);

  const handleThemeSelect = useCallback((nextTheme) => {
    setTheme(nextTheme);
    setStatusMessage(t("theme_switched", { theme: nextTheme }));
  }, [setTheme, t]);

  const handleHeaderLogout = useCallback(async () => {
    try {
      const anonymousUser = await logout();
      if (anonymousUser) {
        setStatusMessage(t("status_logged_out"));
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, [logout, t]);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentCli) return;
    if (isAnonymous || !user?.id) {
      startLoginPrompt();
      return;
    }

    try {
      const nextActive = await toggleFavorite(currentCli.slug, user.id);
      await loadCliDetail(currentCli.slug);
      await loadHomepage(homeFeed.sort || "favorites");
      setStatusMessage(
        nextActive ? t("status_favorited", { name: currentCli.command }) : t("status_unfavorited", { name: currentCli.command }),
      );
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, [currentCli, homeFeed.sort, isAnonymous, loadCliDetail, loadHomepage, t, toggleFavorite, user]);

  const handleStartComment = useCallback(() => {
    if (!currentCli) return;
    if (isAnonymous || !user?.id) {
      startLoginPrompt();
      return;
    }

    appendToBuffer("", t("comment_prompt", { name: currentCli.command }), false, { modeLabel: currentCli.environmentKind });
    setInlineMode("comment-prompt");
    setInlineValue("");
  }, [currentCli, isAnonymous, t, user]);

  useKeyboardShortcuts({
    mode,
    inputRef,
    currentCli,
    isAnonymous,
    showPalette,
    inlineMode: inlineMode !== "none",
    onCycleTheme: cycleTheme,
    onClearTerminal: handleClearTerminal,
    onToggleLanguage: useCallback(() => {
      const nextLang = i18n.language === "en" ? "zh" : "en";
      applyLanguage(nextLang, { record: true });
    }, [applyLanguage, i18n.language]),
    onShowPalette: useCallback(() => setShowPalette(true), []),
    onClosePalette: useCallback(() => setShowPalette(false), []),
    onShowHelp: handleShowHelp,
    onClearInput: handleClearInput,
    onToggleFavorite: handleToggleFavorite,
    onStartComment: handleStartComment,
    onEscape: handleEscape,
    onFocusInput: useCallback(() => inputRef.current?.focus(), []),
    onApplyQuickSlot: (index) => applyQuickSlot(index),
    isPrintableKey,
  });

  function startLoginPrompt() {
    appendToBuffer("", t("login_prompt"), false, { modeLabel: "WEBSITE" });
    setInlineMode("login-prompt");
    setInlineValue("");
  }

  async function submitInlineLogin() {
    const username = inlineValue.trim() || "operator";
    try {
      const loggedInUser = await login(username);
      setInlineMode("none");
      setInlineValue("");
      appendToBuffer(username, t("status_logged_in", { user: `${loggedInUser.username}@${loggedInUser.ip}` }), true, { modeLabel: "WEBSITE" });
      setStatusMessage(t("status_logged_in", { user: `${loggedInUser.username}@${loggedInUser.ip}` }));
    } catch (error) {
      setErrorMessage(error.message);
      setInlineMode("none");
      setInlineValue("");
    }
  }

  async function submitInlineComment() {
    if (!currentCli || !user) return;

    const body = inlineValue.trim();
    if (!body) {
      setInlineMode("none");
      setInlineValue("");
      return;
    }

    try {
      await request("/api/v1/comments", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, cliSlug: currentCli.slug, body }),
      });
      await loadCliDetail(currentCli.slug);
      setInlineMode("none");
      setInlineValue("");
      appendToBuffer(body, t("status_comment_posted", { name: currentCli.command }), true, { modeLabel: currentCli.environmentKind });
      setStatusMessage(t("status_comment_posted", { name: currentCli.command }));
    } catch (error) {
      setErrorMessage(error.message);
      setInlineMode("none");
      setInlineValue("");
    }
  }

  async function openStatusPanel() {
    try {
      const payload = await request("/healthz");
      setInfoPanel({ kind: "status", payload });
    } catch (error) {
      setInfoPanel({ kind: "status", payload: { status: "error", message: error.message } });
    }
  }

  async function executeInput() {
    const trimmed = inputValue.trim();

    if (!trimmed && mode === "search-results" && selectedSearchResult) {
      selectCli(selectedSearchResult);
      return;
    }
    if (!trimmed) return;

    setBusy(true);
    setErrorMessage("");

    try {
      if (handleLocalCommand(trimmed)) {
        setInputValue("");
        commandHistory.push(trimmed);
        setBusy(false);
        return;
      }

      if (currentCli) {
        if (!currentCli.executable || currentCli.environmentKind === "TEXT") {
          appendToBuffer(trimmed, buildTextCommandOutput(currentCli), true, {
            durationMs: 0,
            modeLabel: "TEXT",
          });
          setMode("execution");
          setStatusMessage(t("status_text_loaded", { name: currentCli.command }));
          setInputValue("");
          commandHistory.push(trimmed);
          return;
        }

        const result = await request("/api/v1/exec", {
          method: "POST",
          body: JSON.stringify({
            cliSlug: currentCli.slug,
            line: trimmed,
            userId: user?.id,
            themeContext: resolvedTheme,
          }),
        });
        commandHistory.push(trimmed);
        appendToBuffer(trimmed, formatExecution(currentCli.command, trimmed, result), true, {
          durationMs: result.durationMs,
          modeLabel: "SANDBOX",
        });
        setMode("execution");
        setStatusMessage(t("status_executed", { slug: currentCli.command, ms: result.durationMs }));
        await loadCliDetail(currentCli.slug);
        await loadHomepage(homeFeed.sort || "favorites");
      } else {
        const line = buildBuiltinLine(activeBuiltinCli, trimmed);
        const response = await request("/api/v1/builtin/exec", {
          method: "POST",
          body: JSON.stringify({ line, userId: user?.id }),
        });
        commandHistory.push(trimmed);
        await applyBuiltinResponse(trimmed, response);
      }

      setInputValue("");
      commandHistory.reset();
    } catch (error) {
      setErrorMessage(error.message);
      appendToBuffer(trimmed, `${t("error_prefix")}\n\n${error.message}`, true, { modeLabel: selectedCommand.environmentKind });
      setMode("execution");
    } finally {
      setBusy(false);
    }
  }

  function handleLocalCommand(trimmed) {
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === "theme") {
      const arg = parts[1]?.toLowerCase();
      if (THEME_OPTIONS.includes(arg)) {
        handleThemeSelect(arg);
        appendToBuffer(trimmed, t("theme_switched", { theme: arg }), true, { modeLabel: "WEBSITE" });
        return true;
      }
    }

    if (cmd === "lang") {
      const arg = parts[1]?.toLowerCase();
      if (["en", "zh"].includes(arg)) {
        applyLanguage(arg, { record: true, command: trimmed });
        return true;
      }
    }

    if (cmd === "clear") {
      setHistoryBuffer([]);
      return true;
    }

    if (cmd === "login" && parts.length === 1) {
      startLoginPrompt();
      return true;
    }

    return false;
  }

  async function applyBuiltinResponse(originalInput, response) {
    if (response.action === "logout") {
      await ensureAnonymousSession();
      setStatusMessage(t("status_search_done"));
    } else {
      setStatusMessage(response.message || t("status_builtin_executed"));
    }
    setHints((response.hints ?? []).slice(0, 3));

    if (response.sessionState === "home") {
      setMode("home");
      setCurrentCli(null);
      setActiveBuiltinCli(DEFAULT_WEBSITE_COMMAND);
      setDetail(null);
      setSearchResults([]);
      setSelectedResultIndex(0);
      appendToBuffer(originalInput, getMotd(), true, { modeLabel: "WEBSITE" });
      await loadHomepage(homeFeed.sort || "favorites");
      return;
    }

    if (response.sessionState === "search-results") {
      setMode("search-results");
      setCurrentCli(null);
      setActiveBuiltinCli(DEFAULT_WEBSITE_COMMAND);
      setDetail(null);
      setSearchResults((response.searchResults ?? []).map((cli) => normalizeCliView(cli)));
      setSelectedResultIndex(0);
      appendToBuffer(originalInput, response.message || t("search_complete"), true, { modeLabel: "WEBSITE" });
      return;
    }

    setMode("execution");
    setCurrentCli(null);
    appendToBuffer(originalInput, formatBuiltinExecution(response), true, {
      durationMs: response.execution?.durationMs ?? 0,
      modeLabel: "WEBSITE",
    });
  }

  function selectCli(rawCli) {
    const cli = normalizeCliView(rawCli);
    setSelectedResultIndex(0);

    if (cli.environmentKind === "WEBSITE") {
      const nextBuiltin = { ...cli, promptCommands: resolveBuiltinShortcuts(cli.slug) };
      setActiveBuiltinCli(nextBuiltin);
      setCurrentCli(null);
      setMode("execution");
      setDetail(null);
      setInputValue("");
      setHints(nextBuiltin.promptCommands);
      setStatusMessage(t("status_builtin_selected"));
      appendToBuffer("", [cli.description, "", cli.helpText].join("\n"), false, { modeLabel: "WEBSITE" });
      return;
    }

    setCurrentCli(cli);
    setMode("execution");
    setDetail(null);
    setInputValue("");
    setHints(resolveShortcutCommands(cli, null, []));
    setStatusMessage(t("status_cli_selected", { name: cli.command }));
    appendToBuffer("", [t("selected_cli", { name: cli.command }), "", cli.description].join("\n"), false, {
      modeLabel: cli.environmentKind,
    });
    void loadCliDetail(cli.slug);
  }

  function applyQuickSlot(index) {
    const nextValue = shortcutCommands[index];
    if (nextValue) {
      setInputValue(nextValue);
    }
  }

  function handleTabComplete() {
    if (shortcutCommands.length > 0) {
      setInputValue(shortcutCommands[0]);
      return;
    }

    if (mode === "search-results" && selectedSearchResult) {
      setInputValue(selectedSearchResult.exampleLine || "");
      return;
    }

    const partial = inputValue.trim().toLowerCase();
    if (partial) {
      const matches = TAB_COMPLETIONS.filter((completion) => completion.startsWith(partial));
      if (matches.length === 1) {
        setInputValue(`${matches[0]} `);
      }
    }
  }

  function onInputKeyDown(event) {
    if (event.altKey && ["1", "2", "3"].includes(event.key)) {
      event.preventDefault();
      applyQuickSlot(parseInt(event.key, 10) - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void executeInput();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (mode === "search-results" && inputValue.trim() === "" && searchResults.length > 0) {
        setSelectedResultIndex((index) => Math.max(index - 1, 0));
        return;
      }
      const value = commandHistory.cycle(1);
      if (value !== null) setInputValue(value);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (mode === "search-results" && inputValue.trim() === "" && searchResults.length > 0) {
        setSelectedResultIndex((index) => Math.min(index + 1, searchResults.length - 1));
        return;
      }
      const value = commandHistory.cycle(-1);
      if (value !== null) setInputValue(value);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      handleTabComplete();
      return;
    }
  }

  function onInlineKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (inlineMode === "login-prompt") {
        void submitInlineLogin();
      } else if (inlineMode === "comment-prompt") {
        void submitInlineComment();
      }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setInlineMode("none");
      setInlineValue("");
    }
  }

  function onPaletteExecute(cmd) {
    setInputValue(cmd);
    setTimeout(() => {
      const handled = handleLocalCommand(cmd);
      if (handled) {
        commandHistory.push(cmd);
        setInputValue("");
      }
    }, 0);
  }

  function renderPromptArea() {
    if (inlineMode === "login-prompt" || inlineMode === "comment-prompt") {
      return (
        <div className="inline-prompt-line">
          <span className="inline-prompt-label">
            {inlineMode === "login-prompt" ? t("login_username_prompt") : t("comment_input_prompt")}:
          </span>
          <input
            ref={inlineRef}
            className="inline-prompt-input"
            value={inlineValue}
            onChange={(event) => setInlineValue(event.target.value)}
            onKeyDown={onInlineKeyDown}
            placeholder={inlineMode === "login-prompt" ? "operator" : "This CLI feels sharp for log triage."}
            spellCheck="false"
            autoComplete="off"
          />
        </div>
      );
    }

    return (
      <PromptLine
        ref={inputRef}
        activeUser={activeUser}
        commandPrefix={selectedCommand.command}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onKeyDown={onInputKeyDown}
        currentModeTheme={currentModeTheme}
        placeholder={selectedCommand.environmentKind === "WEBSITE" ? t("placeholder_search") : t("placeholder_args")}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <header className="site-header">
        <div className="site-brand">
          <span className="brand-title">{typedBrand || "CLI GREP"}</span>
          <span className="brand-caret" aria-hidden="true">_</span>
        </div>

        <div className="site-flat-actions">
          <button type="button" className="flat-action-button" onClick={() => void resetToHome()}>{t("header_search")}</button>
          <button type="button" className="flat-action-button" onClick={() => void openStatusPanel()}>{t("header_status")}</button>
          <button type="button" className="flat-action-button" onClick={() => setInfoPanel({ kind: "docs" })}>{t("header_docs")}</button>
        </div>

        <div className="site-bracket-actions">
          <button type="button" className="bracket-action-button" onClick={() => handleThemeSelect(THEME_OPTIONS[(THEME_OPTIONS.indexOf(theme) + 1) % THEME_OPTIONS.length])}>
            [{resolvedTheme === "dark" ? "moon" : "sun"}]
          </button>
          <button type="button" className="bracket-action-button" onClick={() => applyLanguage(i18n.language === "en" ? "zh" : "en")}>
            [{i18n.language.toUpperCase()}]
          </button>
          <button type="button" className="bracket-action-button accent" onClick={() => (isAnonymous ? startLoginPrompt() : void handleHeaderLogout())}>
            [$ {isAnonymous ? t("session_action_login") : activeUser.username}]
          </button>
        </div>
      </header>

      <main className="main-grid stacked-grid">
        <TerminalWindow
          className="command-console-window"
          title={commandIdentity(selectedCommand)}
          badge={selectedCommand.environmentKind}
          badgeTheme={currentModeTheme}
        >
          <div className="terminal-body command-console-body">
            <div className="console-input-row">{renderPromptArea()}</div>

            <div className="console-shortcuts-row">
              <div className="console-shortcuts-list">
                {shortcutCommands.slice(0, 3).map((hint, index) => (
                  <button key={hint} type="button" className="console-shortcut-chip" onClick={() => applyQuickSlot(index)}>
                    ALT+{index + 1} {hint}
                  </button>
                ))}
              </div>
              <span className="console-escape-hint">ESC {t("hint_esc_search")}</span>
            </div>

            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

            <OutputPanel
              currentEntry={currentOutputEntry}
              historyEntries={historyEntries}
              activeUser={activeUser}
              historyExpanded={historyExpanded}
              onToggleHistory={() => setHistoryExpanded((expanded) => !expanded)}
              emptyLabel={t("output_empty")}
              historyLabel={t("history_label", { count: historyEntries.length })}
              durationLabel={outputDurationLabel}
              modeLabel={outputModeLabel}
            />
          </div>
        </TerminalWindow>

        {mode === "home" ? (
          <TrendingGrid
            feed={homeFeed}
            onSelectCli={selectCli}
            onSortChange={(sort) => void loadHomepage(sort)}
          />
        ) : null}

        {mode === "search-results" ? (
          <ResultsPanel
            searchResults={searchResults}
            selectedResultIndex={selectedResultIndex}
            onSelectCli={selectCli}
          />
        ) : null}

        {showDetailPanels ? (
          <section className="detail-stack">
            <DetailPanel
              detail={detail}
              onToggleFavorite={handleToggleFavorite}
              isFavoriteActive={isFavoriteActive}
              onComment={handleStartComment}
              onFillHelp={() => setInputValue("--help")}
              onFillExample={(example) => setInputValue(example)}
            />
            <CommentsPanel comments={detail?.comments ?? []} onComment={handleStartComment} />
          </section>
        ) : null}
      </main>

      {showPalette ? (
        <CommandPalette onClose={() => setShowPalette(false)} onExecute={onPaletteExecute} />
      ) : null}

      {infoPanel?.kind === "docs" ? (
        <InfoOverlay title={t("header_docs")} onClose={() => setInfoPanel(null)}>
          <div className="info-copy">
            <p>{t("docs_intro")}</p>
            <p>{t("docs_runtime")}</p>
            <p>{t("docs_text")}</p>
          </div>
        </InfoOverlay>
      ) : null}

      {infoPanel?.kind === "status" ? (
        <InfoOverlay title={t("header_status")} onClose={() => setInfoPanel(null)}>
          <div className="status-grid">
            {Object.entries(infoPanel.payload).map(([key, value]) => (
              <div key={key} className="status-grid-item">
                <span>{key}</span>
                <strong>{Array.isArray(value) ? value.join(", ") : String(value)}</strong>
              </div>
            ))}
          </div>
        </InfoOverlay>
      ) : null}
    </div>
  );
}

function resolveBuiltinShortcuts(slug) {
  return BUILTIN_SHORTCUTS[slug] ?? DEFAULT_WEBSITE_COMMAND.promptCommands;
}

function resolveShortcutCommands(selectedCommand, detail, hints) {
  if (detail?.examples?.length) {
    return detail.examples.slice(0, 3);
  }

  if (selectedCommand.environmentKind === "WEBSITE") {
    return resolveBuiltinShortcuts(selectedCommand.slug);
  }

  if (selectedCommand.exampleLine) {
    return [selectedCommand.exampleLine, "--help", "--version"].filter(Boolean).slice(0, 3);
  }

  return (hints ?? []).slice(0, 3);
}

function buildTextCommandOutput(cli) {
  const sections = [
    cli.helpText || cli.description,
    "",
    `environment: ${cli.environmentKind}`,
    `source: ${cli.sourceType}`,
    `executable: false`,
  ];
  return sections.join("\n");
}

export default App;
