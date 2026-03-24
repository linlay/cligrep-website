import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { request } from "./lib/api";
import {
  MAX_HISTORY_BUFFER,
  TAB_COMPLETIONS,
  THEME_OPTIONS,
} from "./lib/constants";
import {
  formatBuiltinExecution,
  formatExecution,
  getQuickSlotIndex,
  isPrintableKey,
} from "./lib/commands";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import { useFavorites } from "./hooks/useFavorites";
import { useCommandHistory } from "./hooks/useCommandHistory";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import TerminalWindow from "./components/TerminalWindow";
import PromptLine from "./components/PromptLine";
import OutputPanel from "./components/OutputPanel";
import ResultsPanel from "./components/ResultsPanel";
import TrendingGrid from "./components/TrendingGrid";
import DetailPanel from "./components/DetailPanel";
import CommentsPanel from "./components/CommentsPanel";
import CommandPalette from "./components/CommandPalette";
import InfoOverlay from "./components/InfoOverlay";
import {
  buildBuiltinLine,
  commandIdentity,
  environmentTone,
  normalizeCliView,
} from "./lib/cliView";
import type {
  AppMode,
  BuiltinExecResponse,
  CliDetailPayload,
  CliRecord,
  CliView,
  HistoryEntry,
  HistoryEntryMeta,
  HomeFeed,
  HomeFeedSort,
  InfoPanel,
  InlineMode,
  Language,
  ThemeOption,
  TrendingResponse,
} from "./types";

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
})!;

const BRAND_TEXT = "CLI GREP";
const BRAND_TYPING_INTERVAL_MS = 15000;
const BRAND_TYPING_STEP_MS = 120;

const BUILTIN_SHORTCUTS: Record<string, string[]> = {
  "builtin-grep": ["ripgrep", "python script", "mcp bridge"],
  "builtin-create": [
    '"make a todo cli"',
    '"build a markdown linter"',
    '"scan log files"',
  ],
  "builtin-make": ["sandbox grep", "dockerfile rg", "sandbox uv"],
};

interface ApplyLanguageOptions {
  record?: boolean;
  command?: string;
}

function createMeta(meta: Partial<HistoryEntryMeta> = {}): HistoryEntryMeta {
  return {
    durationMs: meta.durationMs ?? 0,
    modeLabel: meta.modeLabel ?? "WEBSITE",
  };
}

