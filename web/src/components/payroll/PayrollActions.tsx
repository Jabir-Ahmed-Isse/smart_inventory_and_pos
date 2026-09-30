"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { generatePayslips, approvePayRun, markPayRunPaid, decideAdvance, disburseAdvance, seedPayroll, deletePayAdjustment } from "@/lib/payroll/actions";

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

export function RunActions({ id, status }: { id: string; status: "draft" | "approved" | "paid" | "cancelled" }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-sm">
        {status === "draft" && (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => generatePayslips(id))}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors font-label-md text-label-md">
              <Icon name="calculate" size={16} /> Generate payslips
            </button>
            <button type="button" disabled={pending} onClick={() => run(() => approvePayRun(id))}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md shadow-sm">
              <Icon name="check" size={16} /> Approve &amp; post
            </button>
          </>
        )}
        {status === "approved" && (
          <button type="button" disabled={pending} onClick={() => run(() => markPayRunPaid(id))}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md shadow-sm">
            <Icon name="payments" size={16} /> Mark as paid
          </button>
        )}
        {status === "paid" && <span className="inline-flex items-center gap-1 text-primary font-label-md text-label-md"><Icon name="task_alt" size={16} filled /> Paid</span>}
      </div>
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}

export function AdvanceActions({ id, status }: { id: string; status: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1 justify-end">
        {status === "pending" && (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => decideAdvance(id, "approved"))}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors font-label-md text-label-md">
              <Icon name="check" size={14} /> Approve
            </button>
            <button type="button" disabled={pending} onClick={() => run(() => decideAdvance(id, "rejected"))}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error disabled:opacity-60 transition-colors font-label-md text-label-md">
              <Icon name="close" size={14} /> Reject
            </button>
          </>
        )}
        {status === "approved" && (
          <button type="button" disabled={pending} onClick={() => run(() => disburseAdvance(id))}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md">
            <Icon name="account_balance_wallet" size={14} /> Disburse
          </button>
        )}
        {(status === "disbursed" || status === "settled" || status === "rejected") && (
          <span className="text-on-surface-variant font-label-md text-label-md">—</span>
        )}
      </div>
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}

export function AdjustmentRemoveButton({ id }: { id: string }) {
  const { pending, run } = useAction();
  return (
    <button type="button" disabled={pending} onClick={() => run(() => deletePayAdjustment(id))}
      className="text-on-surface-variant hover:text-error disabled:opacity-50 transition-colors p-0.5" title="Remove adjustment">
      <Icon name="close" size={14} />
    </button>
  );
}

export function SeedPayrollButton({ label = "Install payroll defaults" }: { label?: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending} onClick={() => run(() => seedPayroll())}
        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors font-label-md text-label-md">
        <Icon name={pending ? "hourglass_empty" : "auto_awesome"} size={16} /> {pending ? "Installing…" : label}
      </button>
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}
