"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { decideLeave, setEmployeeStatus, seedHr } from "@/lib/hr/actions";
import type { EmployeeStatus } from "@/lib/supabase/database.types";

export function AttendanceDateNav({ date }: { date: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      value={date}
      onChange={(e) => router.push(`/hr/attendance?date=${e.target.value}`)}
      className="bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-2 text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}

export function LeaveDecision({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  if (status !== "pending") return <span className="text-on-surface-variant font-label-md text-label-md">—</span>;
  return (
    <div className="flex items-center gap-1 justify-end">
      <button type="button" disabled={pending} onClick={() => start(async () => void (await decideLeave(id, "approved")))}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors font-label-md text-label-md">
        <Icon name="check" size={14} /> Approve
      </button>
      <button type="button" disabled={pending} onClick={() => start(async () => void (await decideLeave(id, "rejected")))}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error disabled:opacity-60 transition-colors font-label-md text-label-md">
        <Icon name="close" size={14} /> Reject
      </button>
    </div>
  );
}

const STATUS_OPTIONS: EmployeeStatus[] = ["active", "on_leave", "suspended", "terminated"];

export function EmployeeStatusControl({ id, status }: { id: string; status: EmployeeStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => start(async () => void (await setEmployeeStatus(id, e.target.value as EmployeeStatus)))}
      className="bg-transparent border border-outline-variant rounded-md px-2 py-1 font-label-md text-label-md text-on-surface disabled:opacity-60 capitalize focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s.replace("_", " ")}</option>
      ))}
    </select>
  );
}

export function SeedLeaveTypesButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending}
        onClick={() => start(async () => { setError(null); const r = await seedHr(); if (!r.ok) setError(r.error); })}
        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
        <Icon name={pending ? "hourglass_empty" : "auto_awesome"} size={16} />
        {pending ? "Installing…" : "Install standard leave types"}
      </button>
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}
