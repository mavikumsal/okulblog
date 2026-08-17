import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { archiveMediaAsset, createMediaAsset, createMediaTransferJob, listMediaAssets, listMediaTransferJobs } from "./db";
import { storagePut } from "./storage";
import type { TrpcContext } from "./_core/context";

vi.mock("./storage", () => ({ storagePut: vi.fn().mockResolvedValue({ key: "okulblog/media/1/deneme.pdf", url: "/manus-storage/okulblog/media/1/deneme.pdf" }) }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listMediaAssets: vi.fn().mockResolvedValue([{ id: 1, provider: "s3", fileName: "deneme.pdf", contentType: "document", status: "active" }]),
    createMediaAsset: vi.fn().mockResolvedValue(undefined),
    getMediaAsset: vi.fn().mockImplementation(async (id: number) => id === 1 ? { id: 1, provider: "s3", status: "active" } : undefined),
    archiveMediaAsset: vi.fn().mockResolvedValue(undefined),
    listMediaTransferJobs: vi.fn().mockResolvedValue([{ id: 7, status: "queued", operation: "copy" }]),
    createMediaTransferJob: vi.fn().mockResolvedValue(undefined),
  };
});

const context = (role: "admin" | "member"): TrpcContext => ({
  user: { id: role === "admin" ? 1 : 2, openId: `${role}-user`, email: `${role}@example.com`, name: role, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Admin medya merkezi backend akışları", () => {
  it("medya listesini filtreler, varlık kaydeder, arşivler ve aktarım işi oluşturur", async () => {
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.admin.mediaAssets({ provider: "s3", contentType: "document" })).resolves.toHaveLength(1);
    await expect(caller.admin.createMediaAsset({ provider: "s3", fileName: "deneme.pdf", mimeType: "application/pdf", contentType: "document", publicUrl: "https://cdn.example.com/deneme.pdf", sizeBytes: 1200, providerAssetId: "s3-key" })).resolves.toEqual({ success: true });
    await expect(caller.admin.uploadMediaAsset({ fileName: "deneme.pdf", mimeType: "application/pdf", dataBase64: Buffer.from("pdf-data").toString("base64"), contentType: "document" })).resolves.toEqual({ key: "okulblog/media/1/deneme.pdf", url: "/manus-storage/okulblog/media/1/deneme.pdf" });
    await expect(caller.admin.archiveMediaAsset({ id: 1 })).resolves.toEqual({ success: true });
    await expect(caller.admin.mediaTransferJobs()).resolves.toHaveLength(1);
    await expect(caller.admin.createMediaTransferJob({ mediaAssetId: 1, sourceProvider: "s3", targetProvider: "bunny-storage", operation: "copy" })).resolves.toEqual({ success: true });

    expect(createMediaAsset).toHaveBeenCalledWith(expect.objectContaining({ uploadedBy: 1, provider: "s3" }));
    expect(storagePut).toHaveBeenCalledWith(expect.stringContaining("okulblog/media/1/deneme.pdf"), expect.any(Buffer), "application/pdf");
    expect(archiveMediaAsset).toHaveBeenCalledWith(1);
    expect(createMediaTransferJob).toHaveBeenCalledWith({ mediaAssetId: 1, sourceProvider: "s3", targetProvider: "bunny-storage", operation: "copy", requestedBy: 1 });
  });

  it("izin verilmeyen S3 MIME türünü reddeder", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.uploadMediaAsset({ fileName: "script.exe", mimeType: "application/x-msdownload", dataBase64: "ZGF0YQ==", contentType: "general" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("aynı sağlayıcıya aktarımı reddeder", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.createMediaTransferJob({ mediaAssetId: 1, sourceProvider: "s3", targetProvider: "s3", operation: "move" })).rejects.toThrow("Kaynak ve hedef sağlayıcı farklı olmalıdır.");
  });

  it("geçersiz veya arşivlenmiş medya ID’siyle aktarım başlatmaz", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.createMediaTransferJob({ mediaAssetId: 99, sourceProvider: "s3", targetProvider: "bunny-storage", operation: "copy" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("üye medya varlıklarına veya aktarım işlerine erişemez", async () => {
    const caller = appRouter.createCaller(context("member"));
    await expect(caller.admin.mediaAssets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.mediaTransferJobs()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.archiveMediaAsset({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
