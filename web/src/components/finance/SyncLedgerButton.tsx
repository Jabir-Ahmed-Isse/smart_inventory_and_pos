"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { syncFinanceToLedger } from "@/lib/finance/actions";

/**
 * One-click backfill: posts any manual Finance income/expense that isn't in the
 * accounting ledger yet. Idempotent, so it's safe to click repeatedly.
 */
export function SyncLedgerButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  function run() {
    setMsg(null);
    start(async () => {
      const res = await syncFinanceToLedger();
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      if (res.posted > 0) {
        setMsg({ ok: true, text: `Posted ${res.posted} entr${res.posted === 1 ? "y" : "ies"} to Accounting.` });
      } else if (res.already > 0 && res.skipped === 0) {
        setMsg({ ok: true, text: "Everything is already in Accounting." });
      } else if (res.skipped > 0) {
        setMsg({ ok: false, text: "Set up the Chart of Accounts first (Accounting isn't configured)." });
      } else {
        setMsg({ ok: true, text: "No manual entries to post." });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title="Post manual Finance income/expense into the double-entry ledger"
        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md disabled:opacity-60"
      >
        <Icon name={pending ? "hourglass_empty" : "sync"} size={16} /> {pending ? "Syncing…" : "Sync to Accounting"}
      </button>
      {msg && (
        <span className={`text-[11px] max-w-[220px] text-right flex items-center gap-1 ${msg.ok ? "text-primary" : "text-error"}`}>
          <Icon name={msg.ok ? "check_circle" : "error"} size={13} /> {msg.text}
        </span>
      )}
    </div>
  );
}
