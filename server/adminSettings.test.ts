import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { listSecurityEvents, listSiteSettings, recordSecurityEvent, saveSiteSetting } from "./db";
import { notifyOwner } from "./_core/notification";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listSecurityEvents: vi.fn().mockResolvedValue([]),
    listSiteSettings: vi.fn().mockResolvedValue([{ settingKey: "seo_description", settingValue: "OkulBlog eğitim platformu" }]),
    recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
    saveSiteSetting: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(undefined) }));

const context = (role: "admin" | "member"): TrpcContext => ({
  user: { id: role === "admin" ? 1 : 2, openId: `${role}-user`, email: `${role}@example.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Admin ayar ve güvenlik yönetimi", () => {
  it("SEO/ölçüm ayarlarını listeler, kaydeder ve güvenlik olaylarını listeler", async () => {
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.admin.settings()).resolves.toEqual([{ settingKey: "seo_description", settingValue: "OkulBlog eğitim platformu" }]);
    await expect(caller.admin.saveSetting({ settingKey: "adsense_publisher_id", settingValue: "ca-pub-123456" })).resolves.toEqual({ success: true });
    await expect(caller.security.list()).resolves.toEqual([]);

    expect(saveSiteSetting).toHaveBeenCalledWith({ settingKey: "adsense_publisher_id", settingValue: "ca-pub-123456", updatedBy: 1 });
  });

  it("reklam ayarı değişikliğini audit log’a kaydeder ve güvensiz scripti reddeder", async () => {
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.admin.saveSetting({ settingKey: "private_ad_campaign", settingValue: JSON.stringify({ advertiser: "Firma", campaignUrl: "https://firma.example" }) })).resolves.toEqual({ success: true });
    expect(recordSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "ad_setting_changed", severity: "low" }));
    await expect(caller.admin.saveSetting({ settingKey: "private_ad_campaign", settingValue: "<script>alert(1)</script>" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("yüksek güvenlik olayını kaydeder ve Admin bildirimi gönderir", async () => {
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.security.report({ eventType: "Şüpheli giriş", severity: "high", description: "Birden fazla başarısız giriş denemesi." })).resolves.toEqual({ success: true });

    expect(recordSecurityEvent).toHaveBeenCalledWith({ eventType: "Şüpheli giriş", severity: "high", description: "Birden fazla başarısız giriş denemesi." });
    expect(notifyOwner).toHaveBeenCalledTimes(1);
  });

  it("provider bağlantısı için eksik hosting anahtarlarını raporlar", async () => {
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.admin.testProviderConnection({ provider: "google-drive-personal" })).resolves.toMatchObject({
      provider: "google-drive-personal",
      configured: false,
      status: "not_configured",
      missingKeys: ["clientId", "clientSecret"],
    });
    await expect(caller.admin.testProviderConnection({ provider: "s3" })).resolves.toMatchObject({ provider: "s3", configured: true, status: "ready" });
  });

  it("geçici Bunny Storage config alanlarını doğrular ve secret döndürmez", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.testProviderConnection({ provider: "bunny-storage", config: { apiKey: "bunny-secret", storageZone: "okulblog-media" } })).resolves.toMatchObject({ provider: "bunny-storage", configured: true, status: "ready", missingKeys: [] });
    const result = await caller.admin.testProviderConnection({ provider: "bunny-storage", config: { apiKey: "bunny-secret", storageZone: "okulblog-media" } });
    expect(JSON.stringify(result)).not.toContain("bunny-secret");
  });

  it("Bunny CDN Pull Zone alanlarını doğrular ve secret döndürmez", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const config = { apiKey: "pull-secret", pullZoneId: "123456", cdnHostname: "cdn.example.b-cdn.net", originUrl: "https://origin.example.com" };
    const result = await caller.admin.testProviderConnection({ provider: "bunny-pull-zone", config });
    expect(result).toMatchObject({ provider: "bunny-pull-zone", configured: true, status: "ready", missingKeys: [] });
    expect(JSON.stringify(result)).not.toContain("pull-secret");
  });

  it("Bunny CDN Pull Zone için eksik hostname ve origin alanlarını raporlar", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.testProviderConnection({ provider: "bunny-pull-zone", config: { apiKey: "pull-secret", pullZoneId: "123456" } })).resolves.toMatchObject({ configured: false, status: "not_configured", missingKeys: ["cdnHostname", "originUrl"] });
  });

  it("Bunny Storage için API key veya zone eksikse alanları raporlar", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.testProviderConnection({ provider: "bunny-storage", config: { apiKey: "bunny-secret" } })).resolves.toMatchObject({ configured: false, status: "not_configured", missingKeys: ["storageZone"] });
  });

  it("üye rolü Admin ayarlarını değiştiremez veya güvenlik olaylarını listeleyemez", async () => {
    const caller = appRouter.createCaller(context("member"));

    await expect(caller.admin.settings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.saveSetting({ settingKey: "seo_description", settingValue: "değişiklik" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.security.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.testProviderConnection({ provider: "s3" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
