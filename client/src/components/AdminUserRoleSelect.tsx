import React, { useState } from "react";

export type AdminRole = "admin" | "teacher" | "moderator" | "member";

const roleLabels: Record<AdminRole, string> = {
  admin: "Admin",
  teacher: "Öğretmen",
  moderator: "Moderatör",
  member: "Üye",
};

type AdminUserRoleSelectProps = {
  userId: number;
  role: AdminRole;
  disabled?: boolean;
  onRoleChange: (input: { id: number; role: AdminRole }) => Promise<void> | void;
};

export function AdminUserRoleSelect({ userId, role, disabled, onRoleChange }: AdminUserRoleSelectProps) {
  const [currentRole, setCurrentRole] = useState(role);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <select
      aria-label={`${roleLabels[currentRole]} rolü`}
      value={currentRole}
      disabled={disabled || isSaving}
      onChange={async event => {
        const nextRole = event.target.value as AdminRole;
        setCurrentRole(nextRole);
        setIsSaving(true);
        try {
          await onRoleChange({ id: userId, role: nextRole });
        } finally {
          setIsSaving(false);
        }
      }}
      className="h-9 rounded-lg border border-input bg-background px-2 text-xs font-semibold"
    >
      {(Object.keys(roleLabels) as AdminRole[]).map(value => <option key={value} value={value}>{roleLabels[value]}</option>)}
    </select>
  );
}

