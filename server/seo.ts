import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { categoryNodes, contentItems, qaQuestions, tests } from "../drizzle/schema";

type SeoMetadata = {
  title: string;
  description: string;
  canonical: string;
  ogType: "website" | "article";
  image?: string | null;
  noIndex?: boolean;
};

const DEFAULT_TITLE = "OkulBlog | Eğitim İçerikleri ve Testler";
const DEFAULT_DESCRIPTION = "OkulBlog ile testleri, dokümanları, videoları, oyunları, simülasyonları ve eğitim kazanımlarını keşfedin.";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

function absoluteUrl(origin: string, path: string) {
  return `${normalizeOrigin(origin)}${path.startsWith("/") ? path : `/${path}`}`;
}

function contentPath(contentType: string, id: number) {
  return `/icerik/${encodeURIComponent(contentType)}/${id}`;
}

export async function getSeoMetadata(pathname: string, origin: string): Promise<SeoMetadata> {
  const canonical = absoluteUrl(origin, pathname || "/");
  const db = await getDb();
  if (!db) return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, canonical, ogType: "website" };

  if (pathname === "/" || pathname === "") {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, canonical, ogType: "website" };
  }
  if (pathname === "/soru-cevap") {
    return { title: "Soru-Cevap | OkulBlog", description: "Öğrencilerin ve eğitimcilerin sorularını paylaştığı OkulBlog Soru-Cevap alanı.", canonical, ogType: "website" };
  }
  if (pathname === "/destek/sss") {
    return { title: "Sıkça Sorulan Sorular | OkulBlog", description: "OkulBlog kullanımı ve eğitim içerikleri hakkında sıkça sorulan sorular.", canonical, ogType: "website" };
  }
  if (pathname === "/hakkimizda") {
    return { title: "Hakkımızda | OkulBlog", description: "OkulBlog eğitim platformunu ve çalışma yaklaşımımızı keşfedin.", canonical, ogType: "website" };
  }
  if (pathname === "/gizlilik") {
    return { title: "Gizlilik Politikası | OkulBlog", description: "OkulBlog gizlilik ve veri işleme politikası.", canonical, ogType: "website" };
  }

  const contentMatch = pathname.match(/^\/icerik\/([^/]+)\/(\d+)$/);
  if (contentMatch) {
    const contentType = decodeURIComponent(contentMatch[1]);
    const id = Number(contentMatch[2]);
    const row = (await db.select().from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.contentType, contentType as typeof contentItems.contentType.enumValues[number]), eq(contentItems.status, "published")))).at(0);
    if (row) {
      return {
        title: `${row.title} | OkulBlog`,
        description: row.summary?.slice(0, 160) || `${row.title} içeriğini OkulBlog üzerinde keşfedin.`,
        canonical,
        ogType: "article",
        image: row.coverImageUrl,
      };
    }
  }

  const testMatch = pathname.match(/^\/test\/(\d+)$/);
  if (testMatch) {
    const id = Number(testMatch[1]);
    const row = (await db.select().from(tests).where(and(eq(tests.id, id), eq(tests.status, "published")))).at(0);
    if (row) return { title: `${row.title} | OkulBlog`, description: row.description?.slice(0, 160) || `${row.title} testini OkulBlog üzerinde çözün.`, canonical, ogType: "article", image: row.coverImageUrl };
  }

  const outcomeMatch = pathname.match(/^\/kazanim\/(\d+)$/);
  if (outcomeMatch) {
    const id = Number(outcomeMatch[1]);
    const row = (await db.select().from(categoryNodes).where(and(eq(categoryNodes.id, id), eq(categoryNodes.level, "outcome"), eq(categoryNodes.isActive, true)))).at(0);
    if (row) return { title: `${row.name} | Kazanım | OkulBlog`, description: `${row.name} kazanımına ait test ve çalışma içeriklerini keşfedin.`, canonical, ogType: "article" };
  }

  if (pathname.startsWith("/panel")) return { title: "Yönetim Paneli | OkulBlog", description: "OkulBlog yönetim paneli.", canonical, ogType: "website", noIndex: true };
  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, canonical, ogType: "website" };
}

export function injectSeoMetadata(template: string, metadata: SeoMetadata) {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const canonical = escapeHtml(metadata.canonical);
  const image = metadata.image ? escapeHtml(metadata.image) : undefined;
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="${metadata.ogType}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    image ? `<meta property="og:image" content="${image}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    image ? `<meta name="twitter:image" content="${image}" />` : "",
    metadata.noIndex ? `<meta name="robots" content="noindex,nofollow" />` : `<meta name="robots" content="index,follow" />`,
  ].filter(Boolean).join("\n    ");
  const cleaned = template
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");
  return cleaned.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

export async function buildSitemap(origin: string) {
  const db = await getDb();
  const staticPaths = ["/", "/soru-cevap", "/destek/sss", "/hakkimizda", "/gizlilik"];
  if (!db) return staticPaths.map(path => absoluteUrl(origin, path));
  const [contents, publishedTests, outcomes, qa] = await Promise.all([
    db.select({ id: contentItems.id, contentType: contentItems.contentType, updatedAt: contentItems.updatedAt }).from(contentItems).where(eq(contentItems.status, "published")),
    db.select({ id: tests.id, updatedAt: tests.updatedAt }).from(tests).where(eq(tests.status, "published")),
    db.select({ id: categoryNodes.id, updatedAt: categoryNodes.updatedAt }).from(categoryNodes).where(and(eq(categoryNodes.level, "outcome"), eq(categoryNodes.isActive, true))),
    db.select({ id: qaQuestions.id, updatedAt: qaQuestions.updatedAt }).from(qaQuestions).where(eq(qaQuestions.status, "published")),
  ]);
  return [
    ...staticPaths.map(path => ({ url: absoluteUrl(origin, path), updatedAt: undefined })),
    ...contents.map(row => ({ url: absoluteUrl(origin, contentPath(row.contentType, row.id)), updatedAt: row.updatedAt })),
    ...publishedTests.map(row => ({ url: absoluteUrl(origin, `/test/${row.id}`), updatedAt: row.updatedAt })),
    ...outcomes.map(row => ({ url: absoluteUrl(origin, `/kazanim/${row.id}`), updatedAt: row.updatedAt })),
    ...qa.map(row => ({ url: absoluteUrl(origin, `/soru-cevap?soru=${row.id}`), updatedAt: row.updatedAt })),
  ];
}

export function sitemapXml(entries: Array<string | { url: string; updatedAt?: Date | null }>) {
  const urls = entries.map(entry => {
    const item = typeof entry === "string" ? { url: entry } : entry;
    const lastmod = item.updatedAt ? `<lastmod>${item.updatedAt.toISOString()}</lastmod>` : "";
    return `<url><loc>${escapeHtml(item.url)}</loc>${lastmod}</url>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function robotsTxt(origin: string) {
  return `User-agent: *\nAllow: /\nDisallow: /panel\nDisallow: /api/\nSitemap: ${absoluteUrl(origin, "/sitemap.xml")}\n`;
}
