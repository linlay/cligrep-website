import type { CliRecord, CliView, EnvironmentKind } from "../types";

interface NormalizeCliOptions {
  examples?: string[];
}

function pickString(...values: unknown[]): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim() !== "") as string | undefined;
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeCount(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeEnvironmentKind(kind: unknown, type: unknown): EnvironmentKind {
  if (kind === "WEBSITE" || kind === "TEXT" || kind === "SANDBOX") {
    return kind;
  }
  return type === "builtin" ? "WEBSITE" : "SANDBOX";
}

export function normalizeCliView(cli: CliRecord | CliView | null | undefined, options: NormalizeCliOptions = {}): CliView | null {
  if (!cli) return null;

  const rawCommand = "rawCommand" in cli ? cli.rawCommand : undefined;
  const versionText = "versionText" in cli ? cli.versionText : undefined;
  const promptCommands = asArray(cli.promptCommands ?? options.examples);
  const command = pickString(cli.command, cli.displayName, cli.slug, "unknown") ?? "unknown";
  const originalCommand = pickString(cli.originalCommand, rawCommand) ?? "";

  return {
    slug: pickString(cli.slug, command) ?? command,
    type: cli.type === "builtin" ? "builtin" : cli.type ?? "cli",
    command,
    displayName: pickString(cli.displayName, command) ?? command,
    summary: pickString(cli.summary, cli.description, "") ?? "",
    description: pickString(cli.description, cli.summary, cli.helpText, "") ?? "",
    helpText: cli.helpText ?? "",
    contentLocale: pickString(cli.contentLocale, "en") ?? "en",
    availableLocales: asArray(cli.availableLocales).length > 0 ? asArray(cli.availableLocales) : ["en"],
    tags: asArray(cli.tags),
    version: pickString(versionText, cli.version, "N/A") ?? "N/A",
    runtimeImage: pickString(cli.runtimeImage, "") ?? "",
    favoriteCount: normalizeCount(cli.favoriteCount),
    commentCount: normalizeCount(cli.commentCount),
    runCount: normalizeCount(cli.runCount),
    environmentKind: normalizeEnvironmentKind(cli.environmentKind ?? cli.environment, cli.type),
    sourceType: pickString(cli.sourceType, "unknown") ?? "unknown",
    author: pickString(cli.author, "") ?? "",
    officialUrl: pickString(cli.officialUrl, "") ?? "",
    giteeUrl: pickString(cli.giteeUrl, "") ?? "",
    license: pickString(cli.license, "N/A") ?? "N/A",
    createdAt: pickString(cli.createdAt, "") ?? "",
    updatedAt: pickString(cli.updatedAt, cli.createdAt, "") ?? "",
    publishedAt: pickString(cli.publishedAt, "") ?? undefined,
    originalCommand,
    executable: cli.executable !== false,
    exampleLine: pickString(cli.exampleLine, "") ?? "",
    promptCommands,
    ownerUserId: cli.ownerUserId ?? undefined,
    status: pickString(cli.status, "published") ?? "published",
    executionTemplate: pickString(cli.executionTemplate, "") ?? "",
  };
}

export function formatOfficialLinkLabel(url: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.host.replace(/^www\./i, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    return path && path !== "/" ? `${host}${path}` : host;
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  }
}

export function formatCliDate(value: string, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatCliDateTime(value: string, locale: string, timeZone?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  if (timeZone) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function sourceTypeLabel(sourceType: string, t: (key: string) => string): string {
  const key = `source_type_${sourceType ?? "unknown"}`;
  const translated = t(key);
  return translated === key ? t("source_type_unknown") : translated;
}

export function environmentTone(environmentKind: EnvironmentKind): "website" | "text" | "sandbox" {
  switch (environmentKind) {
    case "WEBSITE":
      return "website";
    case "TEXT":
      return "text";
    case "SANDBOX":
    default:
      return "sandbox";
  }
}

export function commandNamespace(cli: Pick<CliView, "environmentKind" | "type">): string {
  switch (cli.environmentKind) {
    case "WEBSITE":
      return "website";
    case "TEXT":
      return "text";
    default:
      return String(cli.type ?? "sandbox").toLowerCase();
  }
}

export function commandIdentity(cli: Pick<CliView, "environmentKind" | "type" | "command">): string {
  return `${commandNamespace(cli)}:${cli.command}`;
}

export function buildBuiltinLine(activeBuiltin: Pick<CliView, "originalCommand" | "command"> | null, rawArgs: string): string {
  const args = rawArgs.trim();
  const prefix = pickString(activeBuiltin?.originalCommand, activeBuiltin?.command, "grep") ?? "grep";
  return args ? `${prefix} ${args}` : prefix;
}
