import { TRPCError } from "@trpc/server";
import type { InferSelectModel } from "drizzle-orm";
import { documentImportHistory } from "../drizzle/schema";

type DocumentImportHistory = InferSelectModel<typeof documentImportHistory>;
import { createDocumentImportDraft, createMediaAsset, listSiteSettings, recordSecurityEvent, updateDocumentImportHistory } from "./db";
import { storagePut } from "./storage";
import { ALLOWED_REMOTE_DOCUMENT_TYPES, uploadToBunnyStorage, validateRemoteDocumentUrl } from "./bunnyStorage";
import { renderPdfCover } from "./documentCover";

const MAX_ATTEMPTS = 4;
const MAX_BYTES = 20 * 1024 * 1024;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 255);
}

function titleFromFileName(value: string) {
  return value.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 220) || "İçe aktarılan doküman";
}

export async function retryFailedDocumentImport(history: DocumentImportHistory) {
  if (history.status !== "failed") return { skipped: true as const, reason: "not-failed" as const };
  if ((history.attempts ?? 1) >= MAX_ATTEMPTS) return { skipped: true as const, reason: "max-attempts" as const };

  const nextAttempt = (history.attempts ?? 1) + 1;
  await updateDocumentImportHistory(history.id, { status: "retried", attempts: nextAttempt, errorMessage: null });
  try {
    const sourceUrl = validateRemoteDocumentUrl(history.sourceUrl);
    const response = await fetch(sourceUrl, { redirect: "manual", signal: AbortSignal.timeout(45_000), headers: { "User-Agent": "OkulBlogDocumentImporter/1.0" } });
    if (!response.ok || response.headers.get("location")) throw new TRPCError({ code: "BAD_REQUEST", message: "Kaynak dosya doğrudan indirilebilir olmalı." });
    const mimeType = (response.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
    if (!ALLOWED_REMOTE_DOCUMENT_TYPES.has(mimeType)) throw new TRPCError({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Yalnızca PDF, DOCX ve PPTX dokümanları içe aktarılabilir." });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Doküman boyutu geçersiz veya 20 MB sınırını aşıyor." });

    const settings = await listSiteSettings();
    const settingMap = new Map(settings.map(item => [item.settingKey, item.settingValue]));
    const activeProvider = settingMap.get("active_storage_provider") || "s3";
    const originalName = safeFileName(history.fileName || sourceUrl.pathname.split("/").pop() || "dokuman.pdf");
    let provider: "s3" | "bunny-storage" = "s3";
    let providerAssetId: string;
    let publicUrl: string;
    let coverImageUrl: string | null = null;

    if (activeProvider === "bunny-storage") {
      const storageZone = settingMap.get("bunny_storage_zone") || process.env.BUNNY_STORAGE_ZONE;
      const accessKey = settingMap.get("bunny_storage_access_key") || process.env.BUNNY_STORAGE_ACCESS_KEY;
      const pullZoneUrl = settingMap.get("bunny_pull_zone_url") || process.env.BUNNY_PULL_ZONE_URL;
      if (!storageZone || !accessKey || !pullZoneUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aktif Bunny depolama ayarları eksik." });
      const uploaded = await uploadToBunnyStorage({ data: buffer, fileName: originalName, mimeType, storageZone, accessKey, pullZoneUrl, endpoint: settingMap.get("bunny_storage_endpoint") || undefined });
      provider = "bunny-storage";
      providerAssetId = uploaded.providerAssetId;
      publicUrl = uploaded.publicUrl;
    } else {
      const uploaded = await storagePut(`okulblog/imported/${history.requestedBy}/${originalName}`, buffer, mimeType);
      providerAssetId = uploaded.key;
      publicUrl = uploaded.url;
      if (mimeType === "application/pdf") {
        const cover = await storagePut(`okulblog/imported/${history.requestedBy}/covers/${originalName.replace(/\.pdf$/i, "")}-cover.webp`, await renderPdfCover(buffer), "image/webp");
        coverImageUrl = cover.url;
      }
    }

    const mediaAssetId = await createMediaAsset({ provider, providerAssetId, fileName: originalName, publicUrl, mimeType, sizeBytes: buffer.byteLength, contentType: "document", metadata: { sourceUrl: history.sourceUrl, activeProvider, automaticRetry: true, coverImageUrl }, uploadedBy: history.requestedBy });
    const draftId = await createDocumentImportDraft({ mediaAssetId, sourceUrl: history.sourceUrl, title: titleFromFileName(originalName), summary: "", tags: [], coverImageUrl, previewPages: [], ocrStatus: "not_started", ocrConfidence: null, extractedText: "", aiSuggestedTitle: null, aiSuggestedSummary: null, aiSuggestedTags: [], createdBy: history.requestedBy });
    await updateDocumentImportHistory(history.id, { status: "completed", provider, fileName: originalName, mediaAssetId, draftId, errorMessage: null });
    await recordSecurityEvent({ eventType: "document_import_automatic_retry_succeeded", severity: "low", description: "Başarısız PDF aktarımı arka planda yeniden denenerek taslağa alındı.", metadata: { historyId: history.id, draftId, mediaAssetId, attempts: nextAttempt, provider } });
    return { success: true as const, historyId: history.id, draftId, mediaAssetId, attempts: nextAttempt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Otomatik PDF yeniden denemesi başarısız.";
    await updateDocumentImportHistory(history.id, { status: "failed", attempts: nextAttempt, errorMessage: message });
    await recordSecurityEvent({ eventType: "document_import_automatic_retry_failed", severity: "medium", description: "Arka plan PDF yeniden denemesi başarısız oldu.", metadata: { historyId: history.id, attempts: nextAttempt, error: message } });
    return { success: false as const, historyId: history.id, attempts: nextAttempt, error: message };
  }
}

export const documentImportRetryPolicy = { maxAttempts: MAX_ATTEMPTS, intervalMinutes: 15 } as const;
