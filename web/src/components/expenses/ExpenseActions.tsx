"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { approveExpense, payExpense, cancelExpense, generateDueExpenses, seedExpenses } from "@/lib/expenses/actions";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
    });
  return { pending, error, run };
}

export function ExpenseRowActions({ id, status }: { id: string; status: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1 justify-end">
        {status === "draft" && (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => approveExpense(id))}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors font-label-md text-label-md">
              <Icon name="check" size={14} /> Approve
            </button>
            <button type="button" disabled={pending} onClick={() => run(() => cancelExpense(id))}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error disabled:opacity-60 transition-colors font-label-md text-label-md">
              <Icon name="close" size={14} /> Cancel
            </button>
          </>
        )}
        {status === "approved" && (
          <button type="button" disabled={pending} onClick={() => run(() => payExpense(id))}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md">
            <Icon name="payments" size={14} /> Pay
          </button>
        )}
        {status === "paid" && <span className="inline-flex items-center gap-1 text-primary font-label-md text-label-md"><Icon name="task_alt" size={14} filled /> Paid</span>}
        {status === "cancelled" && <span className="text-on-surface-variant font-label-md text-label-md">—</span>}
      </div>
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}

export function GenerateDueButton() {
  const { pending, error, run } = useAction();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending}
        onClick={() => run(async () => { setMsg(null); const r = await generateDueExpenses(); if (r.ok) setMsg(r.message ?? "Done."); return r; })}
        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors font-label-md text-label-md">
        <Icon name={pending ? "hourglass_empty" : "sync"} size={16} /> {pending ? "Generating…" : "Generate due bills"}
      </button>
      {msg && <span className="font-label-md text-label-md text-primary">{msg}</span>}
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}

export function SeedExpensesButton() {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending} onClick={() => run(() => seedExpenses())}
        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors font-label-md text-label-md">
        <Icon name={pending ? "hourglass_empty" : "auto_awesome"} size={16} /> {pending ? "Installing…" : "Install default categories"}
      </button>
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}
