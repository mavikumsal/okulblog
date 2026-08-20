import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCategoryNode,
  recordContentView,
  aggregateContentViewDaily,
  listContentMissingCovers,
  bulkAssignContentCover,
  importEducationCurriculum,
  createContentItem,
  createHomeSlide,
  createNewsCategory,
  listQaQuestions,
  listQaAnswers,
  listMemberQaQuestions,
  listMemberQaAnswers,
  createQaQuestion,
  createQaAnswer,
  setQaStatus,
  createQuestion,
  createQuestions,
  createStoredFile,
  createTest,
  appendQuestionsToTest,
  listTests,
  getHomepageContentOverview,
  getHomepageOverviewStats,
  getHomepagePersonalization,
  listContentByType,
  listContentByCategory,
  updateContentStatus,
  getRolePermissions,
  listActiveHomeSlides,
  listSecurityEvents,
  listSiteSettings,
  listUsersForAdmin,
  updateUserRole,
  listNewsCategories,
  listCategoryNodes,
  listPopularEducationCategories,
  getPopularEducationCategoryIds,
  savePopularEducationCategoryIds,
  toggleFavorite,
  listFavorites,
  markContentProgress,
  getMemberDashboard,
  createTestAttempt,
  listHomeSlidesForAdmin,
  listMediaAssets,
  getMediaAsset,
  createMediaAsset,
  createDocumentImportDraft,
  createDocumentImportHistory,
  updateDocumentImportHistory,
  updateDocumentImportHistoryMany,
  listDocumentImportHistory,
  getDocumentImportHistory,
  listDocumentImportDrafts,
  getDocumentImportDraft,
  updateDocumentImportDraft,
  createMediaAssetLink,
  listMediaAssetLinks,
  removeMediaAssetLink,
  archiveMediaAsset,
  listMediaTransferJobs,
  getMediaTransferJob,
  updateMediaTransferJob,
  completeMediaTransferJob,
  createMediaTransferJob,
  saveSiteSetting,
  setRolePermission,
  listQuestions,
  getOutcomeStudyData,
  listApprovedQuestions,
  getOutcomeProgress,
  markOutcomeProgress,
  getQuestionProductionStats,
  recordSecurityEvent,
  setInstitutionCategoryStatus,
  setCategoryStatus,
  setCategoriesStatus,
  updateCategoryNode,
  updateHomeSlide,
  deleteHomeSlide,
  deleteCategoryNode,
  deleteQuestion,
  deleteContentItem,
  deleteTest,
  deleteNewsCategory,
  recordAuditLog,
  listAuditLogs,
  upsertSearchConsoleToken,
  getSearchConsoleToken,
  enqueueSearchIndexing,
  listSearchIndexingQueue,
  getSearchIndexingQueueItem,
  updateSearchIndexingQueue,
} from "./db";
import { generateQuestionDraft } from "./aiQuestionGenerator";
import { generateSeoSuggestion } from "./seoAssistant";
import { getAiProviderConfig, maskSecret } from "./aiProviderConfig";
import { listProviderModels } from "./aiProviderCatalog";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { extractAiSourceText, parsePdfQuestions, parsePdfQuestionPair, parseImageQuestionPair } from "./pdfQuestionParser";
import { storageGetSignedUrl, storagePut, storagePutStable } from "./storage";
import { describeCoverReplacement, getStableDocumentCoverKey } from "./documentCoverLifecycle";
import { notifyOwner } from "./_core/notification";
import { buildGoogleDriveAuthorizationUrl, createGoogleDriveResumableUpload, exchangeGoogleDriveCode, getGoogleDriveMissingConfig } from "./googleDriveProvider";
import { buildSearchConsoleActions, buildSearchConsoleAuthorizationUrl, createSearchConsoleOAuthState, exchangeSearchConsoleCode, getSearchConsoleMissingConfig, getSearchConsoleTokenMetadata, refreshSearchConsoleToken, verifySearchConsoleOAuthState } from "./searchConsoleProvider";
import { decryptSearchConsoleToken, encryptSearchConsoleToken } from "./searchConsoleTokenVault";
import { extractPdfText, renderPdfCover, renderPdfPages } from "./documentCover";
import { ALLOWED_REMOTE_DOCUMENT_TYPES, uploadToBunnyStorage, validateRemoteDocumentUrl } from "./bunnyStorage";
import { buildExportFile } from "./exportDocuments";
import { buildDocumentAiPrompt, buildDocumentOcrPrompt, normalizeDocumentAiMetadata, normalizeDocumentOcrText, ocrConfidenceFromText, sanitizeDocumentAiError, shouldAnalyzeDocumentText } from "./documentAiMetadata";

export function canManagePopularEducationCategories(role: string | undefined) {
  return role === "admin";
}
function safeFileStem(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.pdf$/i, "").slice(0, 160);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}

async function analyzeDocumentWithOcr(input: { text: string; previewPages: Array<{ page: number; url: string }>; fallbackTitle: string }) {
  let extractedText = input.text.trim();
  let ocrStatus: "not_needed" | "not_started" | "completed" | "failed" = "not_needed";
  let ocrConfidence: number | null = null;
  let aiStatus: "not_started" | "completed" | "failed" = "not_started";
  let aiModel: string | null = null;
  let aiError: string | null = null;
  if (extractedText.length < 40 && input.previewPages.length) {
    ocrStatus = "not_started";
    try {
      const pages = input.previewPages.slice(0, 3);
      const ocr = await invokeLLM({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: buildDocumentOcrPrompt() },
          { role: "user", content: [{ type: "text", text: "Belgenin aşağıdaki sayfalarından Türkçe OCR metni çıkar." }, ...pages.map(page => ({ type: "image_url" as const, image_url: { url: page.url, detail: "high" as const } }))] },
        ],
      });
      const content = ocr.choices[0]?.message?.content;
      extractedText = normalizeDocumentOcrText(content);
      ocrConfidence = ocrConfidenceFromText(extractedText, pages.length);
      ocrStatus = extractedText.length >= 20 ? "completed" : "failed";
    } catch (error) {
      ocrStatus = "failed";
      aiError = sanitizeDocumentAiError(error);
    }
  }
  let title = input.fallbackTitle;
  let summary = "";
  let tags: string[] = [];
  if (extractedText.length >= 40) {
    try {
      aiModel = "gpt-5-mini";
      const ai = await invokeLLM({ model: aiModel, messages: [{ role: "system", content: "Türkçe eğitim dokümanını analiz et. Yalnızca JSON döndür. Başlık en fazla 220, özet en fazla 3000 karakter, etiket sayısı en fazla 6 olmalı." }, { role: "user", content: buildDocumentAiPrompt(extractedText) }], response_format: { type: "json_schema", json_schema: { name: "document_metadata", strict: true, schema: { type: "object", properties: { title: { type: "string" }, summary: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "summary", "tags"], additionalProperties: false } } } });
      const content = ai.choices[0]?.message?.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");
      ({ title, summary, tags } = normalizeDocumentAiMetadata(parsed, title));
      aiStatus = "completed";
    } catch (error) {
      aiStatus = "failed";
      aiError = sanitizeDocumentAiError(error);
    }
  }
  return { extractedText, ocrStatus, ocrConfidence, title, summary, tags, aiStatus, aiModel, aiError, aiSuggestedTitle: aiStatus === "completed" ? title : null, aiSuggestedSummary: aiStatus === "completed" ? summary : null, aiSuggestedTags: aiStatus === "completed" ? tags : [] };
}

const categoryInput = z.object({
  name: z.string().trim().min(2).max(180),
  categoryType: z.enum(["education", "institution"]),
  level: z.enum(["ana-grup", "school-level", "class", "subject", "unit", "outcome", "institution-root", "institution-child"]),
  parentId: z.number().int().positive().nullable().optional(),
});

