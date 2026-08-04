"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { settleOrderAction } from "@/lib/pos/actions";
import type { AccountLite } from "@/lib/accounts/data";

const kindIcon = (kind: AccountLite["kind"]) =>
  kind === "mobile" ? "smartphone" : kind === "cash" ? "payments" : "account_balance";
const kindLabel = (kind: AccountLite["kind"]) =>
  kind === "mobile" ? "Mobile money" : kind === "cash" ? "Cash" : "Bank";

/**
 * Settles a due order into a chosen account — full or partial. Submits through a
 * server action (useActionState) so the Orders list auto-refreshes on success.
 * Rendered as a centered modal so the table's horizontal scroll can't clip it.
 */
export function MarkPaidButton({
  orderId,
  orderNumber,
  total,
  due,
  currency,
  accounts,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  due: number;
  currency: string;
  accounts: AccountLite[];
}) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(accounts[0]?.id ?? "");
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [state, formAction, pending] = useActionState(settleOrderAction, null);
  const router = useRouter();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

  const partialAmt = parseFloat(amount) || 0;
  const partialValid = mode === "full" || (partialAmt > 0 && partialAmt <= due + 0.005);
  const payNow = mode === "full" ? due : partialAmt;
  const partiallyPaid = total - due > 0.005;
  const error = state && !state.ok ? state.error : null;

  // Auto-refresh + close once the payment is recorded.
  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  function open_() {
    setMode("full");
    setAmount(due.toFixed(2));
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={open_}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-label-md text-label-md shadow-sm"
      >
        <Icon name="paid" size={16} /> Mark Paid
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40"
          onClick={() => !pending && setOpen(false)}
        >
          <form
            action={formAction}
            className="w-full max-w-sm bg-surface rounded-xl shadow-xl border border-outline-variant overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hidden fields submitted to the server action */}
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="orderNumber" value={orderNumber} />
            <input type="hidden" name="accountId" value={account} />
            <input type="hidden" name="amount" value={mode === "full" ? "" : amount} />

            {/* Header */}
            <div className="p-md border-b border-outline-variant flex items-start justify-between gap-md">
              <div>
                <h3 className="font-headline-lg text-headline-lg text-on-surface">Settle payment</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                  Order <span className="font-mono">{orderNumber}</span>
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-on-surface shrink-0">
                <Icon name="close" />
              </button>
            </div>

            <div className="p-md space-y-md">
              {/* Balance */}
              <div className="rounded-lg bg-surface-container-lowest border border-outline-variant px-md py-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">Balance due</span>
                  <span className="font-headline-lg text-headline-lg text-primary tabular-nums">{fmt(due)}</span>
                </div>
                {partiallyPaid && (
                  <p className="font-label-md text-label-md text-on-surface-variant mt-xs">
                    {fmt(total - due)} already paid of {fmt(total)}
                  </p>
                )}
              </div>

              {accounts.length === 0 ? (
                <div className="rounded-lg border border-tertiary-container/40 bg-tertiary-container/10 p-md text-center space-y-sm">
                  <Icon name="account_balance" size={28} className="text-tertiary" />
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    You have no payment accounts yet. Add a bank or mobile-money account to record where the money went.
                  </p>
                  <Link href="/finance/cash-bank" className="inline-flex items-center gap-1 text-primary font-label-md text-label-md hover:underline">
                    <Icon name="add" size={16} /> Add an account
                  </Link>
                </div>
              ) : (
                <>
                  {/* Full / Partial */}
                  <div>
                    <div className="grid grid-cols-2 gap-sm">
                      {(["full", "partial"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { setMode(m); if (m === "partial") setAmount(""); }}
                          className={`py-2 rounded-lg border font-label-md text-label-md transition-colors ${mode === m ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"}`}
                        >
                          {m === "full" ? "Pay full" : "Partial"}
                        </button>
                      ))}
                    </div>
                    {mode === "partial" && (
                      <div className="mt-sm">
                        <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">Amount to pay now</label>
                        <input
                          autoFocus
                          value={amount}
                          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                          inputMode="decimal"
                          placeholder="0.00"
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <p className="font-label-md text-label-md text-on-surface-variant mt-xs">
                          {partialValid
                            ? `Leaves ${fmt(Math.max(0, due - partialAmt))} still due.`
                            : `Enter an amount up to ${fmt(due)}.`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Account */}
                  <div>
                    <label className="font-label-md text-label-md text-on-surface-variant block mb-xs uppercase tracking-wide">Received into</label>
                    <div className="space-y-xs">
                      {accounts.map((a) => {
                        const active = account === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAccount(a.id)}
                            className={`w-full flex items-center gap-sm px-md py-sm rounded-lg border transition-colors text-left ${active ? "border-primary bg-primary/10" : "border-outline-variant hover:border-primary hover:bg-primary/5"}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                              <Icon name={kindIcon(a.kind)} size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-body-sm text-body-sm truncate ${active ? "text-primary font-semibold" : "text-on-surface"}`}>{a.name}</p>
                              <p className="font-label-md text-label-md text-on-surface-variant">{kindLabel(a.kind)}</p>
                            </div>
                            {active && <Icon name="check_circle" size={18} className="text-primary shrink-0" filled />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg border border-error/30 bg-error-container/40 px-sm py-xs font-body-sm text-body-sm text-on-error-container">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-md border-t border-outline-variant flex items-center justify-end gap-sm bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !account || !partialValid || accounts.length === 0}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
              >
                <Icon name={pending ? "hourglass_empty" : "paid"} size={16} />
                {pending ? "Settling…" : `Pay ${fmt(payNow || 0)}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
