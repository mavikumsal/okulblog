import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const overviewState = vi.hoisted(() => ({
  content: [{ id: 1, title: "Türkçe testi" }],
  questions: [{ id: 7, prompt: "Bir soru" }],
  education: [{ id: 10, name: "İlkokul" }],
  institution: [],
  stats: { totalMembers: 3, publishedContent: 4, activeEducationCategories: 1, approvedQuestions: 2, favorites: 1, completedProgress: 1, testAttempts: 2, contentByType: [{ contentType: "test", count: 4 }] },
  personalization: { authenticated: false, plan: null, popularTopics: [] },
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getHomepageContentOverview: vi.fn().mockImplementation(async () => overviewState.content),
    listApprovedQuestions: vi.fn().mockImplementation(async () => overviewState.questions),
    listCategoryNodes: vi.fn().mockImplementation(async (type: string) => type === "education" ? overviewState.education : overviewState.institution),
    getHomepageOverviewStats: vi.fn().mockImplementation(async () => overviewState.stats),
    getHomepagePersonalization: vi.fn().mockImplementation(async () => overviewState.personalization),
  };
});

const context = (): TrpcContext => ({
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("platform.overview smoke", () => {
  it("returns a stable homepage overview contract without authentication", async () => {
    const result = await appRouter.createCaller(context()).platform.overview();
    expect(result.content).toEqual(overviewState.content);
    expect(result.approvedQuestions).toEqual(overviewState.questions);
    expect(result.educationCategories).toEqual(overviewState.education);
    expect(result.institutionCategories).toEqual([]);
    expect(result.stats.contentByType).toEqual([{ contentType: "test", count: 4 }]);
    expect(result.personalization.authenticated).toBe(false);
  });
});
