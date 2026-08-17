import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const moduleState = vi.hoisted(() => ({
  tests: [] as Array<{ id: number; title: string; description: string; questionCount: number }>,
  contentByType: new Map<string, unknown[]>([
    ["document", []],
    ["video", []],
    ["simulation", []],
    ["game", []],
    ["news", []],
  ]),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listQuestions: vi.fn().mockResolvedValue([]),
    listTests: vi.fn().mockImplementation(async () => moduleState.tests),
    listContentByType: vi.fn().mockImplementation(async (contentType: string) => moduleState.contentByType.get(contentType) ?? []),
    createTest: vi.fn().mockImplementation(async (input: { title: string; description?: string; questionIds: number[] }) => {
      moduleState.tests.push({ id: moduleState.tests.length + 1, title: input.title, description: input.description ?? "", questionCount: input.questionIds.length });
    }),
  };
});

const adminContext = (): TrpcContext => ({
  user: { id: 1, openId: "admin-user", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Admin modül listeleme ve test yenileme akışı", () => {
  it("soru havuzu ve tüm içerik modüllerinde boş listeyi güvenle döndürür", async () => {
    moduleState.tests = [];
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.questions.list()).resolves.toEqual([]);
    for (const contentType of ["test", "document", "video", "simulation", "game", "news"] as const) {
      await expect(caller.contents.list({ contentType })).resolves.toEqual([]);
    }
  });

  it("test oluşturma sonrası tests.list yeni kaydı döndürür", async () => {
    moduleState.tests = [];
    const caller = appRouter.createCaller(adminContext());

    await caller.tests.create({ title: "Türkçe kazanım testi", description: "İlk deneme", categoryId: null, questionIds: [11, 12, 13] });

    await expect(caller.tests.list()).resolves.toEqual([{ id: 1, title: "Türkçe kazanım testi", description: "İlk deneme", questionCount: 3 }]);
  });
});
