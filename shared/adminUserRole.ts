export type AdminUsersCache = {
  admin: {
    users: {
      invalidate: () => Promise<unknown> | unknown;
    };
  };
};

export async function refreshAdminUsers(cache: AdminUsersCache) {
  await cache.admin.users.invalidate();
  return { refreshed: true } as const;
}

