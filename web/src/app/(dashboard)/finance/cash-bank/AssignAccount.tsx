"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { assignTransactionAccount } from "@/lib/finance/actions";
import type { AccountLite } from "@/lib/accounts/data";

/**
 * Inline control shown on a money movement that isn't tied to any Cash & Bank
 * account. Picking an account attaches it so the movement starts counting toward
 * that account's balance. Only rendered for untied movements.
 */
export function AssignAccount({ txId, accounts }: { txId: string; accounts: AccountLite[] }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  if (accounts.length === 0) return null;

  function choose(accountId: string) {
    if (!accountId) return;
    setErr(null);
    start(async () => {
      const res = await assignTransactionAccount(txId, accountId);
      if (res.ok) router.refresh();
      else setErr(res.error);
    });
  }

  return (
    <div className="mt-1 flex items-center gap-1">
      <Icon name="link" size={12} className="text-on-surface-variant" />
      <select
        defaultValue=""
        disabled={pending}
        onChange={(e) => choose(e.target.value)}
        className="text-[11px] bg-surface-container-low border border-outline-variant rounded-md px-1.5 py-0.5 text-on-surface-variant focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60"
        title="Attach this movement to an account"
      >
        <option value="" disabled>{pending ? "Saving…" : "Assign to account…"}</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      {err && <span className="text-[10px] text-error">{err}</span>}
    </div>
  );
}
