"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrgSettings } from "@/lib/settings/actions";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "AED", "NGN", "KES", "ZAR", "JPY", "CNY"];

const inputCls =
  "w-full px-md py-3 bg-surface-bright border border-outline-variant/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm font-body-md text-body-md text-on-surface";

export function SettingsForm({
  name,
  currency,
  taxRate,
  canManage,
}: {
  name: string;
  currency: string;
  taxRate: number;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const router = useRouter();

  function submit(formData: FormData) {
    setStatus(null);
    startTransition(async () => {
      const res = await updateOrgSettings(formData);
      if (res.ok) {
        setStatus({ ok: true, msg: "Settings saved." });
        router.refresh();
      } else {
        setStatus({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <form action={submit}>
      <div className="p-lg space-y-lg">
        {status && (
          <div
            className={`rounded-xl px-md py-sm font-body-sm text-body-sm border ${status.ok ? "border-primary/30 bg-primary-container/20 text-primary" : "border-error/30 bg-error-container/40 text-on-error-container"}`}
          >
            {status.msg}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="space-y-sm md:col-span-2">
            <label className="block font-label-md text-label-md text-on-surface">Workspace Name</label>
            <input name="name" required defaultValue={name} disabled={!canManage} className={inputCls} type="text" />
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Your company&apos;s visible name across the app.</p>
          </div>
          <div className="space-y-sm">
            <label className="block font-label-md text-label-md text-on-surface">Default Currency</label>
            <select name="currency" defaultValue={currency} disabled={!canManage} className={`${inputCls} appearance-none`}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Used for prices, sales, and reports.</p>
          </div>
          <div className="space-y-sm">
            <label className="block font-label-md text-label-md text-on-surface">Default Tax Rate (%)</label>
            <input name="tax_rate" defaultValue={taxRate} disabled={!canManage} className={inputCls} type="number" min="0" max="100" step="0.01" />
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">Applied at POS checkout by default.</p>
          </div>
        </div>
      </div>
      <div className="bg-surface-bright p-md md:px-lg md:py-md flex justify-end gap-sm border-t border-outline-variant/30">
        <button
          type="submit"
          disabled={pending || !canManage}
          className="px-lg py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-label-md text-label-md transition-colors shadow-sm disabled:opacity-60"
        >
          {pending ? "Saving…" : canManage ? "Save Changes" : "Read-only"}
        </button>
      </div>
    </form>
  );
}
