import { and, eq, asc, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { categoryNodes, contentItems, homeSlides, InsertUser, mediaAssetLinks, mediaAssets, mediaTransferJobs, newsCategories, questions, rolePermissions, securityEvents, siteSettings, storedFiles, tests, users } from "../drizzle/schema";
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

export async function listContentByType(contentType: "test" | "document" | "simulation" | "video" | "game" | "news") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentItems).where(eq(contentItems.contentType, contentType)).orderBy(desc(contentItems.createdAt));
}

export async function updateContentStatus(input: { id: number; status: "draft" | "pending" | "published" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.update(contentItems).set({ status: input.status }).where(eq(contentItems.id, input.id));
}

export async function listQuestions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questions).orderBy(asc(questions.createdAt));
}

export async function createQuestion(input: {
  questionType: "multiple-choice" | "true-false" | "open-ended";
  prompt: string;
  imageUrl?: string | null;
  options?: string[];
  answer?: string;
  explanation?: string;
  categoryId?: number | null;
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
    status: input.status ?? "draft",
  });
  return Number(result[0].insertId);
}

export async function createContentItem(input: {
  title: string;
  contentType: "test" | "document" | "simulation" | "video" | "game" | "news";
  summary?: string;
  body?: string;
  categoryId?: number | null;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  const slug = `${input.title.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşöçıİ]+/gi, "-").replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(contentItems).values({ ...input, slug, categoryId: input.categoryId ?? null, status: "draft" });
}

export async function createTest(input: { title: string; description?: string; categoryId?: number | null; questionIds: number[]; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(tests).values({ ...input, categoryId: input.categoryId ?? null, status: "draft" });
}
export async function listTests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tests).orderBy(desc(tests.createdAt));
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
