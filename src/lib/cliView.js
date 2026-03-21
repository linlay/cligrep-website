function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeCount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function normalizeCliView(cli, options = {}) {
  if (!cli) return null;

  const promptCommands = asArray(firstDefined(cli.promptCommands, options.examples));
  const command = firstDefined(cli.command, cli.displayName, cli.slug, "unknown");
  const originalCommand = firstDefined(cli.originalCommand, cli.rawCommand);

  return {
    slug: firstDefined(cli.slug, command),
    type: cli.type === "builtin" ? "builtin" : cli.type ?? "cli",
    command,
    displayName: firstDefined(cli.displayName, command),
    summary: firstDefined(cli.summary, cli.description, ""),
    description: firstDefined(cli.description, cli.summary, cli.helpText, ""),
    helpText: cli.helpText ?? "",
    tags: asArray(cli.tags),
    version: firstDefined(cli.versionText, cli.version, "N/A"),
    runtimeImage: firstDefined(cli.runtimeImage, ""),
    favoriteCount: normalizeCount(cli.favoriteCount),
    commentCount: normalizeCount(cli.commentCount),
    runCount: normalizeCount(cli.runCount),
    environmentKind: firstDefined(cli.environmentKind, cli.environment, cli.type === "builtin" ? "WEBSITE" : "SANDBOX"),
    sourceType: firstDefined(cli.sourceType, "unknown"),
    author: firstDefined(cli.author, ""),
    githubUrl: firstDefined(cli.githubUrl, ""),
    giteeUrl: firstDefined(cli.giteeUrl, ""),
    license: firstDefined(cli.license, "N/A"),
    createdAt: firstDefined(cli.createdAt, ""),
    originalCommand,
    executable: cli.executable !== false,
    exampleLine: firstDefined(cli.exampleLine, ""),
    promptCommands,
  };
}

export function formatCliDate(value, locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function sourceTypeLabel(sourceType, t) {
  const key = `source_type_${sourceType ?? "unknown"}`;
  const translated = t(key);
  return translated === key ? t("source_type_unknown") : translated;
}

export function environmentTone(environmentKind) {
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

export function commandNamespace(cli) {
  switch (cli.environmentKind) {
    case "WEBSITE":
      return "website";
    case "TEXT":
      return "text";
    default:
      return String(cli.type ?? "sandbox").toLowerCase();
  }
}

export function commandIdentity(cli) {
  return `${commandNamespace(cli)}:${cli.command}`;
}

export function buildBuiltinLine(activeBuiltin, rawArgs) {
  const args = rawArgs.trim();
  const prefix = firstDefined(activeBuiltin?.originalCommand, activeBuiltin?.command, "grep");
  return args ? `${prefix} ${args}` : prefix;
}
