import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { createQuestion, createContentItem, createTest } from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, createQuestion: vi.fn().mockResolvedValue(undefined), createContentItem: vi.fn().mockResolvedValue(undefined), createTest: vi.fn().mockResolvedValue(undefined) };
});

const adminContext = (): TrpcContext => ({
  user: { id: 1, openId: "admin-user", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Admin soru, test ve içerik oluşturma akışları", () => {
  it("soru, içerik ve test kayıtlarını doğru kullanıcıyla oluşturur", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.questions.create({ questionType: "multiple-choice", prompt: "Birinci sınıf Türkçe kazanımı nedir?", options: ["A", "B"], answer: "A", difficulty: "easy", categoryId: null })).resolves.toEqual({ success: true });
    await expect(caller.contents.create({ title: "Örnek doküman", contentType: "document", summary: "Kısa açıklama", categoryId: null })).resolves.toEqual({ success: true });
    await expect(caller.tests.create({ title: "Türkçe denemesi", description: "Kısa test", categoryId: null, questionIds: [12] })).resolves.toEqual({ success: true });
    expect(createQuestion).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 1, prompt: "Birinci sınıf Türkçe kazanımı nedir?" }));
    expect(createContentItem).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 1, contentType: "document" }));
    expect(createTest).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 1, questionIds: [12] }));
  });
});
