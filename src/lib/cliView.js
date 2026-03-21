function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function normalizeCount(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseRepositoryLabel(url) {
  if (!url) return null;

  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    return null;
  }

  return null;
}

function inferAuthor(cli, githubUrl, giteeUrl) {
  return firstDefined(
    cli.author,
    cli.owner,
    cli.publisher,
    cli.namespace,
    parseRepositoryLabel(githubUrl),
    parseRepositoryLabel(giteeUrl),
    cli.type === "builtin" ? "CLI Grep" : null,
  );
}

function inferSandbox(cli) {
  return firstDefined(
    cli.sandbox,
    cli.sandboxName,
    cli.sandboxEnv,
    cli.runtimeImage,
    cli.environment,
    cli.type === "builtin" ? "builtin" : "sandbox",
  );
}

function inferPromptCommands(cli, detailExamples) {
  const candidateArrays = [
    asArray(cli.promptCommands),
    asArray(cli.promptCommandList),
    asArray(cli.hints),
    asArray(detailExamples),
  ];

  const firstArray = candidateArrays.find((items) => items.length > 0);
  if (firstArray) {
    return [...new Set(firstArray)];
  }

  return asArray(cli.exampleLine);
}

function inferSourceUrl(githubUrl, giteeUrl, cli) {
  return firstDefined(
    githubUrl,
    giteeUrl,
    cli.repoUrl,
    cli.repositoryUrl,
    cli.sourceUrl,
  );
}

export function normalizeCliView(cli, options = {}) {
  if (!cli) return null;

  const githubUrl = firstDefined(cli.githubUrl, cli.github, cli.githubRepoUrl);
  const giteeUrl = firstDefined(cli.giteeUrl, cli.gitee, cli.giteeRepoUrl);
  const sourceUrl = inferSourceUrl(githubUrl, giteeUrl, cli);
  const promptCommands = inferPromptCommands(cli, options.examples);

  return {
    slug: firstDefined(cli.slug, cli.displayName, cli.command, "cli"),
    type: cli.type === "builtin" ? "builtin" : "cli",
    command: firstDefined(cli.command, cli.displayName, cli.slug, "unknown"),
    rawCommand: firstDefined(cli.rawCommand, cli.originalCommand, cli.originalLine),
    sandbox: inferSandbox(cli),
    author: inferAuthor(cli, githubUrl, giteeUrl),
    githubUrl,
    giteeUrl,
    sourceUrl,
    sourceLabel: firstDefined(
      cli.sourceLabel,
      parseRepositoryLabel(sourceUrl),
      firstDefined(cli.author, cli.owner, cli.publisher),
    ),
    license: firstDefined(cli.license, cli.licenseName, cli.spdxLicenseId),
    createdAt: firstDefined(cli.createdAt, cli.created_at, cli.createdDate, cli.publishedAt),
    description: firstDefined(cli.description, cli.summary, cli.intro, cli.helpText, ""),
    promptCommands,
    favoriteCount: normalizeCount(firstDefined(cli.favoriteCount, cli.favorite_count)) ?? 0,
    runCount: normalizeCount(firstDefined(cli.runCount, cli.runs, cli.executionCount, cli.usageCount)),
    version: firstDefined(cli.version, cli.versionText, cli.release, "N/A"),
    runtimeImage: firstDefined(cli.runtimeImage, cli.runtime, cli.sandbox),
    tags: asArray(cli.tags),
    helpText: cli.helpText ?? "",
    exampleLine: cli.exampleLine ?? "",
    displayName: firstDefined(cli.displayName, cli.command, cli.slug, "unknown"),
    summary: firstDefined(cli.summary, cli.description, ""),
    commentCount: normalizeCount(firstDefined(cli.commentCount, cli.commentsCount)) ?? 0,
  };
}

export function formatCliDate(value, locale) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
