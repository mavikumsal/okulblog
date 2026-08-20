import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, uniqueIndex, index } from "drizzle-orm/mysql-core";

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
  sortOrder: int("sortOrder").default(0).notNull(),
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
  coverImageUrl: varchar("coverImageUrl", { length: 700 }),
  categoryId: int("categoryId"),
  institutionCategoryId: int("institutionCategoryId"),
  status: mysqlEnum("status", ["draft", "pending", "published", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const contentViewEvents = mysqlTable("content_view_events", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  userId: int("userId"),
  viewerKey: varchar("viewerKey", { length: 160 }).notNull(),
  viewDay: varchar("viewDay", { length: 10 }).notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => ({
  viewerDayUnique: uniqueIndex("content_view_events_viewer_day_unique").on(table.contentId, table.viewerKey, table.viewDay),
  contentDayIndex: index("content_view_events_content_day_idx").on(table.contentId, table.viewDay),
}));

export const contentViewDaily = mysqlTable("content_view_daily", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  viewDay: varchar("viewDay", { length: 10 }).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  contentDayUnique: uniqueIndex("content_view_daily_content_day_unique").on(table.contentId, table.viewDay),
  contentIndex: index("content_view_daily_content_idx").on(table.contentId),
}));

export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  questionType: mysqlEnum("questionType", ["multiple-choice", "true-false", "open-ended"]).notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: varchar("imageUrl", { length: 700 }),
  explanationImageUrl: varchar("explanationImageUrl", { length: 700 }),
  options: json("options"),
  answer: text("answer"),
  explanation: text("explanation"),
  sourceFileName: varchar("sourceFileName", { length: 255 }),
  sourcePage: int("sourcePage"),
  sourceRegion: json("sourceRegion"),
  topicTag: varchar("topicTag", { length: 180 }),
  gradeLevel: varchar("gradeLevel", { length: 80 }),
  categoryId: int("categoryId"),
  institutionCategoryId: int("institutionCategoryId"),
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
  institutionCategoryId: int("institutionCategoryId"),
  description: text("description"),
  coverImageUrl: varchar("coverImageUrl", { length: 700 }),
  durationMinutes: int("durationMinutes").default(20).notNull(),
  questionIds: json("questionIds"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentType: mysqlEnum("contentType", ["test", "document", "simulation", "video", "game", "news"]).notNull(),
  contentId: int("contentId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contentProgress = mysqlTable("content_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentType: mysqlEnum("contentType", ["test", "document", "simulation", "video", "game", "news"]).notNull(),
  contentId: int("contentId").notNull(),
  status: mysqlEnum("status", ["started", "completed"]).default("completed").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const outcomeProgress = mysqlTable("outcome_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  outcomeId: int("outcomeId").notNull(),
  status: mysqlEnum("status", ["started", "completed"]).default("completed").notNull(),
  questionCount: int("questionCount").default(0).notNull(),
  documentViewed: boolean("documentViewed").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const testAttempts = mysqlTable("test_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  testId: int("testId").notNull(),
  correctCount: int("correctCount").default(0).notNull(),
  wrongCount: int("wrongCount").default(0).notNull(),
  blankCount: int("blankCount").default(0).notNull(),
  score: int("score").default(0).notNull(),
  durationSeconds: int("durationSeconds").default(0).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
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

export const searchConsoleTokens = mysqlTable("search_console_tokens", {
  id: int("id").autoincrement().primaryKey(),
  propertyUrl: varchar("propertyUrl", { length: 700 }).notNull(),
  encryptedAccessToken: text("encryptedAccessToken").notNull(),
  encryptedRefreshToken: text("encryptedRefreshToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  scopes: text("scopes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const searchIndexingQueue = mysqlTable("search_indexing_queue", {
  id: int("id").autoincrement().primaryKey(),
  url: varchar("url", { length: 900 }).notNull(),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: int("entityId"),
  status: mysqlEnum("status", ["pending", "processing", "submitted", "failed", "skipped"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  lastError: text("lastError"),
  lastResponse: json("lastResponse"),
  nextAttemptAt: timestamp("nextAttemptAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIndex: index("search_indexing_queue_status_idx").on(table.status, table.nextAttemptAt),
  entityIndex: index("search_indexing_queue_entity_idx").on(table.entityType, table.entityId),
}));

export const newsCategories = mysqlTable("news_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const homeSlides = mysqlTable("home_slides", {
  id: int("id").autoincrement().primaryKey(),
  eyebrow: varchar("eyebrow", { length: 100 }),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description"),
  buttonLabel: varchar("buttonLabel", { length: 80 }),
  buttonLink: varchar("buttonLink", { length: 500 }),
  imageUrl: varchar("imageUrl", { length: 700 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const qaQuestions = mysqlTable("qa_questions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body").notNull(),
  imageUrl: varchar("imageUrl", { length: 700 }),
  categoryId: int("categoryId"),
  institutionCategoryId: int("institutionCategoryId"),
  status: mysqlEnum("status", ["pending", "published", "hidden"]).default("pending").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const qaAnswers = mysqlTable("qa_answers", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  body: text("body").notNull(),
  imageUrl: varchar("imageUrl", { length: 700 }),
  status: mysqlEnum("status", ["pending", "published", "hidden"]).default("pending").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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

export const mediaAssets = mysqlTable("media_assets", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]).notNull(),
  providerAssetId: varchar("providerAssetId", { length: 500 }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  publicUrl: varchar("publicUrl", { length: 900 }),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes"),
  folderPath: varchar("folderPath", { length: 500 }),
  contentType: mysqlEnum("contentType", ["test", "document", "video", "simulation", "game", "news", "general"]).default("general").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  metadata: json("metadata"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const documentImportDrafts = mysqlTable("document_import_drafts", {
  id: int("id").autoincrement().primaryKey(),
  mediaAssetId: int("mediaAssetId").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1200 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  summary: text("summary"),
  tags: json("tags"),
  categoryId: int("categoryId"),
  institutionCategoryId: int("institutionCategoryId"),
  coverImageUrl: varchar("coverImageUrl", { length: 900 }),
  previewPages: json("previewPages"),
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected"]).default("draft").notNull(),
  aiStatus: mysqlEnum("aiStatus", ["not_started", "processing", "completed", "failed"]).default("not_started").notNull(),
  aiModel: varchar("aiModel", { length: 120 }),
  aiError: text("aiError"),
  aiSuggestedTitle: varchar("aiSuggestedTitle", { length: 220 }),
  aiSuggestedSummary: text("aiSuggestedSummary"),
  aiSuggestedTags: json("aiSuggestedTags"),
  ocrStatus: mysqlEnum("ocrStatus", ["not_needed", "not_started", "completed", "failed"]).default("not_needed").notNull(),
  ocrConfidence: int("ocrConfidence"),
  extractedText: text("extractedText"),
  createdBy: int("createdBy").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const documentImportHistory = mysqlTable("document_import_history", {
  id: int("id").autoincrement().primaryKey(),
  sourceUrl: varchar("sourceUrl", { length: 1200 }).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  provider: varchar("provider", { length: 80 }),
  status: mysqlEnum("status", ["queued", "downloading", "completed", "failed", "retried", "cancelled"]).default("queued").notNull(),
  errorMessage: text("errorMessage"),
  draftId: int("draftId"),
  mediaAssetId: int("mediaAssetId"),
  attempts: int("attempts").default(1).notNull(),
  requestedBy: int("requestedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const mediaAssetLinks = mysqlTable("media_asset_links", {
  id: int("id").autoincrement().primaryKey(),
  mediaAssetId: int("mediaAssetId").notNull(),
  targetType: mysqlEnum("targetType", ["content", "test"]).notNull(),
  targetId: int("targetId").notNull(),
  role: varchar("role", { length: 80 }).default("attachment").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const mediaTransferJobs = mysqlTable("media_transfer_jobs", {
  id: int("id").autoincrement().primaryKey(),
  mediaAssetId: int("mediaAssetId").notNull(),
  sourceProvider: mysqlEnum("sourceProvider", ["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]).notNull(),
  targetProvider: mysqlEnum("targetProvider", ["s3", "google-drive-personal", "google-drive-workspace", "bunny-storage", "bunny-stream"]).notNull(),
  operation: mysqlEnum("operation", ["copy", "move"]).notNull(),
  status: mysqlEnum("status", ["queued", "running", "completed", "failed", "cancelled"]).default("queued").notNull(),
  progress: int("progress").default(0).notNull(),
  errorMessage: text("errorMessage"),
  destinationProviderAssetId: varchar("destinationProviderAssetId", { length: 255 }),
  destinationUrl: text("destinationUrl"),
  sourceArchived: boolean("sourceArchived").default(false).notNull(),
  referencesUpdated: boolean("referencesUpdated").default(false).notNull(),
  requestedBy: int("requestedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  action: mysqlEnum("action", ["delete", "bulk_delete", "bulk_create"]).notNull(),
  targetType: varchar("targetType", { length: 80 }).notNull(),
  targetId: int("targetId"),
  targetLabel: varchar("targetLabel", { length: 240 }),
  actorId: int("actorId"),
  actorName: varchar("actorName", { length: 220 }),
  status: mysqlEnum("status", ["success", "failed"]).notNull(),
  reason: text("reason"),
  metadata: json("metadata"),
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

export type AuditLog = typeof auditLogs.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CategoryNode = typeof categoryNodes.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Test = typeof tests.$inferSelect;
export type OutcomeProgress = typeof outcomeProgress.$inferSelect;
export type StoredFile = typeof storedFiles.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type DocumentImportHistory = typeof documentImportHistory.$inferSelect;
export type MediaTransferJob = typeof mediaTransferJobs.$inferSelect;
export type SearchConsoleToken = typeof searchConsoleTokens.$inferSelect;
export type NewsCategory = typeof newsCategories.$inferSelect;
export type HomeSlide = typeof homeSlides.$inferSelect;
export type QaQuestion = typeof qaQuestions.$inferSelect;
export type QaAnswer = typeof qaAnswers.$inferSelect;
