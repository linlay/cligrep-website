import { useEffect, type RefObject } from "react";
import { getQuickSlotIndex } from "../lib/commands";
import type { CliView } from "../types";

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }

  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  return ![
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "radio",
    "range",
    "reset",
    "submit",
  ].includes(target.type);
}

interface UseKeyboardShortcutsOptions {
  mode: string;
  inputRef: RefObject<HTMLInputElement>;
  currentCli: CliView | null;
  isAnonymous: boolean;
  showPalette: boolean;
  dialogOpen: boolean;
  onCycleTheme: () => void;
  onClearTerminal: () => void;
  onToggleLanguage: () => void;
  onShowPalette: () => void;
  onClosePalette: () => void;
  onShowHelp: () => void;
  onClearInput: () => void;
  onToggleFavorite: () => void;
  onStartComment: () => void;
  onEscape: () => void;
  onFocusInput: () => void;
  onApplyQuickSlot?: (index: number) => void;
  isPrintableKey: (event: KeyboardEvent) => boolean;
  inlineMode: boolean;
}

export function useKeyboardShortcuts({
  mode,
  inputRef,
  currentCli,
  isAnonymous,
  showPalette,
  dialogOpen,
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
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const targetIsEditable = isEditableElement(event.target);

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

      // Leave modal/forms in control of text entry and local shortcuts.
      if (dialogOpen || targetIsEditable) {
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
    mode, currentCli, isAnonymous, showPalette, dialogOpen, inlineMode,
    onCycleTheme, onClearTerminal, onToggleLanguage, onShowPalette,
    onClosePalette, onShowHelp, onClearInput, onToggleFavorite,
    onStartComment, onEscape, onFocusInput, isPrintableKey,
    onApplyQuickSlot,
  ]);
}
