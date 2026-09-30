"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { seedAccounting, backfillAccounting } from "@/lib/accounting/actions";

/** First-run setup: install the standard chart of accounts. */
export function SeedAccountingCard() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-gradient-to-br from-primary-container/20 to-tertiary-container/10 border border-primary/20 rounded-xl p-lg shadow-sm max-w-2xl mx-auto text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-md">
        <Icon name="account_balance" size={28} filled />
      </div>
      <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Set up your books</h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
        Install a standard double-entry Chart of Accounts (Assets, Liabilities, Equity, Income, Expenses)
        with automatic posting rules. From then on, every completed sale and received purchase posts a
        balanced journal entry to your general ledger — the same way QuickBooks and Odoo work.
      </p>
      {error && (
        <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container mb-md">
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await seedAccounting();
            if (!res.ok) setError(res.error);
          })
        }
        className="inline-flex items-center gap-2 px-lg py-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
      >
        <Icon name={pending ? "hourglass_empty" : "auto_awesome"} size={18} />
        {pending ? "Installing…" : "Install Chart of Accounts"}
      </button>
    </div>
  );
}

/** Post ledger entries for sales/purchases created before the ledger existed. */
export function BackfillButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            setMsg(null);
            const res = await backfillAccounting();
            if (res.ok) setMsg(res.message ?? "Done.");
            else setError(res.error);
          })
        }
        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md"
        title="Post ledger entries for existing sales & purchases"
      >
        <Icon name={pending ? "hourglass_empty" : "sync"} size={16} />
        {pending ? "Posting…" : "Sync operations"}
      </button>
      {msg && <span className="font-label-md text-label-md text-primary">{msg}</span>}
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}
