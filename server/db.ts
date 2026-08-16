import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { categoryNodes, contentItems, homeSlides, InsertUser, newsCategories, questions, rolePermissions, securityEvents, siteSettings, storedFiles, tests, users } from "../drizzle/schema";
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

export async function listQuestions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(questions).orderBy(asc(questions.createdAt));
}

export async function createQuestion(input: {
  questionType: "multiple-choice" | "true-false" | "open-ended";
  prompt: string;
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
  await db.insert(questions).values({
    ...input,
    options: input.options ?? [],
    categoryId: input.categoryId ?? null,
    status: input.status ?? "draft",
  });
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

export async function createStoredFile(input: { fileName: string; storageKey: string; publicUrl: string; mimeType: string; sizeBytes: number; uploadedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı kurulamadı.");
  await db.insert(storedFiles).values(input);
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
