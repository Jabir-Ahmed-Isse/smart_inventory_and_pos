"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { setActiveBranch } from "@/lib/branches/actions";

export type BranchOption = { id: string; name: string };

/**
 * Global branch-context selector shown in the top bar for users who can reach
 * more than one branch. Owner/admin also get an "All Branches" aggregate option.
 * Persists the choice via a cookie, then refreshes so server components re-read
 * the active branch.
 */
export function BranchSelector({
  branches,
  activeBranchId,
  canSeeAll,
}: {
  branches: BranchOption[];
  activeBranchId: string | null;
  canSeeAll: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onChange(value: string) {
    start(async () => {
      await setActiveBranch(value === "all" ? null : value);
      router.refresh();
    });
  }

  return (
    <label className="hidden sm:flex items-center gap-sm bg-surface-container-low rounded-full pl-md pr-sm py-1.5 border border-outline-variant focus-within:ring-2 ring-primary transition-all">
      <Icon name="store" size={16} className="text-on-surface-variant" />
      <select
        aria-label="Active branch"
        disabled={pending}
        value={activeBranchId ?? "all"}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none focus:ring-0 text-body-sm text-on-surface outline-none cursor-pointer pr-4 disabled:opacity-60"
      >
        {canSeeAll && <option value="all">All Branches</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </label>
  );
}
