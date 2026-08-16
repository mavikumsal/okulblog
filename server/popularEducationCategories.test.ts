import { describe, expect, it } from "vitest";
import { normalizePopularEducationCategoryIds } from "./db";
import { canManagePopularEducationCategories, appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 42, openId: "test-user", email: "test@example.com", name: "Test User", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("normalizePopularEducationCategoryIds", () => {
  it("sıralamayı korur, tekrarları kaldırır ve geçersiz kimlikleri atar", () => {
    expect(normalizePopularEducationCategoryIds([8, 3, 8, 0, -2, 3, 5])).toEqual([8, 3, 5]);
  });

  it("en fazla on iki seçimi korur", () => {
    expect(normalizePopularEducationCategoryIds(Array.from({ length: 15 }, (_, index) => index + 1))).toHaveLength(12);
  });

  it("boş seçimi boş liste olarak korur", () => {
    expect(normalizePopularEducationCategoryIds([])).toEqual([]);
  });

  it("gerçek router mutation’ı Admin olmayan kullanıcıyı reddeder", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.savePopularEducationCategories({ categoryIds: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("yalnızca Admin rolünün yönetim yetkisi vardır", () => {
    expect(canManagePopularEducationCategories("admin")).toBe(true);
    expect(canManagePopularEducationCategories("teacher")).toBe(false);
    expect(canManagePopularEducationCategories("moderator")).toBe(false);
    expect(canManagePopularEducationCategories(undefined)).toBe(false);
  });
});
