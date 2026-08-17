import { describe, expect, it, vi } from "vitest";
import { refreshAdminUsers } from "@shared/adminUserRole";

describe("Admin kullanıcı listesi yenileme", () => {
  it("rol değişikliğinden sonra admin.users sorgusunu invalidate eder", async () => {
    const invalidate = vi.fn().mockResolvedValue(undefined);
    const result = await refreshAdminUsers({ admin: { users: { invalidate } } });

    expect(result).toEqual({ refreshed: true });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

