import { useState } from "react";

export function useCommandHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  function push(line: string) {
    setHistory((current) => [line, ...current].slice(0, 40));
    setHistoryIndex(-1);
  }

  function cycle(direction: number): string | null {
    if (history.length === 0) return null;
    const nextIndex = Math.min(Math.max(historyIndex + direction, -1), history.length - 1);
    setHistoryIndex(nextIndex);
    return nextIndex === -1 ? "" : history[nextIndex];
  }

  function reset() {
    setHistoryIndex(-1);
  }

  return { history, historyIndex, push, cycle, reset };
}
