import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { updateCategoryNode, setCategoryStatus, setInstitutionCategoryStatus, updateContentStatus } from "./db";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    updateCategoryNode: vi.fn().mockResolvedValue(undefined),
    setCategoryStatus: vi.fn().mockResolvedValue(undefined),
    setInstitutionCategoryStatus: vi.fn().mockResolvedValue(undefined),
    updateContentStatus: vi.fn().mockResolvedValue(undefined),
  };
});

const adminContext = (): TrpcContext => ({
  user: {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

describe("Admin kategori ve içerik yönetimi", () => {
  it("kategori adını ve aktiflik durumunu günceller", async () => {
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.categories.update({ id: 3, name: "Yeni Ders" })).resolves.toEqual({ success: true });
    await expect(caller.categories.setStatus({ id: 3, isActive: false })).resolves.toEqual({ success: true });
    await expect(caller.categories.setInstitutionStatus({ id: 8, isActive: true })).resolves.toEqual({ success: true });

    expect(updateCategoryNode).toHaveBeenCalledWith({ id: 3, name: "Yeni Ders" });
    expect(setCategoryStatus).toHaveBeenCalledWith({ id: 3, isActive: false });
    expect(setInstitutionCategoryStatus).toHaveBeenCalledWith({ id: 8, isActive: true });
  });

  it("içeriği silmeden arşiv durumuna geçirir", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.contents.archive({ id: 12, contentType: "document" })).resolves.toEqual({ success: true });
    expect(updateContentStatus).toHaveBeenCalledWith({ id: 12, status: "archived" });
  });
});

