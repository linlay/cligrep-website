import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "./lib/api.js";
import { BUILTIN_PREFIXES, TAB_COMPLETIONS, MAX_HISTORY_BUFFER } from "./lib/constants.js";
import { normalizeBuiltinLine, formatExecution, formatBuiltinExecution, exampleTail, isPrintableKey } from "./lib/commands.js";
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
import StatusBar from "./components/StatusBar.jsx";
import CommandPalette from "./components/CommandPalette.jsx";

function App() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme, cycleTheme } = useTheme();
  const { user, activeUser, isAnonymous, ensureAnonymousSession, login, logout } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const commandHistory = useCommandHistory();

  const [mode, setMode] = useState("home");
  const [inputValue, setInputValue] = useState("");
  const [trending, setTrending] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [currentCli, setCurrentCli] = useState(null);
  const [detail, setDetail] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [hints, setHints] = useState([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPalette, setShowPalette] = useState(false);

  // Inline prompt mode: "none" | "login-prompt" | "comment-prompt"
  const [inlineMode, setInlineMode] = useState("none");
  const [inlineValue, setInlineValue] = useState("");

  // History buffer: array of { prompt: bool, command: string, output: string }
  const [historyBuffer, setHistoryBuffer] = useState([]);

  const inputRef = useRef(null);
  const inlineRef = useRef(null);

  const selectedSearchResult = searchResults[selectedResultIndex] ?? null;
  const isFavoriteActive = currentCli ? isFavorite(currentCli.slug) : false;
  const currentModeTheme = currentCli ? "cli" : "builtin";

  const shellMeta = useMemo(() => {
    if (currentCli) {
      return { badge: "sandbox", title: `sandbox: ${currentCli.displayName}` };
    }
    return { badge: "buildin", title: "buildin search mode" };
  }, [currentCli]);

  // Generate MOTD
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

  // Append to history buffer
  function appendToBuffer(command, output, showPrompt = true) {
    setHistoryBuffer((buf) => {
      const next = [...buf, { prompt: showPrompt, command, output }];
      if (next.length > MAX_HISTORY_BUFFER) {
        return next.slice(next.length - MAX_HISTORY_BUFFER);
      }
      return next;
    });
  }

  // Init
  useEffect(() => {
    setHistoryBuffer([{ prompt: false, command: "", output: getMotd() }]);
    setStatusMessage(t("status_ready"));
    setHints([t("hint_tab"), t("hint_esc")]);
    void loadTrending();
    if (!user) {
      void ensureAnonymousSession();
    }
  }, []);

  // Focus management
  useEffect(() => {
    if (inlineMode !== "none") {
      requestAnimationFrame(() => inlineRef.current?.focus());
    } else {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [inlineMode, currentCli, mode]);

  // Keyboard shortcuts
  const handleEscape = useCallback(() => {
    if (inlineMode !== "none") {
      setInlineMode("none");
      setInlineValue("");
      appendToBuffer("", "(cancelled)");
      return;
    }
    if (mode === "execution") {
      if (searchResults.length > 0) {
        setMode("search-results");
        setStatusMessage(t("status_search_ready"));
      } else {
        setMode("home");
        setStatusMessage(t("status_ready"));
      }
      setCurrentCli(null);
      setDetail(null);
      setInputValue("");
      return;
    }
    if (mode === "search-results") {
      setMode("home");
      setSearchResults([]);
      setSelectedResultIndex(0);
      setInputValue("");
      setStatusMessage(t("status_ready"));
    }
  }, [mode, searchResults.length, inlineMode, t]);

  const handleShowHelp = useCallback(() => {
    const helpText = [
      t("help_shortcuts"),
      t("help_shortcut_enter"),
      t("help_shortcut_esc"),
      t("help_shortcut_updown"),
      t("help_shortcut_tab"),
      t("help_shortcut_ctrlk"),
      t("help_shortcut_ctrlt"),
      t("help_shortcut_ctrlj"),
      t("help_shortcut_ctrll"),
      t("help_shortcut_ctrlh"),
      t("help_shortcut_ctrlu"),
      t("help_shortcut_ctrlf"),
      t("help_shortcut_ctrlslash"),
    ].join("\n");
    appendToBuffer("shortcuts", helpText);
  }, [t]);

  const handleToggleLanguage = useCallback(() => {
    const nextLang = i18n.language === "en" ? "zh" : "en";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("cligrep-lang", nextLang);
    appendToBuffer(`lang ${nextLang}`, nextLang === "zh" ? "语言已切换为中文。" : "Language switched to English.");
    setStatusMessage(nextLang === "zh" ? "语言已切换为中文。" : "Language switched to English.");
  }, [i18n]);

  const handleClearTerminal = useCallback(() => {
    setHistoryBuffer([]);
  }, []);

  const handleClearInput = useCallback(() => {
    setInputValue("");
  }, []);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentCli) return;
    if (isAnonymous || !user?.id) {
      startLoginPrompt();
      return;
    }
    try {
      const nextActive = await toggleFavorite(currentCli.slug, user.id);
      await loadCliDetail(currentCli.slug);
      setStatusMessage(
        nextActive
          ? t("status_favorited", { name: currentCli.displayName })
          : t("status_unfavorited", { name: currentCli.displayName }),
      );
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, [currentCli, isAnonymous, user, toggleFavorite, t]);

  const handleStartComment = useCallback(() => {
    if (!currentCli) return;
    if (isAnonymous || !user?.id) {
      startLoginPrompt();
      return;
    }
    appendToBuffer("", t("comment_prompt", { name: currentCli.displayName }));
    setInlineMode("comment-prompt");
    setInlineValue("");
  }, [currentCli, isAnonymous, user, t]);

  useKeyboardShortcuts({
    mode,
    inputRef,
    currentCli,
    isAnonymous,
    showPalette,
    inlineMode: inlineMode !== "none",
    onCycleTheme: cycleTheme,
    onClearTerminal: handleClearTerminal,
    onToggleLanguage: handleToggleLanguage,
    onShowPalette: useCallback(() => setShowPalette(true), []),
    onClosePalette: useCallback(() => setShowPalette(false), []),
    onShowHelp: handleShowHelp,
    onClearInput: handleClearInput,
    onToggleFavorite: handleToggleFavorite,
    onStartComment: handleStartComment,
    onEscape: handleEscape,
    onFocusInput: useCallback(() => inputRef.current?.focus(), []),
    isPrintableKey,
  });

  async function loadTrending() {
    try {
      const data = await request("/api/v1/clis/trending");
      setTrending(data.items ?? []);
    } catch (error) {
      setErrorMessage(error.message);
      appendToBuffer("", `${t("backend_unavailable")}\n\n${error.message}`);
    }
  }

  async function loadCliDetail(cliSlug) {
    try {
      const payload = await request(`/api/v1/clis/${cliSlug}`);
      setDetail(payload);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  // Inline prompt handlers
  function startLoginPrompt() {
    appendToBuffer("", t("login_prompt"));
    setInlineMode("login-prompt");
    setInlineValue("");
  }

  async function submitInlineLogin() {
    const username = inlineValue.trim() || "operator";
    try {
      const u = await login(username);
      setInlineMode("none");
      setInlineValue("");
      appendToBuffer(username, t("status_logged_in", { user: `${u.username}@${u.ip}` }));
      setStatusMessage(t("status_logged_in", { user: `${u.username}@${u.ip}` }));
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
      appendToBuffer(body, t("status_comment_posted", { name: currentCli.displayName }));
      setStatusMessage(t("status_comment_posted", { name: currentCli.displayName }));
    } catch (error) {
      setErrorMessage(error.message);
      setInlineMode("none");
      setInlineValue("");
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
      appendToBuffer("", "(cancelled)");
    }
  }

  // Command execution
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
      // Handle local commands first
      if (handleLocalCommand(trimmed)) {
        setInputValue("");
        commandHistory.push(trimmed);
        setBusy(false);
        return;
      }

      if (currentCli) {
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
        const output = formatExecution(currentCli.slug, trimmed, result);
        appendToBuffer(trimmed, output);
        setMode("execution");
        setStatusMessage(t("status_executed", { slug: currentCli.slug, ms: result.durationMs }));
        setHints([t("hint_esc_search"), t("hint_busybox")]);
        await loadCliDetail(currentCli.slug);
      } else {
        const line = normalizeBuiltinLine(trimmed);
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
      appendToBuffer(trimmed, `${t("error_prefix")}\n\n${error.message}`);
      setMode("execution");
    } finally {
      setBusy(false);
    }
  }

  // Handle commands that are processed locally (theme, lang, clear)
  function handleLocalCommand(trimmed) {
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === "theme") {
      const arg = parts[1]?.toLowerCase();
      if (["dark", "light", "system"].includes(arg)) {
        setTheme(arg);
        appendToBuffer(trimmed, t("theme_switched", { theme: arg }));
        setStatusMessage(t("theme_switched", { theme: arg }));
        return true;
      }
    }

    if (cmd === "lang") {
      const arg = parts[1]?.toLowerCase();
      if (["en", "zh"].includes(arg)) {
        i18n.changeLanguage(arg);
        localStorage.setItem("cligrep-lang", arg);
        const msg = arg === "zh" ? "语言已切换为中文。" : "Language switched to English.";
        appendToBuffer(trimmed, msg);
        setStatusMessage(msg);
        return true;
      }
    }

    if (cmd === "clear") {
      setHistoryBuffer([]);
      return true;
    }

    if (cmd === "login" && parts.length === 1) {
      appendToBuffer(trimmed, t("login_prompt"));
      setInlineMode("login-prompt");
      setInlineValue("");
      return true;
    }

    return false;
  }

  async function applyBuiltinResponse(originalInput, response) {
    if (response.user) {
      // user state handled by auth hook indirectly via login/logout
    }

    if (response.action === "logout") {
      await ensureAnonymousSession();
      setStatusMessage(t("status_search_done"));
    } else {
      setStatusMessage(response.message || t("status_builtin_executed"));
    }
    setHints(response.hints ?? []);

    if (response.sessionState === "home") {
      setMode("home");
      setCurrentCli(null);
      setDetail(null);
      setSearchResults([]);
      setSelectedResultIndex(0);
      appendToBuffer(originalInput, getMotd());
      await loadTrending();
      return;
    }

    if (response.sessionState === "search-results") {
      setMode("search-results");
      setCurrentCli(null);
      setDetail(null);
      setSearchResults(response.searchResults ?? []);
      setSelectedResultIndex(0);
      appendToBuffer(originalInput, response.message || "Search complete.");
      return;
    }

    setMode("execution");
    setCurrentCli(null);
    setDetail(null);
    setSelectedResultIndex(0);
    appendToBuffer(originalInput, formatBuiltinExecution(response));
  }

  function selectCli(cli) {
    if (cli.type === "builtin") {
      setCurrentCli(null);
      setMode("execution");
      setDetail(null);
      setSelectedResultIndex(0);
      setStatusMessage(t("status_builtin_selected"));
      setHints([t("hint_help"), t("hint_try", { example: cli.exampleLine })]);
      appendToBuffer(cli.displayName, [cli.displayName, "", cli.summary, "", cli.helpText].join("\n"));
      setInputValue(cli.exampleLine || "");
      return;
    }

    setCurrentCli(cli);
    setMode("execution");
    setDetail(null);
    setSelectedResultIndex(0);
    setInputValue("");
    setStatusMessage(t("status_cli_selected", { name: cli.displayName }));
    setHints([t("hint_args"), t("hint_esc_search")]);
    appendToBuffer("", [
      t("selected_cli", { name: cli.displayName }),
      "",
      cli.summary,
      "",
      t("try_example", { example: exampleTail(cli.exampleLine, cli.slug) || "--help" }),
    ].join("\n"));
    void loadCliDetail(cli.slug);
  }

  // Tab completion
  function handleTabComplete() {
    if (mode === "search-results" && selectedSearchResult) {
      setInputValue(
        selectedSearchResult.type === "builtin"
          ? selectedSearchResult.exampleLine || selectedSearchResult.slug
          : exampleTail(selectedSearchResult.exampleLine, selectedSearchResult.slug) || selectedSearchResult.slug,
      );
      return;
    }
    if (currentCli && inputValue.trim() === "") {
      setInputValue("--help");
      return;
    }
    // Partial command completion
    const partial = inputValue.trim().toLowerCase();
    if (partial) {
      const matches = TAB_COMPLETIONS.filter((c) => c.startsWith(partial));
      if (matches.length === 1) {
        setInputValue(matches[0] + " ");
      } else if (matches.length > 1) {
        appendToBuffer("", matches.join("  "));
      }
    }
  }

  function onInputKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      void executeInput();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (mode === "search-results" && inputValue.trim() === "" && searchResults.length > 0) {
        setSelectedResultIndex((i) => Math.max(i - 1, 0));
        return;
      }
      const val = commandHistory.cycle(1);
      if (val !== null) setInputValue(val);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (mode === "search-results" && inputValue.trim() === "" && searchResults.length > 0) {
        setSelectedResultIndex((i) => Math.min(i + 1, searchResults.length - 1));
        return;
      }
      const val = commandHistory.cycle(-1);
      if (val !== null) setInputValue(val);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      handleTabComplete();
      return;
    }
    // Number quick select
    if (
      mode === "search-results" &&
      inputValue === "" &&
      event.key >= "1" && event.key <= "9" &&
      !event.ctrlKey && !event.metaKey && !event.altKey
    ) {
      const idx = parseInt(event.key) - 1;
      if (idx < searchResults.length) {
        event.preventDefault();
        selectCli(searchResults[idx]);
      }
    }
  }

  // Command palette execute
  function onPaletteExecute(cmd) {
    setInputValue(cmd);
    // Execute after next render
    setTimeout(() => {
      const parts = cmd.split(/\s+/);
      const handled = handleLocalCommand(cmd);
      if (handled) {
        commandHistory.push(cmd);
        setInputValue("");
      } else {
        // Let it be typed in and user can press enter, or auto-execute
        setInputValue(cmd);
      }
    }, 0);
  }

  return (
    <div className="app-shell">
      <main className="main-grid">
        <TerminalWindow
          title={shellMeta.title}
          badge={shellMeta.badge}
          badgeTheme={currentModeTheme}
        >
          <div className="terminal-body">
            <div className="status-strip">
              <span>{statusMessage}</span>
              <span>{busy ? t("status_executing") : t("status_ready_short")}</span>
            </div>

            <div className="hint-row">
              {hints.map((hint) => (
                <span key={hint}>{hint}</span>
              ))}
            </div>

            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

            {/* Scrolling history buffer */}
            <OutputPanel historyBuffer={historyBuffer} activeUser={activeUser} />

            {/* Search results overlay */}
            {mode === "search-results" ? (
              <ResultsPanel
                searchResults={searchResults}
                selectedResultIndex={selectedResultIndex}
                onSelectCli={selectCli}
              />
            ) : null}

            {/* Inline prompt or normal prompt */}
            {inlineMode === "login-prompt" ? (
              <div className="inline-prompt-line">
                <span className="inline-prompt-label">{t("login_username_prompt")}:</span>
                <input
                  ref={inlineRef}
                  className="inline-prompt-input"
                  value={inlineValue}
                  onChange={(e) => setInlineValue(e.target.value)}
                  onKeyDown={onInlineKeyDown}
                  placeholder="operator"
                  spellCheck="false"
                  autoComplete="off"
                />
              </div>
            ) : inlineMode === "comment-prompt" ? (
              <div className="inline-prompt-line">
                <span className="inline-prompt-label">{t("comment_input_prompt")}:</span>
                <input
                  ref={inlineRef}
                  className="inline-prompt-input"
                  value={inlineValue}
                  onChange={(e) => setInlineValue(e.target.value)}
                  onKeyDown={onInlineKeyDown}
                  placeholder="This CLI feels sharp for log triage."
                  spellCheck="false"
                  autoComplete="off"
                />
              </div>
            ) : (
              <PromptLine
                ref={inputRef}
                activeUser={activeUser}
                currentCli={currentCli}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onKeyDown={onInputKeyDown}
                currentModeTheme={currentModeTheme}
              />
            )}
          </div>
        </TerminalWindow>

        {mode === "home" ? (
          <TrendingGrid trending={trending} onSelectCli={selectCli} />
        ) : null}

        {currentCli && detail?.cli ? (
          <DetailPanel
            detail={detail}
            currentCli={currentCli}
            isFavoriteActive={isFavoriteActive}
            onToggleFavorite={handleToggleFavorite}
            onComment={handleStartComment}
            onFillHelp={() => setInputValue("--help")}
            onFillExample={(example) => setInputValue(example)}
          />
        ) : null}
      </main>

      <StatusBar
        theme={theme}
        resolvedTheme={resolvedTheme}
        mode={mode}
        busy={busy}
        lang={i18n.language}
      />

      {showPalette ? (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          onExecute={onPaletteExecute}
        />
      ) : null}
    </div>
  );
}

export default App;
