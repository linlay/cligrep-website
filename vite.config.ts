import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_SITE_URL = "https://cligrep.com";

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, "");
}

function buildRobotsTxt(siteUrl: string) {
  return `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function buildSitemapXml(siteUrl: string) {
  const lastModified = new Date().toISOString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${siteUrl}/</loc>`,
    `    <lastmod>${lastModified}</lastmod>`,
    "    <changefreq>daily</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>",
  ].join("\n");
}

function seoAssetsPlugin(siteUrl: string): Plugin {
  const robotsTxt = buildRobotsTxt(siteUrl);
  const sitemapXml = buildSitemapXml(siteUrl);

  return {
    name: "cligrep-seo-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url === "/robots.txt") {
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end(robotsTxt);
          return;
        }

        if (request.url === "/sitemap.xml") {
          response.setHeader("Content-Type", "application/xml; charset=utf-8");
          response.end(sitemapXml);
          return;
        }

        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: robotsTxt,
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: sitemapXml,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_DEV_API_TARGET || "http://127.0.0.1:11802";
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL || DEFAULT_SITE_URL);

  return {
    plugins: [react(), seoAssetsPlugin(siteUrl)],
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/healthz": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
