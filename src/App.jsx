import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { request } from "./lib/api.js";
import { TAB_COMPLETIONS, MAX_HISTORY_BUFFER } from "./lib/constants.js";
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

const THEME_OPTIONS = ["system", "dark", "light"];

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
  const [inlineMode, setInlineMode] = useState("none");
  const [inlineValue, setInlineValue] = useState("");
  const [historyBuffer, setHistoryBuffer] = useState([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const inputRef = useRef(null);
  const inlineRef = useRef(null);

  const selectedSearchResult = searchResults[selectedResultIndex] ?? null;
  const isFavoriteActive = currentCli ? isFavorite(currentCli.slug) : false;
  const currentModeTheme = currentCli ? "cli" : "builtin";
  const isWorkbenchMode = mode !== "home";
  const currentOutputEntry = useMemo(
    () => (historyBuffer.length > 0 ? historyBuffer[historyBuffer.length - 1] : null),
    [historyBuffer],
  );
  const historyEntries = useMemo(
    () => (historyBuffer.length > 1 ? historyBuffer.slice(0, -1).reverse() : []),
    [historyBuffer],
  );

  const shellMeta = useMemo(() => {
    if (currentCli) {
      return { badge: "sandbox", title: `sandbox: ${currentCli.displayName}` };
    }
    if (mode === "search-results") {
      return { badge: "results", title: t("workbench_search_title") };
    }
    return { badge: "builtin", title: t("workbench_builtin_title") };
  }, [currentCli, mode, t]);

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

  function appendToBuffer(command, output, showPrompt = true) {
    setHistoryExpanded(false);
    setHistoryBuffer((buf) => {
      const next = [...buf, { prompt: showPrompt, command, output }];
      if (next.length > MAX_HISTORY_BUFFER) {
        return next.slice(next.length - MAX_HISTORY_BUFFER);
      }
      return next;
    });
  }

  useEffect(() => {
    setHistoryBuffer([{ prompt: false, command: "", output: getMotd() }]);
    setStatusMessage(t("status_ready"));
    setHints([t("hint_tab"), t("hint_esc")]);
    void loadTrending();
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
  }, [inlineMode, currentCli, mode]);

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
  }, [inlineMode, mode, searchResults.length, t]);

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
    setMode("execution");
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
  }, [currentCli, isAnonymous, toggleFavorite, t, user]);

  const handleStartComment = useCallback(() => {
    if (!currentCli) return;
    if (isAnonymous || !user?.id) {
      startLoginPrompt();
      return;
    }

    appendToBuffer("", t("comment_prompt", { name: currentCli.displayName }));
    setInlineMode("comment-prompt");
    setInlineValue("");
  }, [currentCli, isAnonymous, t, user]);

  const handleThemeSelect = useCallback((nextTheme) => {
    setTheme(nextTheme);
    setStatusMessage(t("theme_switched", { theme: nextTheme }));
  }, [setTheme, t]);

  const handleDisplayMenuChange = useCallback((event) => {
    const value = event.target.value;
    if (!value) return;

    if (value.startsWith("theme:")) {
      handleThemeSelect(value.slice("theme:".length));
    }

    if (value.startsWith("lang:")) {
      const nextLang = value.slice("lang:".length);
      i18n.changeLanguage(nextLang);
      localStorage.setItem("cligrep-lang", nextLang);
      setStatusMessage(nextLang === "zh" ? "语言已切换为中文。" : "Language switched to English.");
    }

    event.target.value = "";
  }, [handleThemeSelect, i18n]);

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

  const handleSessionMenuChange = useCallback((event) => {
    const value = event.target.value;
    if (!value) return;

    if (value === "login") {
      startLoginPrompt();
    }

    if (value === "logout") {
      void handleHeaderLogout();
    }

    event.target.value = "";
  }, [handleHeaderLogout]);

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

  function startLoginPrompt() {
    appendToBuffer("", t("login_prompt"));
    setInlineMode("login-prompt");
    setInlineValue("");
  }

  async function submitInlineLogin() {
    const username = inlineValue.trim() || "operator";
    try {
      const loggedInUser = await login(username);
      setInlineMode("none");
      setInlineValue("");
      appendToBuffer(username, t("status_logged_in", { user: `${loggedInUser.username}@${loggedInUser.ip}` }));
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
        appendToBuffer(trimmed, formatExecution(currentCli.slug, trimmed, result));
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

  function handleLocalCommand(trimmed) {
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === "theme") {
      const arg = parts[1]?.toLowerCase();
      if (THEME_OPTIONS.includes(arg)) {
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

    const partial = inputValue.trim().toLowerCase();
    if (partial) {
      const matches = TAB_COMPLETIONS.filter((completion) => completion.startsWith(partial));
      if (matches.length === 1) {
        setInputValue(`${matches[0]} `);
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

    if (
      mode === "search-results" &&
      inputValue === "" &&
      event.key >= "1" &&
      event.key <= "9" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const index = parseInt(event.key, 10) - 1;
      if (index < searchResults.length) {
        event.preventDefault();
        selectCli(searchResults[index]);
      }
    }
  }

  function onPaletteExecute(cmd) {
    setInputValue(cmd);
    setTimeout(() => {
      const handled = handleLocalCommand(cmd);
      if (handled) {
        commandHistory.push(cmd);
        setInputValue("");
      } else {
        setInputValue(cmd);
      }
    }, 0);
  }

  function renderPromptArea() {
    if (inlineMode === "login-prompt") {
      return (
        <div className="inline-prompt-line">
          <span className="inline-prompt-label">{t("login_username_prompt")}:</span>
          <input
            ref={inlineRef}
            className="inline-prompt-input"
            value={inlineValue}
            onChange={(event) => setInlineValue(event.target.value)}
            onKeyDown={onInlineKeyDown}
            placeholder="operator"
            spellCheck="false"
            autoComplete="off"
          />
        </div>
      );
    }

    if (inlineMode === "comment-prompt") {
      return (
        <div className="inline-prompt-line">
          <span className="inline-prompt-label">{t("comment_input_prompt")}:</span>
          <input
            ref={inlineRef}
            className="inline-prompt-input"
            value={inlineValue}
            onChange={(event) => setInlineValue(event.target.value)}
            onKeyDown={onInlineKeyDown}
            placeholder="This CLI feels sharp for log triage."
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
        currentCli={currentCli}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onKeyDown={onInputKeyDown}
        currentModeTheme={currentModeTheme}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <header className="topbar-shell">
        <div className="brand-lockup">
          <span className="brand-title">cli grep</span>
        </div>

        <div className="corner-controls">
          <label className="corner-select-wrap">
            <span>{t("display_menu_label")}</span>
            <select defaultValue="" onChange={handleDisplayMenuChange} className="corner-select">
              <option value="" disabled>{t("display_menu_default")}</option>
              <optgroup label={t("display_menu_theme_group")}>
                {THEME_OPTIONS.map((option) => (
                  <option key={option} value={`theme:${option}`}>
                    {t(`theme_option_${option}`)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t("display_menu_lang_group")}>
                <option value="lang:en">{t("lang_option_en")}</option>
                <option value="lang:zh">{t("lang_option_zh")}</option>
              </optgroup>
            </select>
          </label>

          <label className="corner-select-wrap">
            <span>{isAnonymous ? t("session_menu_guest") : activeUser.username}</span>
            <select defaultValue="" onChange={handleSessionMenuChange} className="corner-select">
              <option value="" disabled>{t("session_menu_default")}</option>
              {isAnonymous ? (
                <option value="login">{t("session_action_login")}</option>
              ) : (
                <option value="logout">{t("session_action_logout")}</option>
              )}
            </select>
          </label>
        </div>
      </header>

      <main className="main-grid">
        {mode === "home" ? (
          <>
            <TerminalWindow
              className="home-terminal-window"
              title={t("home_terminal_title")}
              badge="bash"
              badgeTheme="builtin"
            >
              <div className="terminal-body home-terminal-body">
                <div className="status-strip">
                  <span>{statusMessage}</span>
                  <span>{busy ? t("status_executing") : t("status_ready_short")}</span>
                </div>

                <div className="home-prompt-wrap">{renderPromptArea()}</div>

                {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
              </div>
            </TerminalWindow>

            <TrendingGrid trending={trending} onSelectCli={selectCli} />
          </>
        ) : (
          <section className="workbench-stage">
            <TerminalWindow
              className="workbench-terminal-window"
              title={shellMeta.title}
              badge={shellMeta.badge}
              badgeTheme={currentModeTheme}
            >
              <div className="terminal-body">
                <div className="status-strip">
                  <span>{statusMessage}</span>
                  <span>{busy ? t("status_executing") : t("status_ready_short")}</span>
                </div>

                <div className="workbench-prompt-wrap">{renderPromptArea()}</div>

                {hints.length > 0 ? (
                  <div className="hint-row">
                    {hints.map((hint) => (
                      <span key={hint}>{hint}</span>
                    ))}
                  </div>
                ) : null}

                {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

                {mode === "search-results" ? (
                  <ResultsPanel
                    searchResults={searchResults}
                    selectedResultIndex={selectedResultIndex}
                    onSelectCli={selectCli}
                  />
                ) : (
                  <OutputPanel
                    currentEntry={currentOutputEntry}
                    historyEntries={historyEntries}
                    activeUser={activeUser}
                    historyExpanded={historyExpanded}
                    onToggleHistory={() => setHistoryExpanded((expanded) => !expanded)}
                    emptyLabel={t("output_empty")}
                    historyLabel={t("history_label", { count: historyEntries.length })}
                  />
                )}
              </div>
            </TerminalWindow>

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
          </section>
        )}
      </main>

      <StatusBar
        theme={theme}
        resolvedTheme={resolvedTheme}
        mode={isWorkbenchMode ? mode : "home"}
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
