import { useEffect } from "react";
import { getQuickSlotIndex } from "../lib/commands.js";

export function useKeyboardShortcuts({
  mode,
  inputRef,
  currentCli,
  isAnonymous,
  showPalette,
  onCycleTheme,
  onClearTerminal,
  onToggleLanguage,
  onShowPalette,
  onClosePalette,
  onShowHelp,
  onClearInput,
  onToggleFavorite,
  onStartComment,
  onEscape,
  onFocusInput,
  onApplyQuickSlot,
  isPrintableKey,
  inlineMode,
}) {
  useEffect(() => {
    function onKeyDown(event) {
      // Don't intercept when command palette is open (it manages its own keys)
      if (showPalette) return;

      // Don't intercept when in inline prompt mode (login/comment manage their own keys)
      if (inlineMode) {
        if (event.key === "Escape") {
          event.preventDefault();
          onEscape();
        }
        return;
      }

      // Ctrl shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case "k":
            event.preventDefault();
            onShowPalette();
            return;
          case "t":
            event.preventDefault();
            onCycleTheme();
            return;
          case "l":
            event.preventDefault();
            onClearTerminal();
            return;
          case "j":
            event.preventDefault();
            onToggleLanguage();
            return;
          case "h":
            event.preventDefault();
            onShowHelp();
            return;
          case "u":
            event.preventDefault();
            onClearInput();
            return;
          case "f":
            if (currentCli) {
              event.preventDefault();
              onToggleFavorite();
            }
            return;
          case "/":
            if (currentCli) {
              event.preventDefault();
              onStartComment();
            }
            return;
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
        return;
      }

      const quickSlotIndex = getQuickSlotIndex(event);
      if (quickSlotIndex !== null) {
        event.preventDefault();
        onApplyQuickSlot?.(quickSlotIndex);
        return;
      }

      // Focus input on printable keys
      if (document.activeElement !== inputRef.current && isPrintableKey(event)) {
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    mode, currentCli, isAnonymous, showPalette, inlineMode,
    onCycleTheme, onClearTerminal, onToggleLanguage, onShowPalette,
    onClosePalette, onShowHelp, onClearInput, onToggleFavorite,
    onStartComment, onEscape, onFocusInput, isPrintableKey,
    onApplyQuickSlot,
  ]);
}
