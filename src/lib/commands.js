import { BUILTIN_PREFIXES } from "./constants.js";

const QUICK_SLOT_CODES = ["Digit1", "Digit2", "Digit3"];

export function normalizeBuiltinLine(trimmed) {
  const first = trimmed.split(/\s+/)[0];
  if (BUILTIN_PREFIXES.includes(first)) {
    return trimmed;
  }
  return `grep ${trimmed}`;
}

export function formatExecution(cliSlug, submittedLine, result) {
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

export function formatBuiltinExecution(response) {
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

export function exampleTail(exampleLine, cliSlug) {
  if (!exampleLine) {
    return "";
  }
  return exampleLine.startsWith(`${cliSlug} `) ? exampleLine.slice(cliSlug.length + 1) : exampleLine;
}

export function getQuickSlotIndex(event) {
  const index = QUICK_SLOT_CODES.indexOf(event.code);
  if (index === -1) {
    return null;
  }

  const isAltCombo = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  return isAltCombo ? index : null;
}

export function isPrintableKey(event) {
  return event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;
}
