import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { updateUserRole } from "./db";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, updateUserRole: vi.fn().mockResolvedValue(undefined) };
});
import type { TrpcContext } from "./_core/context";

describe("admin.updateUserRole", () => {
  it("Admin rol değişikliğini başarıyla kaydeder", async () => {
    const ctx: TrpcContext = {
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
    };

    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.updateUserRole({ id: 9, role: "teacher" })).resolves.toEqual({ success: true });
    expect(updateUserRole).toHaveBeenCalledWith({ id: 9, role: "teacher" });
  });

  it("Admin olmayan kullanıcıyı yetkisiz bırakır", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 7,
        openId: "member-user",
        email: "member@example.com",
        name: "Member",
        loginMethod: "manus",
        role: "member",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.updateUserRole({ id: 1, role: "teacher" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

