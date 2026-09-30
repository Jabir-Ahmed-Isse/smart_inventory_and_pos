"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { assignUserBranches } from "@/lib/branches/actions";

type Member = { userId: string; name: string; role: string; orgWide: boolean };
type Branch = { id: string; name: string };

/**
 * Assign non-admin members to specific branches. Owner/admin have org-wide scope
 * (all branches) and are shown as such — no assignment needed. Each row saves
 * independently.
 */
export function BranchAccessManager({
  members,
  branches,
  initial,
}: {
  members: Member[];
  branches: Branch[];
  initial: Record<string, string[]>;
}) {
  if (branches.length === 0) {
    return (
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Create a branch first, then assign team members to it here.
      </p>
    );
  }

  return (
    <div className="divide-y divide-outline-variant">
      {members.map((m) => (
        <MemberRow key={m.userId} member={m} branches={branches} initial={initial[m.userId] ?? []} />
      ))}
      {members.length === 0 && (
        <p className="py-md font-body-sm text-body-sm text-on-surface-variant">No team members yet.</p>
      )}
    </div>
  );
}

function MemberRow({ member, branches, initial }: { member: Member; branches: Branch[]; initial: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    selected.size !== initial.length || initial.some((id) => !selected.has(id));

  function toggle(id: string) {
    setMsg(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function save() {
    start(async () => {
      const res = await assignUserBranches(member.userId, Array.from(selected));
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="py-md flex flex-col md:flex-row md:items-center gap-md">
      <div className="md:w-48 shrink-0">
        <div className="font-label-md text-label-md text-on-surface font-semibold">{member.name}</div>
        <div className="font-body-sm text-body-sm text-on-surface-variant capitalize">{member.role}</div>
      </div>

      {member.orgWide ? (
        <div className="flex-1 flex items-center gap-2 font-body-sm text-body-sm text-primary">
          <Icon name="all_inclusive" size={16} /> All branches (org-wide access)
        </div>
      ) : (
        <div className="flex-1 flex flex-wrap gap-2">
          {branches.map((b) => {
            const on = selected.has(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(b.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${
                  on
                    ? "bg-primary-container/30 border-primary/40 text-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <Icon name={on ? "check_circle" : "add_circle"} size={15} />
                {b.name}
              </button>
            );
          })}
        </div>
      )}

      {!member.orgWide && (
        <div className="flex items-center gap-2 md:w-32 justify-end">
          {msg && (
            <span className={`font-body-sm text-body-sm ${msg.ok ? "text-primary" : "text-error"}`}>{msg.text}</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-50 shadow-sm"
          >
            {pending ? "…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
