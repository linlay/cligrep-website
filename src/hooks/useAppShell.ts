import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { request } from "../lib/api";
import { TAB_COMPLETIONS, THEME_OPTIONS } from "../lib/constants";
import {
  formatBuiltinExecution,
  formatExecution,
  getQuickSlotIndex,
  isPrintableKey,
} from "../lib/commands";
import { useTheme } from "./useTheme";
import { useFavorites } from "./useFavorites";
import { useCommandHistory } from "./useCommandHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useAuthOverlayState } from "./useAuthOverlayState";
import { useHistoryBuffer } from "./useHistoryBuffer";
import {
  buildBuiltinLine,
  environmentTone,
  normalizeCliView,
} from "../lib/cliView";
import {
  DEFAULT_WEBSITE_COMMAND,
  buildMotd,
  buildTextCommandOutput,
  isWebsiteBuiltinCli,
  nextLanguage,
  normalizeCliList,
  resolveAuthErrorMessage,
  resolveShortcutCommands,
  toErrorMessage,
  type ApplyLanguageOptions,
  type TranslateFn,
} from "../lib/appShell";
import type {
  AppMode,
  BuiltinExecResponse,
  CliDetailPayload,
  CliRecord,
  CliView,
  HomeFeed,
  HomeFeedSort,
  InfoPanel,
  InlineMode,
  Language,
  ThemeOption,
  TrendingResponse,
} from "../types";

interface I18nLike {
  language: string;
  changeLanguage: (language: Language) => Promise<unknown>;
}

interface UseAppShellOptions {
  t: TranslateFn;
  i18n: I18nLike;
}

interface CliSearchResponse {
  items?: CliRecord[];
}

