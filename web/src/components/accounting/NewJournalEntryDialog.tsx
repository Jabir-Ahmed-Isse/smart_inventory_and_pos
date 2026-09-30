"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { fieldCls, labelCls } from "@/components/CrudDialog";
import { createJournalEntry } from "@/lib/accounting/actions";

type AccountOption = { id: string; code: string; name: string };
type Line = { accountId: string; description: string; debit: string; credit: string };

const emptyLine = (): Line => ({ accountId: "", description: "", debit: "", credit: "" });

export function NewJournalEntryDialog({ accounts }: { accounts: AccountOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 && debit > 0 };
  }, [lines]);

  function reset() {
    setDate(new Date().toISOString().slice(0, 10));
    setMemo("");
    setReference("");
    setLines([emptyLine(), emptyLine()]);
    setError(null);
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function submit(post: boolean) {
    start(async () => {
      setError(null);
      const res = await createJournalEntry({
        entryDate: date,
        memo,
        reference,
        post,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          description: l.description,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });
      if (res.ok) {
        setOpen(false);
        reset();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm"
      >
        <Icon name="add" size={18} /> New Journal Entry
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-[820px] max-h-[90vh] overflow-auto bg-surface rounded-xl border border-outline-variant shadow-lg">
            <div className="flex items-center justify-between p-md border-b border-outline-variant bg-surface-container-lowest sticky top-0">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">New Journal Entry</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-primary p-xs rounded-full">
                <Icon name="close" />
              </button>
            </div>

            <div className="p-lg space-y-md">
              {error && (
                <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Memo</label>
                  <input value={memo} onChange={(e) => setMemo(e.target.value)} className={fieldCls} placeholder="e.g. Owner cash injection" />
                </div>
              </div>

              {/* Lines */}
              <div className="border border-outline-variant rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_120px_120px_36px] gap-2 px-3 py-2 bg-surface-container-high font-label-md text-label-md text-on-surface-variant">
                  <span>Account</span>
                  <span>Description</span>
                  <span className="text-right">Debit</span>
                  <span className="text-right">Credit</span>
                  <span />
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_120px_120px_36px] gap-2 px-3 py-2 border-t border-outline-variant/60 items-center">
                    <select value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })} className={`${fieldCls} appearance-none`}>
                      <option value="">Select…</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </select>
                    <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} className={fieldCls} placeholder="Line memo" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.debit}
                      onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })}
                      className={`${fieldCls} text-right`}
                      placeholder="0.00"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.credit}
                      onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })}
                      className={`${fieldCls} text-right`}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => setLines((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev))}
                      className="text-on-surface-variant hover:text-error p-1 rounded"
                      title="Remove line"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_1fr_120px_120px_36px] gap-2 px-3 py-2 border-t border-outline-variant bg-surface-container-lowest items-center font-body-sm text-body-sm">
                  <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className="flex items-center gap-1 text-primary hover:underline justify-self-start">
                    <Icon name="add" size={16} /> Add line
                  </button>
                  <span className="text-right text-on-surface-variant">Totals</span>
                  <span className="text-right font-semibold tabular-nums text-on-surface">{totals.debit.toFixed(2)}</span>
                  <span className="text-right font-semibold tabular-nums text-on-surface">{totals.credit.toFixed(2)}</span>
                  <span />
                </div>
              </div>

              <div className="flex items-center justify-between gap-md flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 font-label-md text-label-md ${
                    totals.balanced ? "text-primary" : "text-tertiary"
                  }`}
                >
                  <Icon name={totals.balanced ? "check_circle" : "info"} size={16} />
                  {totals.balanced ? "Balanced" : `Out of balance by ${Math.abs(totals.debit - totals.credit).toFixed(2)}`}
                </span>
                <div className="flex gap-sm">
                  <button type="button" onClick={() => setOpen(false)} className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => submit(false)}
                    className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors font-label-md text-label-md"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    disabled={pending || !totals.balanced}
                    onClick={() => submit(true)}
                    className="px-lg py-sm rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md shadow-sm"
                  >
                    {pending ? "Posting…" : "Post Entry"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
