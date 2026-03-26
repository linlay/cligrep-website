import type { ReactNode } from "react";

export type ThemeOption = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";
export type Language = "en" | "zh";
export type AppMode = "home" | "search-results" | "execution";
export type InlineMode = "none" | "comment-prompt";
export type EnvironmentKind = "WEBSITE" | "TEXT" | "SANDBOX";
export type HomeFeedSort = "favorites" | "newest" | "runs";

export interface User {
  id?: number | string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  authProvider?: string;
  ip: string;
  [key: string]: unknown;
}

export interface CliRecord {
  slug?: string;
  type?: string;
  command?: string;
  displayName?: string;
  summary?: string;
  description?: string;
  helpText?: string;
  tags?: unknown;
  version?: string;
  versionText?: string;
  runtimeImage?: string;
  favoriteCount?: number | string | null;
  commentCount?: number | string | null;
  runCount?: number | string | null;
  environmentKind?: string;
  environment?: string;
  sourceType?: string;
  author?: string;
  githubUrl?: string;
  giteeUrl?: string;
  license?: string;
  createdAt?: string;
  originalCommand?: string;
  rawCommand?: string;
  executable?: boolean;
  exampleLine?: string;
  promptCommands?: unknown;
  [key: string]: unknown;
}

export interface CliView {
  slug: string;
  type: string;
  command: string;
  displayName: string;
  summary: string;
  description: string;
  helpText: string;
  tags: string[];
  version: string;
  runtimeImage: string;
  favoriteCount: number;
  commentCount: number;
  runCount: number;
  environmentKind: EnvironmentKind;
  sourceType: string;
  author: string;
  githubUrl: string;
  giteeUrl: string;
  license: string;
  createdAt: string;
  originalCommand: string;
  executable: boolean;
  exampleLine: string;
  promptCommands: string[];
}

export interface CliComment {
  id: number | string;
  username: string;
  createdAt: string;
  body: string;
}

export interface CliReleaseAsset {
  fileName?: string;
  downloadUrl?: string;
  os?: string;
  arch?: string;
  packageKind?: string;
  checksumUrl?: string;
  sizeBytes?: number | string | null;
  [key: string]: unknown;
}

export interface CliRelease {
  version?: string;
  publishedAt?: string;
  isCurrent?: boolean;
  sourceKind?: string;
  sourceUrl?: string;
  assets?: CliReleaseAsset[];
  [key: string]: unknown;
}

export interface CliDetailPayload {
  cli?: CliRecord | null;
  examples?: string[];
  comments?: CliComment[];
  latestRelease?: CliRelease | null;
  releases?: CliRelease[];
  [key: string]: unknown;
}

export interface ExecutionResult {
  exitCode: number;
  durationMs: number;
  stdout?: string;
  stderr?: string;
}

export interface BuiltinExecutionAsset {
  kind: string;
  name: string;
}

export interface BuiltinExecResponse {
  action?: string;
  asset?: BuiltinExecutionAsset;
  execution?: Partial<ExecutionResult>;
  message?: string;
  hints?: string[];
  sessionState?: "home" | "search-results" | "execution" | string;
  searchResults?: CliRecord[];
}

export interface TrendingResponse {
  items?: CliRecord[];
  total?: number;
  sort?: HomeFeedSort;
}

export interface HomeFeed {
  items: CliView[];
  total: number;
  sort: HomeFeedSort;
}

export interface HistoryEntryMeta {
  durationMs: number;
  modeLabel: string;
}

export interface HistoryEntry {
  id: number;
  prompt: boolean;
  command: string;
  output: string;
  meta: HistoryEntryMeta;
}

export type InfoPanel =
  | { kind: "docs" }
  | { kind: "status"; payload: Record<string, unknown> };

export interface ToolbarMenuItem {
  id: string;
  label: string;
  active?: boolean;
  onSelect: () => void;
  role?: "menuitem" | "menuitemradio";
}

export interface TerminalContainerProps {
  children: ReactNode;
}
