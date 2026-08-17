import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { createQuestion } from "./db";
import { generateQuestionDraft } from "./aiQuestionGenerator";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, createQuestion: vi.fn().mockResolvedValue(undefined) };
});
vi.mock("./aiQuestionGenerator", () => ({
  generateQuestionDraft: vi.fn().mockResolvedValue({ questionType: "multiple-choice", prompt: "Örnek AI soru metni yeterince uzun.", options: ["A", "B"], answer: "A", explanation: "Açıklama" }),
}));

const adminContext = (): TrpcContext => ({
  user: { id: 1, openId: "admin-user", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Admin AI soru oluşturucu", () => {
  it("AI taslağını soru havuzuna kaydeder", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.ai.generateQuestion({ topic: "Heceleme", questionType: "multiple-choice", difficulty: "easy", categoryId: 4 })).resolves.toMatchObject({ questionType: "multiple-choice" });
    expect(generateQuestionDraft).toHaveBeenCalledWith({ topic: "Heceleme", questionType: "multiple-choice", difficulty: "easy", categoryId: 4 });
    expect(createQuestion).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 1, categoryId: 4, difficulty: "easy" }));
  });
});
