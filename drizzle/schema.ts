import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "teacher", "moderator", "member"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categoryNodes = mysqlTable("category_nodes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  categoryType: mysqlEnum("categoryType", ["education", "institution"]).notNull(),
  level: mysqlEnum("level", ["ana-grup", "school-level", "class", "subject", "unit", "outcome", "institution-root", "institution-child"]).notNull(),
  parentId: int("parentId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 240 }).notNull().unique(),
  contentType: mysqlEnum("contentType", ["test", "document", "simulation", "video", "game", "news"]).notNull(),
  summary: text("summary"),
  body: text("body"),
  categoryId: int("categoryId"),
  status: mysqlEnum("status", ["draft", "pending", "published", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  questionType: mysqlEnum("questionType", ["multiple-choice", "true-false", "open-ended"]).notNull(),
  prompt: text("prompt").notNull(),
  options: json("options"),
  answer: text("answer"),
  explanation: text("explanation"),
  categoryId: int("categoryId"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  status: mysqlEnum("status", ["draft", "approved", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tests = mysqlTable("tests", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  categoryId: int("categoryId"),
  description: text("description"),
  questionIds: json("questionIds"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["teacher", "moderator"]).notNull(),
  section: varchar("section", { length: 100 }).notNull(),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 120 }).notNull().unique(),
  settingValue: text("settingValue"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const newsCategories = mysqlTable("news_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const storedFiles = mysqlTable("stored_files", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull().unique(),
  publicUrl: varchar("publicUrl", { length: 700 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const securityEvents = mysqlTable("security_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  description: text("description").notNull(),
  metadata: json("metadata"),
  isResolved: boolean("isResolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CategoryNode = typeof categoryNodes.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Test = typeof tests.$inferSelect;
export type StoredFile = typeof storedFiles.$inferSelect;
export type NewsCategory = typeof newsCategories.$inferSelect;
