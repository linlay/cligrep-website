import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
const BUILTIN_PREFIXES = ["grep", "help", "clear", "login", "logout", "create", "make"];
const THEME_OPTIONS = ["system", "dark", "light"];
const ANONYMOUS_FALLBACK = { username: "anonymous", ip: "0.0.0.0" };

const INITIAL_OUTPUT = [
  "CLI Grep v1 booted.",
  "",
  "Type plain text to search the registry.",
  "Type help for built-in commands.",
  "Press Esc to back out of results or execution.",
].join("\n");

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("cligrep-theme") || "system");
  const [resolvedTheme, setResolvedTheme] = useState("dark");
  const [mode, setMode] = useState("home");
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [trending, setTrending] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [currentCli, setCurrentCli] = useState(null);
  const [detail, setDetail] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState(INITIAL_OUTPUT);
  const [statusMessage, setStatusMessage] = useState("Press Enter to grep the registry.");
  const [hints, setHints] = useState(["Tab accepts the highlighted suggestion.", "Esc returns to the homepage."]);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("cligrep-user");
    return raw ? JSON.parse(raw) : null;
  });
  const [favoriteState, setFavoriteState] = useState(() => {
    const raw = localStorage.getItem("cligrep-favorites");
    return raw ? JSON.parse(raw) : {};
  });
  const [showLogin, setShowLogin] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const inputRef = useRef(null);
  const loginRef = useRef(null);
  const commentRef = useRef(null);

  const activeUser = user ?? ANONYMOUS_FALLBACK;
  const isAnonymous = activeUser.username === "anonymous";
  const promptCommand = `${activeUser.username}@${activeUser.ip}:~$`;
  const selectedSearchResult = searchResults[selectedResultIndex] ?? null;
  const currentComments = detail?.comments ?? [];
  const favoriteCount = detail?.cli?.favoriteCount ?? currentCli?.favoriteCount ?? 0;
  const isFavoriteActive = currentCli ? favoriteState[currentCli.slug] === true : false;
  const currentModeTheme = currentCli ? "cli" : "builtin";

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => {
      setResolvedTheme(theme === "system" ? (media.matches ? "dark" : "light") : theme);
    };

    updateTheme();
    media.addEventListener("change", updateTheme);
    return () => media.removeEventListener("change", updateTheme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    localStorage.setItem("cligrep-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("cligrep-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cligrep-user");
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("cligrep-favorites", JSON.stringify(favoriteState));
  }, [favoriteState]);

  useEffect(() => {
    void loadTrending();
    if (!user) {
      void ensureAnonymousSession();
    }
  }, []);

  useEffect(() => {
    const target = showLogin ? loginRef.current : showComment ? commentRef.current : inputRef.current;
    requestAnimationFrame(() => target?.focus());
  }, [showLogin, showComment, currentCli, mode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (showLogin || showComment) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeOverlay();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        handleEscape();
        return;
      }

      if (document.activeElement !== inputRef.current && isPrintableKey(event)) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, searchResults.length, currentCli, showLogin, showComment]);

  const shellMeta = useMemo(() => {
    if (currentCli) {
      return {
        badge: currentCli.displayName,
        title: `${currentCli.displayName} interactive mode`,
      };
    }

    return {
      badge: "buildin",
      title: "buildin search mode",
    };
  }, [currentCli]);

  async function ensureAnonymousSession() {
    try {
      const payload = await request("/api/v1/auth/mock/anonymous", { method: "POST" });
      setUser(payload.user);
      return payload.user;
    } catch (error) {
      setErrorMessage(error.message);
      return null;
    }
  }

  async function loadTrending() {
    try {
      const data = await request("/api/v1/clis/trending");
      setTrending(data.items ?? []);
    } catch (error) {
      setErrorMessage(error.message);
      setTerminalOutput(`Backend unavailable.\n\n${error.message}`);
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

  async function executeInput() {
    const trimmed = inputValue.trim();
    if (!trimmed && mode === "search-results" && selectedSearchResult) {
      selectCli(selectedSearchResult);
      return;
    }
    if (!trimmed) {
      return;
    }

    setBusy(true);
    setErrorMessage("");

    try {
      if (currentCli) {
        const submittedLine = trimmed;
        const result = await request("/api/v1/exec", {
          method: "POST",
          body: JSON.stringify({
            cliSlug: currentCli.slug,
            line: submittedLine,
            userId: user?.id,
            themeContext: resolvedTheme,
          }),
        });

        pushHistory(submittedLine);
        setMode("execution");
        setTerminalOutput(formatExecution(currentCli.slug, submittedLine, result));
        setStatusMessage(`Executed ${currentCli.slug} in ${result.durationMs}ms.`);
        setHints(["Esc returns to search or home.", "Try --help and --version for seeded BusyBox commands."]);
        await loadCliDetail(currentCli.slug);
      } else {
        const line = normalizeBuiltinLine(trimmed);
        const response = await request("/api/v1/builtin/exec", {
          method: "POST",
          body: JSON.stringify({
            line,
            userId: user?.id,
          }),
        });

        pushHistory(trimmed);
        await applyBuiltinResponse(response);
      }
      setInputValue("");
      setHistoryIndex(-1);
    } catch (error) {
      setErrorMessage(error.message);
      setTerminalOutput(`Error\n\n${error.message}`);
      setMode("execution");
    } finally {
      setBusy(false);
    }
  }

  async function applyBuiltinResponse(response) {
    if (response.user) {
      setUser(response.user);
    }

    if (response.action === "logout") {
      await ensureAnonymousSession();
      setStatusMessage("Search is ready.");
    } else {
      setStatusMessage(response.message || "Built-in command executed.");
    }
    setHints(response.hints ?? []);

    if (response.sessionState === "home") {
      setMode("home");
      setCurrentCli(null);
      setDetail(null);
      setSearchResults([]);
      setSelectedResultIndex(0);
      setTerminalOutput(INITIAL_OUTPUT);
      await loadTrending();
      return;
    }

    if (response.sessionState === "search-results") {
      setMode("search-results");
      setCurrentCli(null);
      setDetail(null);
      setSearchResults(response.searchResults ?? []);
      setSelectedResultIndex(0);
      setTerminalOutput(response.message || "Search complete.");
      return;
    }

    setMode("execution");
    setCurrentCli(null);
    setDetail(null);
    setSelectedResultIndex(0);
    setTerminalOutput(formatBuiltinExecution(response));
  }

  function normalizeBuiltinLine(trimmed) {
    const first = trimmed.split(/\s+/)[0];
    if (BUILTIN_PREFIXES.includes(first)) {
      return trimmed;
    }
    return `grep ${trimmed}`;
  }

  function pushHistory(line) {
    setHistory((current) => [line, ...current].slice(0, 40));
  }

  function formatExecution(cliSlug, submittedLine, result) {
    const shownLine = submittedLine.startsWith(cliSlug) ? submittedLine : `${cliSlug} ${submittedLine}`.trim();
    const normalized = normalizeExecutionResult(result);
    const lines = [`$ ${shownLine}`, "", normalized.stdout || "(no stdout)"];

    if (normalized.stderr) {
      lines.push("", "[stderr]", normalized.stderr);
    }

    lines.push("", `exit ${result.exitCode} | ${result.durationMs}ms`);
    return lines.join("\n");
  }

  function normalizeExecutionResult(result) {
    if (!isSuccessfulBusyBoxHelp(result)) {
      return result;
    }

    return {
      ...result,
      stdout: stripBusyBoxBanner(result.stderr),
      stderr: "",
    };
  }

  function isSuccessfulBusyBoxHelp(result) {
    return (
      result.exitCode === 0 &&
      !result.stdout?.trim() &&
      result.stderr?.includes("Usage:") &&
      result.stderr?.startsWith("BusyBox v")
    );
  }

  function stripBusyBoxBanner(text) {
    const lines = text.split("\n");
    if (lines[0]?.startsWith("BusyBox v")) {
      lines.shift();
      if (lines[0] === "") {
        lines.shift();
      }
    }
    return lines.join("\n").trim();
  }

  function formatBuiltinExecution(response) {
    const execution = response.execution;
    const lines = [];

    if (response.asset) {
      lines.push(`[asset] ${response.asset.kind}: ${response.asset.name}`, "");
    }

    if (execution?.stdout) {
      lines.push(execution.stdout);
    }

    if (execution?.stderr) {
      lines.push("", "[stderr]", execution.stderr);
    }

    if (response.message) {
      lines.push("", response.message);
    }

    return lines.filter(Boolean).join("\n");
  }

  function selectCli(cli) {
    if (cli.type === "builtin") {
      setCurrentCli(null);
      setMode("execution");
      setDetail(null);
      setSelectedResultIndex(0);
      setStatusMessage("Buildin grep namespace selected.");
      setHints(["Type help for the built-in catalog.", `Try: ${cli.exampleLine}`]);
      setTerminalOutput([cli.displayName, "", cli.summary, "", cli.helpText].join("\n"));
      setInputValue(cli.exampleLine || "");
      return;
    }

    setCurrentCli(cli);
    setMode("execution");
    setDetail(null);
    setSelectedResultIndex(0);
    setInputValue("");
    setStatusMessage(`${cli.displayName} selected.`);
    setHints(["Type only arguments like --help.", "Esc returns to search or home."]);
    setTerminalOutput([
      `Selected ${cli.displayName}`,
      "",
      cli.summary,
      "",
      `Try: ${exampleTail(cli.exampleLine, cli.slug) || "--help"}`,
    ].join("\n"));
    void loadCliDetail(cli.slug);
  }

  function handleEscape() {
    if (showLogin || showComment) {
      closeOverlay();
      return;
    }

    if (mode === "execution") {
      if (searchResults.length > 0) {
        setMode("search-results");
        setStatusMessage("Search results ready.");
      } else {
        setMode("home");
        setStatusMessage("Press Enter to grep the registry.");
      }
      setCurrentCli(null);
      setDetail(null);
      setInputValue("");
      setTerminalOutput(INITIAL_OUTPUT);
      return;
    }

    if (mode === "search-results") {
      setMode("home");
      setSearchResults([]);
      setSelectedResultIndex(0);
      setInputValue("");
      setTerminalOutput(INITIAL_OUTPUT);
      setStatusMessage("Press Enter to grep the registry.");
    }
  }

  function closeOverlay() {
    setShowLogin(false);
    setShowComment(false);
    setLoginName("");
    setCommentDraft("");
  }

  async function submitLogin(event) {
    event.preventDefault();
    try {
      const payload = await request("/api/v1/auth/mock/login", {
        method: "POST",
        body: JSON.stringify({ username: loginName || "operator" }),
      });
      setUser(payload.user);
      setStatusMessage(`Logged in as ${payload.user.username}@${payload.user.ip}.`);
      closeOverlay();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!currentCli || !user) {
      return;
    }

    try {
      await request("/api/v1/comments", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          cliSlug: currentCli.slug,
          body: commentDraft,
        }),
      });
      await loadCliDetail(currentCli.slug);
      setStatusMessage(`Comment posted on ${currentCli.displayName}.`);
      closeOverlay();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function toggleFavorite() {
    if (!currentCli) {
      return;
    }
    if (isAnonymous || !user?.id) {
      setShowLogin(true);
      return;
    }

    try {
      const nextActive = !isFavoriteActive;
      await request("/api/v1/favorites", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          cliSlug: currentCli.slug,
          active: nextActive,
        }),
      });
      setFavoriteState((current) => ({ ...current, [currentCli.slug]: nextActive }));
      await loadCliDetail(currentCli.slug);
      setStatusMessage(nextActive ? `Saved ${currentCli.displayName} to favorites.` : `Removed ${currentCli.displayName} from favorites.`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function logout() {
    try {
      await request("/api/v1/auth/mock/logout", { method: "POST" });
      await ensureAnonymousSession();
      setStatusMessage("Search is ready.");
      closeOverlay();
    } catch (error) {
      setErrorMessage(error.message);
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
        setSelectedResultIndex((current) => Math.max(current - 1, 0));
        return;
      }
      cycleHistory(1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (mode === "search-results" && inputValue.trim() === "" && searchResults.length > 0) {
        setSelectedResultIndex((current) => Math.min(current + 1, searchResults.length - 1));
        return;
      }
      cycleHistory(-1);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      if (mode === "search-results" && selectedSearchResult) {
        setInputValue(
          selectedSearchResult.type === "builtin"
            ? selectedSearchResult.exampleLine || selectedSearchResult.slug
            : exampleTail(selectedSearchResult.exampleLine, selectedSearchResult.slug) || selectedSearchResult.slug,
        );
      } else if (currentCli && inputValue.trim() === "") {
        setInputValue("--help");
      }
    }
  }

  function cycleHistory(direction) {
    if (history.length === 0) {
      return;
    }

    const nextIndex = Math.min(Math.max(historyIndex + direction, -1), history.length - 1);
    setHistoryIndex(nextIndex);
    setInputValue(nextIndex === -1 ? "" : history[nextIndex]);
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <header className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">keyboard native cli registry</p>
          <h1>cli grep</h1>
          <p className="hero-text">
            Search, scaffold, sandbox, and execute one command line at a time.
            Every interaction stays bash-shaped, from registry grep to BusyBox
            runtime output.
          </p>
        </div>

        <div className="hero-actions">
          <div className="theme-switcher" role="group" aria-label="Theme switcher">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={theme === option ? "theme-button active" : "theme-button"}
                onClick={() => setTheme(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="auth-panel">
            <span>{`${activeUser.username}@${activeUser.ip}`}</span>
            {isAnonymous ? (
              <button type="button" onClick={() => setShowLogin(true)}>
                login
              </button>
            ) : (
              <button type="button" onClick={logout}>
                logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-grid">
        <section className="terminal-window">
          <div className="terminal-topbar">
            <div className="traffic-lights" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="terminal-title">{shellMeta.title}</div>
            <div className={`mode-badge ${currentModeTheme}`}>{shellMeta.badge}</div>
          </div>

          <div className="terminal-body">
            <div className="status-strip">
              <span>{statusMessage}</span>
              <span>{busy ? "executing..." : "ready"}</span>
            </div>

            <label className={`prompt-line ${currentModeTheme}`}>
              <span className="prompt-text">{promptCommand}</span>
              <span className={`session-chip ${currentModeTheme}`}>{shellMeta.badge}</span>
              <input
                ref={inputRef}
                autoFocus
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={onInputKeyDown}
                className={`command-input ${currentModeTheme}`}
                spellCheck="false"
                autoComplete="off"
                placeholder={
                  currentCli
                    ? "--help"
                    : 'grep cli, or create python "..."'
                }
              />
            </label>

            <div className="hint-row">
              {hints.map((hint) => (
                <span key={hint}>{hint}</span>
              ))}
            </div>

            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

            {mode === "search-results" ? (
              <section className="results-panel">
                {searchResults.length === 0 ? (
                  <div className="empty-state">No indexed CLI matched your grep.</div>
                ) : (
                  searchResults.map((cli, index) => (
                    <button
                      key={cli.slug}
                      type="button"
                      className={`result-row ${cli.type === "builtin" ? "builtin" : "cli"} ${index === selectedResultIndex ? "active" : ""}`}
                      onClick={() => selectCli(cli)}
                    >
                      <span className={`result-type ${cli.type === "builtin" ? "builtin" : "cli"}`}>
                        {cli.type}
                      </span>
                      <span className="result-slug">{cli.displayName}</span>
                      <span className="result-summary">{cli.summary}</span>
                      <span className="result-stats">
                        <StarStat value={cli.favoriteCount} /> {cli.commentCount} notes
                      </span>
                    </button>
                  ))
                )}
              </section>
            ) : (
              <section className="output-panel">
                <pre>{terminalOutput}</pre>
              </section>
            )}
          </div>
        </section>

        {mode === "home" ? (
          <section className="cards-section">
            <div className="section-heading">
              <span>[ trending_clis ]</span>
              <small>4-up desktop grid, keyboard searchable from the prompt above</small>
            </div>
            <div className="card-grid">
              {trending.map((cli) => (
                <button
                  key={cli.slug}
                  type="button"
                  className={`cli-card ${cli.type === "builtin" ? "builtin" : "cli"}`}
                  onClick={() => selectCli(cli)}
                >
                  <div className="card-head">
                    <strong>{cli.displayName}</strong>
                    <StarStat value={cli.favoriteCount} />
                  </div>
                  <p>{cli.summary}</p>
                  <div className="tag-row">
                    {cli.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="card-foot">$ {cli.exampleLine || `${cli.slug} --help`}</div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {currentCli && detail?.cli ? (
          <section className="detail-panel">
            <div className="section-heading">
              <span>[ cli_session ]</span>
              <small>{detail.cli.runtimeImage}</small>
            </div>

            <article className="detail-card">
              <header className="detail-head">
                <div>
                  <h2>{detail.cli.displayName}</h2>
                  <p>{detail.cli.summary}</p>
                </div>
                <div className={detail.cli.type === "builtin" ? "detail-type builtin" : "detail-type cli"}>
                  {detail.cli.type}
                </div>
              </header>

              <div className="detail-meta">
                <span><StarStat value={favoriteCount} /></span>
                <span>{currentComments.length} comments</span>
                <span>{detail.cli.versionText}</span>
              </div>

              <div className="tag-row">
                {detail.cli.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="action-row">
                <button type="button" className={isFavoriteActive ? "favorite-button active" : "favorite-button"} onClick={toggleFavorite}>
                  {isFavoriteActive ? "★ favorited" : "☆ favorite"}
                </button>
                <button
                  type="button"
                  onClick={() => (isAnonymous ? setShowLogin(true) : setShowComment(true))}
                >
                  comment
                </button>
                <button type="button" onClick={() => setInputValue("--help")}>
                  autofill --help
                </button>
              </div>

              <div className="examples-block">
                <strong>Examples</strong>
                {(detail.examples ?? []).map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="example-line"
                    onClick={() => setInputValue(example)}
                  >
                    $ {detail.cli.slug} {example}
                  </button>
                ))}
              </div>

              <div className="comments-block">
                <strong>Recent comments</strong>
                {currentComments.length === 0 ? (
                  <p className="comment-empty">No comments yet. Start the thread from the keyboard.</p>
                ) : (
                  currentComments.map((comment) => (
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
            </article>
          </section>
        ) : null}
      </main>

      {showLogin ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <form className="overlay-card" onSubmit={submitLogin}>
            <h2>mock login</h2>
            <p>Enter a username to get a synthetic IP-backed session.</p>
            <input
              ref={loginRef}
              value={loginName}
              onChange={(event) => setLoginName(event.target.value)}
              placeholder="operator"
              className="overlay-input"
            />
            <div className="overlay-actions">
              <button type="submit">enter</button>
              <button type="button" onClick={closeOverlay}>
                esc
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showComment ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <form className="overlay-card" onSubmit={submitComment}>
            <h2>comment on {currentCli?.displayName}</h2>
            <p>One line only, same spirit as the terminal.</p>
            <input
              ref={commentRef}
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="This CLI feels sharp for log triage."
              className="overlay-input"
            />
            <div className="overlay-actions">
              <button type="submit">save</button>
              <button type="button" onClick={closeOverlay}>
                esc
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function StarStat({ value }) {
  return (
    <span className="star-stat">
      <span className="star-icon" aria-hidden="true">★</span>
      <span>{value}</span>
    </span>
  );
}

function exampleTail(exampleLine, cliSlug) {
  if (!exampleLine) {
    return "";
  }
  return exampleLine.startsWith(`${cliSlug} `) ? exampleLine.slice(cliSlug.length + 1) : exampleLine;
}

function isPrintableKey(event) {
  return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}

export default App;