const homeSlideInput = z.object({
  eyebrow: z.string().trim().max(100).optional().nullable(),
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().max(3000).optional().nullable(),
  buttonLabel: z.string().trim().max(80).optional().nullable(),
  buttonLink: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().url().max(700).optional().nullable(),
  sortOrder: z.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

const permittedSections = [
  "Kategoriler",
  "Kurum Kategorisi",
  "Soru Havuzu",
  "Testler",
  "Dokümanlar",
  "Videolar",
  "Simülasyonlar",
  "Oyunlar",
  "Haberler",
] as const;

async function assertSectionAccess(user: { id: number; role: "user" | "admin" | "teacher" | "moderator" | "member" }, section: typeof permittedSections[number]) {
  if (user.role === "admin") return;
  if (user.role !== "teacher" && user.role !== "moderator") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Bu işlem için gerekli rol izni bulunmuyor." });
  }
  const permissions = await getRolePermissions(user.role);
  if (!permissions.some(permission => permission.section === section && permission.isEnabled)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin bu modül için erişim izni vermedi." });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  platform: router({
    overview: publicProcedure.query(async ({ ctx }) => {
      const [content, approvedQuestions, educationCategories, institutionCategories, stats, personalization] = await Promise.all([
        getHomepageContentOverview(),
        listApprovedQuestions(),
        listCategoryNodes("education"),
        listCategoryNodes("institution"),
        getHomepageOverviewStats(),
        getHomepagePersonalization(ctx.user?.id),
      ]);
      return { content, approvedQuestions, educationCategories, institutionCategories, stats, personalization };
    }),
    homeSlides: publicProcedure.query(() => listActiveHomeSlides()),
    contentByCategory: publicProcedure.input(z.object({ categoryId: z.number().int().positive() })).query(({ input }) => listContentByCategory(input.categoryId)),
    popularEducationCategories: publicProcedure.query(() => listPopularEducationCategories()),
    recordContentView: publicProcedure.input(z.object({ contentId: z.number().int().positive(), viewerKey: z.string().trim().min(8).max(160) })).mutation(({ ctx, input }) => recordContentView({ contentId: input.contentId, viewerKey: input.viewerKey, userId: ctx.user?.id ?? null })),
    outcome: publicProcedure.input(z.object({ outcomeId: z.number().int().positive() })).query(({ input }) => getOutcomeStudyData(input.outcomeId)),
    approvedQuestions: publicProcedure.query(() => listApprovedQuestions()),
  siteContact: publicProcedure.query(async () => {
    const settings = await listSiteSettings();
    const allowed = new Set(["contact_enabled", "contact_title", "contact_description", "contact_email", "contact_phone", "contact_address"]);
    return Object.fromEntries(settings.filter(item => allowed.has(item.settingKey)).map(item => [item.settingKey, item.settingValue ?? ""]));
  }),
  qa: router({
    categories: publicProcedure.query(async () => ({ education: await listCategoryNodes("education"), institution: await listCategoryNodes("institution") })),
    list: publicProcedure.input(z.object({ search: z.string().trim().max(120).optional(), categoryId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => ({ questions: await listQaQuestions({ search: input?.search, categoryId: input?.categoryId }), answers: await listQaAnswers() })),
  }),
  }),
  categories: router({
    list: protectedProcedure.input(z.object({ categoryType: z.enum(["education", "institution"]).optional() })).query(({ input }) => listCategoryNodes(input.categoryType)),
    create: adminProcedure.input(categoryInput).mutation(async ({ ctx, input }) => {
      await createCategoryNode({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
    importCurriculum: adminProcedure.mutation(({ ctx }) => importEducationCurriculum({ createdBy: ctx.user.id })),
    setInstitutionStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input }) => {
      await setInstitutionCategoryStatus(input);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(180) })).mutation(async ({ input }) => {
      await updateCategoryNode(input);
      return { success: true };
    }),
    setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input }) => {
      await setCategoryStatus(input);
      return { success: true };
    }),
    bulkSetStatus: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(500), isActive: z.boolean() })).mutation(async ({ input }) => {
      await setCategoriesStatus(input);
      return { success: true, updated: input.ids.length };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        const result = await deleteCategoryNode(input.id);
        await recordAuditLog({ action: "delete", targetType: "category", targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "success" });
        return result;
      } catch (error) {
        await recordAuditLog({ action: "delete", targetType: "category", targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "failed", reason: error instanceof Error ? error.message : "Bilinmeyen hata" });
        throw error;
      }
    }),
    bulkRemove: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(input.ids.map(id => deleteCategoryNode(id)));
      const failed = results.filter(item => item.status === "rejected").length;
      await recordAuditLog({ action: "bulk_delete", targetType: "category", actorId: ctx.user.id, actorName: ctx.user.name, status: failed ? "failed" : "success", reason: failed ? `${failed} kayıt silinemedi.` : null, metadata: { ids: input.ids, deleted: input.ids.length - failed } });
      return { success: failed === 0, deleted: input.ids.length - failed, failed };
    }),
  }),
  permissions: router({
    forRole: protectedProcedure.input(z.object({ role: z.enum(["teacher", "moderator"]) })).query(({ input }) => getRolePermissions(input.role)),
    update: adminProcedure.input(z.object({
      role: z.enum(["teacher", "moderator"]),
      section: z.enum(permittedSections),
      isEnabled: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      await setRolePermission({ ...input, updatedBy: ctx.user.id });
      return { success: true };
    }),
  }),
  panel: router({
    productionStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Üretim istatistikleri yalnızca admin ve öğretmenler içindir." });
      }
      return getQuestionProductionStats({ userId: ctx.user.id, role: ctx.user.role });
    }),
    accessibleSections: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") return permittedSections;
      if (ctx.user.role === "teacher" || ctx.user.role === "moderator") {
        const permissions = await getRolePermissions(ctx.user.role);
        return permissions.filter(item => item.isEnabled).map(item => item.section);
      }
      return ["Testler", "Dokümanlar", "Videolar", "Oyunlar"];
    }),
  }),
  questions: router({
    list: protectedProcedure.input(z.object({ topicTag: z.string().trim().max(180).optional(), gradeLevel: z.string().trim().max(80).optional(), difficulty: z.enum(["easy", "medium", "hard"]).optional() }).optional()).query(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      return listQuestions(input);
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        const result = await deleteQuestion(input.id);
        await recordAuditLog({ action: "delete", targetType: "question", targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "success" });
        return result;
      } catch (error) {
        await recordAuditLog({ action: "delete", targetType: "question", targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "failed", reason: error instanceof Error ? error.message : "Bilinmeyen hata" });
        throw error;
      }
    }),
    bulkRemove: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(input.ids.map(id => deleteQuestion(id)));
      const failed = results.filter(item => item.status === "rejected").length;
      await recordAuditLog({ action: "bulk_delete", targetType: "question", actorId: ctx.user.id, actorName: ctx.user.name, status: failed ? "failed" : "success", reason: failed ? `${failed} kayıt silinemedi.` : null, metadata: { ids: input.ids, deleted: input.ids.length - failed } });
      return { success: failed === 0, deleted: input.ids.length - failed, failed };
    }),
    bulkSaveAi: protectedProcedure.input(z.object({
      status: z.enum(["draft", "approved"]).default("draft"),
      categoryId: z.number().int().positive(),
      institutionCategoryId: z.number().int().positive().nullable().optional(),
      questions: z.array(z.object({
        id: z.string().trim().min(1).max(120),
        questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
        prompt: z.string().trim().min(12).max(1500),
        options: z.array(z.string().trim().min(1).max(300)).max(5).optional(),
        answer: z.string().trim().max(800).optional(),
        explanation: z.string().trim().max(1200).optional(),
        topicTag: z.string().trim().max(180).nullable().optional(),
        gradeLevel: z.string().trim().max(80).nullable().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        sourceFileName: z.string().trim().max(255).nullable().optional(),
        sourcePage: z.number().int().positive().nullable().optional(),
        sourceRegion: z.object({ page: z.number().int().positive(), x: z.number().nonnegative(), y: z.number().nonnegative(), width: z.number().positive(), height: z.number().positive(), pageWidth: z.number().positive(), pageHeight: z.number().positive(), coordinateSpace: z.literal("pdf-points") }).nullable().optional(),
      })).min(1).max(100),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const ids = await createQuestions(input.questions.map(question => ({
        questionType: question.questionType,
        prompt: question.prompt,
        options: question.options ?? [],
        answer: question.answer,
        explanation: question.explanation,
        sourceFileName: question.sourceFileName ?? null,
        sourcePage: question.sourcePage ?? null,
        sourceRegion: question.sourceRegion ?? null,
        topicTag: question.topicTag ?? null,
        gradeLevel: question.gradeLevel ?? null,
        categoryId: input.categoryId,
        institutionCategoryId: input.institutionCategoryId ?? null,
        difficulty: question.difficulty,
        status: input.status,
        createdBy: ctx.user.id,
      })));
      await recordAuditLog({ action: "bulk_create", targetType: "question", actorId: ctx.user.id, actorName: ctx.user.name, status: "success", metadata: { source: "ai", status: input.status, draftIds: input.questions.map(question => question.id), questionIds: ids } });
      return { success: true, saved: ids.length, ids, status: input.status };
    }),
    create: protectedProcedure.input(z.object({
      questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
      prompt: z.string().trim().min(12).max(1500),
      imageUrl: z.string().url().max(700).nullable().optional(),
      explanationImageUrl: z.string().url().max(700).nullable().optional(),
      options: z.array(z.string().trim().min(1).max(300)).max(5).optional(),
      answer: z.string().trim().max(800).optional(),
      explanation: z.string().trim().max(1200).optional(),
      topicTag: z.string().trim().max(180).nullable().optional(),
      gradeLevel: z.string().trim().max(80).nullable().optional(),
      categoryId: z.number().int().positive(),
      institutionCategoryId: z.number().int().positive().nullable().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      await createQuestion({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
  }),
  contents: router({
    list: protectedProcedure.input(z.object({ contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]), categoryId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
      const sectionMap = { test: "Testler", document: "Dokümanlar", simulation: "Simülasyonlar", video: "Videolar", game: "Oyunlar", news: "Haberler" } as const;
      await assertSectionAccess(ctx.user, sectionMap[input.contentType]);
      return listContentByType(input.contentType, input.categoryId);
    }),
    byCategory: protectedProcedure.input(z.object({ categoryId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Dokümanlar");
      return listContentByCategory(input.categoryId);
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive(), contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]) })).mutation(async ({ ctx, input }) => {
      try {
        const result = await deleteContentItem(input);
        await recordAuditLog({ action: "delete", targetType: input.contentType, targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "success" });
        return result;
      } catch (error) {
        await recordAuditLog({ action: "delete", targetType: input.contentType, targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "failed", reason: error instanceof Error ? error.message : "Bilinmeyen hata" });
        throw error;
      }
    }),
    bulkRemove: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]) })).mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(input.ids.map(id => deleteContentItem({ id, contentType: input.contentType })));
      const failed = results.filter(item => item.status === "rejected").length;
      await recordAuditLog({ action: "bulk_delete", targetType: input.contentType, actorId: ctx.user.id, actorName: ctx.user.name, status: failed ? "failed" : "success", reason: failed ? `${failed} kayıt silinemedi.` : null, metadata: { ids: input.ids, deleted: input.ids.length - failed } });
      return { success: failed === 0, deleted: input.ids.length - failed, failed };
    }),
    archive: protectedProcedure.input(z.object({ id: z.number().int().positive(), contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]) })).mutation(async ({ ctx, input }) => {
      const sectionMap = { test: "Testler", document: "Dokümanlar", simulation: "Simülasyonlar", video: "Videolar", game: "Oyunlar", news: "Haberler" } as const;
      await assertSectionAccess(ctx.user, sectionMap[input.contentType]);
      await updateContentStatus({ id: input.id, status: "archived" });
      return { success: true };
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]),
      summary: z.string().trim().max(3000).optional(),
      body: z.string().trim().max(10000).optional(),
      coverImageUrl: z.string().refine(value => { try { return value.startsWith("/") || Boolean(new URL(value)); } catch { return false; } }, "Geçerli bir görsel adresi girilmelidir.").max(900).nullable().optional(),
      categoryId: z.number().int().positive(),
      institutionCategoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const sectionMap = { test: "Testler", document: "Dokümanlar", simulation: "Simülasyonlar", video: "Videolar", game: "Oyunlar", news: "Haberler" } as const;
      await assertSectionAccess(ctx.user, sectionMap[input.contentType]);
      await createContentItem({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
  }),
  member: router({
    askQuestion: protectedProcedure.input(z.object({ title: z.string().trim().min(3).max(220), body: z.string().trim().min(3).max(20000), imageUrl: z.string().url().max(700).nullable().optional(), categoryId: z.number().int().positive(), institutionCategoryId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => { await createQaQuestion({ ...input, createdBy: ctx.user.id }); return { success: true, status: "pending" as const }; }),
    myQuestions: protectedProcedure.query(({ ctx }) => listMemberQaQuestions(ctx.user.id)),
    myAnswers: protectedProcedure.query(({ ctx }) => listMemberQaAnswers(ctx.user.id)),
    answerQuestion: protectedProcedure.input(z.object({ questionId: z.number().int().positive(), body: z.string().trim().min(3).max(20000), imageUrl: z.string().url().max(700).nullable().optional() })).mutation(async ({ ctx, input }) => { await createQaAnswer({ ...input, createdBy: ctx.user.id }); return { success: true, status: "pending" as const }; }),
    uploadQaImage: protectedProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataBase64: z.string().min(1) })).mutation(async ({ ctx, input }) => { const buffer = Buffer.from(input.dataBase64, "base64"); if (buffer.byteLength > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Görsel en fazla 5 MB olabilir." }); const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-"); return storagePut(`okulblog/${ctx.user.id}/qa/${Date.now()}-${safeName}`, buffer, input.mimeType); }),
    dashboard: protectedProcedure.query(({ ctx }) => getMemberDashboard(ctx.user.id)),
    favorites: protectedProcedure.query(({ ctx }) => listFavorites(ctx.user.id)),
    toggleFavorite: protectedProcedure.input(z.object({ contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]), contentId: z.number().int().positive() })).mutation(({ ctx, input }) => toggleFavorite({ ...input, userId: ctx.user.id })),
    progress: protectedProcedure.input(z.object({ contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]), contentId: z.number().int().positive(), status: z.enum(["started", "completed"]) })).mutation(({ ctx, input }) => markContentProgress({ ...input, userId: ctx.user.id })),
    outcomeProgress: protectedProcedure.input(z.object({ outcomeId: z.number().int().positive() })).query(({ ctx, input }) => getOutcomeProgress(ctx.user.id, input.outcomeId)),
    updateOutcomeProgress: protectedProcedure.input(z.object({ outcomeId: z.number().int().positive(), status: z.enum(["started", "completed"]), questionCount: z.number().int().min(0).optional(), documentViewed: z.boolean().optional() })).mutation(({ ctx, input }) => markOutcomeProgress({ ...input, userId: ctx.user.id })),
    submitAttempt: protectedProcedure.input(z.object({ testId: z.number().int().positive(), correctCount: z.number().int().min(0), wrongCount: z.number().int().min(0), blankCount: z.number().int().min(0), score: z.number().int().min(0).max(100), durationSeconds: z.number().int().min(0) })).mutation(async ({ ctx, input }) => { await createTestAttempt({ ...input, userId: ctx.user.id }); return { success: true }; }),
  }),
  tests: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await assertSectionAccess(ctx.user, "Testler");
      return listTests();
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        const result = await deleteTest(input.id);
        await recordAuditLog({ action: "delete", targetType: "test", targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "success" });
        return result;
      } catch (error) {
        await recordAuditLog({ action: "delete", targetType: "test", targetId: input.id, actorId: ctx.user.id, actorName: ctx.user.name, status: "failed", reason: error instanceof Error ? error.message : "Bilinmeyen hata" });
        throw error;
      }
    }),
    bulkRemove: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
      const results = await Promise.allSettled(input.ids.map(id => deleteTest(id)));
      const failed = results.filter(item => item.status === "rejected").length;
      await recordAuditLog({ action: "bulk_delete", targetType: "test", actorId: ctx.user.id, actorName: ctx.user.name, status: failed ? "failed" : "success", reason: failed ? `${failed} kayıt silinemedi.` : null, metadata: { ids: input.ids, deleted: input.ids.length - failed } });
      return { success: failed === 0, deleted: input.ids.length - failed, failed };
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      description: z.string().trim().max(1000).optional(),
      coverImageUrl: z.string().url().max(700).nullable().optional(),
      durationMinutes: z.number().int().min(1).max(240).default(20),
      categoryId: z.number().int().positive(),
      institutionCategoryId: z.number().int().positive().nullable().optional(),
      questionIds: z.array(z.number().int().positive()).min(1).max(500),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Testler");
      await createTest({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
    appendQuestions: protectedProcedure.input(z.object({
      testId: z.number().int().positive(),
      questionIds: z.array(z.number().int().positive()).min(1).max(500),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Testler");
      const result = await appendQuestionsToTest(input.testId, input.questionIds);
      return { success: true, ...result };
    }),
  }),
  ai: router({
    prepareSourceContext: protectedProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(255),
      storageKey: z.string().trim().min(1).max(500),
      mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const prefix = `okulblog/${ctx.user.id}/question-import-staging/`;
      if (!input.storageKey.startsWith(prefix)) throw new TRPCError({ code: "FORBIDDEN", message: "Bu AI kaynak staging kaydına erişilemiyor." });
      const signedUrl = await storageGetSignedUrl(input.storageKey);
      const response = await fetch(signedUrl);
      if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "AI kaynak dosyası okunamadı." });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "AI kaynak dosyası en fazla 20 MB olabilir." });
      return extractAiSourceText(buffer, input.fileName, input.mimeType);
    }),
    generateSeoSuggestion: adminProcedure.input(z.object({
      title: z.string().trim().min(1).max(220),
      content: z.string().trim().min(20).max(12000),
      provider: z.enum(["openai", "gemini"]).default("openai"),
      model: z.string().trim().max(120).optional(),
    })).mutation(async ({ input }) => generateSeoSuggestion(input)),
    generateQuestion: protectedProcedure.input(z.object({
      topic: z.string().trim().min(3).max(300),
      questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      gradeLevel: z.string().trim().max(80).optional(),
      categoryId: z.number().int().positive(),
      provider: z.enum(["openai", "gemini"]).default("openai"),
      model: z.string().trim().max(120).optional(),
      promptTemplate: z.string().trim().max(5000).optional(),
      sourceContext: z.string().trim().max(12000).optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const { provider, model, ...legacyInput } = input;
      const draft = await generateQuestionDraft({
        ...legacyInput,
        ...(provider !== "openai" ? { provider } : {}),
          ...(model ? { model } : {}),
          ...(input.promptTemplate ? { promptTemplate: input.promptTemplate } : {}),
          ...(input.sourceContext ? { sourceContext: input.sourceContext } : {}),
        });
      return draft;
    }),
    generateTest: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      topic: z.string().trim().min(3).max(300),
      count: z.number().int().min(2).max(20),
      questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      gradeLevel: z.string().trim().max(80).optional(),
      categoryId: z.number().int().positive(),
      provider: z.enum(["openai", "gemini"]).default("openai"),
      model: z.string().trim().max(120).optional(),
      previewOnly: z.boolean().default(false),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      await assertSectionAccess(ctx.user, "Testler");
      const drafts: Array<{ prompt: string; options?: string[]; answer?: string; explanation?: string }> = [];
      const questionIds: number[] = [];
      for (let index = 0; index < input.count; index += 1) {
        const { provider, model, ...legacyInput } = input;
        const draft = await generateQuestionDraft({
          ...legacyInput,
          ...(provider !== "openai" ? { provider } : {}),
          ...(model ? { model } : {}),
        });
        drafts.push({ prompt: draft.prompt, options: draft.options ?? undefined, answer: draft.answer ?? undefined, explanation: draft.explanation ?? undefined });
        if (!input.previewOnly) {
          const id = await createQuestion({ ...draft, topicTag: input.topic, gradeLevel: input.gradeLevel ?? null, categoryId: input.categoryId ?? null, difficulty: input.difficulty, createdBy: ctx.user.id });
          questionIds.push(id);
        }
      }
      if (!input.previewOnly) {
        await createTest({ title: input.title, description: `${input.topic} konusu için AI tarafından oluşturulan taslak test.`, categoryId: input.categoryId ?? null, questionIds, createdBy: ctx.user.id });
      }
      return { title: input.title, questionIds, questionCount: drafts.length, status: input.previewOnly ? "preview" as const : "draft" as const, drafts };
    }),
  }),
  exports: router({
    questions: protectedProcedure.input(z.object({
      format: z.enum(["pdf", "doc"]),
      title: z.string().trim().min(1).max(220),
      questions: z.array(z.object({ prompt: z.string().trim().min(1).max(5000), options: z.array(z.string().max(500)).max(6).optional(), answer: z.string().max(1000).optional(), explanation: z.string().max(2000).optional() })).min(1).max(100),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const file = buildExportFile(input.format, input.title, input.questions);
      return { fileName: `${input.title.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80)}.${file.extension}`, mimeType: file.mimeType, dataBase64: file.buffer.toString("base64") };
    }),
    test: protectedProcedure.input(z.object({
      format: z.enum(["pdf", "doc"]),
      title: z.string().trim().min(1).max(220),
      questions: z.array(z.object({ prompt: z.string().trim().min(1).max(5000), options: z.array(z.string().max(500)).max(6).optional(), answer: z.string().max(1000).optional(), explanation: z.string().max(2000).optional() })).min(1).max(100),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Testler");
      const file = buildExportFile(input.format, input.title, input.questions);
      return { fileName: `${input.title.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80)}.${file.extension}`, mimeType: file.mimeType, dataBase64: file.buffer.toString("base64") };
    }),
  }),
  files: router({
    parseQuestionPdf: protectedProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.literal("application/pdf"),
      dataBase64: z.string().min(1),
      topicTag: z.string().trim().max(180).nullable().optional(),
      gradeLevel: z.string().trim().max(80).nullable().optional(),
      categoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const buffer = Buffer.from(input.dataBase64, "base64");
      if (buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "PDF dosyası en fazla 20 MB olabilir." });
      const parsed = await parsePdfQuestions(buffer, input.fileName);
      const questions = await Promise.all(parsed.questions.map(async (question, index) => {
        if (!question.embeddedImageDataBase64) return question;
        const imageBuffer = Buffer.from(question.embeddedImageDataBase64, "base64");
        const image = await storagePut(`okulblog/${ctx.user.id}/question-imports/${safeFileStem(input.fileName)}-q${question.sourceNumber || index + 1}.webp`, imageBuffer, "image/webp");
        return { ...question, embeddedImageDataBase64: null, embeddedImageUrl: image.url };
      }));
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const stored = await storagePut(`okulblog/${ctx.user.id}/question-imports/${safeName}`, buffer, "application/pdf");
      await createStoredFile({ fileName: input.fileName, storageKey: stored.key, publicUrl: stored.url, mimeType: "application/pdf", sizeBytes: buffer.byteLength, uploadedBy: ctx.user.id });
      return { ...parsed, questions, topicTag: input.topicTag ?? null, gradeLevel: input.gradeLevel ?? null, categoryId: input.categoryId ?? null, originalFileUrl: stored.url };
    }),
    stageQuestionPdf: protectedProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(255),
      dataBase64: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const buffer = Buffer.from(input.dataBase64, "base64");
      if (buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "PDF dosyası en fazla 20 MB olabilir." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const stored = await storagePut(`okulblog/${ctx.user.id}/question-import-staging/${safeName}`, buffer, "application/pdf");
      return { fileName: input.fileName, storageKey: stored.key, publicUrl: stored.url, sizeBytes: buffer.byteLength };
    }),
    parseQuestionPdfPairFromStorage: protectedProcedure.input(z.object({
      questionFileName: z.string().trim().min(1).max(255),
      questionStorageKey: z.string().trim().min(1).max(500),
      questionMimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]).default("application/pdf"),
      answerKeyFileName: z.string().trim().min(1).max(255),
      answerKeyStorageKey: z.string().trim().min(1).max(500),
      answerKeyMimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]).default("application/pdf"),
      topicTag: z.string().trim().max(180).nullable().optional(),
      gradeLevel: z.string().trim().max(80).nullable().optional(),
      categoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const prefix = `okulblog/${ctx.user.id}/question-import-staging/`;
      if (!input.questionStorageKey.startsWith(prefix) || !input.answerKeyStorageKey.startsWith(prefix)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Bu manuel içe aktarma staging kaydına erişilemiyor." });
      }
      if (input.questionMimeType !== input.answerKeyMimeType) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Soru ve cevap dosyası aynı türde olmalıdır: ikisi de PDF veya ikisi de görsel." });
      }
      const [questionSignedUrl, answerSignedUrl] = await Promise.all([
        storageGetSignedUrl(input.questionStorageKey),
        storageGetSignedUrl(input.answerKeyStorageKey),
      ]);
      const [questionResponse, answerResponse] = await Promise.all([fetch(questionSignedUrl), fetch(answerSignedUrl)]);
      if (!questionResponse.ok || !answerResponse.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "Manuel içe aktarma dosyaları okunamadı." });
      const [questionBuffer, answerKeyBuffer] = await Promise.all([
        questionResponse.arrayBuffer().then(buffer => Buffer.from(buffer)),
        answerResponse.arrayBuffer().then(buffer => Buffer.from(buffer)),
      ]);
      if (questionBuffer.byteLength > 20 * 1024 * 1024 || answerKeyBuffer.byteLength > 20 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Her dosya en fazla 20 MB olabilir." });
      }
      const parsed = input.questionMimeType === "application/pdf"
        ? await parsePdfQuestionPair(questionBuffer, input.questionFileName, answerKeyBuffer, input.answerKeyFileName)
        : await parseImageQuestionPair(questionBuffer, input.questionFileName, answerKeyBuffer, input.answerKeyFileName);
      return { ...parsed, topicTag: input.topicTag ?? null, gradeLevel: input.gradeLevel ?? null, categoryId: input.categoryId ?? null };
    }),
    parseQuestionPdfPair: protectedProcedure.input(z.object({
      questionFileName: z.string().trim().min(1).max(255),
      questionDataBase64: z.string().min(1),
      answerKeyFileName: z.string().trim().min(1).max(255),
      answerKeyDataBase64: z.string().min(1),
      topicTag: z.string().trim().max(180).nullable().optional(),
      gradeLevel: z.string().trim().max(80).nullable().optional(),
      categoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const questionBuffer = Buffer.from(input.questionDataBase64, "base64");
      const answerKeyBuffer = Buffer.from(input.answerKeyDataBase64, "base64");
      if (questionBuffer.byteLength > 20 * 1024 * 1024 || answerKeyBuffer.byteLength > 20 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Her PDF dosyası en fazla 20 MB olabilir." });
      }
      const parsed = await parsePdfQuestionPair(questionBuffer, input.questionFileName, answerKeyBuffer, input.answerKeyFileName);
      return { ...parsed, topicTag: input.topicTag ?? null, gradeLevel: input.gradeLevel ?? null, categoryId: input.categoryId ?? null };
    }),
    upload: protectedProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().max(120),
      dataBase64: z.string().min(1),
      targetSection: z.enum(["Dokümanlar", "Videolar", "Simülasyonlar", "Oyunlar"]),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, input.targetSection);
      const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!allowedMimeTypes.includes(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Bu dosya türüne izin verilmiyor." });
      }
      const buffer = Buffer.from(input.dataBase64, "base64");
      if (buffer.byteLength > 20 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Dosya boyutu en fazla 20 MB olabilir." });
      }
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const result = await storagePut(`okulblog/${ctx.user.id}/${safeName}`, buffer, input.mimeType);
      await createStoredFile({ fileName: input.fileName, storageKey: result.key, publicUrl: result.url, mimeType: input.mimeType, sizeBytes: buffer.byteLength, uploadedBy: ctx.user.id });
      if (input.mimeType === "application/pdf") {
        const coverBuffer = await renderPdfCover(buffer);
        const cover = await storagePut(`okulblog/${ctx.user.id}/covers/${safeFileStem(input.fileName)}-cover.webp`, coverBuffer, "image/webp");
        return { ...result, coverImageUrl: cover.url, coverGenerated: true as const };
      }
      return { ...result, coverImageUrl: null, coverGenerated: false as const };
    }),
  }),
  audit: router({
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(250).optional() }).optional()).query(({ input }) => listAuditLogs(input?.limit ?? 100)),
  }),
  security: router({
    list: adminProcedure.query(() => listSecurityEvents()),
    report: protectedProcedure.input(z.object({
      eventType: z.string().trim().min(3).max(120),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string().trim().min(5).max(2000),
    })).mutation(async ({ input }) => {
      await recordSecurityEvent(input);
      if (input.severity === "high" || input.severity === "critical") {
        await notifyOwner({ title: `OkulBlog güvenlik uyarısı: ${input.severity === "critical" ? "Kritik" : "Yüksek"}`, content: `${input.eventType}: ${input.description}` });
      }
      return { success: true };
    }),
  }),
  admin: router({
    users: adminProcedure.query(() => listUsersForAdmin()),
    updateUserRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["admin", "teacher", "moderator", "member"]) })).mutation(async ({ input }) => {
      await updateUserRole(input);
      return { success: true };
    }),
    settings: adminProcedure.query(() => listSiteSettings()),
    aiProviderStatus: adminProcedure.query(async () => {
      const config = getAiProviderConfig({ OPENAI_API_KEY: process.env.OPENAI_API_KEY, GEMINI_API_KEY: process.env.GEMINI_API_KEY });
      const catalog = await listLLMModels();
      return {
        openai: { configured: config.openai.configured, maskedKey: maskSecret(config.openai.apiKey), models: catalog.data.filter(item => item.id.startsWith("gpt-")).map(item => item.id) },
        gemini: { configured: config.gemini.configured, maskedKey: maskSecret(config.gemini.apiKey), models: catalog.data.filter(item => item.id.startsWith("gemini-")).map(item => item.id) },
      };
    }),
    listAiProviderModels: adminProcedure.input(z.object({ provider: z.enum(["openai", "gemini"]) })).query(async ({ input }) => {
      const apiKey = input.provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY;
      const result = await listProviderModels(input.provider, apiKey);
      return { ...result, models: result.models.map(({ id, displayName, provider, description, inputTokenLimit, outputTokenLimit, supportsText, supportsVision, supportsStructuredOutput, generationCompatible, source }) => ({ id, displayName, provider, description, inputTokenLimit, outputTokenLimit, supportsText, supportsVision, supportsStructuredOutput, generationCompatible, source })) };
    }),
    testAiProviderConnection: adminProcedure.input(z.object({ provider: z.enum(["openai", "gemini"]), model: z.string().trim().max(120).optional() })).mutation(async ({ input }) => {
      const config = getAiProviderConfig({ OPENAI_API_KEY: process.env.OPENAI_API_KEY, GEMINI_API_KEY: process.env.GEMINI_API_KEY });
      const selected = config[input.provider];
      if (!selected.configured) return { success: false as const, configured: false as const, message: "API anahtarı henüz girilmedi." };
      try {
        const response = await invokeLLM({ model: input.model || selected.defaultModel, maxTokens: 80, messages: [{ role: "user", content: "Yalnızca OK yanıtı ver." }] });
        const content = response.choices[0]?.message.content;
        return { success: Boolean(content), configured: true as const, message: content ? "Bağlantı ve model yanıtı başarılı." : "Model boş yanıt döndürdü." };
      } catch {
        return { success: false as const, configured: true as const, message: "Sağlayıcı bağlantısı başarısız. Model ve API anahtarını kontrol edin." };
      }
    }),
    searchConsoleStatus: adminProcedure.query(async () => {
      const rows = await listSiteSettings();
      const values = Object.fromEntries(rows.map(row => [row.settingKey, row.settingValue ?? ""]));
      return {
        configured: Boolean(values.search_console_property_url),
        propertyUrl: values.search_console_property_url || null,
        verificationStatus: values.search_console_verification_status || "not_configured",
        sitemapStatus: values.search_console_sitemap_status || "not_configured",
        lastError: values.search_console_last_error || null,
      };
    }),
    searchConsoleAuthorization: adminProcedure.query(() => {
      const missingConfig = getSearchConsoleMissingConfig();
      if (missingConfig.length > 0) return { configured: false as const, authorizationUrl: null, missingConfig };
      const state = createSearchConsoleOAuthState();
      return { configured: true as const, authorizationUrl: buildSearchConsoleAuthorizationUrl(state), missingConfig: [] as string[] };
    }),
    searchConsoleOAuthCallback: adminProcedure.input(z.object({ code: z.string().trim().min(8).max(4000), state: z.string().trim().min(20).max(2000), propertyUrl: z.string().trim().url().max(700) })).mutation(async ({ ctx, input }) => {
      if (!verifySearchConsoleOAuthState(input.state)) throw new TRPCError({ code: "BAD_REQUEST", message: "Search Console OAuth state doğrulanamadı veya süresi doldu." });
      try {
        const token = await exchangeSearchConsoleCode(input.code);
        await upsertSearchConsoleToken({ propertyUrl: input.propertyUrl, encryptedAccessToken: encryptSearchConsoleToken(token.access_token), encryptedRefreshToken: token.refresh_token ? encryptSearchConsoleToken(token.refresh_token) : null, accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, scopes: "https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/webmasters.readonly", createdBy: ctx.user.id });
        await saveSiteSetting({ settingKey: "search_console_property_url", settingValue: input.propertyUrl, updatedBy: ctx.user.id });
        return { ...getSearchConsoleTokenMetadata(token), propertyUrl: input.propertyUrl, message: "Google Search Console bağlantısı kuruldu. Tokenlar şifreli olarak sunucuda saklandı." };
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Search Console OAuth kodu doğrulanamadı veya token kaydedilemedi." });
      }
    }),
    testProviderConnection: adminProcedure.input(z.object({
      provider: z.enum(["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream", "bunny-dns", "bunny-pull-zone", "adsense", "search-console", "google-analytics", "youtube", "video-source"]),
      config: z.object({
        apiKey: z.string().trim().max(500).optional(),
        apiSecret: z.string().trim().max(500).optional(),
        accessKeyId: z.string().trim().max(500).optional(),
        secretAccessKey: z.string().trim().max(500).optional(),
        bucketName: z.string().trim().max(255).optional(),
        storageZone: z.string().trim().max(255).optional(),
        streamLibraryId: z.string().trim().max(255).optional(),
        dnsZoneId: z.string().trim().max(255).optional(),
        pullZoneId: z.string().trim().max(255).optional(),
        cdnHostname: z.string().trim().max(500).optional(),
        originUrl: z.string().trim().url().max(900).optional(),
        zoneSecurityKey: z.string().trim().max(500).optional(),
        customDomain: z.string().trim().max(255).optional(),
        region: z.string().trim().max(120).optional(),
        endpoint: z.string().trim().url().max(900).optional(),
        clientId: z.string().trim().max(500).optional(),
        clientSecret: z.string().trim().max(500).optional(),
        sharedDriveId: z.string().trim().max(255).optional(),
        propertyId: z.string().trim().max(255).optional(),
        measurementId: z.string().trim().max(255).optional(),
        channelId: z.string().trim().max(255).optional(),
        channelUrl: z.string().trim().url().max(900).optional(),
        videoUrl: z.string().trim().url().max(900).optional(),
        embedUrl: z.string().trim().url().max(900).optional(),
        redirectUri: z.string().trim().max(900).optional(),
        siteUrl: z.string().trim().max(700).optional(),
      }).optional(),
    })).mutation(async ({ input }) => {
      const settings = await listSiteSettings();
      const config = input.config ?? {};
      const has = (...values: Array<string | undefined>) => values.some(value => Boolean(value?.trim()));
      const requiredKeys: Record<string, string[]> = {
        s3: [],
        "google-drive-personal": ["google_client_id", "google_client_secret"],
        "google-drive-workspace": ["google_client_id", "google_client_secret", "google_drive_shared_id"],
        "bunny-storage": ["bunny_api_key", "bunny_storage_zone"],
        "bunny-stream": ["bunny_api_key", "bunny_stream_library_id"],
        "bunny-dns": ["bunny_api_key", "bunny_dns_zone_id"],
        "bunny-pull-zone": ["bunny_api_key", "bunny_pull_zone_id", "bunny_pull_zone_hostname", "bunny_pull_zone_origin"],
        adsense: ["adsense_publisher_id"],
        "search-console": ["google_client_id", "google_client_secret", "search_console_property"],
        "google-analytics": ["analytics_measurement_id", "analytics_property_id"],
        youtube: ["youtube_api_key", "youtube_channel_id"],
        "video-source": ["video_source_url"],
      };
      const configuredKeys = new Set(settings.filter(item => typeof item.settingValue === "string" && item.settingValue.trim().length > 0).map(item => item.settingKey));
      const hasSettingOrInput = (settingKey: string, ...inputValues: Array<string | undefined>) => configuredKeys.has(settingKey) || has(...inputValues);
      const missing = input.provider === "s3"
        ? []
        : input.provider === "google-drive-personal"
          ? [
              ...(hasSettingOrInput("google_client_id", config.clientId) ? [] : ["clientId"]),
              ...(hasSettingOrInput("google_client_secret", config.clientSecret) ? [] : ["clientSecret"]),
            ]
          : input.provider === "google-drive-workspace"
            ? [
                ...(hasSettingOrInput("google_client_id", config.clientId) ? [] : ["clientId"]),
                ...(hasSettingOrInput("google_client_secret", config.clientSecret) ? [] : ["clientSecret"]),
                ...(hasSettingOrInput("google_drive_shared_id", config.sharedDriveId) ? [] : ["sharedDriveId"]),
              ]
            : input.provider === "bunny-storage"
              ? [
                  ...(hasSettingOrInput("bunny_api_key", config.apiKey) ? [] : ["apiKey"]),
                  ...(hasSettingOrInput("bunny_storage_zone", config.storageZone) ? [] : ["storageZone"]),
                ]
              : input.provider === "bunny-stream"
                ? [
                    ...(hasSettingOrInput("bunny_api_key", config.apiKey) ? [] : ["apiKey"]),
                    ...(hasSettingOrInput("bunny_stream_library_id", config.streamLibraryId) ? [] : ["streamLibraryId"]),
                  ]
                : input.provider === "bunny-dns"
                  ? [
                      ...(hasSettingOrInput("bunny_api_key", config.apiKey) ? [] : ["apiKey"]),
                      ...(hasSettingOrInput("bunny_dns_zone_id", config.dnsZoneId) ? [] : ["dnsZoneId"]),
                    ]
                  : input.provider === "bunny-pull-zone"
                    ? [
                        ...(hasSettingOrInput("bunny_api_key", config.apiKey) ? [] : ["apiKey"]),
                        ...(hasSettingOrInput("bunny_pull_zone_id", config.pullZoneId) ? [] : ["pullZoneId"]),
                        ...(hasSettingOrInput("bunny_pull_zone_hostname", config.cdnHostname) ? [] : ["cdnHostname"]),
                        ...(hasSettingOrInput("bunny_pull_zone_origin", config.originUrl) ? [] : ["originUrl"]),
                      ]
                          : input.provider === "search-console"
                            ? [
                                ...(hasSettingOrInput("google_client_id", config.clientId) ? [] : ["clientId"]),
                                ...(hasSettingOrInput("google_client_secret", config.clientSecret) ? [] : ["clientSecret"]),
                                ...(hasSettingOrInput("google_oauth_redirect_uri", config.redirectUri) ? [] : ["redirectUri"]),
                                ...(hasSettingOrInput("search_console_property", config.siteUrl) ? [] : ["siteUrl"]),
                              ]
                            : input.provider === "google-analytics"
                            ? [
                          ...(hasSettingOrInput("analytics_measurement_id", config.measurementId) ? [] : ["measurementId"]),
                          ...(hasSettingOrInput("analytics_property_id", config.propertyId) ? [] : ["propertyId"]),
                        ]
                      : input.provider === "youtube"
                        ? [
                            ...(hasSettingOrInput("youtube_api_key", config.apiKey) ? [] : ["apiKey"]),
                            ...(hasSettingOrInput("youtube_channel_id", config.channelId) || has(config.channelUrl) ? [] : ["channelIdOrUrl"]),
                          ]
                        : input.provider === "video-source"
                          ? [
                              ...(hasSettingOrInput("video_source_url", config.videoUrl) ? [] : ["videoUrl"]),
                              ...(has(config.embedUrl) ? [] : ["embedUrl"]),
                            ]
                          : requiredKeys[input.provider].filter(key => !configuredKeys.has(key));
      return {
        provider: input.provider,
        configured: missing.length === 0,
        status: missing.length === 0 ? "ready" : "not_configured",
        missingKeys: missing,
        credentialSource: Object.keys(config).length ? "temporary_form" : (missing.length === 0 ? "server_settings" : "missing"),
        message: missing.length === 0 ? "Alanlar doğrulandı. Secret değerleri sunucu yanıtında gösterilmez." : "Eksik alanları doldurun veya hosting sonrası sunucu ayarlarını yapılandırın.",
      };
    }),
    mediaAssets: adminProcedure.input(z.object({ provider: z.enum(["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]).optional(), contentType: z.enum(["test", "document", "video", "simulation", "game", "news", "general"]).optional() }).optional()).query(({ input }) => listMediaAssets(input)),
    contentMissingCovers: adminProcedure.input(z.object({ categoryId: z.number().int().positive().optional(), contentType: z.enum(["test", "document", "video", "simulation", "game", "news"]).optional() }).optional()).query(({ input }) => listContentMissingCovers(input)),
    bulkAssignContentCover: adminProcedure.input(z.object({ contentIds: z.array(z.number().int().positive()).min(1).max(100), mediaAssetId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const result = await bulkAssignContentCover(input); await recordSecurityEvent({ eventType: "content_bulk_cover_assigned", severity: "low", description: "Kapaksız yayınlanmış içeriklere toplu kapak atandı.", metadata: { ...input, updated: result.updated, updatedBy: ctx.user.id } }); return result; }),
    createMediaAsset: adminProcedure.input(z.object({ provider: z.enum(["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]), providerAssetId: z.string().trim().max(500).optional().nullable(), fileName: z.string().trim().min(1).max(255), publicUrl: z.string().trim().url().max(900).optional().nullable(), mimeType: z.string().trim().min(1).max(120), sizeBytes: z.number().int().nonnegative().optional().nullable(), folderPath: z.string().trim().max(500).optional().nullable(), contentType: z.enum(["test", "document", "video", "simulation", "game", "news", "general"]).default("general"), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => { await createMediaAsset({ ...input, uploadedBy: ctx.user.id }); return { success: true }; }),
    uploadMediaAsset: adminProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(120), dataBase64: z.string().min(1), contentType: z.enum(["test", "document", "video", "simulation", "game", "news", "general"]).default("general") })).mutation(async ({ ctx, input }) => { const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]; if (!allowedMimeTypes.includes(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Bu dosya türüne izin verilmiyor." }); const buffer = Buffer.from(input.dataBase64, "base64"); if (buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Dosya boyutu en fazla 20 MB olabilir." }); const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-"); const result = await storagePut(`okulblog/media/${ctx.user.id}/${safeName}`, buffer, input.mimeType); await createMediaAsset({ provider: "s3", providerAssetId: result.key, fileName: input.fileName, publicUrl: result.url, mimeType: input.mimeType, sizeBytes: buffer.byteLength, contentType: input.contentType, metadata: { storageKey: result.key }, uploadedBy: ctx.user.id }); if (input.mimeType === "application/pdf") { const coverBuffer = await renderPdfCover(buffer); const cover = await storagePut(`okulblog/media/${ctx.user.id}/covers/${safeFileStem(input.fileName)}-cover.webp`, coverBuffer, "image/webp"); return { ...result, coverImageUrl: cover.url, coverGenerated: true as const }; } return { ...result, coverImageUrl: null, coverGenerated: false as const }; }),
    importDocumentFromUrl: adminProcedure.input(z.object({ sourceUrl: z.string().trim().url().max(1200), fileName: z.string().trim().max(255).optional(), contentType: z.enum(["document"]).default("document") })).mutation(async ({ ctx, input }) => {
      let sourceUrl: URL;
      try { sourceUrl = validateRemoteDocumentUrl(input.sourceUrl); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Geçersiz kaynak URL." }); }
      const response = await fetch(sourceUrl, { redirect: "manual", signal: AbortSignal.timeout(45_000), headers: { "User-Agent": "OkulBlogDocumentImporter/1.0" } });
      if (!response.ok || response.headers.get("location")) throw new TRPCError({ code: "BAD_REQUEST", message: "Kaynak dosya doğrudan indirilebilir olmalı; yönlendirmeli veya başarısız bağlantılar kabul edilmiyor." });
      const mimeType = (response.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
      if (!ALLOWED_REMOTE_DOCUMENT_TYPES.has(mimeType)) throw new TRPCError({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Yalnızca PDF, DOCX ve PPTX dokümanları içe aktarılabilir." });
      const declaredSize = Number(response.headers.get("content-length") || 0);
      if (declaredSize > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Doküman boyutu en fazla 20 MB olabilir." });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength === 0 || buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Doküman boyutu geçersiz veya 20 MB sınırını aşıyor." });
      const settings = await listSiteSettings();
      const settingMap = new Map(settings.map(item => [item.settingKey, item.settingValue]));
      const activeProvider = settingMap.get("active_storage_provider") || "s3";
      const originalName = input.fileName || sourceUrl.pathname.split("/").pop() || "dokuman.pdf";
      let provider: "s3" | "bunny-storage" = "s3";
      let providerAssetId: string;
      let publicUrl: string;
      let coverImageUrl: string | null = null;
      if (activeProvider === "bunny-storage") {
        const storageZone = settingMap.get("bunny_storage_zone") || process.env.BUNNY_STORAGE_ZONE;
        const accessKey = settingMap.get("bunny_storage_access_key") || process.env.BUNNY_STORAGE_ACCESS_KEY;
        const pullZoneUrl = settingMap.get("bunny_pull_zone_url") || process.env.BUNNY_PULL_ZONE_URL;
        if (!storageZone || !accessKey || !pullZoneUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aktif Bunny depolama için Storage Zone, AccessKey ve Pull Zone bilgileri eksik." });
        const uploaded = await uploadToBunnyStorage({ data: buffer, fileName: originalName, mimeType, storageZone, accessKey, pullZoneUrl, endpoint: settingMap.get("bunny_storage_endpoint") || undefined });
        provider = "bunny-storage"; providerAssetId = uploaded.providerAssetId; publicUrl = uploaded.publicUrl;
      } else {
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploaded = await storagePut(`okulblog/imported/${ctx.user.id}/${safeName}`, buffer, mimeType);
        providerAssetId = uploaded.key; publicUrl = uploaded.url;
      }
      if (mimeType === "application/pdf") {
        const coverBuffer = await renderPdfCover(buffer);
        const cover = provider === "s3" ? await storagePut(`okulblog/imported/${ctx.user.id}/covers/${safeFileStem(originalName)}-cover.webp`, coverBuffer, "image/webp") : null;
        coverImageUrl = cover?.url ?? null;
      }
      await createMediaAsset({ provider, providerAssetId, fileName: originalName, publicUrl, mimeType, sizeBytes: buffer.byteLength, contentType: input.contentType, metadata: { sourceUrl: input.sourceUrl, activeProvider, coverImageUrl }, uploadedBy: ctx.user.id });
      await recordSecurityEvent({ eventType: "document_imported", severity: "low", description: "Admin URL üzerinden doküman içe aktardı.", metadata: { sourceUrl: input.sourceUrl, provider, providerAssetId, mimeType, sizeBytes: buffer.byteLength, actorId: ctx.user.id } });
      return { success: true, provider, providerAssetId, publicUrl, coverImageUrl, fileName: originalName, mimeType, sizeBytes: buffer.byteLength, sourceUrl: input.sourceUrl };
    }),
    importDocumentDraftFromUrl: adminProcedure.input(z.object({ sourceUrl: z.string().trim().url().max(1200), fileName: z.string().trim().max(255).optional(), analyzeWithAi: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      const historyId = await createDocumentImportHistory({ sourceUrl: input.sourceUrl, fileName: input.fileName ?? null, status: "downloading", requestedBy: ctx.user.id });
      try {
      let sourceUrl: URL;
      try { sourceUrl = validateRemoteDocumentUrl(input.sourceUrl); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Geçersiz kaynak URL." }); }
      const response = await fetch(sourceUrl, { redirect: "manual", signal: AbortSignal.timeout(45_000), headers: { "User-Agent": "OkulBlogDocumentImporter/1.0" } });
      if (!response.ok || response.headers.get("location")) throw new TRPCError({ code: "BAD_REQUEST", message: "Kaynak dosya doğrudan indirilebilir olmalı." });
      const mimeType = (response.headers.get("content-type") || "").split(";", 1)[0].toLowerCase();
      if (!ALLOWED_REMOTE_DOCUMENT_TYPES.has(mimeType)) throw new TRPCError({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Yalnızca PDF, DOCX ve PPTX dokümanları içe aktarılabilir." });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength === 0 || buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Doküman boyutu en fazla 20 MB olabilir." });
      const settings = await listSiteSettings();
      const settingMap = new Map(settings.map(item => [item.settingKey, item.settingValue]));
      const activeProvider = settingMap.get("active_storage_provider") || "s3";
      const originalName = input.fileName || sourceUrl.pathname.split("/").pop() || "dokuman.pdf";
      let provider: "s3" | "bunny-storage" = "s3";
      let providerAssetId: string;
      let publicUrl: string;
      const uploadPreview = async (data: Buffer, name: string) => {
        if (activeProvider === "bunny-storage") {
          const storageZone = settingMap.get("bunny_storage_zone") || process.env.BUNNY_STORAGE_ZONE;
          const accessKey = settingMap.get("bunny_storage_access_key") || process.env.BUNNY_STORAGE_ACCESS_KEY;
          const pullZoneUrl = settingMap.get("bunny_pull_zone_url") || process.env.BUNNY_PULL_ZONE_URL;
          if (!storageZone || !accessKey || !pullZoneUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aktif Bunny depolama ayarları eksik." });
          return uploadToBunnyStorage({ data, fileName: name, mimeType: "image/webp", storageZone, accessKey, pullZoneUrl, endpoint: settingMap.get("bunny_storage_endpoint") || undefined });
        }
        return storagePut(`okulblog/imported/${ctx.user.id}/previews/${name}`, data, "image/webp");
      };
      if (activeProvider === "bunny-storage") {
        const storageZone = settingMap.get("bunny_storage_zone") || process.env.BUNNY_STORAGE_ZONE;
        const accessKey = settingMap.get("bunny_storage_access_key") || process.env.BUNNY_STORAGE_ACCESS_KEY;
        const pullZoneUrl = settingMap.get("bunny_pull_zone_url") || process.env.BUNNY_PULL_ZONE_URL;
        if (!storageZone || !accessKey || !pullZoneUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aktif Bunny depolama için Storage Zone, AccessKey ve Pull Zone bilgileri eksik." });
        const uploaded = await uploadToBunnyStorage({ data: buffer, fileName: originalName, mimeType, storageZone, accessKey, pullZoneUrl, endpoint: settingMap.get("bunny_storage_endpoint") || undefined });
        provider = "bunny-storage"; providerAssetId = uploaded.providerAssetId; publicUrl = uploaded.publicUrl;
      } else {
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
        const uploaded = await storagePut(`okulblog/imported/${ctx.user.id}/${safeName}`, buffer, mimeType);
        providerAssetId = uploaded.key; publicUrl = uploaded.url;
      }
      let coverImageUrl: string | null = null;
      let previewPages: Array<{ page: number; url: string }> = [];
      let extractedText = "";
      if (mimeType === "application/pdf") {
        const rendered = await withTimeout(
          renderPdfPages(buffer),
          45_000,
          "PDF sayfa ön izlemesi zaman aşımına uğradı; taslak kapaksız oluşturulacak.",
        ).catch(() => ({ pages: [] as Buffer[] }));
        for (let index = 0; index < rendered.pages.length; index += 1) {
          const uploaded = await uploadPreview(rendered.pages[index], `${safeFileStem(originalName)}-page-${String(index + 1).padStart(3, "0")}.webp`);
          previewPages.push({ page: index + 1, url: "url" in uploaded ? uploaded.url : uploaded.publicUrl });
        }
        coverImageUrl = previewPages[0]?.url ?? null;
        extractedText = await withTimeout(
          extractPdfText(buffer),
          30_000,
          "PDF metin çıkarma zaman aşımına uğradı; taslak manuel inceleme için oluşturulacak.",
        ).catch(() => "");
      }
      const mediaAssetId = await createMediaAsset({ provider, providerAssetId, fileName: originalName, publicUrl, mimeType, sizeBytes: buffer.byteLength, contentType: "document", metadata: { sourceUrl: input.sourceUrl, activeProvider, coverImageUrl, previewPages }, uploadedBy: ctx.user.id });
      const fallbackTitle = originalName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const analysis = input.analyzeWithAi ? await withTimeout(
        analyzeDocumentWithOcr({ text: extractedText, previewPages, fallbackTitle }),
        60_000,
        "Belge analizi 60 saniye içinde tamamlanamadı; taslak AI analizi beklemeden oluşturuldu.",
      ).catch(() => ({ extractedText, ocrStatus: "not_started" as const, ocrConfidence: null, title: fallbackTitle, summary: "", tags: [], aiStatus: "failed" as const, aiModel: null, aiError: "AI analizi zaman aşımına uğradı; taslak manuel inceleme için oluşturuldu.", aiSuggestedTitle: null, aiSuggestedSummary: null, aiSuggestedTags: [] })) : { extractedText, ocrStatus: "not_needed" as const, ocrConfidence: null, title: fallbackTitle, summary: "", tags: [], aiStatus: "not_started" as const, aiModel: null, aiError: null, aiSuggestedTitle: null, aiSuggestedSummary: null, aiSuggestedTags: [] };
      const draftId = await createDocumentImportDraft({ mediaAssetId, sourceUrl: input.sourceUrl, title: analysis.title, summary: analysis.summary, tags: analysis.tags, coverImageUrl, previewPages, ocrStatus: analysis.ocrStatus, ocrConfidence: analysis.ocrConfidence, extractedText: analysis.extractedText, aiSuggestedTitle: analysis.aiSuggestedTitle, aiSuggestedSummary: analysis.aiSuggestedSummary, aiSuggestedTags: analysis.aiSuggestedTags, createdBy: ctx.user.id });
      if (analysis.aiStatus !== "not_started" || analysis.ocrStatus !== "not_needed") await updateDocumentImportDraft(draftId, { aiStatus: analysis.aiStatus, aiModel: analysis.aiModel, aiError: analysis.aiError, aiSuggestedTitle: analysis.aiSuggestedTitle, aiSuggestedSummary: analysis.aiSuggestedSummary, aiSuggestedTags: analysis.aiSuggestedTags, ocrStatus: analysis.ocrStatus, ocrConfidence: analysis.ocrConfidence, extractedText: analysis.extractedText });
      await recordSecurityEvent({ eventType: "document_import_draft_created", severity: "low", description: "Admin dokümanı taslak onay kuyruğuna aldı.", metadata: { draftId, mediaAssetId, provider, mimeType, sizeBytes: buffer.byteLength, actorId: ctx.user.id } });
      if (historyId) await updateDocumentImportHistory(historyId, { status: "completed", fileName: originalName, provider, draftId, mediaAssetId, errorMessage: null });
      return { success: true, draftId, mediaAssetId, provider, publicUrl, coverImageUrl, previewPages, fileName: originalName, mimeType, sizeBytes: buffer.byteLength, title: analysis.title, summary: analysis.summary, tags: analysis.tags, aiStatus: analysis.aiStatus, aiError: analysis.aiError, ocrStatus: analysis.ocrStatus, ocrConfidence: analysis.ocrConfidence, aiRequested: input.analyzeWithAi };
      } catch (error) {
        if (historyId) await updateDocumentImportHistory(historyId, { status: "failed", errorMessage: error instanceof Error ? error.message : "PDF aktarımı başarısız." });
        throw error;
      }
    }),
    documentImportHistory: adminProcedure.input(z.object({ limit: z.number().int().positive().max(200).optional() }).optional()).query(({ input }) => listDocumentImportHistory(input?.limit ?? 100)),
    retryDocumentImport: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const history = await getDocumentImportHistory(input.id);
      if (!history) throw new TRPCError({ code: "NOT_FOUND", message: "İşlem kaydı bulunamadı." });
      if (history.status !== "failed" && history.status !== "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Yalnızca başarısız veya iptal edilmiş PDF işlemleri yeniden denenebilir." });
      await updateDocumentImportHistory(input.id, { status: "retried", attempts: (history.attempts ?? 1) + 1, errorMessage: null });
      await recordSecurityEvent({ eventType: "document_import_retried", severity: "low", description: "Başarısız PDF aktarımı yeniden denendi.", metadata: { historyId: input.id, actorId: ctx.user.id } });
      return { success: true, sourceUrl: history.sourceUrl, fileName: history.fileName };
    }),
    cancelStuckDocumentImports: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
      const cutoff = Date.now() - 10 * 60 * 1000;
      const results: Array<{ id: number; success: boolean; error?: string }> = [];
      for (const id of input.ids) {
        try {
          const history = await getDocumentImportHistory(id);
          if (!history) throw new Error("İşlem kaydı bulunamadı.");
          if (history.status !== "queued" && history.status !== "downloading") throw new Error("Yalnızca kuyrukta veya işleniyor durumundaki kayıtlar iptal edilebilir.");
          if (history.updatedAt.getTime() > cutoff) throw new Error("Kayıt henüz 10 dakikalık takılma eşiğini aşmadı.");
          await updateDocumentImportHistory(id, { status: "cancelled", errorMessage: "Admin tarafından toplu olarak iptal edildi." });
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: error instanceof Error ? error.message : "İptal başarısız." });
        }
      }
      await recordSecurityEvent({ eventType: "document_import_cancelled", severity: "medium", description: "Admin takılı PDF aktarım kayıtlarını topluca iptal etti.", metadata: { ids: input.ids, results, actorId: ctx.user.id } });
      return { success: results.some(item => item.success), results };
    }),
    retryDocumentImports: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
      const results: Array<{ id: number; success: boolean; error?: string; sourceUrl?: string; fileName?: string | null }> = [];
      for (const id of input.ids) {
        try {
          const history = await getDocumentImportHistory(id);
          if (!history) throw new Error("İşlem kaydı bulunamadı.");
          if (history.status !== "failed" && history.status !== "cancelled") throw new Error("Yalnızca başarısız veya iptal edilmiş kayıtlar yeniden başlatılabilir.");
          if ((history.attempts ?? 1) >= 4) throw new Error("Maksimum 4 denemeye ulaşıldı.");
          await updateDocumentImportHistory(id, { status: "retried", attempts: (history.attempts ?? 1) + 1, errorMessage: null });
          results.push({ id, success: true, sourceUrl: history.sourceUrl, fileName: history.fileName });
        } catch (error) {
          results.push({ id, success: false, error: error instanceof Error ? error.message : "Yeniden başlatma başarısız." });
        }
      }
      await recordSecurityEvent({ eventType: "document_import_retried", severity: "low", description: "Admin PDF aktarım kayıtlarını topluca yeniden başlattı.", metadata: { ids: input.ids, results, actorId: ctx.user.id } });
      return { success: results.some(item => item.success), results };
    }),
    documentImportDrafts: adminProcedure.input(z.object({ status: z.enum(["draft", "pending", "approved", "rejected"]).optional(), aiStatus: z.enum(["not_started", "processing", "completed", "failed"]).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).optional()).query(({ input }) => listDocumentImportDrafts(input)),
    updateDocumentImportDraft: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(3).max(220), summary: z.string().trim().max(3000).optional().nullable(), tags: z.array(z.string().trim().min(1).max(50)).max(12).default([]), categoryId: z.number().int().positive().optional().nullable(), institutionCategoryId: z.number().int().positive().optional().nullable(), extractedText: z.string().max(14000).optional().nullable(), status: z.enum(["draft", "pending", "rejected"]).optional() })).mutation(async ({ input }) => { const { id, ...data } = input; await updateDocumentImportDraft(id, data); return { success: true }; }),
    reanalyzeDocumentImportDraft: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const draft = await getDocumentImportDraft(input.id); if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Taslak bulunamadı." }); let text = draft.extractedText ?? ""; const pages = Array.isArray(draft.previewPages) ? draft.previewPages as Array<{ page: number; url: string }> : []; if (text.length < 40 && pages.length === 0) { const asset = await getMediaAsset(draft.mediaAssetId); if (asset?.mimeType === "application/pdf" && asset.publicUrl) { const response = await fetch(asset.publicUrl, { signal: AbortSignal.timeout(30_000) }); if (response.ok) text = await extractPdfText(Buffer.from(await response.arrayBuffer())); } } const fallbackTitle = draft.sourceUrl.split("/").pop()?.replace(/[-_]+/g, " ").replace(/\.[^.]+$/, "").trim() || draft.title; const analysis = await analyzeDocumentWithOcr({ text, previewPages: pages, fallbackTitle }); await updateDocumentImportDraft(input.id, { title: analysis.title, summary: analysis.summary, tags: analysis.tags, aiStatus: analysis.aiStatus, aiModel: analysis.aiModel, aiError: analysis.aiError, aiSuggestedTitle: analysis.aiSuggestedTitle, aiSuggestedSummary: analysis.aiSuggestedSummary, aiSuggestedTags: analysis.aiSuggestedTags, ocrStatus: analysis.ocrStatus, ocrConfidence: analysis.ocrConfidence, extractedText: analysis.extractedText }); return { success: true, ...analysis }; }),
    regenerateDocumentImportDraftCover: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const draft = await getDocumentImportDraft(input.id);
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Taslak bulunamadı." });
      const asset = await getMediaAsset(draft.mediaAssetId);
      if (!asset || asset.mimeType !== "application/pdf" || !asset.publicUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Bu taslak için yeniden üretilecek PDF dosyası bulunamadı." });
      const response = await fetch(asset.publicUrl, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "PDF dosyası kapak üretimi için alınamadı." });
      const buffer = Buffer.from(await response.arrayBuffer());
      const coverBuffer = await renderPdfCover(buffer);
      const replacement = describeCoverReplacement(draft.coverImageUrl, `/manus-storage/${getStableDocumentCoverKey(draft.createdBy, asset.fileName || `draft-${input.id}.pdf`)}`);
      const cover = await storagePutStable(getStableDocumentCoverKey(draft.createdBy, asset.fileName || `draft-${input.id}.pdf`), coverBuffer, "image/webp");
      const finalReplacement = describeCoverReplacement(draft.coverImageUrl, cover.url);
      await updateDocumentImportDraft(input.id, { coverImageUrl: cover.url });
      await recordSecurityEvent({ eventType: "document_draft_cover_regenerated", severity: "low", description: "Doküman taslağının kapağı yeniden üretildi; eski sürüm arşivlendi ve kararlı anahtar güncellendi.", metadata: { draftId: input.id, ...finalReplacement, storageKey: cover.key, plannedReplacement: replacement } });
      return { success: true, ...finalReplacement, storageKey: cover.key };
    }),
    revertDocumentImportDraftAi: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const draft = await getDocumentImportDraft(input.id); if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Taslak bulunamadı." }); const fallbackTitle = draft.sourceUrl.split("/").pop()?.replace(/[-_]+/g, " ").replace(/\.[^.]+$/, "").trim() || "İçe aktarılan doküman"; await updateDocumentImportDraft(input.id, { title: fallbackTitle.slice(0, 220), summary: null, tags: [], aiStatus: "not_started", aiModel: null, aiError: null, aiSuggestedTitle: null, aiSuggestedSummary: null, aiSuggestedTags: [] }); return { success: true, title: fallbackTitle }; }),
    approveDocumentImportDraft: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const draft = await getDocumentImportDraft(input.id); if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Taslak bulunamadı." }); if (!draft.categoryId && !draft.institutionCategoryId) throw new TRPCError({ code: "BAD_REQUEST", message: "Yayınlamadan önce bir kategori seçilmelidir." }); if (!draft.coverImageUrl?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Yayınlamadan önce kapak görseli eklenmelidir." }); const asset = await getMediaAsset(draft.mediaAssetId); if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Medya varlığı bulunamadı." }); const contentId = await createContentItem({ title: draft.title, contentType: "document", summary: draft.summary ?? undefined, body: asset.publicUrl ?? "", coverImageUrl: draft.coverImageUrl, categoryId: draft.categoryId, institutionCategoryId: draft.institutionCategoryId, createdBy: ctx.user.id, status: "published" }); await createMediaAssetLink({ mediaAssetId: draft.mediaAssetId, targetType: "content", targetId: contentId, role: "document-file", createdBy: ctx.user.id }); await updateDocumentImportDraft(input.id, { status: "approved", reviewedBy: ctx.user.id, reviewedAt: new Date() }); return { success: true, contentId }; }),
    bulkApproveDocumentImportDrafts: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => { const results: Array<{ id: number; success: boolean; error?: string; contentId?: number }> = []; for (const id of input.ids) { try { const draft = await getDocumentImportDraft(id); if (!draft) throw new Error("Taslak bulunamadı."); if (!draft.categoryId && !draft.institutionCategoryId) throw new Error("Kategori seçilmemiş."); if (!draft.coverImageUrl?.trim()) throw new Error("Kapak görseli eklenmemiş."); const asset = await getMediaAsset(draft.mediaAssetId); if (!asset) throw new Error("Medya varlığı bulunamadı."); const contentId = await createContentItem({ title: draft.title, contentType: "document", summary: draft.summary ?? undefined, body: asset.publicUrl ?? "", coverImageUrl: draft.coverImageUrl, categoryId: draft.categoryId, institutionCategoryId: draft.institutionCategoryId, createdBy: ctx.user.id, status: "published" }); await createMediaAssetLink({ mediaAssetId: draft.mediaAssetId, targetType: "content", targetId: contentId, role: "document-file", createdBy: ctx.user.id }); await updateDocumentImportDraft(id, { status: "approved", reviewedBy: ctx.user.id, reviewedAt: new Date() }); results.push({ id, success: true, contentId }); } catch (error) { results.push({ id, success: false, error: error instanceof Error ? error.message : "Yayınlama başarısız." }); } } return { success: results.every(item => item.success), results }; }),
    bulkRejectDocumentImportDrafts: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), reason: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => { const results: Array<{ id: number; success: boolean; error?: string }> = []; for (const id of input.ids) { try { const draft = await getDocumentImportDraft(id); if (!draft) throw new Error("Taslak bulunamadı."); await updateDocumentImportDraft(id, { status: "rejected", reviewedBy: ctx.user.id, reviewedAt: new Date(), aiError: input.reason }); results.push({ id, success: true }); } catch (error) { results.push({ id, success: false, error: error instanceof Error ? error.message : "Reddetme başarısız." }); } } return { success: results.every(item => item.success), results }; }),
    rejectDocumentImportDraft: adminProcedure.input(z.object({ id: z.number().int().positive(), reason: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => { const draft = await getDocumentImportDraft(input.id); if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Taslak bulunamadı." }); await updateDocumentImportDraft(input.id, { status: "rejected", reviewedBy: ctx.user.id, reviewedAt: new Date(), aiError: input.reason }); return { success: true }; }),
    archiveMediaAsset: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await archiveMediaAsset(input.id); return { success: true }; }),
    linkMediaAsset: adminProcedure.input(z.object({ mediaAssetId: z.number().int().positive(), targetType: z.enum(["content", "test"]), targetId: z.number().int().positive(), role: z.string().trim().min(1).max(80).default("attachment") })).mutation(async ({ ctx, input }) => { const asset = await getMediaAsset(input.mediaAssetId); if (!asset || asset.status === "archived") throw new TRPCError({ code: "NOT_FOUND", message: "Bağlanacak medya varlığı bulunamadı veya arşivlenmiş." }); await createMediaAssetLink({ ...input, createdBy: ctx.user.id }); return { success: true }; }),
    mediaAssetLinks: adminProcedure.input(z.object({ targetType: z.enum(["content", "test"]), targetId: z.number().int().positive() })).query(({ input }) => listMediaAssetLinks(input)),
    unlinkMediaAsset: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { await removeMediaAssetLink(input.id); return { success: true }; }),
    mediaTransferJobs: adminProcedure.query(() => listMediaTransferJobs()),
    createMediaTransferJob: adminProcedure.input(z.object({ mediaAssetId: z.number().int().positive(), sourceProvider: z.enum(["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]), targetProvider: z.enum(["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]), operation: z.enum(["copy", "move"]) })).mutation(async ({ ctx, input }) => { if (input.sourceProvider === input.targetProvider) throw new TRPCError({ code: "BAD_REQUEST", message: "Kaynak ve hedef sağlayıcı farklı olmalıdır." }); const asset = await getMediaAsset(input.mediaAssetId); if (!asset || asset.status === "archived") throw new TRPCError({ code: "NOT_FOUND", message: "Aktarılacak medya varlığı bulunamadı veya arşivlenmiş." }); if (asset.provider !== input.sourceProvider) throw new TRPCError({ code: "BAD_REQUEST", message: "Kaynak sağlayıcı medya varlığıyla eşleşmiyor." }); await createMediaTransferJob({ ...input, requestedBy: ctx.user.id }); await recordSecurityEvent({ eventType: "media_transfer_created", severity: "low", description: "Admin medya aktarım işini kuyruğa aldı.", metadata: { job: input, requestedBy: ctx.user.id } }); return { success: true }; }),
    retryMediaTransferJob: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const job = await getMediaTransferJob(input.id); if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Aktarım işi bulunamadı." }); if (job.status !== "failed" && job.status !== "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "Yalnızca başarısız veya iptal edilmiş işler yeniden kuyruğa alınabilir." }); await updateMediaTransferJob({ id: input.id, status: "queued", progress: 0, errorMessage: null }); await recordSecurityEvent({ eventType: "media_transfer_retried", severity: "low", description: "Admin medya aktarım işini yeniden kuyruğa aldı.", metadata: { jobId: input.id, requestedBy: ctx.user.id } }); return { success: true }; }),
    cancelMediaTransferJob: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const job = await getMediaTransferJob(input.id); if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Aktarım işi bulunamadı." }); if (job.status !== "queued" && job.status !== "running") throw new TRPCError({ code: "BAD_REQUEST", message: "Bu aktarım işi artık iptal edilemez." }); await updateMediaTransferJob({ id: input.id, status: "cancelled", progress: job.progress ?? 0, errorMessage: "Admin tarafından iptal edildi." }); await recordSecurityEvent({ eventType: "media_transfer_cancelled", severity: "medium", description: "Admin medya aktarım işini iptal etti.", metadata: { jobId: input.id, requestedBy: ctx.user.id } }); return { success: true }; }),
    completeMediaTransferJob: adminProcedure.input(z.object({ id: z.number().int().positive(), destinationMediaAssetId: z.number().int().positive().optional(), destinationProviderAssetId: z.string().trim().max(255).optional(), destinationUrl: z.string().trim().url().max(900).optional(), archiveSource: z.boolean().default(true) })).mutation(async ({ ctx, input }) => { const job = await getMediaTransferJob(input.id); if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Aktarım işi bulunamadı." }); if (job.operation !== "move") throw new TRPCError({ code: "BAD_REQUEST", message: "Completion yalnızca taşıma işleri içindir." }); await completeMediaTransferJob(input); await recordSecurityEvent({ eventType: "media_transfer_completed", severity: "medium", description: "Admin medya taşıma işini tamamladı; kaynak ve referans durumu işlendi.", metadata: { jobId: input.id, destinationMediaAssetId: input.destinationMediaAssetId ?? null, requestedBy: ctx.user.id } }); return { success: true }; }),
    googleDriveMissingConfig: adminProcedure.input(z.object({ mode: z.enum(["personal", "workspace"]) })).query(({ input }) => ({ mode: input.mode, missing: getGoogleDriveMissingConfig(input.mode) })),
    googleDriveAuthorizationUrl: adminProcedure.input(z.object({ mode: z.enum(["personal", "workspace"]), state: z.string().trim().min(8).max(200).optional() })).query(({ input }) => { try { return buildGoogleDriveAuthorizationUrl(input.mode, input.state); } catch (error) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Google Drive OAuth yapılandırılmadı." }); } }),
    googleDriveExchangeCode: adminProcedure.input(z.object({ mode: z.enum(["personal", "workspace"]), code: z.string().trim().min(4).max(2000) })).mutation(async ({ input }) => { try { const tokens = await exchangeGoogleDriveCode(input.mode, input.code); return { accessToken: tokens.access_token, expiresIn: tokens.expires_in ?? null, hasRefreshToken: Boolean(tokens.refresh_token) }; } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Google Drive OAuth başarısız." }); } }),
    googleDriveResumableUpload: adminProcedure.input(z.object({ mode: z.enum(["personal", "workspace"]), accessToken: z.string().trim().min(10), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(3).max(120), sizeBytes: z.number().int().positive(), folderId: z.string().trim().max(255).optional() })).mutation(async ({ input }) => { try { return await createGoogleDriveResumableUpload(input); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Google Drive upload oturumu başlatılamadı." }); } }),
    searchConsoleMissingConfig: adminProcedure.query(() => ({ missing: getSearchConsoleMissingConfig() })),
    searchConsoleTokenExchange: adminProcedure.input(z.object({ code: z.string().trim().min(4).max(2000), propertyUrl: z.string().trim().url().max(700) })).mutation(async ({ ctx, input }) => { try { const tokens = await exchangeSearchConsoleCode(input.code); await upsertSearchConsoleToken({ propertyUrl: input.propertyUrl, encryptedAccessToken: encryptSearchConsoleToken(tokens.access_token), encryptedRefreshToken: tokens.refresh_token ? encryptSearchConsoleToken(tokens.refresh_token) : null, accessTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null, createdBy: ctx.user.id }); return { expiresIn: tokens.expires_in ?? null, hasRefreshToken: Boolean(tokens.refresh_token), propertyUrl: input.propertyUrl }; } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Search Console OAuth başarısız." }); } }),
    searchConsoleTokenRefresh: adminProcedure.input(z.object({ propertyUrl: z.string().trim().url().max(700) })).mutation(async ({ input }) => { try { const stored = await getSearchConsoleToken(input.propertyUrl); if (!stored?.encryptedRefreshToken) throw new Error("Bu mülk için yenileme tokenı bulunamadı."); const tokens = await refreshSearchConsoleToken(decryptSearchConsoleToken(stored.encryptedRefreshToken)); await upsertSearchConsoleToken({ propertyUrl: input.propertyUrl, encryptedAccessToken: encryptSearchConsoleToken(tokens.access_token), encryptedRefreshToken: stored.encryptedRefreshToken, accessTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null, createdBy: stored.createdBy }); return { expiresIn: tokens.expires_in ?? null, propertyUrl: input.propertyUrl }; } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Search Console token yenilenemedi." }); } }),
    searchIndexingQueue: adminProcedure.input(z.object({ limit: z.number().int().positive().max(200).optional() }).optional()).query(({ input }) => listSearchIndexingQueue(input?.limit ?? 100)),
    enqueueSearchIndexing: adminProcedure.input(z.object({ url: z.string().trim().url().max(900), entityType: z.string().trim().min(2).max(60), entityId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => ({ id: await enqueueSearchIndexing({ ...input, createdBy: ctx.user.id }) })),
    retrySearchIndexing: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const item = await getSearchIndexingQueueItem(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "İndeksleme kuyruğu kaydı bulunamadı." });
      if (item.status !== "failed" && item.status !== "skipped") throw new TRPCError({ code: "BAD_REQUEST", message: "Yalnızca başarısız veya atlanmış kayıtlar yeniden denenebilir." });
      await updateSearchIndexingQueue(input.id, { status: "pending", lastError: null, nextAttemptAt: null });
      return { success: true };
    }),
    searchConsoleAction: adminProcedure.input(z.object({ action: z.enum(["submit-sitemap", "inspect-url", "request-indexing", "performance", "links"]), siteUrl: z.string().trim().url().max(700), sitemap: z.string().trim().max(700).optional(), url: z.string().trim().url().max(900).optional(), startDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(), endDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional() })).mutation(async ({ input }) => { try { const stored = await getSearchConsoleToken(input.siteUrl); if (!stored) throw new Error("Search Console mülkü için OAuth bağlantısı bulunamadı."); let accessToken = decryptSearchConsoleToken(stored.encryptedAccessToken); if (stored.accessTokenExpiresAt && stored.accessTokenExpiresAt.getTime() <= Date.now() + 60_000 && stored.encryptedRefreshToken) { const refreshed = await refreshSearchConsoleToken(decryptSearchConsoleToken(stored.encryptedRefreshToken)); accessToken = refreshed.access_token; await upsertSearchConsoleToken({ propertyUrl: input.siteUrl, encryptedAccessToken: encryptSearchConsoleToken(accessToken), encryptedRefreshToken: stored.encryptedRefreshToken, accessTokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null, createdBy: stored.createdBy }); } const actions = buildSearchConsoleActions(accessToken, input.siteUrl); if (input.action === "submit-sitemap") return await actions.submitSitemap(input.sitemap ?? "sitemap.xml"); if (input.action === "inspect-url") return await actions.inspectUrl(input.url ?? input.siteUrl); if (input.action === "request-indexing") return await actions.requestIndexing(input.url ?? input.siteUrl); if (input.action === "links") return await actions.links(); return await actions.performance(input.startDate ?? "1970-01-01", input.endDate ?? new Date().toISOString().slice(0, 10)); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Search Console işlemi başarısız." }); } }),
    newsCategories: adminProcedure.query(() => listNewsCategories()),
    createNewsCategory: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120) })).mutation(async ({ input }) => {
      await createNewsCategory(input.name);
      return { success: true };
    }),
    removeNewsCategory: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      return deleteNewsCategory(input.id);
    }),
    saveSetting: adminProcedure.input(z.object({ settingKey: z.string().trim().min(2).max(120), settingValue: z.string().trim().max(4000) })).mutation(async ({ ctx, input }) => {
      if (["adsense_config", "private_ad_campaign", "custom_home_ad"].includes(input.settingKey) && /<script|javascript:/i.test(input.settingValue)) {
        const isAllowedAdSense = input.settingKey === "adsense_config" && input.settingValue.includes("pagead2.googlesyndication.com");
        if (!isAllowedAdSense) throw new TRPCError({ code: "BAD_REQUEST", message: "Reklam kodu güvenlik politikası nedeniyle kaydedilemedi." });
      }
      await saveSiteSetting({ ...input, updatedBy: ctx.user.id });
      if (["adsense_config", "private_ad_campaign", "custom_home_ad"].includes(input.settingKey)) {
        await recordSecurityEvent({ eventType: "ad_setting_changed", severity: "low", description: "Admin reklam ayarını güncelledi.", metadata: { settingKey: input.settingKey, updatedBy: ctx.user.id } });
      }
      return { success: true };
    }),
    qaQuestions: adminProcedure.query(() => listQaQuestions(true)),
    qaAnswers: adminProcedure.query(() => listQaAnswers(undefined, true)),
    setQaStatus: adminProcedure.input(z.object({ entity: z.enum(["question", "answer"]), id: z.number().int().positive(), status: z.enum(["pending", "published", "hidden"]) })).mutation(async ({ input }) => { await setQaStatus(input); return { success: true }; }),
    homeSlides: adminProcedure.query(() => listHomeSlidesForAdmin()),
    popularEducationCategories: adminProcedure.query(async () => ({
      selectedIds: await getPopularEducationCategoryIds(),
      available: await listCategoryNodes("education"),
    })),
    savePopularEducationCategories: adminProcedure.input(z.object({ categoryIds: z.array(z.number().int().positive()).max(12) })).mutation(async ({ ctx, input }) => {
      await savePopularEducationCategoryIds({ categoryIds: input.categoryIds, updatedBy: ctx.user.id });
      return { success: true };
    }),
    createHomeSlide: adminProcedure.input(homeSlideInput).mutation(async ({ ctx, input }) => {
      await createHomeSlide({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
    updateHomeSlide: adminProcedure.input(homeSlideInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await updateHomeSlide(input);
      return { success: true };
    }),
    deleteHomeSlide: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await deleteHomeSlide(input.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