function isWebsiteBuiltinCli(cli: CliView): boolean {
  return (
    cli.environmentKind === "WEBSITE" &&
    Object.prototype.hasOwnProperty.call(BUILTIN_SHORTCUTS, cli.slug)
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function App() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme, cycleTheme } = useTheme();
  const {
    user,
    activeUser,
    isAnonymous,
    ensureAnonymousSession,
    login,
    logout,
  } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const commandHistory = useCommandHistory();

  const [mode, setMode] = useState<AppMode>("home");
  const [inputValue, setInputValue] = useState("");
  const [homeFeed, setHomeFeed] = useState<HomeFeed>({
    items: [],
    total: 0,
    sort: "favorites",
  });
  const [searchResults, setSearchResults] = useState<CliView[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [currentCli, setCurrentCli] = useState<CliView | null>(null);
  const [activeBuiltinCli, setActiveBuiltinCli] = useState<CliView>(
    DEFAULT_WEBSITE_COMMAND,
  );
  const [detail, setDetail] = useState<CliDetailPayload | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [hints, setHints] = useState<string[]>(
    DEFAULT_WEBSITE_COMMAND.promptCommands,
  );
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPalette, setShowPalette] = useState(false);
  const [inlineMode, setInlineMode] = useState<InlineMode>("none");
  const [inlineValue, setInlineValue] = useState("");
  const [historyBuffer, setHistoryBuffer] = useState<HistoryEntry[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [typedBrand, setTypedBrand] = useState(BRAND_TEXT);
  const [isBrandTyping, setIsBrandTyping] = useState(false);
  const [infoPanel, setInfoPanel] = useState<InfoPanel | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const inlineRef = useRef<HTMLInputElement>(null);
  const nextHistoryEntryId = useRef(0);

  const selectedSearchResult = searchResults[selectedResultIndex] ?? null;
  const selectedCommand = currentCli ?? activeBuiltinCli;
  const currentModeTheme = environmentTone(selectedCommand.environmentKind);
  const isFavoriteActive = currentCli ? isFavorite(currentCli.slug) : false;
  const currentOutputEntry = useMemo(
    () => historyBuffer[historyBuffer.length - 1 - historyOffset] ?? null,
    [historyBuffer, historyOffset],
  );
  const shortcutCommands = useMemo(
    () => resolveShortcutCommands(selectedCommand, detail, hints),
    [detail, hints, selectedCommand],
  );
  const showDetailPanels = Boolean(
    currentCli &&
    detail?.cli &&
    (currentCli.environmentKind === "SANDBOX" ||
      currentCli.environmentKind === "TEXT"),
  );
  const outputDurationLabel = currentOutputEntry?.meta?.durationMs
    ? t("console_duration", { ms: currentOutputEntry.meta.durationMs })
    : t("console_duration_idle");
  const outputModeLabel =
    currentOutputEntry?.meta?.modeLabel ?? selectedCommand.environmentKind;
  const shouldShowOutputPanel = !isWebsiteBuiltinCli(selectedCommand);
  const outputHistoryTotal = historyBuffer.length;
  const outputHistoryPosition =
    outputHistoryTotal > 0 ? outputHistoryTotal - historyOffset : 0;
  const maxHistoryOffset = Math.max(historyBuffer.length - 1, 0);
  const canViewOlderOutput = historyOffset < outputHistoryTotal - 1;
  const canViewNewerOutput = historyOffset > 0;

  function buildHistoryEntry(
    command: string,
    output: string,
    showPrompt = true,
    meta: Partial<HistoryEntryMeta> = {},
  ): HistoryEntry {
    nextHistoryEntryId.current += 1;
    return {
      id: nextHistoryEntryId.current,
      prompt: showPrompt,
      command,
      output,
      meta: createMeta(meta),
    };
  }

  function appendToBuffer(
    command: string,
    output: string,
    showPrompt = true,
    meta: Partial<HistoryEntryMeta> = {},
  ) {
    setHistoryOffset(0);
    setHistoryBuffer((buf) => {
      const next = [
        ...buf,
        buildHistoryEntry(command, output, showPrompt, meta),
      ];
      if (next.length > MAX_HISTORY_BUFFER) {
        return next.slice(next.length - MAX_HISTORY_BUFFER);
      }
      return next;
    });
  }

  function getMotd(): string {
    return [
      t("motd_line1"),
      "",
      t("motd_line2"),
      t("motd_line3"),
      t("motd_line4"),
      t("motd_line5"),
    ].join("\n");
  }

  const loadHomepage = useCallback(
    async (sort: HomeFeedSort = homeFeed.sort || "favorites") => {
      const payload = await request<TrendingResponse>(
        `/api/v1/clis/trending?sort=${encodeURIComponent(sort)}`,
      );
      setHomeFeed({
        items: (payload.items ?? [])
          .map((cli) => normalizeCliView(cli))
          .filter((cli): cli is CliView => Boolean(cli)),
        total: payload.total ?? 0,
        sort: payload.sort ?? sort,
      });
    },
    [homeFeed.sort],
  );

  const loadCliDetail = useCallback(async (cliSlug: string) => {
    const payload = await request<CliDetailPayload>(`/api/v1/clis/${cliSlug}`);
    setDetail(payload);
    const normalized = normalizeCliView(payload.cli, {
      examples: payload.examples ?? [],
    });
    if (normalized) {
      setHints(resolveShortcutCommands(normalized, payload, []));
    }
  }, []);

  useEffect(() => {
    setHistoryBuffer([
      buildHistoryEntry("", getMotd(), false, { modeLabel: "WEBSITE" }),
    ]);
    setHistoryOffset(0);
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
    const timeoutIds = new Set<number>();

    const schedule = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId);
        callback();
      }, delay);
      timeoutIds.add(timeoutId);
    };

    const runTypingCycle = () => {
      let index = 0;
      setTypedBrand("");
      setIsBrandTyping(true);

      const typeNext = () => {
        index += 1;
        setTypedBrand(BRAND_TEXT.slice(0, index));

        if (index < BRAND_TEXT.length) {
          schedule(typeNext, BRAND_TYPING_STEP_MS);
          return;
        }

        setIsBrandTyping(false);
        schedule(runTypingCycle, BRAND_TYPING_INTERVAL_MS);
      };

      schedule(typeNext, BRAND_TYPING_STEP_MS);
    };

    setTypedBrand(BRAND_TEXT);
    setIsBrandTyping(false);
    schedule(runTypingCycle, BRAND_TYPING_INTERVAL_MS);

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, []);

  useEffect(() => {
    setHistoryOffset((currentOffset) =>
      Math.min(currentOffset, maxHistoryOffset),
    );
  }, [maxHistoryOffset]);

  const applyLanguage = useCallback(
    (nextLang: Language, options: ApplyLanguageOptions = {}) => {
      const { record = false, command = `lang ${nextLang}` } = options;
      void i18n.changeLanguage(nextLang);
      localStorage.setItem("cligrep-lang", nextLang);
      const message =
        nextLang === "zh"
          ? "语言已切换为中文。"
          : "Language switched to English.";
      if (record) {
        appendToBuffer(command, message, true, { modeLabel: "WEBSITE" });
      }
      setStatusMessage(message);
    },
    [i18n],
  );

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
      appendToBuffer("", "(cancelled)", false, {
        modeLabel: selectedCommand.environmentKind,
      });
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
  }, [
    infoPanel,
    inlineMode,
    mode,
    resetToHome,
    searchResults.length,
    selectedCommand.environmentKind,
    t,
  ]);

  const handleShowHelp = useCallback(() => {
    appendToBuffer(
      "help",
      [
        t("help_shortcuts"),
        t("help_shortcut_enter"),
        t("help_shortcut_esc"),
        t("help_shortcut_updown"),
        t("help_shortcut_tab"),
        t("help_shortcut_alt"),
      ].join("\n"),
      true,
      { modeLabel: selectedCommand.environmentKind },
    );
    setMode("execution");
  }, [selectedCommand.environmentKind, t]);

  const handleClearTerminal = useCallback(() => {
    setHistoryBuffer([]);
    setHistoryOffset(0);
  }, []);

  const handleClearInput = useCallback(() => {
    setInputValue("");
  }, []);

  const handleThemeSelect = useCallback(
    (nextTheme: ThemeOption) => {
      setTheme(nextTheme);
      setStatusMessage(t("theme_switched", { theme: nextTheme }));
    },
    [setTheme, t],
  );

  const handleHeaderLogout = useCallback(async () => {
    try {
      const anonymousUser = await logout();
      if (anonymousUser) {
        setStatusMessage(t("status_logged_out"));
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
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
        nextActive
          ? t("status_favorited", { name: currentCli.command })
          : t("status_unfavorited", { name: currentCli.command }),
      );
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }, [
    currentCli,
    homeFeed.sort,
    isAnonymous,
    loadCliDetail,
    loadHomepage,
    t,
    toggleFavorite,
    user,
  ]);

  const handleStartComment = useCallback(() => {
    if (!currentCli) return;
    if (isAnonymous || !user?.id) {
      startLoginPrompt();
      return;
    }

    appendToBuffer(
      "",
      t("comment_prompt", { name: currentCli.command }),
      false,
      { modeLabel: currentCli.environmentKind },
    );
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
      const nextLang: Language = i18n.language === "en" ? "zh" : "en";
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
      appendToBuffer(
        username,
        t("status_logged_in", {
          user: `${loggedInUser.username}@${loggedInUser.ip}`,
        }),
        true,
        { modeLabel: "WEBSITE" },
      );
      setStatusMessage(
        t("status_logged_in", {
          user: `${loggedInUser.username}@${loggedInUser.ip}`,
        }),
      );
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      setInlineMode("none");
      setInlineValue("");
    }
  }

  async function submitInlineComment() {
    if (!currentCli || !user?.id) return;

    const body = inlineValue.trim();
    if (!body) {
      setInlineMode("none");
      setInlineValue("");
      return;
    }

    try {
      await request("/api/v1/comments", {
        method: "POST",
        body: JSON.stringify({
          userId: user.id,
          cliSlug: currentCli.slug,
          body,
        }),
      });
      await loadCliDetail(currentCli.slug);
      setInlineMode("none");
      setInlineValue("");
      appendToBuffer(
        body,
        t("status_comment_posted", { name: currentCli.command }),
        true,
        {
          modeLabel: currentCli.environmentKind,
        },
      );
      setStatusMessage(
        t("status_comment_posted", { name: currentCli.command }),
      );
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      setInlineMode("none");
      setInlineValue("");
    }
  }

  async function openStatusPanel() {
    try {
      const payload = await request<Record<string, unknown>>("/healthz");
      setInfoPanel({ kind: "status", payload });
    } catch (error) {
      setInfoPanel({
        kind: "status",
        payload: { status: "error", message: toErrorMessage(error) },
      });
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
          setStatusMessage(
            t("status_text_loaded", { name: currentCli.command }),
          );
          setInputValue("");
          commandHistory.push(trimmed);
          return;
        }

        const result = await request<{
          exitCode: number;
          durationMs: number;
          stdout?: string;
          stderr?: string;
        }>("/api/v1/exec", {
          method: "POST",
          body: JSON.stringify({
            cliSlug: currentCli.slug,
            line: trimmed,
            userId: user?.id,
            themeContext: resolvedTheme,
          }),
        });
        commandHistory.push(trimmed);
        appendToBuffer(
          trimmed,
          formatExecution(currentCli.command, trimmed, result),
          true,
          {
            durationMs: result.durationMs,
            modeLabel: "SANDBOX",
          },
        );
        setMode("execution");
        setStatusMessage(
          t("status_executed", {
            slug: currentCli.command,
            ms: result.durationMs,
          }),
        );
        await loadCliDetail(currentCli.slug);
        await loadHomepage(homeFeed.sort || "favorites");
      } else {
        const line = buildBuiltinLine(activeBuiltinCli, trimmed);
        const response = await request<BuiltinExecResponse>(
          "/api/v1/builtin/exec",
          {
            method: "POST",
            body: JSON.stringify({ line, userId: user?.id }),
          },
        );
        commandHistory.push(trimmed);
        await applyBuiltinResponse(trimmed, response);
      }

      setInputValue("");
      commandHistory.reset();
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      appendToBuffer(trimmed, `${t("error_prefix")}\n\n${message}`, true, {
        modeLabel: selectedCommand.environmentKind,
      });
      setMode("execution");
    } finally {
      setBusy(false);
    }
  }

  function handleLocalCommand(trimmed: string): boolean {
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === "theme") {
      const arg = parts[1]?.toLowerCase();
      if (arg && THEME_OPTIONS.includes(arg as ThemeOption)) {
        handleThemeSelect(arg as ThemeOption);
        appendToBuffer(trimmed, t("theme_switched", { theme: arg }), true, {
          modeLabel: "WEBSITE",
        });
        return true;
      }
    }

    if (cmd === "lang") {
      const arg = parts[1]?.toLowerCase();
      if (arg === "en" || arg === "zh") {
        applyLanguage(arg, { record: true, command: trimmed });
        return true;
      }
    }

    if (cmd === "clear") {
      setHistoryBuffer([]);
      setHistoryOffset(0);
      return true;
    }

    if (cmd === "login" && parts.length === 1) {
      startLoginPrompt();
      return true;
    }

    return false;
  }

  async function applyBuiltinResponse(
    originalInput: string,
    response: BuiltinExecResponse,
  ) {
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
      setSearchResults(
        (response.searchResults ?? [])
          .map((cli) => normalizeCliView(cli))
          .filter((cli): cli is CliView => Boolean(cli)),
      );
      setSelectedResultIndex(0);
      appendToBuffer(
        originalInput,
        response.message || t("search_complete"),
        true,
        { modeLabel: "WEBSITE" },
      );
      return;
    }

    setMode("execution");
    setCurrentCli(null);
    appendToBuffer(originalInput, formatBuiltinExecution(response), true, {
      durationMs: response.execution?.durationMs ?? 0,
      modeLabel: "WEBSITE",
    });
  }

  function selectCli(rawCli: CliRecord | CliView) {
    const cli = normalizeCliView(rawCli);
    if (!cli) return;

    setSelectedResultIndex(0);
    setHistoryOffset(0);

    if (cli.environmentKind === "WEBSITE") {
      const nextBuiltin: CliView = {
        ...cli,
        promptCommands: resolveBuiltinShortcuts(cli.slug),
      };
      setActiveBuiltinCli(nextBuiltin);
      setCurrentCli(null);
      setMode("execution");
      setDetail(null);
      setInputValue("");
      setHints(nextBuiltin.promptCommands);
      setStatusMessage(t("status_builtin_selected"));
      return;
    }

    setCurrentCli(cli);
    setMode("execution");
    setDetail(null);
    setInputValue("");
    setHints(resolveShortcutCommands(cli, null, []));
    setStatusMessage(t("status_cli_selected", { name: cli.command }));
    appendToBuffer(
      "",
      [t("selected_cli", { name: cli.command }), "", cli.description].join(
        "\n",
      ),
      false,
      {
        modeLabel: cli.environmentKind,
      },
    );
    void loadCliDetail(cli.slug);
  }

  function applyQuickSlot(index: number) {
    const nextValue = shortcutCommands[index];
    if (nextValue) {
      setInputValue(nextValue);
    }
  }

  function showOlderOutput() {
    setHistoryOffset((currentOffset) =>
      currentOffset < maxHistoryOffset ? currentOffset + 1 : currentOffset,
    );
  }

  function showNewerOutput() {
    setHistoryOffset((currentOffset) =>
      currentOffset > 0 ? currentOffset - 1 : currentOffset,
    );
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
      const matches = TAB_COMPLETIONS.filter((completion) =>
        completion.startsWith(partial),
      );
      if (matches.length === 1) {
        setInputValue(`${matches[0]} `);
      }
    }
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const quickSlotIndex = getQuickSlotIndex(event.nativeEvent);
    if (quickSlotIndex !== null) {
      event.preventDefault();
      applyQuickSlot(quickSlotIndex);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void executeInput();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (
        mode === "search-results" &&
        inputValue.trim() === "" &&
        searchResults.length > 0
      ) {
        setSelectedResultIndex((index) => Math.max(index - 1, 0));
        return;
      }
      const value = commandHistory.cycle(1);
      if (value !== null) setInputValue(value);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (
        mode === "search-results" &&
        inputValue.trim() === "" &&
        searchResults.length > 0
      ) {
        setSelectedResultIndex((index) =>
          Math.min(index + 1, searchResults.length - 1),
        );
        return;
      }
      const value = commandHistory.cycle(-1);
      if (value !== null) setInputValue(value);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      handleTabComplete();
    }
  }

  function onInlineKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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

  function onPaletteExecute(cmd: string) {
    setInputValue(cmd);
    window.setTimeout(() => {
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
            {inlineMode === "login-prompt"
              ? t("login_username_prompt")
              : t("comment_input_prompt")}
            :
          </span>
          <input
            ref={inlineRef}
            className="inline-prompt-input"
            value={inlineValue}
            onChange={(event) => setInlineValue(event.target.value)}
            onKeyDown={onInlineKeyDown}
            placeholder={
              inlineMode === "login-prompt"
                ? "operator"
                : "This CLI feels sharp for log triage."
            }
            spellCheck={false}
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
        placeholder={
          selectedCommand.environmentKind === "WEBSITE"
            ? t("placeholder_search")
            : t("placeholder_args")
        }
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />

      <header className="site-header">
        <div className="site-brand" aria-label={BRAND_TEXT}>
          <span className="brand-title-shell">
            <span className="brand-title-sizer" aria-hidden="true">
              {BRAND_TEXT}
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
        </div>

        <div className="site-flat-actions">
          <button
            type="button"
            className="flat-action-button"
            onClick={() => void resetToHome()}
          >
            {t("header_search")}
          </button>
          <button
            type="button"
            className="flat-action-button"
            onClick={() => void openStatusPanel()}
          >
            {t("header_status")}
          </button>
          <button
            type="button"
            className="flat-action-button"
            onClick={() => setInfoPanel({ kind: "docs" })}
          >
            {t("header_docs")}
          </button>
        </div>

        <div className="site-bracket-actions">
          <button
            type="button"
            className="bracket-action-button"
            onClick={() =>
              handleThemeSelect(
                THEME_OPTIONS[
                  (THEME_OPTIONS.indexOf(theme) + 1) % THEME_OPTIONS.length
                ],
              )
            }
          >
            [{resolvedTheme === "dark" ? "moon" : "sun"}]
          </button>
          <button
            type="button"
            className="bracket-action-button"
            onClick={() => applyLanguage(i18n.language === "en" ? "zh" : "en")}
          >
            [{i18n.language.toUpperCase()}]
          </button>
          <button
            type="button"
            className="bracket-action-button accent"
            onClick={() =>
              isAnonymous ? startLoginPrompt() : void handleHeaderLogout()
            }
          >
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
                  <button
                    key={hint}
                    type="button"
                    className="console-shortcut-chip"
                    onClick={() => applyQuickSlot(index)}
                  >
                    {t("quick_slot_hint", { slot: index + 1, hint })}
                  </button>
                ))}
              </div>
              <span className="console-escape-hint">
                ESC {t("hint_esc_search")}
              </span>
            </div>

            {errorMessage ? (
              <div className="error-banner">{errorMessage}</div>
            ) : null}

            {shouldShowOutputPanel ? (
              <OutputPanel
                currentEntry={currentOutputEntry}
                activeUser={activeUser}
                emptyLabel={t("output_empty")}
                historyPositionLabel={t("history_position", {
                  current: outputHistoryPosition,
                  total: outputHistoryTotal,
                })}
                durationLabel={outputDurationLabel}
                modeLabel={outputModeLabel}
                onShowOlder={showOlderOutput}
                onShowNewer={showNewerOutput}
                canShowOlder={canViewOlderOutput}
                canShowNewer={canViewNewerOutput}
                olderLabel={t("history_older")}
                newerLabel={t("history_newer")}
              />
            ) : null}
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
            <CommentsPanel
              comments={detail?.comments ?? []}
              onComment={handleStartComment}
            />
          </section>
        ) : null}
      </main>

      {showPalette ? (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          onExecute={onPaletteExecute}
        />
      ) : null}

      {infoPanel?.kind === "docs" ? (
        <InfoOverlay
          title={t("header_docs")}
          onClose={() => setInfoPanel(null)}
        >
          <div className="info-copy">
            <p>{t("docs_intro")}</p>
            <p>{t("docs_runtime")}</p>
            <p>{t("docs_text")}</p>
          </div>
        </InfoOverlay>
      ) : null}

      {infoPanel?.kind === "status" ? (
        <InfoOverlay
          title={t("header_status")}
          onClose={() => setInfoPanel(null)}
        >
          <div className="status-grid">
            {Object.entries(infoPanel.payload).map(([key, value]) => (
              <div key={key} className="status-grid-item">
                <span>{key}</span>
                <strong>
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </strong>
              </div>
            ))}
          </div>
        </InfoOverlay>
      ) : null}
    </div>
  );
}

function resolveBuiltinShortcuts(slug: string): string[] {
  return BUILTIN_SHORTCUTS[slug] ?? DEFAULT_WEBSITE_COMMAND.promptCommands;
}

function resolveShortcutCommands(
  selectedCommand: CliView,
  detail: CliDetailPayload | null,
  hints: string[],
): string[] {
  if (detail?.examples?.length) {
    return detail.examples.slice(0, 3);
  }

  if (selectedCommand.environmentKind === "WEBSITE") {
    return resolveBuiltinShortcuts(selectedCommand.slug);
  }

  if (selectedCommand.exampleLine) {
    return [selectedCommand.exampleLine, "--help", "--version"]
      .filter((value): value is string => Boolean(value))
      .slice(0, 3);
  }

  return hints.slice(0, 3);
}

function buildTextCommandOutput(cli: CliView): string {
  const sections = [
    cli.helpText || cli.description,
    "",
    `environment: ${cli.environmentKind}`,
    `source: ${cli.sourceType}`,
    "executable: false",
  ];
  return sections.join("\n");
}

export default App;
