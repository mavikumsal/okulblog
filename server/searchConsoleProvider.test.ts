import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSearchConsoleActions, buildSearchConsoleAuthorizationUrl, createSearchConsoleOAuthState, exchangeSearchConsoleCode, getSearchConsoleMissingConfig, getSearchConsoleTokenMetadata, refreshSearchConsoleToken, verifySearchConsoleOAuthState } from "./searchConsoleProvider";

describe("Search Console provider sözleşmesi", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
    delete process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
    delete process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI;
    delete process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  });

  it("eksik OAuth yapılandırmasını raporlar", () => {
    expect(getSearchConsoleMissingConfig()).toEqual(["clientId", "clientSecret", "redirectUri", "siteUrl"]);
  });

  it("imzalı OAuth state’i doğrular, yetkilendirme URL’si üretir ve tokenı maskeli metadata’ya indirger", () => {
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI = "https://okulblog.example.com/oauth/search-console";
    const state = createSearchConsoleOAuthState();
    expect(verifySearchConsoleOAuthState(state)).toBe(true);
    expect(verifySearchConsoleOAuthState(`${state}tampered`)).toBe(false);
    expect(buildSearchConsoleAuthorizationUrl(state)).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(getSearchConsoleTokenMetadata({ access_token: "secret", refresh_token: "refresh", expires_in: 3600 })).toEqual({ connected: true, hasRefreshToken: true, expiresInSeconds: 3600 });
  });

  it("token exchange/refresh ve sitemap, inspection, indexing, performance, links isteklerini üretir", async () => {
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI = "https://okulblog.example.com/oauth/search-console";
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL = "https://okulblog.example.com";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "refreshed", expires_in: 3600 }), { status: 200 }))
      .mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(exchangeSearchConsoleCode("code-1234")).resolves.toMatchObject({ access_token: "access" });
    await expect(refreshSearchConsoleToken("refresh-token")).resolves.toMatchObject({ access_token: "refreshed" });
    const actions = buildSearchConsoleActions("access", "https://okulblog.example.com");
    await actions.submitSitemap("https://okulblog.example.com/sitemap.xml");
    await actions.inspectUrl("https://okulblog.example.com/test");
    await actions.requestIndexing("https://okulblog.example.com/test");
    await actions.performance("2026-01-01", "2026-01-31");
    await actions.links();
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock.mock.calls[2][0]).toContain("/sitemaps/");
    expect(fetchMock.mock.calls[3][0]).toContain("urlInspection/index:inspect");
    expect(fetchMock.mock.calls[4][0]).toContain("urlNotifications:publish");
  });
});
