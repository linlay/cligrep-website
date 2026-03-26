import type { CliView, Language } from "../types";

const DEFAULT_SITE_URL = "https://cligrep.com";
const SITE_NAME = "CLI GREP";

interface SeoCopy {
  title: string;
  description: string;
  keywords: string;
  locale: string;
  languageTag: string;
}

const SEO_COPY: Record<Language, SeoCopy> = {
  en: {
    title: "CLI GREP | Search CLI commands in a terminal-style registry",
    description:
      "Search, inspect, and compare CLI commands from a terminal-style homepage with hot CLI rankings and keyboard-first discovery.",
    keywords:
      "CLI search, command line tools, terminal registry, hot CLI list, developer tools, shell commands",
    locale: "en_US",
    languageTag: "en",
  },
  zh: {
    title: "CLI GREP | 终端风格的 CLI 命令搜索与发现",
    description:
      "在终端风格首页中搜索、查看和对比 CLI 命令，直接浏览热门 CLI 列表与键盘优先的命令发现体验。",
    keywords:
      "CLI 搜索, 命令行工具, 终端风格网站, 热门 CLI, 开发者工具, shell 命令",
    locale: "zh_CN",
    languageTag: "zh-CN",
  },
};

export interface SeoMeta extends SeoCopy {
  siteName: string;
  canonicalUrl: string;
  imageUrl: string;
}

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function normalizeLanguage(language: string): Language {
  return language === "zh" ? "zh" : "en";
}

export function resolveSiteUrl() {
  return normalizeSiteUrl(import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL);
}

export function buildSeoMeta(language: string): SeoMeta {
  const normalizedLanguage = normalizeLanguage(language);
  const copy = SEO_COPY[normalizedLanguage];
  const siteUrl = resolveSiteUrl();

  return {
    ...copy,
    siteName: SITE_NAME,
    canonicalUrl: `${siteUrl}/`,
    imageUrl: `${siteUrl}/og-image.svg`,
  };
}

export function buildStructuredData(
  language: string,
  items: CliView[],
  total: number,
) {
  const meta = buildSeoMeta(language);
  const normalizedLanguage = normalizeLanguage(language);
  const siteUrl = resolveSiteUrl();
  const itemList = items.slice(0, 10).map((cli, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "SoftwareApplication",
      name: cli.displayName || cli.command,
      alternateName: cli.command,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "CLI",
      description: cli.description,
      keywords: cli.tags.join(", "),
      author: cli.author
        ? {
            "@type": "Person",
            name: cli.author,
          }
        : undefined,
      sameAs: cli.githubUrl || undefined,
    },
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: meta.siteName,
      url: `${siteUrl}/`,
      description: meta.description,
      inLanguage: meta.languageTag,
    },
    {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "@id": `${siteUrl}/#social-image`,
      url: meta.imageUrl,
      contentUrl: meta.imageUrl,
      width: 1200,
      height: 630,
      caption: meta.siteName,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: `${siteUrl}/`,
      name: meta.title,
      description: meta.description,
      inLanguage: meta.languageTag,
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      primaryImageOfPage: {
        "@id": `${siteUrl}/#social-image`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: meta.siteName,
      url: `${siteUrl}/`,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: meta.description,
      inLanguage: meta.languageTag,
      featureList: [
        "Search CLI commands from the homepage command line",
        "Browse hot CLI rankings directly below the command input",
        "Inspect command metadata, examples, and comments",
      ],
    },
    ...(itemList.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: normalizedLanguage === "zh" ? "热门 CLI 列表" : "Hot CLI list",
            numberOfItems: total || itemList.length,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            itemListElement: itemList,
          },
        ]
      : []),
  ];
}
