"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMemberRole } from "@/lib/members/actions";

const ROLES = ["owner", "admin", "manager", "staff", "accountant"] as const;

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(next: string) {
    const prev = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const res = await updateMemberRole(userId, next);
      if (res.ok) router.refresh();
      else {
        setValue(prev);
        setError(res.error);
      }
    });
  }

  if (disabled) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-surface-container-highest text-on-surface-variant capitalize">
        {value}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-container-low border border-outline-variant rounded-md px-2 py-1 text-xs text-on-surface capitalize focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r} className="capitalize">{r}</option>
        ))}
      </select>
      {error && <span className="text-[10px] text-error max-w-[160px] text-right">{error}</span>}
    </div>
  );
}
