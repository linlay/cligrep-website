import { useEffect } from "react";
import { buildSeoMeta, buildStructuredData } from "../lib/seo";
import type { CliView } from "../types";

const STRUCTURED_DATA_ID = "cligrep-structured-data";

interface UseSeoOptions {
  language: string;
  items: CliView[];
  total: number;
}

function upsertMeta(
  selector: string,
  attributes: Record<string, string>,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element?.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  );
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function upsertStructuredData(id: string, payload: unknown) {
  let element = document.head.querySelector<HTMLScriptElement>(`#${id}`);
  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(payload);
}

export function useSeo({ language, items, total }: UseSeoOptions) {
  useEffect(() => {
    const meta = buildSeoMeta(language);

    document.title = meta.title;
    document.documentElement.lang = meta.languageTag;

    upsertLink("canonical", meta.canonicalUrl);

    upsertMeta(
      'meta[name="description"]',
      { name: "description" },
      meta.description,
    );
    upsertMeta('meta[name="keywords"]', { name: "keywords" }, meta.keywords);
    upsertMeta(
      'meta[name="robots"]',
      { name: "robots" },
      "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    );
    upsertMeta(
      'meta[name="application-name"]',
      { name: "application-name" },
      meta.siteName,
    );
    upsertMeta(
      'meta[name="apple-mobile-web-app-title"]',
      { name: "apple-mobile-web-app-title" },
      meta.siteName,
    );
    upsertMeta(
      'meta[property="og:type"]',
      { property: "og:type" },
      "website",
    );
    upsertMeta(
      'meta[property="og:site_name"]',
      { property: "og:site_name" },
      meta.siteName,
    );
    upsertMeta(
      'meta[property="og:title"]',
      { property: "og:title" },
      meta.title,
    );
    upsertMeta(
      'meta[property="og:description"]',
      { property: "og:description" },
      meta.description,
    );
    upsertMeta(
      'meta[property="og:url"]',
      { property: "og:url" },
      meta.canonicalUrl,
    );
    upsertMeta(
      'meta[property="og:locale"]',
      { property: "og:locale" },
      meta.locale,
    );
    upsertMeta(
      'meta[property="og:image"]',
      { property: "og:image" },
      meta.imageUrl,
    );
    upsertMeta(
      'meta[property="og:image:type"]',
      { property: "og:image:type" },
      "image/svg+xml",
    );
    upsertMeta(
      'meta[property="og:image:width"]',
      { property: "og:image:width" },
      "1200",
    );
    upsertMeta(
      'meta[property="og:image:height"]',
      { property: "og:image:height" },
      "630",
    );
    upsertMeta(
      'meta[property="og:image:alt"]',
      { property: "og:image:alt" },
      "CLI GREP terminal-style homepage preview",
    );
    upsertMeta(
      'meta[name="twitter:card"]',
      { name: "twitter:card" },
      "summary_large_image",
    );
    upsertMeta(
      'meta[name="twitter:title"]',
      { name: "twitter:title" },
      meta.title,
    );
    upsertMeta(
      'meta[name="twitter:description"]',
      { name: "twitter:description" },
      meta.description,
    );
    upsertMeta(
      'meta[name="twitter:image"]',
      { name: "twitter:image" },
      meta.imageUrl,
    );
    upsertMeta(
      'meta[name="twitter:image:alt"]',
      { name: "twitter:image:alt" },
      "CLI GREP terminal-style homepage preview",
    );

    upsertStructuredData(
      STRUCTURED_DATA_ID,
      buildStructuredData(language, items, total),
    );
  }, [items, language, total]);
}
