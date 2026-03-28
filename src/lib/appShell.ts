import { normalizeCliView } from "./cliView";
import type {
  CliDetailPayload,
  CliRecord,
  CliView,
  HistoryEntryMeta,
  Language,
} from "../types";

export const BRAND_TEXT = "CLI GREP";
export const BRAND_TYPING_INTERVAL_MS = 15000;
export const BRAND_TYPING_STEP_MS = 120;

const BUILTIN_SHORTCUTS: Record<string, string[]> = {
  "builtin-grep": ["ripgrep"],
  "builtin-create": [
    '"make a todo cli"',
    '"build a markdown linter"',
    '"scan log files"',
  ],
  "builtin-make": ["sandbox grep", "dockerfile rg", "sandbox uv"],
};

export interface ApplyLanguageOptions {
  record?: boolean;
  command?: string;
}

export type TranslateFn = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function createHistoryMeta(
  meta: Partial<HistoryEntryMeta> = {},
): HistoryEntryMeta {
  return {
    durationMs: meta.durationMs ?? 0,
    modeLabel: meta.modeLabel ?? "WEBSITE",
  };
}

export function isWebsiteBuiltinCli(cli: CliView): boolean {
  return (
    cli.environmentKind === "WEBSITE" &&
    Object.prototype.hasOwnProperty.call(BUILTIN_SHORTCUTS, cli.slug)
  );
}

export function normalizeCliList(
  items: Array<CliRecord | CliView | null | undefined>,
): CliView[] {
  return items
    .map((cli) => normalizeCliView(cli))
    .filter((cli): cli is CliView => Boolean(cli));
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function resolveAuthErrorMessage(
  t: TranslateFn,
  authError: string,
  authReason: string,
): string {
  if (authError === "missing_state") {
    return t("auth_error_missing_state");
  }
  if (authError === "invalid_state") {
    return t("auth_error_invalid_state");
  }
  if (authError === "missing_code") {
    return t("auth_error_missing_code");
  }
  if (authError !== "google_callback_failed") {
    return t("auth_error_google_oauth");
  }

  switch (authReason) {
    case "google_token_exchange_failed":
      return t("auth_reason_google_token_exchange_failed");
    case "google_id_token_missing":
      return t("auth_reason_google_id_token_missing");
    case "google_id_token_invalid":
      return t("auth_reason_google_id_token_invalid");
    case "google_jwks_fetch_failed":
      return t("auth_reason_google_jwks_fetch_failed");
    case "google_user_upsert_failed":
      return t("auth_reason_google_user_upsert_failed");
    case "google_session_create_failed":
      return t("auth_reason_google_session_create_failed");
    default:
      return t("auth_error_google_callback_failed");
  }
}

export function buildMotd(t: TranslateFn): string {
  return [
    t("motd_line1"),
    "",
    t("motd_line2"),
    t("motd_line3"),
    t("motd_line4"),
    t("motd_line5"),
  ].join("\n");
}

export function buildDefaultWebsiteCommand(t: TranslateFn): CliView {
  return normalizeCliView({
    slug: "builtin-grep",
    command: "grep",
    displayName: "grep",
    summary: t("builtin_default_summary"),
    description: t("builtin_default_summary"),
    helpText: t("builtin_default_help"),
    contentLocale: "en",
    availableLocales: ["en", "zh"],
    environmentKind: "WEBSITE",
    sourceType: "website_builtin",
    originalCommand: "grep",
    executable: true,
    promptCommands: ["ripgrep"],
    versionText: t("builtin_default_version"),
    createdAt: "2026-01-01T00:00:00Z",
  })!;
}

export function resolveBuiltinShortcuts(slug: string): string[] {
  return BUILTIN_SHORTCUTS[slug] ?? BUILTIN_SHORTCUTS["builtin-grep"];
}

export function resolveShortcutCommands(
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

export function buildTextCommandOutput(cli: CliView, t: TranslateFn): string {
  const sections = [
    cli.helpText || cli.description,
    "",
    `${t("text_output_environment")}: ${cli.environmentKind}`,
    `${t("text_output_source")}: ${cli.sourceType}`,
    `${t("text_output_executable")}: false`,
  ];
  return sections.join("\n");
}

export function nextLanguage(currentLanguage: string): Language {
  return currentLanguage === "en" ? "zh" : "en";
}
