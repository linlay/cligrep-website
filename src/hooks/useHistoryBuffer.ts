import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_HISTORY_BUFFER } from "../lib/constants";
import { createHistoryMeta } from "../lib/appShell";
import type { HistoryEntry, HistoryEntryMeta } from "../types";

export function useHistoryBuffer() {
  const [historyBuffer, setHistoryBuffer] = useState<HistoryEntry[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const nextHistoryEntryId = useRef(0);

  const buildHistoryEntry = useCallback(
    (
      command: string,
      output: string,
      showPrompt = true,
      meta: Partial<HistoryEntryMeta> = {},
    ): HistoryEntry => {
      nextHistoryEntryId.current += 1;
      return {
        id: nextHistoryEntryId.current,
        prompt: showPrompt,
        command,
        output,
        meta: createHistoryMeta(meta),
      };
    },
    [],
  );

  const appendToBuffer = useCallback(
    (
      command: string,
      output: string,
      showPrompt = true,
      meta: Partial<HistoryEntryMeta> = {},
    ) => {
      setHistoryOffset(0);
      setHistoryBuffer((buffer) => {
        const next = [
          ...buffer,
          buildHistoryEntry(command, output, showPrompt, meta),
        ];
        if (next.length > MAX_HISTORY_BUFFER) {
          return next.slice(next.length - MAX_HISTORY_BUFFER);
        }
        return next;
      });
    },
    [buildHistoryEntry],
  );

  const currentOutputEntry = useMemo(
    () => historyBuffer[historyBuffer.length - 1 - historyOffset] ?? null,
    [historyBuffer, historyOffset],
  );
  const outputHistoryTotal = historyBuffer.length;
  const outputHistoryPosition =
    outputHistoryTotal > 0 ? outputHistoryTotal - historyOffset : 0;
  const maxHistoryOffset = Math.max(historyBuffer.length - 1, 0);
  const canViewOlderOutput = historyOffset < outputHistoryTotal - 1;
  const canViewNewerOutput = historyOffset > 0;

  useEffect(() => {
    setHistoryOffset((currentOffset) =>
      Math.min(currentOffset, maxHistoryOffset),
    );
  }, [maxHistoryOffset]);

  const clearHistory = useCallback(() => {
    setHistoryBuffer([]);
    setHistoryOffset(0);
  }, []);

  const showOlderOutput = useCallback(() => {
    setHistoryOffset((currentOffset) =>
      currentOffset < maxHistoryOffset ? currentOffset + 1 : currentOffset,
    );
  }, [maxHistoryOffset]);

  const showNewerOutput = useCallback(() => {
    setHistoryOffset((currentOffset) =>
      currentOffset > 0 ? currentOffset - 1 : currentOffset,
    );
  }, []);

  return {
    historyBuffer,
    historyOffset,
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
  };
}
