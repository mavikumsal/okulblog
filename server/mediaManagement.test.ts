import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { archiveMediaAsset, completeMediaTransferJob, createMediaAsset, createMediaAssetLink, createMediaTransferJob, getMediaTransferJob, listMediaAssetLinks, listMediaAssets, listMediaTransferJobs, removeMediaAssetLink, updateMediaTransferJob } from "./db";
import { storagePut } from "./storage";
import type { TrpcContext } from "./_core/context";

vi.mock("./storage", () => ({ storagePut: vi.fn().mockResolvedValue({ key: "okulblog/media/1/deneme.pdf", url: "/manus-storage/okulblog/media/1/deneme.pdf" }) }));
vi.mock("./documentCover", () => ({ renderPdfCover: vi.fn().mockResolvedValue(Buffer.from("webp-cover")) }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listMediaAssets: vi.fn().mockResolvedValue([{ id: 1, provider: "s3", fileName: "deneme.pdf", contentType: "document", status: "active" }]),
    createMediaAsset: vi.fn().mockResolvedValue(undefined),
    createStoredFile: vi.fn().mockResolvedValue(undefined),
    createMediaAssetLink: vi.fn().mockResolvedValue(undefined),
    listMediaAssetLinks: vi.fn().mockResolvedValue([{ id: 11, mediaAssetId: 1, targetType: "content", targetId: 4, role: "hero" }]),
    removeMediaAssetLink: vi.fn().mockResolvedValue(undefined),
    getMediaAsset: vi.fn().mockImplementation(async (id: number) => id === 1 ? { id: 1, provider: "s3", status: "active" } : undefined),
    archiveMediaAsset: vi.fn().mockResolvedValue(undefined),
    listMediaTransferJobs: vi.fn().mockResolvedValue([{ id: 7, status: "queued", operation: "copy" }]),
    getMediaTransferJob: vi.fn().mockImplementation(async (id: number) => id === 7 ? { id: 7, status: "failed", progress: 42 } : undefined),
    updateMediaTransferJob: vi.fn().mockResolvedValue(undefined),
    completeMediaTransferJob: vi.fn().mockResolvedValue(undefined),
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
    await expect(caller.admin.uploadMediaAsset({ fileName: "deneme.pdf", mimeType: "application/pdf", dataBase64: Buffer.from("pdf-data").toString("base64"), contentType: "document" })).resolves.toMatchObject({ key: "okulblog/media/1/deneme.pdf", url: "/manus-storage/okulblog/media/1/deneme.pdf", coverGenerated: true, coverImageUrl: "/manus-storage/okulblog/media/1/deneme.pdf" });
    await expect(caller.files.upload({ fileName: "ders.pdf", mimeType: "application/pdf", dataBase64: Buffer.from("pdf-data").toString("base64"), targetSection: "Dokümanlar" })).resolves.toMatchObject({ coverImageUrl: "/manus-storage/okulblog/media/1/deneme.pdf", coverGenerated: true });
    await expect(caller.admin.archiveMediaAsset({ id: 1 })).resolves.toEqual({ success: true });
    await expect(caller.admin.mediaTransferJobs()).resolves.toHaveLength(1);
    await expect(caller.admin.createMediaTransferJob({ mediaAssetId: 1, sourceProvider: "s3", targetProvider: "bunny-storage", operation: "copy" })).resolves.toEqual({ success: true });

    expect(createMediaAsset).toHaveBeenCalledWith(expect.objectContaining({ uploadedBy: 1, provider: "s3" }));
    expect(storagePut).toHaveBeenCalledWith(expect.stringContaining("okulblog/media/1/deneme.pdf"), expect.any(Buffer), "application/pdf");
    expect(archiveMediaAsset).toHaveBeenCalledWith(1);
    expect(createMediaTransferJob).toHaveBeenCalledWith({ mediaAssetId: 1, sourceProvider: "s3", targetProvider: "bunny-storage", operation: "copy", requestedBy: 1 });
  });

  it("medya varlığını içerik kaydına bağlar, bağlantıları listeler ve ayırır", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.linkMediaAsset({ mediaAssetId: 1, targetType: "content", targetId: 4, role: "hero" })).resolves.toEqual({ success: true });
    await expect(caller.admin.mediaAssetLinks({ targetType: "content", targetId: 4 })).resolves.toHaveLength(1);
    await expect(caller.admin.unlinkMediaAsset({ id: 11 })).resolves.toEqual({ success: true });
    expect(createMediaAssetLink).toHaveBeenCalledWith({ mediaAssetId: 1, targetType: "content", targetId: 4, role: "hero", createdBy: 1 });
    expect(listMediaAssetLinks).toHaveBeenCalledWith({ targetType: "content", targetId: 4 });
    expect(removeMediaAssetLink).toHaveBeenCalledWith(11);
  });

  it("arşivlenmiş medya varlığını içerik kaydına bağlamaz", async () => {
    const caller = appRouter.createCaller(context("admin"));
    vi.mocked((await import("./db")).getMediaAsset).mockResolvedValueOnce({ id: 1, provider: "s3", status: "archived" } as never);
    await expect(caller.admin.linkMediaAsset({ mediaAssetId: 1, targetType: "test", targetId: 3, role: "attachment" })).rejects.toMatchObject({ code: "NOT_FOUND" });
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

  it("başarısız aktarım işini yeniden kuyruğa alır ve queued işi iptal eder", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.retryMediaTransferJob({ id: 7 })).resolves.toEqual({ success: true });
    expect(getMediaTransferJob).toHaveBeenCalledWith(7);
    expect(updateMediaTransferJob).toHaveBeenCalledWith({ id: 7, status: "queued", progress: 0, errorMessage: null });
    vi.mocked(getMediaTransferJob).mockResolvedValueOnce({ id: 8, status: "queued", progress: 18 } as never);
    await expect(caller.admin.cancelMediaTransferJob({ id: 8 })).resolves.toEqual({ success: true });
    expect(updateMediaTransferJob).toHaveBeenCalledWith({ id: 8, status: "cancelled", progress: 18, errorMessage: "Admin tarafından iptal edildi." });
  });

  it("move aktarımını tamamlayınca hedef referansı ve kaynak arşivleme sözleşmesini çağırır", async () => {
    const caller = appRouter.createCaller(context("admin"));
    vi.mocked(getMediaTransferJob).mockResolvedValueOnce({ id: 10, status: "running", operation: "move", progress: 84 } as never);
    await expect(caller.admin.completeMediaTransferJob({ id: 10, destinationMediaAssetId: 22, destinationProviderAssetId: "bunny-22", destinationUrl: "https://cdn.example.com/22.mp4", archiveSource: true })).resolves.toEqual({ success: true });
    expect(completeMediaTransferJob).toHaveBeenCalledWith({ id: 10, destinationMediaAssetId: 22, destinationProviderAssetId: "bunny-22", destinationUrl: "https://cdn.example.com/22.mp4", archiveSource: true });
  });

  it("copy aktarımında completion prosedürünü reddeder", async () => {
    const caller = appRouter.createCaller(context("admin"));
    vi.mocked(getMediaTransferJob).mockResolvedValueOnce({ id: 11, status: "running", operation: "copy", progress: 84 } as never);
    await expect(caller.admin.completeMediaTransferJob({ id: 11, destinationMediaAssetId: 22 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("tamamlanmış aktarım işini yeniden denemeyi reddeder", async () => {
    const caller = appRouter.createCaller(context("admin"));
    vi.mocked(getMediaTransferJob).mockResolvedValueOnce({ id: 9, status: "completed", progress: 100 } as never);
    await expect(caller.admin.retryMediaTransferJob({ id: 9 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("üye medya varlıklarına veya aktarım işlerine erişemez", async () => {
    const caller = appRouter.createCaller(context("member"));
    await expect(caller.admin.mediaAssets()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.mediaTransferJobs()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.archiveMediaAsset({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.retryMediaTransferJob({ id: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.cancelMediaTransferJob({ id: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
