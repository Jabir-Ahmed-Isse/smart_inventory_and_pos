"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { receiveStock } from "@/lib/purchases/actions";
import type { Option, WarehouseOption } from "@/lib/data";

const inputCls =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-sm text-body-sm";

export function ReceiveStockDialog({
  products,
  warehouses,
  suppliers,
}: {
  products: (Option & { sku: string })[];
  warehouses: WarehouseOption[];
  suppliers: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    (_prev: Awaited<ReturnType<typeof receiveStock>> | null, formData: FormData) =>
      receiveStock(formData),
    null,
  );

  // On a fresh successful receive, flip to the success view. The action's own
  // revalidatePath refreshes the purchases/inventory pages automatically.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state?.ok) setDone(state.poNumber);
    wasPending.current = pending;
  }, [pending, state]);

  const error = state && !state.ok ? state.error : null;
  const disabled = products.length === 0 || warehouses.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDone(null);
          setOpen(true);
        }}
        className="font-label-md text-label-md px-md py-sm rounded-lg bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center gap-xs"
      >
        <Icon name="inventory" size={18} />
        Receive Stock
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-[480px] bg-surface rounded-xl border border-outline-variant shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-md border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Receive Stock</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-primary p-xs rounded-full">
                <Icon name="close" />
              </button>
            </div>

            {done ? (
              <div className="p-lg flex flex-col items-center text-center gap-sm">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon name="check_circle" size={28} className="text-primary" filled />
                </div>
                <p className="font-headline-lg text-headline-lg text-on-surface">Stock received</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  <span className="font-mono">{done}</span> — inventory, purchases &amp; finance updated.
                </p>
                <div className="flex gap-sm mt-sm">
                  <button type="button" onClick={() => setDone(null)} className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high font-label-md text-label-md">
                    Receive more
                  </button>
                  <button type="button" onClick={() => setOpen(false)} className="px-lg py-sm rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md shadow-sm">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form action={formAction} className="p-lg space-y-md">
                {error && (
                  <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">
                    {error}
                  </div>
                )}
                {disabled && (
                  <div className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
                    Add at least one product and warehouse first.
                  </div>
                )}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Product *</label>
                  <select name="product_id" required className={`${inputCls} appearance-none`} defaultValue="">
                    <option value="" disabled>Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Warehouse *</label>
                    <select name="warehouse_id" required className={`${inputCls} appearance-none`} defaultValue="">
                      <option value="" disabled>Select…</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Supplier</label>
                    <select name="supplier_id" className={`${inputCls} appearance-none`} defaultValue="">
                      <option value="">— none —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Quantity *</label>
                    <input name="quantity" required className={inputCls} placeholder="0" type="number" min="1" />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">Unit Cost</label>
                    <input name="unit_cost" className={inputCls} placeholder="0.00" type="number" min="0" step="0.01" />
                  </div>
                </div>
                <div className="flex justify-end gap-sm pt-sm">
                  <button type="button" onClick={() => setOpen(false)} className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
                    Cancel
                  </button>
                  <button type="submit" disabled={pending || disabled} className="px-lg py-sm rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md shadow-sm">
                    {pending ? "Receiving…" : "Receive Stock"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
