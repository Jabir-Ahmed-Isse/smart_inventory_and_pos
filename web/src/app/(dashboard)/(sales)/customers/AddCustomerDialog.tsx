"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { createCustomer } from "@/lib/customers/actions";

const inputCls =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-sm text-body-sm";

type Result = { ok: true } | { ok: false; error: string };

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: Result | null, formData: FormData) => createCustomer(formData),
    null,
  );

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state && !state.ok) setOpen(true);
    wasPending.current = pending;
  }, [pending, state]);

  const error = state && !state.ok ? state.error : null;
  const mounted = open || pending;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 md:flex-none flex items-center justify-center gap-sm bg-primary text-on-primary hover:bg-primary/90 px-lg py-sm rounded font-label-md text-label-md transition-all shadow-sm"
      >
        <Icon name="person_add" size={18} />
        Add Customer
      </button>

      {mounted && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-md ${open ? "" : "hidden"}`}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-[460px] bg-surface rounded-xl border border-outline-variant shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-md border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">New Customer</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-primary p-xs rounded-full">
                <Icon name="close" />
              </button>
            </div>

            <form action={formAction} onSubmit={() => setOpen(false)} className="p-lg space-y-md">
              {error && (
                <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">
                  {error}
                </div>
              )}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Name *</label>
                <input name="name" required className={inputCls} placeholder="Acme Corp Solutions" type="text" />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Email</label>
                  <input name="email" className={inputCls} placeholder="name@company.com" type="email" />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Phone</label>
                  <input name="phone" className={inputCls} placeholder="+1 (555) 000-0000" type="text" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-md">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Segment</label>
                  <select name="segment" className={`${inputCls} appearance-none`} defaultValue="Regular">
                    <option>Regular</option>
                    <option>VIP</option>
                    <option>Distributor</option>
                    <option>Retail Partner</option>
                    <option>New</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Loyalty</label>
                  <input name="loyalty_points" className={inputCls} placeholder="0" type="number" min="0" />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Credit</label>
                  <input name="credit_limit" className={inputCls} placeholder="0" type="number" min="0" step="0.01" />
                </div>
              </div>
              <div className="flex justify-end gap-sm pt-sm">
                <button type="button" onClick={() => setOpen(false)} className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-lg py-sm rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md shadow-sm"
                >
                  {pending ? "Saving…" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
