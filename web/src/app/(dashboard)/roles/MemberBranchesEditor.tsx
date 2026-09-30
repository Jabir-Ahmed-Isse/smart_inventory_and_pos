"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { assignUserBranches } from "@/lib/branches/actions";

type Branch = { id: string; name: string };

/**
 * Compact per-member branch assignment used in the Roles table. Org-wide members
 * (owner/admin/accountant) show a locked "All branches". Others get toggle chips
 * that save immediately.
 */
export function MemberBranchesEditor({
  userId,
  branches,
  assigned,
  orgWide,
  disabled,
}: {
  userId: string;
  branches: Branch[];
  assigned: string[];
  orgWide: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(assigned));
  const [saved, setSaved] = useState(false);

  if (orgWide) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-primary whitespace-nowrap">
        <Icon name="all_inclusive" size={13} /> All branches
      </span>
    );
  }
  if (branches.length === 0) {
    return <span className="text-[11px] text-on-surface-variant">—</span>;
  }

  const dirty = selected.size !== assigned.length || assigned.some((id) => !selected.has(id));

  function toggle(id: string) {
    if (disabled) return;
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function save() {
    start(async () => {
      const res = await assignUserBranches(userId, Array.from(selected));
      if (res.ok) { setSaved(true); router.refresh(); }
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {branches.map((b) => {
        const on = selected.has(b.id);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => toggle(b.id)}
            disabled={disabled}
            className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors disabled:opacity-50 ${
              on ? "bg-primary-container/40 border-primary/40 text-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {b.name}
          </button>
        );
      })}
      {!disabled && dirty && (
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[11px] disabled:opacity-60"
        >
          {pending ? "…" : "Save"}
        </button>
      )}
      {saved && !dirty && <Icon name="check_circle" size={14} className="text-primary" />}
    </div>
  );
}
