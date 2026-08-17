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
      missingKeys: ["google_client_id", "google_client_secret"],
    });
    await expect(caller.admin.testProviderConnection({ provider: "s3" })).resolves.toMatchObject({ provider: "s3", configured: true, status: "ready" });
  });

  it("üye rolü Admin ayarlarını değiştiremez veya güvenlik olaylarını listeleyemez", async () => {
    const caller = appRouter.createCaller(context("member"));

    await expect(caller.admin.settings()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.saveSetting({ settingKey: "seo_description", settingValue: "değişiklik" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.security.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.testProviderConnection({ provider: "s3" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
