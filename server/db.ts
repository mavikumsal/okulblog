import { and, eq, asc, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { categoryNodes, contentItems, contentProgress, favorites, homeSlides, InsertUser, mediaAssetLinks, qaAnswers, qaQuestions, mediaAssets, mediaTransferJobs, newsCategories, questions, rolePermissions, searchConsoleTokens, securityEvents, siteSettings, storedFiles, testAttempts, tests, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listCategoryNodes(categoryType?: "education" | "institution") {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(categoryNodes);
  const result = categoryType
    ? await query.where(eq(categoryNodes.categoryType, categoryType)).orderBy(asc(categoryNodes.name))
    : await query.orderBy(asc(categoryNodes.name));
  return result;
}

export async function createCategoryNode(input: {
  name: string;
  categoryType: "education" | "institution";
  level: "ana-grup" | "school-level" | "class" | "subject" | "unit" | "outcome" | "institution-root" | "institution-child";
  parentId?: number | null;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const educationNextLevel = {
    "ana-grup": "school-level",
    "school-level": "class",
    "class": "subject",
    "subject": "unit",
    "unit": "outcome",
  } as const;
  if (input.categoryType === "education") {
    if (input.level === "ana-grup" && input.parentId) throw new Error("Ana Grup seviyesinde üst kategori seçilemez.");
    if (input.level !== "ana-grup" && !input.parentId) throw new Error("Bu eğitim seviyesi için bir üst kategori seçilmelidir.");
    if (input.parentId) {
      const parent = await db.select().from(categoryNodes).where(eq(categoryNodes.id, input.parentId)).limit(1);
      const parentNode = parent[0];
      if (!parentNode || parentNode.categoryType !== "education" || educationNextLevel[parentNode.level as keyof typeof educationNextLevel] !== input.level) {
        throw new Error("Eğitim kategorisi sırası Ana Grup → İlkokul/Ortaokul → Sınıf → Ders → Ünite → Kazanım olarak korunmalıdır.");
      }
    }
  }
  if (input.categoryType === "institution") {
    if (input.level === "institution-root" && input.parentId) throw new Error("Kurum ana kategorisinde üst kategori seçilemez.");
    if (input.level === "institution-child" && !input.parentId) throw new Error("Alt kurum kategorisi için üst kategori seçilmelidir.");
    if (input.parentId) {
      const parent = await db.select().from(categoryNodes).where(eq(categoryNodes.id, input.parentId)).limit(1);
      if (!parent[0] || parent[0].categoryType !== "institution") throw new Error("Kurum kategorisi yalnızca başka bir Kurum Kategorisine bağlanabilir.");
    }
  }
  await db.insert(categoryNodes).values({ ...input, parentId: input.parentId ?? null });
}

export async function setInstitutionCategoryStatus(input: { id: number; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const category = await db.select().from(categoryNodes).where(eq(categoryNodes.id, input.id)).limit(1);
  if (!category[0] || category[0].categoryType !== "institution") {
    throw new Error("Yalnızca Kurum Kategorilerinin durumu değiştirilebilir.");
  }
  await db.update(categoryNodes).set({ isActive: input.isActive }).where(eq(categoryNodes.id, input.id));
}

export async function updateCategoryNode(input: { id: number; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Kategori adı en az 2 karakter olmalıdır.");
  const category = await db.select().from(categoryNodes).where(eq(categoryNodes.id, input.id)).limit(1);
  if (!category[0]) throw new Error("Kategori bulunamadı.");
  await db.update(categoryNodes).set({ name }).where(eq(categoryNodes.id, input.id));
}

export async function setCategoryStatus(input: { id: number; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const category = await db.select().from(categoryNodes).where(eq(categoryNodes.id, input.id)).limit(1);
  if (!category[0]) throw new Error("Kategori bulunamadı.");
  await db.update(categoryNodes).set({ isActive: input.isActive }).where(eq(categoryNodes.id, input.id));
}

export async function getRolePermissions(role: "teacher" | "moderator") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
}

export async function setRolePermission(input: {
  role: "teacher" | "moderator";
  section: string;
  isEnabled: boolean;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const current = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.role, input.role));
  const existing = current.find(item => item.section === input.section);
  if (existing) {
    await db.update(rolePermissions).set({ isEnabled: input.isEnabled, updatedBy: input.updatedBy }).where(eq(rolePermissions.id, existing.id));
  } else {
    await db.insert(rolePermissions).values(input);
  }
}

export async function getContentOverview() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentItems).orderBy(asc(contentItems.contentType));
}

export async function listContentByType(contentType: "test" | "document" | "simulation" | "video" | "game" | "news", categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(contentItems.contentType, contentType), categoryId ? eq(contentItems.categoryId, categoryId) : undefined].filter(Boolean) as Array<ReturnType<typeof eq>>;
  return db.select().from(contentItems).where(and(...conditions)).orderBy(desc(contentItems.createdAt));
}
export async function updateContentStatus(input: { id: number; status: "draft" | "pending" | "published" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.update(contentItems).set({ status: input.status }).where(eq(contentItems.id, input.id));
}

export async function listQuestions(filters?: { topicTag?: string; gradeLevel?: string; difficulty?: "easy" | "medium" | "hard" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    filters?.topicTag ? eq(questions.topicTag, filters.topicTag) : undefined,
    filters?.gradeLevel ? eq(questions.gradeLevel, filters.gradeLevel) : undefined,
    filters?.difficulty ? eq(questions.difficulty, filters.difficulty) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  return db.select().from(questions).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(questions.createdAt));
}

export async function getQuestionProductionStats(input: { userId: number; role: "admin" | "teacher" }) {
  const db = await getDb();
  if (!db) {
    return {
      scope: input.role === "admin" ? "all" as const : "mine" as const,
      total: 0,
      recentCount: 0,
      statuses: { draft: 0, approved: 0, archived: 0 },
      difficulties: { easy: 0, medium: 0, hard: 0 },
      questionTypes: { "multiple-choice": 0, "true-false": 0, "open-ended": 0 },
      recentQuestions: [],
    };
  }
  const rows = await db.select({
    id: questions.id,
    prompt: questions.prompt,
    difficulty: questions.difficulty,
    questionType: questions.questionType,
    status: questions.status,
    createdAt: questions.createdAt,
  }).from(questions).where(input.role === "admin" ? undefined : eq(questions.createdBy, input.userId));
  const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const statuses = { draft: 0, approved: 0, archived: 0 };
  const difficulties = { easy: 0, medium: 0, hard: 0 };
  const questionTypes = { "multiple-choice": 0, "true-false": 0, "open-ended": 0 };
  for (const row of rows) {
    statuses[row.status] += 1;
    difficulties[row.difficulty] += 1;
    questionTypes[row.questionType] += 1;
  }
  return {
    scope: input.role === "admin" ? "all" as const : "mine" as const,
    total: rows.length,
    recentCount: rows.filter(row => row.createdAt.getTime() >= recentThreshold).length,
    statuses,
    difficulties,
    questionTypes,
    recentQuestions: rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5),
  };
}

export async function createQuestion(input: {
  questionType: "multiple-choice" | "true-false" | "open-ended";
  prompt: string;
  imageUrl?: string | null;
  explanationImageUrl?: string | null;
  options?: string[];
  answer?: string;
  explanation?: string;
  topicTag?: string | null;
  gradeLevel?: string | null;
  categoryId?: number | null;
  institutionCategoryId?: number | null;
  difficulty: "easy" | "medium" | "hard";
  status?: "draft" | "approved" | "archived";
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const result = await db.insert(questions).values({
    ...input,
    options: input.options ?? [],
    categoryId: input.categoryId ?? null,
    institutionCategoryId: input.institutionCategoryId ?? null,
    status: input.status ?? "draft",
  });
  return Number(result[0].insertId);
}

export async function createContentItem(input: {
  title: string;
  contentType: "test" | "document" | "simulation" | "video" | "game" | "news";
  summary?: string;
  body?: string;
  coverImageUrl?: string | null;
  categoryId?: number | null;
  institutionCategoryId?: number | null;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const slug = `${input.title.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşöçıİ]+/gi, "-").replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(contentItems).values({ ...input, slug, categoryId: input.categoryId ?? null, institutionCategoryId: input.institutionCategoryId ?? null, status: "draft" });
}

export async function createTest(input: { title: string; description?: string; coverImageUrl?: string | null; durationMinutes?: number; categoryId?: number | null; institutionCategoryId?: number | null; questionIds: number[]; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(tests).values({ ...input, categoryId: input.categoryId ?? null, institutionCategoryId: input.institutionCategoryId ?? null, coverImageUrl: input.coverImageUrl ?? null, durationMinutes: input.durationMinutes ?? 20, status: "draft" });
}
export async function listTests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tests).orderBy(desc(tests.createdAt));
}

export async function toggleFavorite(input: { userId: number; contentType: "test" | "document" | "simulation" | "video" | "game" | "news"; contentId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const existing = await db.select().from(favorites).where(and(eq(favorites.userId, input.userId), eq(favorites.contentType, input.contentType), eq(favorites.contentId, input.contentId))).limit(1);
  if (existing[0]) { await db.delete(favorites).where(eq(favorites.id, existing[0].id)); return { favorited: false }; }
  await db.insert(favorites).values(input); return { favorited: true };
}

export async function listFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
}

export async function markContentProgress(input: { userId: number; contentType: "test" | "document" | "simulation" | "video" | "game" | "news"; contentId: number; status: "started" | "completed" }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const existing = await db.select().from(contentProgress).where(and(eq(contentProgress.userId, input.userId), eq(contentProgress.contentType, input.contentType), eq(contentProgress.contentId, input.contentId))).limit(1);
  if (existing[0]) { await db.update(contentProgress).set({ status: input.status }).where(eq(contentProgress.id, existing[0].id)); } else { await db.insert(contentProgress).values(input); }
}

export async function getMemberDashboard(userId: number) {
  const db = await getDb();
  if (!db) return { favorites: [], progress: [], attempts: [] };
  const [favoriteRows, progressRows, attemptRows] = await Promise.all([
    db.select().from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt)),
    db.select().from(contentProgress).where(eq(contentProgress.userId, userId)).orderBy(desc(contentProgress.updatedAt)),
    db.select().from(testAttempts).where(eq(testAttempts.userId, userId)).orderBy(desc(testAttempts.completedAt)),
  ]);
  return { favorites: favoriteRows, progress: progressRows, attempts: attemptRows };
}

export async function createTestAttempt(input: { userId: number; testId: number; correctCount: number; wrongCount: number; blankCount: number; score: number; durationSeconds: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(testAttempts).values(input);
  await markContentProgress({ userId: input.userId, contentType: "test", contentId: input.testId, status: "completed" });
}

export async function createStoredFile(input: { fileName: string; storageKey: string; publicUrl: string; mimeType: string; sizeBytes: number; uploadedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(storedFiles).values(input);
}

export async function listMediaAssets(input?: { provider?: "s3" | "google-drive-personal" | "google-drive-workspace" | "bunny-storage" | "bunny-stream"; contentType?: "test" | "document" | "video" | "simulation" | "game" | "news" | "general" }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  return rows.filter(row => (!input?.provider || row.provider === input.provider) && (!input?.contentType || row.contentType === input.contentType));
}

export async function createMediaAsset(input: {
  provider: "s3" | "google-drive-personal" | "google-drive-workspace" | "bunny-storage" | "bunny-stream";
  providerAssetId?: string | null;
  fileName: string;
  publicUrl?: string | null;
  mimeType: string;
  sizeBytes?: number | null;
  folderPath?: string | null;
  contentType?: "test" | "document" | "video" | "simulation" | "game" | "news" | "general";
  metadata?: Record<string, unknown>;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(mediaAssets).values({ ...input, contentType: input.contentType ?? "general", providerAssetId: input.providerAssetId ?? null, publicUrl: input.publicUrl ?? null, sizeBytes: input.sizeBytes ?? null, folderPath: input.folderPath ?? null, metadata: input.metadata ?? {} });
}

export async function createMediaAssetLink(input: { mediaAssetId: number; targetType: "content" | "test"; targetId: number; role?: string; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(mediaAssetLinks).values({ ...input, role: input.role ?? "attachment" });
}

export async function listMediaAssetLinks(input: { targetType: "content" | "test"; targetId: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaAssetLinks).where(and(eq(mediaAssetLinks.targetType, input.targetType), eq(mediaAssetLinks.targetId, input.targetId)));
}

export async function removeMediaAssetLink(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.delete(mediaAssetLinks).where(eq(mediaAssetLinks.id, id));
}

export async function archiveMediaAsset(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.update(mediaAssets).set({ status: "archived" }).where(eq(mediaAssets.id, id));
}

export async function getMediaAsset(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  return rows[0];
}

export async function createMediaTransferJob(input: {
  mediaAssetId: number;
  sourceProvider: "s3" | "google-drive-personal" | "google-drive-workspace" | "bunny-storage" | "bunny-stream";
  targetProvider: "s3" | "google-drive-personal" | "google-drive-workspace" | "bunny-storage" | "bunny-stream";
  operation: "copy" | "move";
  requestedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  if (input.sourceProvider === input.targetProvider) throw new Error("Kaynak ve hedef sağlayıcı farklı olmalıdır.");
  await db.insert(mediaTransferJobs).values({ ...input, status: "queued", progress: 0 });
}

export async function listMediaTransferJobs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaTransferJobs).orderBy(desc(mediaTransferJobs.createdAt));
}

export async function getMediaTransferJob(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(mediaTransferJobs).where(eq(mediaTransferJobs.id, id)).limit(1);
  return rows[0];
}

export async function updateMediaTransferJob(input: { id: number; status: "queued" | "running" | "completed" | "failed" | "cancelled"; progress?: number; errorMessage?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.update(mediaTransferJobs).set({ status: input.status, progress: input.progress, errorMessage: input.errorMessage }).where(eq(mediaTransferJobs.id, input.id));
}

export async function completeMediaTransferJob(input: { id: number; destinationMediaAssetId?: number; destinationProviderAssetId?: string | null; destinationUrl?: string | null; archiveSource?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const job = await getMediaTransferJob(input.id);
  if (!job) throw new Error("Aktarım işi bulunamadı.");
  if (job.operation !== "move") throw new Error("Kaynak arşivleme yalnızca taşıma işlerinde uygulanabilir.");
  if (job.status === "cancelled") throw new Error("İptal edilmiş aktarım tamamlanamaz.");
  if (input.destinationMediaAssetId) {
    await db.update(mediaAssetLinks).set({ mediaAssetId: input.destinationMediaAssetId }).where(eq(mediaAssetLinks.mediaAssetId, job.mediaAssetId));
  }
  if (input.archiveSource !== false) await db.update(mediaAssets).set({ status: "archived" }).where(eq(mediaAssets.id, job.mediaAssetId));
  await db.update(mediaTransferJobs).set({ status: "completed", progress: 100, errorMessage: null, destinationProviderAssetId: input.destinationProviderAssetId ?? null, destinationUrl: input.destinationUrl ?? null, sourceArchived: input.archiveSource !== false, referencesUpdated: Boolean(input.destinationMediaAssetId) }).where(eq(mediaTransferJobs.id, input.id));
}
export async function recordSecurityEvent(input: { eventType: string; severity: "low" | "medium" | "high" | "critical"; description: string; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(securityEvents).values(input);
}

export async function listUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(asc(users.name));
}

export async function updateUserRole(input: { id: number; role: "admin" | "teacher" | "moderator" | "member" }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, input.id)).limit(1);
  if (!target[0]) throw new Error("Kullanıcı bulunamadı.");
  await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
}

export async function listSecurityEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt));
}

export async function listQaQuestions(options: { includeHidden?: boolean; search?: string; categoryId?: number } | boolean = false) {
  const db = await getDb();
  if (!db) return [];
  const normalized = typeof options === "boolean" ? { includeHidden: options } : options;
  const search = normalized.search?.trim().toLowerCase();
  const conditions = [
    normalized.includeHidden ? undefined : eq(qaQuestions.status, "published"),
    normalized.categoryId ? eq(qaQuestions.categoryId, normalized.categoryId) : undefined,
    search ? undefined : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const rows = await db.select().from(qaQuestions).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(qaQuestions.createdAt));
  if (!search) return rows;
  return rows.filter(row => `${row.title} ${row.body}`.toLowerCase().includes(search));
}

export async function listQaAnswers(questionId?: number, includeHidden = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [questionId ? eq(qaAnswers.questionId, questionId) : undefined, includeHidden ? undefined : eq(qaAnswers.status, "published")].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  return db.select().from(qaAnswers).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(qaAnswers.createdAt));
}

export async function listMemberQaQuestions(createdBy: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qaQuestions).where(eq(qaQuestions.createdBy, createdBy)).orderBy(desc(qaQuestions.createdAt));
}

export async function listMemberQaAnswers(createdBy: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qaAnswers).where(eq(qaAnswers.createdBy, createdBy)).orderBy(desc(qaAnswers.createdAt));
}

export async function createQaQuestion(input: { title: string; body: string; imageUrl?: string | null; categoryId?: number | null; institutionCategoryId?: number | null; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(qaQuestions).values({ ...input, imageUrl: input.imageUrl ?? null, categoryId: input.categoryId ?? null, institutionCategoryId: input.institutionCategoryId ?? null, status: "pending" });
}

export async function createQaAnswer(input: { questionId: number; body: string; imageUrl?: string | null; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const question = await db.select().from(qaQuestions).where(eq(qaQuestions.id, input.questionId)).limit(1);
  if (!question[0] || question[0].status !== "published") throw new Error("Bu soruya şu anda cevap yazılamaz.");
  await db.insert(qaAnswers).values({ ...input, imageUrl: input.imageUrl ?? null, status: "pending" });
}

export async function setQaStatus(input: { entity: "question" | "answer"; id: number; status: "pending" | "published" | "hidden" }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  if (input.entity === "question") await db.update(qaQuestions).set({ status: input.status }).where(eq(qaQuestions.id, input.id));
  else await db.update(qaAnswers).set({ status: input.status }).where(eq(qaAnswers.id, input.id));
}

export async function upsertSearchConsoleToken(input: {
  propertyUrl: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  scopes?: string | null;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const existing = await db.select().from(searchConsoleTokens).where(eq(searchConsoleTokens.propertyUrl, input.propertyUrl)).limit(1);
  if (existing[0]) {
    await db.update(searchConsoleTokens).set({
      encryptedAccessToken: input.encryptedAccessToken,
      encryptedRefreshToken: input.encryptedRefreshToken ?? existing[0].encryptedRefreshToken,
      accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
      scopes: input.scopes ?? null,
      updatedAt: new Date(),
    }).where(eq(searchConsoleTokens.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(searchConsoleTokens).values(input);
  return Number(result[0].insertId);
}

export async function getSearchConsoleToken(propertyUrl: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(searchConsoleTokens).where(eq(searchConsoleTokens.propertyUrl, propertyUrl)).limit(1);
  return result[0];
}

export async function listSiteSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(siteSettings).orderBy(asc(siteSettings.settingKey));
}

export async function saveSiteSetting(input: { settingKey: string; settingValue: string; updatedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const existing = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, input.settingKey)).limit(1);
  if (existing[0]) {
    await db.update(siteSettings).set({ settingValue: input.settingValue, updatedBy: input.updatedBy }).where(eq(siteSettings.id, existing[0].id));
  } else {
    await db.insert(siteSettings).values(input);
  }
}

export async function getPopularEducationCategoryIds() {
  const db = await getDb();
  if (!db) return [];
  const setting = await db.select().from(siteSettings).where(eq(siteSettings.settingKey, "home_popular_category_ids")).limit(1);
  if (!setting[0]?.settingValue) return [];
  try {
    const parsed: unknown = JSON.parse(setting[0].settingValue);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export async function listPopularEducationCategories() {
  const ids = await getPopularEducationCategoryIds();
  if (!ids.length) return [];
  const db = await getDb();
  if (!db) return [];
  const categories = await db.select().from(categoryNodes).where(inArray(categoryNodes.id, ids));
  const byId = new Map(categories.map(category => [category.id, category]));
  return ids.map(id => byId.get(id)).filter((category): category is typeof categories[number] => Boolean(category && category.categoryType === "education" && category.isActive));
}

export function normalizePopularEducationCategoryIds(categoryIds: number[]) {
  return Array.from(new Set(categoryIds.filter(id => Number.isInteger(id) && id > 0))).slice(0, 12);
}
export async function savePopularEducationCategoryIds(input: { categoryIds: number[]; updatedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const uniqueIds = normalizePopularEducationCategoryIds(input.categoryIds);
  if (uniqueIds.length) {
    const valid = await db.select({ id: categoryNodes.id }).from(categoryNodes).where(inArray(categoryNodes.id, uniqueIds));
    if (valid.length !== uniqueIds.length) throw new Error("Yalnızca geçerli kategori kayıtları seçilebilir.");
  }
  await saveSiteSetting({ settingKey: "home_popular_category_ids", settingValue: JSON.stringify(uniqueIds), updatedBy: input.updatedBy });
}

export async function listNewsCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(newsCategories).orderBy(asc(newsCategories.name));
}

export async function createNewsCategory(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const slug = `${name.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşöçıİ]+/gi, "-").replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  await db.insert(newsCategories).values({ name, slug });
}

export async function listContentByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentItems).where(eq(contentItems.categoryId, categoryId)).orderBy(desc(contentItems.createdAt));
}

export async function listActiveHomeSlides() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(homeSlides).where(eq(homeSlides.isActive, true)).orderBy(asc(homeSlides.sortOrder), asc(homeSlides.id));
}

export async function listHomeSlidesForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(homeSlides).orderBy(asc(homeSlides.sortOrder), asc(homeSlides.id));
}

export type HomeSlideInput = {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  buttonLabel?: string | null;
  buttonLink?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export async function createHomeSlide(input: HomeSlideInput & { createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(homeSlides).values(input);
}

export async function updateHomeSlide(input: HomeSlideInput & { id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.update(homeSlides).set({
    eyebrow: input.eyebrow ?? null,
    title: input.title,
    description: input.description ?? null,
    buttonLabel: input.buttonLabel ?? null,
    buttonLink: input.buttonLink ?? null,
    imageUrl: input.imageUrl ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  }).where(eq(homeSlides.id, input.id));
}

export async function deleteHomeSlide(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.delete(homeSlides).where(eq(homeSlides.id, id));
}
