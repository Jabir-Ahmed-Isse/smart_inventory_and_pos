"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { ProductRow, StockStatus } from "@/lib/data";

function money(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

const STATUS_META: Record<StockStatus, { label: string; pill: string; qtyClass: string; bar: string; rowExtra: string; dim: boolean }> = {
  in: { label: "IN STOCK", pill: "bg-primary-container/20 text-primary-container border border-primary-container/30", qtyClass: "text-on-surface", bar: "bg-primary", rowExtra: "", dim: false },
  low: { label: "LOW STOCK", pill: "bg-tertiary-fixed text-tertiary border border-tertiary/30", qtyClass: "text-tertiary-container font-semibold", bar: "bg-tertiary-container", rowExtra: "", dim: false },
  out: { label: "OUT OF STOCK", pill: "bg-error-container text-error border border-error/30", qtyClass: "text-error font-semibold", bar: "bg-error", rowExtra: "bg-error-container/5", dim: true },
};

type Props = {
  hasOrg: boolean;
  anyProducts: boolean;
  rows: ProductRow[];
  currency: string;
  total: number;
  pageCount: number;
  page: number;
  pageSize: number;
  categories: string[];
  brands: string[];
  q: string;
  category: string;
  brand: string;
  min: string;
  max: string;
  statuses: StockStatus[];
};

export function ProductsExplorer(props: Props) {
  const { hasOrg, anyProducts, rows, currency, total, pageCount, page, pageSize, categories, brands, q, category, brand, min, max, statuses } = props;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Local mirrors for debounced text inputs (search + price).
  const [searchText, setSearchText] = useState(q);
  const [minText, setMinText] = useState(min);
  const [maxText, setMaxText] = useState(max);
  useEffect(() => setSearchText(q), [q]);
  useEffect(() => { setMinText(min); setMaxText(max); }, [min, max]);

  function apply(updates: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Debounce the text inputs so we don't fire a query per keystroke.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function debounced(updates: Record<string, string | null>) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(updates), 350);
  }

  const activeStatuses = statuses.length === 0 ? (["in", "low", "out"] as StockStatus[]) : statuses;
  function toggleStatus(key: StockStatus) {
    const next = activeStatuses.includes(key) ? activeStatuses.filter((s) => s !== key) : [...activeStatuses, key];
    apply({ status: next.length === 0 || next.length === 3 ? null : next.join(",") });
  }

  const filtersActive = !!(q || category || brand || min || max || statuses.length > 0);
  function reset() { startTransition(() => router.replace(pathname, { scroll: false })); }

  const from = (page - 1) * pageSize;

  return (
    <div className="flex flex-col lg:flex-row gap-lg">
      {/* Filters sidebar */}
      <aside className="w-full lg:w-64 shrink-0 space-y-md">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wide">Filters</h3>
            <button onClick={reset} disabled={!filtersActive} className="text-primary font-label-md text-label-md hover:underline disabled:opacity-40 disabled:no-underline">Reset</button>
          </div>
          <div className="space-y-lg">
            <FilterSelect label="Category" value={category} allLabel="All Categories" options={categories} onChange={(v) => apply({ category: v })} />
            <FilterSelect label="Brand" value={brand} allLabel="All Brands" options={brands} onChange={(v) => apply({ brand: v })} />
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-sm">Price Range</label>
              <div className="flex items-center gap-sm">
                <input value={minText} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ""); setMinText(v); debounced({ min: v || null }); }} inputMode="decimal" className="w-full bg-surface-bright border border-outline-variant rounded-lg px-sm py-sm font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary text-center" placeholder="Min" type="text" />
                <span className="text-outline-variant">-</span>
                <input value={maxText} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ""); setMaxText(v); debounced({ max: v || null }); }} inputMode="decimal" className="w-full bg-surface-bright border border-outline-variant rounded-lg px-sm py-sm font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary text-center" placeholder="Max" type="text" />
              </div>
            </div>
            <div>
              <label className="font-label-md text-label-md text-on-surface-variant block mb-sm">Stock Status</label>
              <div className="space-y-xs">
                {([["in", "In Stock"], ["low", "Low Stock"], ["out", "Out of Stock"]] as const).map(([key, s]) => (
                  <label key={key} className="flex items-center gap-sm cursor-pointer group">
                    <input checked={activeStatuses.includes(key)} onChange={() => toggleStatus(key)} className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4" type="checkbox" />
                    <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Data table */}
      <div className={`flex-1 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col transition-opacity ${pending ? "opacity-60" : ""}`}>
        <div className="p-sm border-b border-outline-variant/50 bg-surface-container-low flex justify-between items-center">
          <div className="flex items-center relative glass-panel border border-outline-variant rounded-md w-72 h-8 px-sm transition-all focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <Icon name={pending ? "hourglass_empty" : "search"} size={16} className="text-outline mr-sm" />
            <input value={searchText} onChange={(e) => { setSearchText(e.target.value); debounced({ q: e.target.value || null }); }} className="bg-transparent border-none outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant focus:ring-0 py-0" placeholder="Search products, SKUs..." type="text" />
            {searchText && (
              <button onClick={() => { setSearchText(""); apply({ q: null }); }} className="text-outline hover:text-on-surface ml-sm"><Icon name="close" size={16} /></button>
            )}
          </div>
          <span className="font-label-md text-label-md text-on-surface-variant hidden sm:inline">{total.toLocaleString()} {total === 1 ? "product" : "products"}</span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-lowest sticky top-0 z-10 border-b border-outline-variant/50">
              <tr>
                <th className="p-md font-label-md text-label-md text-on-surface-variant w-[40px]"><input className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4" type="checkbox" /></th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Category</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Brand</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Price</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant w-48">Stock Level</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-center">Status</th>
                <th className="p-md w-[40px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm text-body-sm">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-xl text-center">
                    <div className="flex flex-col items-center gap-sm text-on-surface-variant">
                      <Icon name={hasOrg ? "search_off" : "inventory_2"} size={40} className="text-outline-variant" />
                      <p className="font-body-md text-body-md">{!hasOrg ? "Sign in to view your catalog." : !anyProducts ? "No products yet." : "No products match your filters."}</p>
                      {hasOrg && !anyProducts && <Link href="/products/new" className="mt-xs text-primary font-label-md text-label-md hover:underline">Add your first product →</Link>}
                      {hasOrg && anyProducts && filtersActive && <button onClick={reset} className="mt-xs text-primary font-label-md text-label-md hover:underline">Clear filters</button>}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((p) => <ProductTableRow key={p.id} product={p} currency={currency} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-sm border-t border-outline-variant/50 bg-surface-container-low flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
          <p>Showing {total === 0 ? 0 : from + 1} to {Math.min(from + pageSize, total)} of {total.toLocaleString()} entries</p>
          <div className="flex items-center gap-xs">
            <button onClick={() => apply({ page: String(page - 1) }, false)} disabled={page <= 1 || pending} className="p-xs rounded hover:bg-surface-container border border-transparent hover:border-outline-variant transition-colors disabled:opacity-50"><Icon name="chevron_left" size={20} /></button>
            <span className="px-sm">Page {page} of {pageCount}</span>
            <button onClick={() => apply({ page: String(page + 1) }, false)} disabled={page >= pageCount || pending} className="p-xs rounded hover:bg-surface-container border border-transparent hover:border-outline-variant transition-colors disabled:opacity-50"><Icon name="chevron_right" size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, allLabel, options, onChange }: { label: string; value: string; allLabel: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="font-label-md text-label-md text-on-surface-variant block mb-sm">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm font-body-sm text-body-sm text-on-surface appearance-none focus:ring-2 focus:ring-primary focus:border-primary">
          <option value="">{allLabel}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Icon name="expand_more" className="absolute right-sm top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
      </div>
    </div>
  );
}

function ProductTableRow({ product, currency }: { product: ProductRow; currency: string }) {
  const meta = STATUS_META[product.status];
  return (
    <tr className={`hover:bg-surface-container-lowest transition-colors group ${meta.rowExtra}`}>
      <td className="p-md"><input className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4" type="checkbox" /></td>
      <td className="p-md">
        <div className="flex items-center gap-md">
          <div className={`w-10 h-10 rounded border border-outline-variant/50 overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center ${meta.dim ? "opacity-50 grayscale" : ""}`}>
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="w-full h-full object-cover" src={product.imageUrl} alt={product.name} />
            ) : (
              <Icon name="inventory_2" size={18} className="text-on-surface-variant" />
            )}
          </div>
          <div>
            <p className={`font-semibold ${meta.dim ? "text-on-surface-variant" : "text-on-surface"}`}>{product.name}</p>
            <p className="text-outline text-xs mt-xs">SKU: {product.sku}</p>
          </div>
        </div>
      </td>
      <td className="p-md text-on-surface-variant">{product.category}</td>
      <td className="p-md text-on-surface-variant">{product.brand}</td>
      <td className={`p-md text-right font-medium ${meta.dim ? "text-on-surface-variant" : "text-on-surface"}`}>{money(product.price, currency)}</td>
      <td className="p-md">
        <div className="flex items-center gap-sm">
          <span className={`w-10 ${meta.qtyClass}`}>{product.qty.toLocaleString()}</span>
          <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${product.bar}%` }} />
          </div>
        </div>
      </td>
      <td className="p-md text-center"><span className={`inline-flex items-center px-2 py-1 rounded-full font-label-md text-[10px] ${meta.pill}`}>{meta.label}</span></td>
      <td className="p-md">
        <Link href={`/products/${product.id}/edit`} className="opacity-0 group-hover:opacity-100 p-xs text-outline hover:text-primary transition-all inline-flex"><Icon name="edit" size={20} /></Link>
      </td>
    </tr>
  );
}
