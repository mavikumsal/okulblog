import React from "react";
import { Badge } from "@/components/ui/badge";
import { AdminUserRoleSelect, type AdminRole } from "@/components/AdminUserRoleSelect";

type AdminMember = { id: number; name: string | null; email: string | null; role: AdminRole };

type AdminUsersManagementProps = {
  members: AdminMember[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isPending: boolean;
  onRoleChange: (input: { id: number; role: AdminRole }) => Promise<void> | void;
};

const roleName: Record<AdminRole, string> = {
  admin: "Admin",
  teacher: "Öğretmen",
  moderator: "Moderatör",
  member: "Üye",
};

export function AdminUsersManagement({ members, isLoading, isError, isPending, onRoleChange }: AdminUsersManagementProps) {
  return (
    <div className="mt-6">
      {isLoading ? <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087]">Kullanıcılar yükleniyor...</div> : isError ? <div className="rounded-xl bg-[#fff5f2] p-5 text-sm text-[#a05d50]">Kullanıcı listesi alınamadı. Lütfen tekrar deneyin.</div> : (members ?? []).length ? <div className="divide-y divide-[#edf0eb] rounded-2xl border border-[#edf0eb]">{(members ?? []).map(member => <div key={member.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-[#365368]">{member.name ?? "İsimsiz kullanıcı"}</p><p className="mt-1 text-xs text-[#7b8b90]">{member.email ?? "E-posta yok"}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{roleName[member.role]}</Badge><AdminUserRoleSelect userId={member.id} role={member.role} disabled={isPending} onRoleChange={onRoleChange} /></div></div>)}</div> : <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087]">Henüz kayıtlı kullanıcı bulunmuyor.</div>}
    </div>
  );
}

