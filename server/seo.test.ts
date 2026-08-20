import { describe, expect, it } from "vitest";
import { injectSeoMetadata, robotsTxt, sitemapXml } from "./seo";

describe("SEO helpers", () => {
  it("replaces template SEO tags without duplicating description or title", () => {
    const template = `<!doctype html><html><head><title>Old</title><meta name="description" content="Old description" /></head><body></body></html>`;
    const result = injectSeoMetadata(template, {
      title: "Yeni Başlık",
      description: "Yeni açıklama",
      canonical: "https://okulblog.com/test/1",
      ogType: "article",
    });
    expect(result).toContain("<title>Yeni Başlık</title>");
    expect(result.match(/name="description"/g)).toHaveLength(1);
    expect(result).toContain('rel="canonical" href="https://okulblog.com/test/1"');
    expect(result).toContain('property="og:type" content="article"');
  });

  it("marks admin routes noindex and escapes metadata values", () => {
    const result = injectSeoMetadata("<html><head><title>Old</title></head></html>", {
      title: "<Panel>",
      description: "A & B",
      canonical: "https://okulblog.com/panel",
      ogType: "website",
      noIndex: true,
    });
    expect(result).toContain("&lt;Panel&gt;");
    expect(result).toContain("A &amp; B");
    expect(result).toContain('content="noindex,nofollow"');
  });

  it("creates sitemap XML with escaped URLs and lastmod values", () => {
    const xml = sitemapXml([{ url: "https://okulblog.com/soru-cevap?soru=1&x=2", updatedAt: new Date("2026-08-20T00:00:00.000Z") }]);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("soru=1&amp;x=2");
    expect(xml).toContain("<lastmod>2026-08-20T00:00:00.000Z</lastmod>");
  });

  it("publishes robots rules with sitemap location", () => {
    const text = robotsTxt("https://okulblog.com/");
    expect(text).toContain("Disallow: /panel");
    expect(text).toContain("Sitemap: https://okulblog.com/sitemap.xml");
  });
});
