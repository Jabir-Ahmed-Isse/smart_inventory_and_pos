"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { createAccount, toggleAccount, deleteAccount } from "@/lib/accounts/actions";
import type { AccountWithBalance, AccountKind } from "@/lib/accounts/data";

const PRESETS: { kind: AccountKind; names: string[] }[] = [
  { kind: "bank", names: ["Premier Bank", "Salaam Bank", "Amal Bank", "Dahabshiil Bank", "IBS Bank"] },
  { kind: "mobile", names: ["EVC Plus", "Jeeb", "Dahab Plus", "Sahal", "eDahab"] },
];
const KIND_META: Record<AccountKind, { icon: string; label: string; badge: string }> = {
  bank: { icon: "account_balance", label: "Bank", badge: "bg-primary-container/20 text-primary" },
  mobile: { icon: "smartphone", label: "Mobile money", badge: "bg-tertiary-container/30 text-tertiary" },
  cash: { icon: "payments", label: "Cash", badge: "bg-surface-container-highest text-on-surface-variant" },
};

export function AccountsPanel({
  accounts,
  currency,
  canManage,
}: {
  accounts: AccountWithBalance[];
  currency: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-lg text-headline-lg text-on-surface">Accounts</h3>
        {canManage && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-label-md text-label-md shadow-sm"
          >
            <Icon name="add" size={16} /> New Account
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="bg-surface border border-dashed border-outline-variant rounded-xl p-lg text-center">
          <Icon name="account_balance" size={32} className="text-outline-variant mb-sm" />
          <p className="font-body-md text-body-md text-on-surface font-medium">No accounts yet</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs max-w-sm mx-auto">
            Add your banks (Premier, Salaam, Amal, Dahabshiil…) and mobile-money wallets (EVC Plus, Jeeb, Dahab Plus)
            to route sales payments and track each balance.
          </p>
          {canManage && (
            <button onClick={() => setOpen(true)} className="mt-md inline-flex items-center gap-1 text-primary font-label-md text-label-md hover:underline">
              <Icon name="add" size={16} /> Add your first account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} money={money} canManage={canManage} />
          ))}
        </div>
      )}

      {open && <CreateDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function AccountCard({
  account,
  money,
  canManage,
}: {
  account: AccountWithBalance;
  money: (n: number) => string;
  canManage: boolean;
}) {
  const meta = KIND_META[account.kind];
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleAccount(account.id, !account.isActive);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }
  function remove() {
    if (!confirm(`Delete "${account.name}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAccount(account.id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className={`rounded-xl border p-md shadow-sm ${account.isActive ? "bg-surface border-outline-variant" : "bg-surface-container-low border-outline-variant/60 opacity-75"}`}>
      <div className="flex items-start justify-between mb-sm">
        <div className="flex items-center gap-sm min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.badge}`}>
            <Icon name={meta.icon} size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-body-md text-body-md text-on-surface font-semibold truncate">{account.name}</p>
            <span className="font-label-md text-label-md text-on-surface-variant">{meta.label}</span>
          </div>
        </div>
        {!account.isActive && (
          <span className="text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant shrink-0">
            Inactive
          </span>
        )}
      </div>

      <p className="font-display-lg text-[26px] font-bold tabular-nums text-on-surface">{money(account.balance)}</p>
      <p className="font-label-md text-label-md text-on-surface-variant mt-xs">
        Opening {money(account.openingBalance)} · <span className="text-primary">+{money(account.inflow)}</span> in ·{" "}
        <span className="text-error">−{money(account.outflow)}</span> out · {account.txnCount} txn
      </p>

      {error && <p className="font-body-sm text-body-sm text-error mt-sm">{error}</p>}

      {canManage && (
        <div className="flex items-center gap-sm mt-md pt-sm border-t border-outline-variant/50">
          <button onClick={toggle} disabled={pending} className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-md text-label-md disabled:opacity-60 transition-colors">
            <Icon name={account.isActive ? "toggle_on" : "toggle_off"} size={18} />
            {account.isActive ? "Deactivate" : "Activate"}
          </button>
          <button onClick={remove} disabled={pending} className="inline-flex items-center gap-1 text-on-surface-variant hover:text-error font-label-md text-label-md disabled:opacity-60 transition-colors ml-auto">
            <Icon name="delete" size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createAccount, null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank");
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const inputCls = "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-xl shadow-xl border border-outline-variant" onClick={(e) => e.stopPropagation()}>
        <div className="p-md border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">New payment account</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><Icon name="close" /></button>
        </div>

        <form action={formAction} className="p-md space-y-md">
          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">Account type</label>
            <div className="grid grid-cols-3 gap-sm">
              {(["bank", "mobile", "cash"] as AccountKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`py-2 rounded-lg border flex flex-col items-center gap-1 transition-colors ${kind === k ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"}`}
                >
                  <Icon name={KIND_META[k].icon} size={18} />
                  <span className="font-label-md text-label-md capitalize">{k === "mobile" ? "Mobile" : k}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="kind" value={kind} />
          </div>

          {kind !== "cash" && (
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-xs">Quick add</p>
              <div className="flex flex-wrap gap-xs">
                {PRESETS.find((p) => p.kind === kind)?.names.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setName(n)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${name === n ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">Account name</label>
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Premier Bank" className={inputCls} />
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">Opening balance</label>
            <input name="opening_balance" type="number" step="0.01" defaultValue="0" className={inputCls} />
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Current money already in this account. Leave 0 to start empty.</p>
          </div>

          {state && !state.ok && <p className="font-body-sm text-body-sm text-error">{state.error}</p>}

          <div className="flex items-center justify-end gap-sm pt-xs">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Cancel</button>
            <button type="submit" disabled={pending} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
              <Icon name={pending ? "hourglass_empty" : "add"} size={16} />
              {pending ? "Adding…" : "Add account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
