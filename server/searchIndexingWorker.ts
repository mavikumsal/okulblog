import { getSearchConsoleToken, listSearchIndexingQueue, listSiteSettings, updateSearchIndexingQueue, upsertSearchConsoleToken } from "./db";
import { buildSearchConsoleActions, refreshSearchConsoleToken } from "./searchConsoleProvider";
import { decryptSearchConsoleToken, encryptSearchConsoleToken } from "./searchConsoleTokenVault";

export async function processSearchIndexingQueue(limit = 10) {
  const settings = await listSiteSettings();
  const propertyUrl = settings.find(item => item.settingKey === "search_console_property_url")?.settingValue;
  if (!propertyUrl) return { processed: 0, skipped: 0, reason: "property-not-configured" };
  const stored = await getSearchConsoleToken(propertyUrl);
  if (!stored) return { processed: 0, skipped: 0, reason: "oauth-not-connected" };
  let accessToken = decryptSearchConsoleToken(stored.encryptedAccessToken);
  if (stored.accessTokenExpiresAt && stored.accessTokenExpiresAt.getTime() <= Date.now() + 60_000 && stored.encryptedRefreshToken) {
    const refreshed = await refreshSearchConsoleToken(decryptSearchConsoleToken(stored.encryptedRefreshToken));
    accessToken = refreshed.access_token;
    await upsertSearchConsoleToken({ propertyUrl, encryptedAccessToken: encryptSearchConsoleToken(accessToken), encryptedRefreshToken: stored.encryptedRefreshToken, accessTokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null, createdBy: stored.createdBy });
  }
  const candidates = (await listSearchIndexingQueue(200)).filter(item => item.status === "pending" && (!item.nextAttemptAt || item.nextAttemptAt.getTime() <= Date.now())).slice(0, Math.max(1, Math.min(limit, 25)));
  const actions = buildSearchConsoleActions(accessToken, propertyUrl);
  let processed = 0;
  for (const item of candidates) {
    await updateSearchIndexingQueue(item.id, { status: "processing", attempts: item.attempts + 1 });
    try {
      const response = await actions.requestIndexing(item.url);
      await updateSearchIndexingQueue(item.id, { status: "submitted", lastError: null, lastResponse: response, nextAttemptAt: null });
      processed += 1;
    } catch (error) {
      const attempts = item.attempts + 1;
      await updateSearchIndexingQueue(item.id, { status: attempts >= 3 ? "failed" : "pending", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Google indeksleme isteği başarısız.", nextAttemptAt: attempts >= 3 ? null : new Date(Date.now() + attempts * 5 * 60_000) });
    }
  }
  return { processed, skipped: candidates.length - processed, propertyUrl };
}
