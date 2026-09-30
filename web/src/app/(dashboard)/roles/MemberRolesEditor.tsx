"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { updateMemberRoles } from "@/lib/members/actions";

const PRIMARY_ROLES = ["owner", "admin", "manager", "staff", "cashier", "accountant"] as const;
// Owner is all-access, so it's never an "extra" hat.
const EXTRA_ROLES = ["admin", "manager", "staff", "cashier", "accountant"] as const;

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager · stock",
  staff: "Staff · POS",
  cashier: "Cashier",
  accountant: "Accountant",
};

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

export function MemberRolesEditor({
  userId,
  primaryRole,
  extraRoles,
  disabled,
}: {
  userId: string;
  primaryRole: string;
  extraRoles: string[];
  disabled?: boolean;
}) {
  const [primary, setPrimary] = useState(primaryRole);
  const [extras, setExtras] = useState<string[]>(extraRoles);
  const [savedPrimary, setSavedPrimary] = useState(primaryRole);
  const [savedExtras, setSavedExtras] = useState<string[]>(extraRoles);
  const [error, setError] = useState<string | null>(null);
  const [okFlash, setOkFlash] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = primary !== savedPrimary || !sameSet(extras, savedExtras);

  if (disabled) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-primary-container/40 text-on-primary-container capitalize">
          {ROLE_LABEL[primaryRole] ?? primaryRole}
        </span>
        {extraRoles.map((r) => (
          <span key={r} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-container-highest text-on-surface-variant">
            +{ROLE_LABEL[r] ?? r}
          </span>
        ))}
      </div>
    );
  }

  function togglePrimary(next: string) {
    setPrimary(next);
    setExtras((prev) => prev.filter((r) => r !== next));
    setError(null);
  }
  function toggleExtra(role: string) {
    setError(null);
    setExtras((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }
  function reset() {
    setPrimary(savedPrimary);
    setExtras(savedExtras);
    setError(null);
  }
  function save() {
    start(async () => {
      const res = await updateMemberRoles(userId, primary, extras);
      if (res.ok) {
        setSavedPrimary(primary);
        setSavedExtras(extras);
        setOkFlash(true);
        setTimeout(() => setOkFlash(false), 1800);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2 min-w-[220px]">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wide">Primary</span>
        <select
          value={primary}
          disabled={pending}
          onChange={(e) => togglePrimary(e.target.value)}
          className="bg-surface-container-low border border-outline-variant rounded-md px-2 py-1 text-xs text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60"
        >
          {PRIMARY_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1">
        <span className="text-[11px] font-label-md text-on-surface-variant mr-1">Extra access</span>
        {EXTRA_ROLES.filter((r) => r !== primary).map((r) => {
          const on = extras.includes(r);
          return (
            <button
              key={r}
              type="button"
              disabled={pending}
              onClick={() => toggleExtra(r)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-60 ${
                on
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface border-outline-variant text-on-surface-variant hover:border-primary/60"
              }`}
            >
              {on ? "✓ " : "+ "}
              {ROLE_LABEL[r]}
            </button>
          );
        })}
      </div>

      {dirty && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} disabled={pending} className="text-[11px] px-2 py-1 rounded-md text-on-surface-variant hover:bg-surface-container-high disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={pending} className="text-[11px] px-3 py-1 rounded-md bg-primary text-on-primary font-semibold hover:opacity-90 disabled:opacity-60 flex items-center gap-1">
            <Icon name={pending ? "hourglass_empty" : "save"} size={13} /> {pending ? "Saving" : "Save"}
          </button>
        </div>
      )}
      {okFlash && !dirty && (
        <span className="text-[11px] text-primary flex items-center gap-1"><Icon name="check_circle" size={13} /> Saved</span>
      )}
      {error && <span className="text-[10px] text-error max-w-[220px] text-right">{error}</span>}
    </div>
  );
}
