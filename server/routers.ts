import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCategoryNode,
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
  createStoredFile,
  createTest,
  listTests,
  getContentOverview,
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
  upsertSearchConsoleToken,
  getSearchConsoleToken,
} from "./db";
import { generateQuestionDraft } from "./aiQuestionGenerator";
import { getAiProviderConfig, maskSecret } from "./aiProviderConfig";
import { listProviderModels } from "./aiProviderCatalog";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { parsePdfQuestions } from "./pdfQuestionParser";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { buildGoogleDriveAuthorizationUrl, createGoogleDriveResumableUpload, exchangeGoogleDriveCode, getGoogleDriveMissingConfig } from "./googleDriveProvider";
import { buildSearchConsoleActions, buildSearchConsoleAuthorizationUrl, createSearchConsoleOAuthState, exchangeSearchConsoleCode, getSearchConsoleMissingConfig, getSearchConsoleTokenMetadata, refreshSearchConsoleToken, verifySearchConsoleOAuthState } from "./searchConsoleProvider";
import { decryptSearchConsoleToken, encryptSearchConsoleToken } from "./searchConsoleTokenVault";
import { renderPdfCover } from "./documentCover";
import { buildExportFile } from "./exportDocuments";

export function canManagePopularEducationCategories(role: string | undefined) {
  return role === "admin";
}
function safeFileStem(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.pdf$/i, "").slice(0, 160);
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
    overview: publicProcedure.query(async () => ({
      content: await getContentOverview(),
      approvedQuestions: await listApprovedQuestions(),
      educationCategories: await listCategoryNodes("education"),
      institutionCategories: await listCategoryNodes("institution"),
    })),
    homeSlides: publicProcedure.query(() => listActiveHomeSlides()),
    contentByCategory: publicProcedure.input(z.object({ categoryId: z.number().int().positive() })).query(({ input }) => listContentByCategory(input.categoryId)),
    popularEducationCategories: publicProcedure.query(() => listPopularEducationCategories()),
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
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteCategoryNode(input.id)),
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
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteQuestion(input.id)),
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
    remove: adminProcedure.input(z.object({ id: z.number().int().positive(), contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]) })).mutation(({ input }) => deleteContentItem(input)),
    archive: protectedProcedure.input(z.object({ id: z.number().int().positive(), contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]) })).mutation(async ({ ctx, input }) => {
      const sectionMap = { test: "Testler", document: "Dokümanlar", simulation: "Simülasyonlar", video: "Videolar", game: "Oyunlar", news: "Haberler" } as const;
      await assertSectionAccess(ctx.user, sectionMap[input.contentType]);
      await updateContentStatus({ id: input.id, status: "archived" });
      return { success: true };
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]),
      summary: z.string().trim().max(1000).optional(),
      body: z.string().trim().max(10000).optional(),
      coverImageUrl: z.string().url().max(700).nullable().optional(),
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
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteTest(input.id)),
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      description: z.string().trim().max(1000).optional(),
      coverImageUrl: z.string().url().max(700).nullable().optional(),
      durationMinutes: z.number().int().min(1).max(240).default(20),
      categoryId: z.number().int().positive(),
      institutionCategoryId: z.number().int().positive().nullable().optional(),
      questionIds: z.array(z.number().int().positive()).min(1),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Testler");
      await createTest({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
  }),
  ai: router({
    generateQuestion: protectedProcedure.input(z.object({
      topic: z.string().trim().min(3).max(300),
      questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      gradeLevel: z.string().trim().max(80).optional(),
      categoryId: z.number().int().positive(),
      provider: z.enum(["openai", "gemini"]).default("openai"),
      model: z.string().trim().max(120).optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const { provider, model, ...legacyInput } = input;
      const draft = await generateQuestionDraft({
        ...legacyInput,
        ...(provider !== "openai" ? { provider } : {}),
        ...(model ? { model } : {}),
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
    createMediaAsset: adminProcedure.input(z.object({ provider: z.enum(["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]), providerAssetId: z.string().trim().max(500).optional().nullable(), fileName: z.string().trim().min(1).max(255), publicUrl: z.string().trim().url().max(900).optional().nullable(), mimeType: z.string().trim().min(1).max(120), sizeBytes: z.number().int().nonnegative().optional().nullable(), folderPath: z.string().trim().max(500).optional().nullable(), contentType: z.enum(["test", "document", "video", "simulation", "game", "news", "general"]).default("general"), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => { await createMediaAsset({ ...input, uploadedBy: ctx.user.id }); return { success: true }; }),
    uploadMediaAsset: adminProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(120), dataBase64: z.string().min(1), contentType: z.enum(["test", "document", "video", "simulation", "game", "news", "general"]).default("general") })).mutation(async ({ ctx, input }) => { const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]; if (!allowedMimeTypes.includes(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Bu dosya türüne izin verilmiyor." }); const buffer = Buffer.from(input.dataBase64, "base64"); if (buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Dosya boyutu en fazla 20 MB olabilir." }); const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-"); const result = await storagePut(`okulblog/media/${ctx.user.id}/${safeName}`, buffer, input.mimeType); await createMediaAsset({ provider: "s3", providerAssetId: result.key, fileName: input.fileName, publicUrl: result.url, mimeType: input.mimeType, sizeBytes: buffer.byteLength, contentType: input.contentType, metadata: { storageKey: result.key }, uploadedBy: ctx.user.id }); if (input.mimeType === "application/pdf") { const coverBuffer = await renderPdfCover(buffer); const cover = await storagePut(`okulblog/media/${ctx.user.id}/covers/${safeFileStem(input.fileName)}-cover.webp`, coverBuffer, "image/webp"); return { ...result, coverImageUrl: cover.url, coverGenerated: true as const }; } return { ...result, coverImageUrl: null, coverGenerated: false as const }; }),
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
