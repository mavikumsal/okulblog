const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SEARCH_CONSOLE_ENDPOINT = "https://searchconsole.googleapis.com/webmasters/v3";

type SearchConsoleConfig = { clientId?: string; clientSecret?: string; redirectUri?: string; siteUrl?: string };

function config(): SearchConsoleConfig {
  return { clientId: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID, clientSecret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET, redirectUri: process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI, siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL };
}

export function getSearchConsoleMissingConfig() {
  return Object.entries(config()).filter(([, value]) => !value?.trim()).map(([key]) => key);
}

async function googleRequest(path: string, accessToken: string, init: RequestInit = {}) {
  if (!accessToken.trim()) throw new Error("Search Console erişim belirteci gereklidir.");
  const response = await fetch(`${SEARCH_CONSOLE_ENDPOINT}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`Search Console isteği başarısız oldu (${response.status}).`);
  return response.json();
}

export async function exchangeSearchConsoleCode(code: string) {
  const values = config();
  if (!values.clientId || !values.clientSecret || !values.redirectUri) throw new Error("Search Console OAuth yapılandırılmadı.");
  const response = await fetch(TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: values.clientId, client_secret: values.clientSecret, redirect_uri: values.redirectUri, grant_type: "authorization_code" }) });
  if (!response.ok) throw new Error("Search Console OAuth kodu değiştirilemedi.");
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
}

export async function refreshSearchConsoleToken(refreshToken: string) {
  const values = config();
  if (!values.clientId || !values.clientSecret) throw new Error("Search Console OAuth yapılandırılmadı.");
  const response = await fetch(TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: values.clientId, client_secret: values.clientSecret, grant_type: "refresh_token" }) });
  if (!response.ok) throw new Error("Search Console token yenilenemedi.");
  return response.json() as Promise<{ access_token: string; expires_in?: number }>;
}

export function buildSearchConsoleActions(accessToken: string, siteUrl: string) {
  if (!siteUrl.trim()) throw new Error("Search Console mülk URL’si gereklidir.");
  return {
    submitSitemap: (sitemap: string) => googleRequest(`/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemap)}`, accessToken, { method: "PUT" }),
    inspectUrl: (url: string) => googleRequest("/urlInspection/index:inspect", accessToken, { method: "POST", body: JSON.stringify({ inspectionUrl: url, siteUrl }) }),
    requestIndexing: (url: string) => googleRequest("/urlNotifications:publish", accessToken, { method: "POST", body: JSON.stringify({ url, type: "URL_UPDATED" }) }),
    performance: (startDate: string, endDate: string) => googleRequest(`/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, accessToken, { method: "POST", body: JSON.stringify({ startDate, endDate, dimensions: ["query", "page"], rowLimit: 100 }) }),
    links: () => googleRequest(`/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, accessToken, { method: "POST", body: JSON.stringify({ dimensions: ["page"], rowLimit: 100 }) }),
  };
}
