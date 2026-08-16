import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createCategoryNode,
  createContentItem,
  createHomeSlide,
  createNewsCategory,
  listContentByCategory,
  createQuestion,
  createStoredFile,
  createTest,
  getContentOverview,
  getRolePermissions,
  listActiveHomeSlides,
  listSecurityEvents,
  listSiteSettings,
  listUsersForAdmin,
  listNewsCategories,
  listCategoryNodes,
  listPopularEducationCategories,
  getPopularEducationCategoryIds,
  savePopularEducationCategoryIds,
  listHomeSlidesForAdmin,
  saveSiteSetting,
  setRolePermission,
  listQuestions,
  recordSecurityEvent,
  setInstitutionCategoryStatus,
  updateHomeSlide,
  deleteHomeSlide,
} from "./db";
import { generateQuestionDraft } from "./aiQuestionGenerator";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

export function canManagePopularEducationCategories(role: string | undefined) {
  return role === "admin";
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
      educationCategories: await listCategoryNodes("education"),
      institutionCategories: await listCategoryNodes("institution"),
    })),
    homeSlides: publicProcedure.query(() => listActiveHomeSlides()),
    contentByCategory: publicProcedure.input(z.object({ categoryId: z.number().int().positive() })).query(({ input }) => listContentByCategory(input.categoryId)),
    popularEducationCategories: publicProcedure.query(() => listPopularEducationCategories()),
  }),
  categories: router({
    list: protectedProcedure.input(z.object({ categoryType: z.enum(["education", "institution"]).optional() })).query(({ input }) => listCategoryNodes(input.categoryType)),
    create: adminProcedure.input(categoryInput).mutation(async ({ ctx, input }) => {
      await createCategoryNode({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
    setInstitutionStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input }) => {
      await setInstitutionCategoryStatus(input);
      return { success: true };
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
    list: protectedProcedure.query(async ({ ctx }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      return listQuestions();
    }),
    create: protectedProcedure.input(z.object({
      questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
      prompt: z.string().trim().min(12).max(1500),
      options: z.array(z.string().trim().min(1).max(300)).max(5).optional(),
      answer: z.string().trim().max(800).optional(),
      explanation: z.string().trim().max(1200).optional(),
      categoryId: z.number().int().positive().nullable().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      await createQuestion({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
  }),
  contents: router({
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]),
      summary: z.string().trim().max(1000).optional(),
      body: z.string().trim().max(10000).optional(),
      categoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const sectionMap = { test: "Testler", document: "Dokümanlar", simulation: "Simülasyonlar", video: "Videolar", game: "Oyunlar", news: "Haberler" } as const;
      await assertSectionAccess(ctx.user, sectionMap[input.contentType]);
      await createContentItem({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
  }),
  tests: router({
    create: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      description: z.string().trim().max(1000).optional(),
      categoryId: z.number().int().positive().nullable().optional(),
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
      categoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const draft = await generateQuestionDraft(input);
      await createQuestion({ ...draft, categoryId: input.categoryId ?? null, difficulty: input.difficulty, createdBy: ctx.user.id });
      return draft;
    }),
  }),
  files: router({
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
      return result;
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
    settings: adminProcedure.query(() => listSiteSettings()),
    newsCategories: adminProcedure.query(() => listNewsCategories()),
    createNewsCategory: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120) })).mutation(async ({ input }) => {
      await createNewsCategory(input.name);
      return { success: true };
    }),
    saveSetting: adminProcedure.input(z.object({ settingKey: z.string().trim().min(2).max(120), settingValue: z.string().trim().max(4000) })).mutation(async ({ ctx, input }) => {
      await saveSiteSetting({ ...input, updatedBy: ctx.user.id });
      return { success: true };
    }),
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