export function useAppShell({ t, i18n }: UseAppShellOptions) {
  const { theme, setTheme, resolvedTheme, cycleTheme } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const commandHistory = useCommandHistory();
  const {
    buildHistoryEntry,
    appendToBuffer,
    currentOutputEntry,
    outputHistoryTotal,
    outputHistoryPosition,
    canViewOlderOutput,
    canViewNewerOutput,
    clearHistory,
    setHistoryBuffer,
    setHistoryOffset,
    showOlderOutput,
    showNewerOutput,
  } = useHistoryBuffer();

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
  const [infoPanel, setInfoPanel] = useState<InfoPanel | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const inlineRef = useRef<HTMLInputElement>(null);

  const selectedSearchResult = searchResults[selectedResultIndex] ?? null;
  const selectedCommand = currentCli ?? activeBuiltinCli;
  const currentModeTheme = environmentTone(selectedCommand.environmentKind);
  const isFavoriteActive = currentCli ? isFavorite(currentCli.slug) : false;
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
  const {
    setUser,
    activeUser,
    isAnonymous,
    sessionLabel,
    authOverlayProps,
    closeAuthOverlay,
    openAuthOverlay,
    openSessionOverlay,
    beginGoogleLogin,
    handleHeaderLogout,
  } = useAuthOverlayState({
    t,
    appendToBuffer,
    setStatusMessage,
    setErrorMessage,
  });

  function syncCommandParam(command: string | null) {
    const params = new URLSearchParams(window.location.search);
    const nextCommand = String(command ?? "").trim();

    if (nextCommand) {
      params.set("cmd", nextCommand);
    } else {
      params.delete("cmd");
    }

    const nextQuery = params.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextURL);
  }

  const loadHomepage = useCallback(
    async (sort: HomeFeedSort = homeFeed.sort || "favorites") => {
      const payload = await request<TrendingResponse>(
        `/api/v1/clis/trending?sort=${encodeURIComponent(sort)}`,
      );
      setHomeFeed({
        items: normalizeCliList(payload.items ?? []),
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

  function selectCli(rawCli: CliRecord | CliView) {
    const cli = normalizeCliView(rawCli);
    if (!cli) return;

    setSelectedResultIndex(0);
    setHistoryOffset(0);

    if (cli.environmentKind === "WEBSITE") {
      const nextBuiltin: CliView = {
        ...cli,
        promptCommands: resolveShortcutCommands(cli, null, []),
      };
      syncCommandParam(null);
      setActiveBuiltinCli(nextBuiltin);
      setCurrentCli(null);
      setMode("execution");
      setDetail(null);
      setInputValue("");
      setHints(nextBuiltin.promptCommands);
      setStatusMessage(t("status_builtin_selected"));
      return;
    }

    syncCommandParam(cli.command);
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

  async function hydrateCliFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const requestedCommand = params.get("cmd")?.trim() ?? "";
    if (!requestedCommand) {
      return;
    }

    try {
      const payload = await request<CliSearchResponse | CliRecord[]>(
        `/api/v1/clis/search?q=${encodeURIComponent(requestedCommand)}`,
      );
      const items = Array.isArray(payload) ? payload : payload.items ?? [];
      const candidates = normalizeCliList(items);
      const normalizedCommand = requestedCommand.toLowerCase();
      const matchedCli = candidates.find((cli) =>
        [
          cli.command,
          cli.displayName,
          cli.slug,
          cli.originalCommand,
        ].some((value) => value.trim().toLowerCase() === normalizedCommand),
      );

      if (matchedCli) {
        selectCli(matchedCli);
      }
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  }

  useEffect(() => {
    setHistoryBuffer([
      buildHistoryEntry("", buildMotd(t), false, { modeLabel: "WEBSITE" }),
    ]);
    setHistoryOffset(0);
    setStatusMessage(t("status_ready"));
    void loadHomepage("favorites");
    void hydrateCliFromUrl();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError")?.trim() ?? "";
    if (!authError) {
      return;
    }

    const authReason = params.get("authReason")?.trim() ?? "";
    const message = resolveAuthErrorMessage(t, authError, authReason);
    setErrorMessage(message);
    setStatusMessage(message);

    params.delete("authError");
    params.delete("authReason");
    const nextQuery = params.toString();
    const nextURL = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextURL);
  }, [t]);

  useEffect(() => {
    if (inlineMode !== "none") {
      requestAnimationFrame(() => inlineRef.current?.focus());
    } else {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [inlineMode, mode, currentCli]);

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
    [appendToBuffer, i18n],
  );

  const resetToHome = useCallback(async () => {
    syncCommandParam(null);
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

  const openDocsPanel = useCallback(() => {
    setInfoPanel({ kind: "docs" });
  }, []);

  const closeInfoPanel = useCallback(() => {
    setInfoPanel(null);
  }, []);

  const handleEscape = useCallback(() => {
    if (authOverlayProps) {
      closeAuthOverlay();
      return;
    }

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
        syncCommandParam(null);
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
    authOverlayProps,
    closeAuthOverlay,
    appendToBuffer,
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
  }, [appendToBuffer, selectedCommand.environmentKind, t]);

  const handleClearTerminal = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

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

  const handleToggleFavorite = useCallback(async () => {
    if (!currentCli) return;
    if (isAnonymous) {
      beginGoogleLogin();
      return;
    }

    try {
      const nextActive = await toggleFavorite(currentCli.slug);
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
    beginGoogleLogin,
    currentCli,
    homeFeed.sort,
    isAnonymous,
    loadCliDetail,
    loadHomepage,
    t,
    toggleFavorite,
  ]);

  const handleStartComment = useCallback(() => {
    if (!currentCli) return;
    if (isAnonymous) {
      beginGoogleLogin();
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
  }, [appendToBuffer, beginGoogleLogin, currentCli, isAnonymous, t]);

  const toggleLanguage = useCallback(() => {
    applyLanguage(nextLanguage(i18n.language));
  }, [applyLanguage, i18n.language]);

  const cycleThemeFromHeader = useCallback(() => {
    handleThemeSelect(
      THEME_OPTIONS[(THEME_OPTIONS.indexOf(theme) + 1) % THEME_OPTIONS.length],
    );
  }, [handleThemeSelect, theme]);

  useKeyboardShortcuts({
    mode,
    inputRef,
    currentCli,
    isAnonymous,
    showPalette,
    dialogOpen: Boolean(authOverlayProps || infoPanel),
    inlineMode: inlineMode !== "none",
    onCycleTheme: cycleTheme,
    onClearTerminal: handleClearTerminal,
    onToggleLanguage: useCallback(() => {
      applyLanguage(nextLanguage(i18n.language), { record: true });
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

  async function submitInlineComment() {
    if (!currentCli || isAnonymous) return;

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
            body: JSON.stringify({ line }),
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
      clearHistory();
      return true;
    }

    if (cmd === "login" && parts.length === 1) {
      openAuthOverlay("login");
      setStatusMessage(t("auth_overlay_login_subtitle"));
      return true;
    }

    if (cmd === "logout" && parts.length === 1) {
      void handleHeaderLogout();
      return true;
    }

    if (cmd === "register" && parts.length === 1) {
      openAuthOverlay("register");
      setStatusMessage(t("auth_overlay_register_subtitle"));
      return true;
    }

    if (cmd === "profile" && parts.length === 1 && !isAnonymous) {
      openAuthOverlay("profile");
      setStatusMessage(t("auth_overlay_profile_subtitle"));
      return true;
    }

    return false;
  }

  async function applyBuiltinResponse(
    originalInput: string,
    response: BuiltinExecResponse,
  ) {
    if (response.action === "logout") {
      setUser(null);
      setStatusMessage(t("status_logged_out"));
    } else {
      setStatusMessage(response.message || t("status_builtin_executed"));
    }
    setHints((response.hints ?? []).slice(0, 3));

    if (response.sessionState === "home") {
      syncCommandParam(null);
      setMode("home");
      setCurrentCli(null);
      setActiveBuiltinCli(DEFAULT_WEBSITE_COMMAND);
      setDetail(null);
      setSearchResults([]);
      setSelectedResultIndex(0);
      appendToBuffer(originalInput, buildMotd(t), true, {
        modeLabel: "WEBSITE",
      });
      await loadHomepage(homeFeed.sort || "favorites");
      return;
    }

    if (response.sessionState === "search-results") {
      syncCommandParam(null);
      setMode("search-results");
      setCurrentCli(null);
      setActiveBuiltinCli(DEFAULT_WEBSITE_COMMAND);
      setDetail(null);
      setSearchResults(normalizeCliList(response.searchResults ?? []));
      setSelectedResultIndex(0);
      appendToBuffer(
        originalInput,
        response.message || t("search_complete"),
        true,
        { modeLabel: "WEBSITE" },
      );
      return;
    }

    syncCommandParam(null);
    setMode("execution");
    setCurrentCli(null);
    appendToBuffer(originalInput, formatBuiltinExecution(response), true, {
      durationMs: response.execution?.durationMs ?? 0,
      modeLabel: "WEBSITE",
    });
  }

  function applyQuickSlot(index: number) {
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
      if (inlineMode === "comment-prompt") {
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

  const docsOverlayProps =
    infoPanel?.kind === "docs"
      ? {
          title: t("header_docs"),
          intro: t("docs_intro"),
          runtime: t("docs_runtime"),
          text: t("docs_text"),
          onClose: closeInfoPanel,
        }
      : null;

  const statusOverlayProps =
    infoPanel?.kind === "status"
      ? {
          title: t("header_status"),
          payload: infoPanel.payload,
          onClose: closeInfoPanel,
        }
      : null;

  return {
    mode,
    homeFeed,
    searchResults,
    selectedResultIndex,
    detail,
    showDetailPanels,
    isFavoriteActive,
    siteHeaderProps: {
      resolvedTheme,
      languageLabel: i18n.language.toUpperCase(),
      isAnonymous,
      sessionLabel,
      searchLabel: t("header_search"),
      statusLabel: t("header_status"),
      docsLabel: t("header_docs"),
      loginLabel: t("session_action_login"),
      onSearchHome: () => void resetToHome(),
      onOpenStatusPanel: () => void openStatusPanel(),
      onOpenDocs: openDocsPanel,
      onCycleTheme: cycleThemeFromHeader,
      onToggleLanguage: toggleLanguage,
      onOpenSession: openSessionOverlay,
    },
    authOverlayProps,
    commandConsoleProps: {
      activeUser,
      selectedCommand,
      currentModeTheme,
      inputRef,
      inlineRef,
      inputValue,
      inlineMode,
      inlineValue,
      onInputChange: setInputValue,
      onInlineChange: setInlineValue,
      onInputKeyDown,
      onInlineKeyDown,
      shortcutCommands,
      onApplyQuickSlot: applyQuickSlot,
      errorMessage,
      shouldShowOutputPanel,
      currentOutputEntry,
      emptyLabel: t("output_empty"),
      historyPositionLabel: t("history_position", {
        current: outputHistoryPosition,
        total: outputHistoryTotal,
      }),
      durationLabel: outputDurationLabel,
      modeLabel: outputModeLabel,
      onShowOlder: showOlderOutput,
      onShowNewer: showNewerOutput,
      canShowOlder: canViewOlderOutput,
      canShowNewer: canViewNewerOutput,
      olderLabel: t("history_older"),
      newerLabel: t("history_newer"),
      placeholderSearch: t("placeholder_search"),
      placeholderArgs: t("placeholder_args"),
      commentInputPromptLabel: t("comment_input_prompt"),
      commentInputPlaceholder: "This CLI feels sharp for log triage.",
      escapeHintLabel: `ESC ${t("hint_esc_search")}`,
      quickSlotHint: (slot: number, hint: string) =>
        t("quick_slot_hint", { slot, hint }),
    },
    onSelectCli: selectCli,
    onSortChange: (sort: HomeFeedSort) => void loadHomepage(sort),
    onToggleFavorite: handleToggleFavorite,
    onComment: handleStartComment,
    onFillHelp: () => setInputValue("--help"),
    onFillExample: (example: string) => setInputValue(example),
    paletteProps: showPalette
      ? {
          onClose: () => setShowPalette(false),
          onExecute: onPaletteExecute,
        }
      : null,
    docsOverlayProps,
    statusOverlayProps,
    statusMessage,
    busy,
  };
}
