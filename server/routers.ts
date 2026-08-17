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
  listTests,
  getContentOverview,
  listContentByType,
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
  recordSecurityEvent,
  setInstitutionCategoryStatus,
  setCategoryStatus,
  updateCategoryNode,
  updateHomeSlide,
  deleteHomeSlide,
} from "./db";
import { generateQuestionDraft } from "./aiQuestionGenerator";
import { parsePdfQuestions } from "./pdfQuestionParser";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { buildGoogleDriveAuthorizationUrl, createGoogleDriveResumableUpload, exchangeGoogleDriveCode, getGoogleDriveMissingConfig } from "./googleDriveProvider";
import { buildSearchConsoleActions, exchangeSearchConsoleCode, getSearchConsoleMissingConfig, refreshSearchConsoleToken } from "./searchConsoleProvider";

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
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(180) })).mutation(async ({ input }) => {
      await updateCategoryNode(input);
      return { success: true };
    }),
    setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input }) => {
      await setCategoryStatus(input);
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
    list: protectedProcedure.input(z.object({ topicTag: z.string().trim().max(180).optional(), gradeLevel: z.string().trim().max(80).optional(), difficulty: z.enum(["easy", "medium", "hard"]).optional() }).optional()).query(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      return listQuestions(input);
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
      categoryId: z.number().int().positive().nullable().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      await createQuestion({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),
  }),
  contents: router({
    list: protectedProcedure.input(z.object({ contentType: z.enum(["test", "document", "simulation", "video", "game", "news"]) })).query(async ({ ctx, input }) => {
      const sectionMap = { test: "Testler", document: "Dokümanlar", simulation: "Simülasyonlar", video: "Videolar", game: "Oyunlar", news: "Haberler" } as const;
      await assertSectionAccess(ctx.user, sectionMap[input.contentType]);
      return listContentByType(input.contentType);
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
    list: protectedProcedure.query(async ({ ctx }) => {
      await assertSectionAccess(ctx.user, "Testler");
      return listTests();
    }),
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
      gradeLevel: z.string().trim().max(80).optional(),
      categoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      const draft = await generateQuestionDraft(input);
      return draft;
    }),
    generateTest: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(220),
      topic: z.string().trim().min(3).max(300),
      count: z.number().int().min(2).max(20),
      questionType: z.enum(["multiple-choice", "true-false", "open-ended"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      gradeLevel: z.string().trim().max(80).optional(),
      categoryId: z.number().int().positive().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertSectionAccess(ctx.user, "Soru Havuzu");
      await assertSectionAccess(ctx.user, "Testler");
      const questionIds: number[] = [];
      for (let index = 0; index < input.count; index += 1) {
        const draft = await generateQuestionDraft(input);
        const id = await createQuestion({ ...draft, topicTag: input.topic, gradeLevel: input.gradeLevel ?? null, categoryId: input.categoryId ?? null, difficulty: input.difficulty, createdBy: ctx.user.id });
        questionIds.push(id);
      }
      await createTest({ title: input.title, description: `${input.topic} konusu için AI tarafından oluşturulan taslak test.`, categoryId: input.categoryId ?? null, questionIds, createdBy: ctx.user.id });
      return { title: input.title, questionIds, questionCount: questionIds.length, status: "draft" as const };
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
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const stored = await storagePut(`okulblog/${ctx.user.id}/question-imports/${safeName}`, buffer, "application/pdf");
      await createStoredFile({ fileName: input.fileName, storageKey: stored.key, publicUrl: stored.url, mimeType: "application/pdf", sizeBytes: buffer.byteLength, uploadedBy: ctx.user.id });
      return { ...parsed, topicTag: input.topicTag ?? null, gradeLevel: input.gradeLevel ?? null, categoryId: input.categoryId ?? null, originalFileUrl: stored.url };
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
    updateUserRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: z.enum(["admin", "teacher", "moderator", "member"]) })).mutation(async ({ input }) => {
      await updateUserRole(input);
      return { success: true };
    }),
    settings: adminProcedure.query(() => listSiteSettings()),
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
    uploadMediaAsset: adminProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(120), dataBase64: z.string().min(1), contentType: z.enum(["test", "document", "video", "simulation", "game", "news", "general"]).default("general") })).mutation(async ({ ctx, input }) => { const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]; if (!allowedMimeTypes.includes(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Bu dosya türüne izin verilmiyor." }); const buffer = Buffer.from(input.dataBase64, "base64"); if (buffer.byteLength > 20 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Dosya boyutu en fazla 20 MB olabilir." }); const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-"); const result = await storagePut(`okulblog/media/${ctx.user.id}/${safeName}`, buffer, input.mimeType); await createMediaAsset({ provider: "s3", providerAssetId: result.key, fileName: input.fileName, publicUrl: result.url, mimeType: input.mimeType, sizeBytes: buffer.byteLength, contentType: input.contentType, metadata: { storageKey: result.key }, uploadedBy: ctx.user.id }); return result; }),
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
    searchConsoleTokenExchange: adminProcedure.input(z.object({ code: z.string().trim().min(4).max(2000) })).mutation(async ({ input }) => { try { const tokens = await exchangeSearchConsoleCode(input.code); return { accessToken: tokens.access_token, expiresIn: tokens.expires_in ?? null, hasRefreshToken: Boolean(tokens.refresh_token) }; } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Search Console OAuth başarısız." }); } }),
    searchConsoleTokenRefresh: adminProcedure.input(z.object({ refreshToken: z.string().trim().min(10) })).mutation(async ({ input }) => { try { const tokens = await refreshSearchConsoleToken(input.refreshToken); return { accessToken: tokens.access_token, expiresIn: tokens.expires_in ?? null }; } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Search Console token yenilenemedi." }); } }),
    searchConsoleAction: adminProcedure.input(z.object({ action: z.enum(["submit-sitemap", "inspect-url", "request-indexing", "performance", "links"]), accessToken: z.string().trim().min(10), siteUrl: z.string().trim().url().max(700), sitemap: z.string().trim().max(700).optional(), url: z.string().trim().url().max(900).optional(), startDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(), endDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional() })).mutation(async ({ input }) => { try { const actions = buildSearchConsoleActions(input.accessToken, input.siteUrl); if (input.action === "submit-sitemap") return await actions.submitSitemap(input.sitemap ?? "sitemap.xml"); if (input.action === "inspect-url") return await actions.inspectUrl(input.url ?? input.siteUrl); if (input.action === "request-indexing") return await actions.requestIndexing(input.url ?? input.siteUrl); if (input.action === "links") return await actions.links(); return await actions.performance(input.startDate ?? "1970-01-01", input.endDate ?? new Date().toISOString().slice(0, 10)); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Search Console işlemi başarısız." }); } }),
    newsCategories: adminProcedure.query(() => listNewsCategories()),
    createNewsCategory: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120) })).mutation(async ({ input }) => {
      await createNewsCategory(input.name);
      return { success: true };
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
