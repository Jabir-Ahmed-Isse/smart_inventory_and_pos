import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ImageField } from "./ImageField";
import type { Option, WarehouseOption, ProductEdit } from "@/lib/data";

const inputCls =
  "w-full bg-surface-container-lowest border border-outline-variant rounded p-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">{children}</label>;
}

export function ProductForm({
  action,
  title,
  breadcrumb,
  submitLabel,
  error,
  categories,
  brands,
  warehouses,
  initial,
  headerExtra,
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  breadcrumb: string;
  submitLabel: string;
  error?: string;
  categories: Option[];
  brands: Option[];
  warehouses: WarehouseOption[];
  initial?: ProductEdit | null;
  headerExtra?: React.ReactNode;
}) {
  return (
    <form action={action} className="bg-background text-on-background min-h-screen flex flex-col">
      {/* Contextual header */}
      <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm flex items-center justify-between h-16 px-gutter">
        <div className="flex items-center gap-sm">
          <Link href="/products" className="p-sm text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center">
            <Icon name="arrow_back" />
          </Link>
          <div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-primary">{title}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{breadcrumb}</p>
          </div>
        </div>
        <div className="flex items-center gap-md">
          {headerExtra}
          <Link href="/products" className="px-md py-sm rounded border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            Cancel
          </Link>
          <button type="submit" className="px-md py-sm rounded bg-primary-container text-on-primary-container font-label-md text-label-md font-semibold hover:opacity-90 transition-opacity">
            {submitLabel}
          </button>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 overflow-y-auto p-gutter max-w-container-max mx-auto w-full">
        {error && (
          <div className="mb-lg rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left column */}
          <div className="lg:col-span-8 flex flex-col gap-lg">
            {/* General */}
            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">General Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
                <div className="md:col-span-2">
                  <Label>Product Name *</Label>
                  <input name="name" required defaultValue={initial?.name} className={inputCls} placeholder="e.g. Premium Ergonomic Office Chair" type="text" />
                </div>
                <div>
                  <Label>SKU *</Label>
                  <input name="sku" required defaultValue={initial?.sku} className={inputCls} placeholder="e.g. FUR-CHR-001" type="text" />
                </div>
                <div>
                  <Label>Barcode</Label>
                  <input name="barcode" defaultValue={initial?.barcode ?? ""} className={inputCls} placeholder="UPC / EAN — optional" type="text" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <textarea name="description" defaultValue={initial?.description ?? ""} className={`${inputCls} resize-y`} placeholder="Detailed product description..." rows={4} />
              </div>
            </section>

            {/* Pricing */}
            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <Label>Cost Price</Label>
                  <div className="relative">
                    <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">$</span>
                    <input name="cost_price" defaultValue={initial?.costPrice} className={`${inputCls} pl-xl`} placeholder="0.00" type="number" step="0.01" min="0" />
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">What you pay your supplier.</p>
                </div>
                <div>
                  <Label>Retail Price *</Label>
                  <div className="relative">
                    <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">$</span>
                    <input name="retail_price" defaultValue={initial?.retailPrice} className={`${inputCls} pl-xl font-semibold text-primary`} placeholder="0.00" type="number" step="0.01" min="0" />
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Default price customers pay at checkout.</p>
                </div>
              </div>
              {/* Selling-price band — bounds the price a cashier can set at POS. */}
              <div className="mt-md pt-md border-t border-outline-variant">
                <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-sm flex items-center gap-1">
                  <Icon name="tune" size={15} /> Selling price limits (POS)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div>
                    <Label>Min Price</Label>
                    <div className="relative">
                      <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">$</span>
                      <input name="min_price" defaultValue={initial?.minPrice ?? ""} className={`${inputCls} pl-xl`} placeholder="No floor" type="number" step="0.01" min="0" />
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Lowest a cashier may sell for. Blank = no floor.</p>
                  </div>
                  <div>
                    <Label>Max Price</Label>
                    <div className="relative">
                      <span className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">$</span>
                      <input name="max_price" defaultValue={initial?.maxPrice ?? ""} className={`${inputCls} pl-xl`} placeholder="No ceiling" type="number" step="0.01" min="0" />
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Highest a cashier may sell for. Blank = no ceiling.</p>
                  </div>
                </div>
              </div>
              {/* Featured — surface as a POS quick-add button */}
              <label className="mt-md pt-md border-t border-outline-variant flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="is_featured" defaultChecked={initial?.isFeatured ?? false} className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary" />
                <span>
                  <span className="flex items-center gap-1 font-label-md text-label-md text-on-surface"><Icon name="star" size={15} className="text-tertiary" /> Featured product</span>
                  <span className="block font-body-sm text-body-sm text-on-surface-variant">Show as a fast quick-add button on the POS screen.</span>
                </span>
              </label>
            </section>

            {/* Inventory */}
            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg">
              <div className="flex items-center justify-between mb-md">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">
                  {initial ? "Stock On Hand" : "Initial Inventory"}
                </h2>
                <Link href="/warehouse" className="text-primary font-label-md text-label-md hover:underline">Manage Warehouses</Link>
              </div>

              {/* Stock thresholds — grouped together (were split across sections) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md mb-md pb-md border-b border-outline-variant">
                <div>
                  <Label>Low-stock Alert At</Label>
                  <input name="min_stock" defaultValue={initial?.minStock} className={inputCls} placeholder="0" type="number" min="0" />
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Flags the product as “low stock”.</p>
                </div>
                <div>
                  <Label>Reorder Point</Label>
                  <input name="reorder_point" defaultValue={initial?.reorderPoint} className={inputCls} placeholder="0" type="number" min="0" />
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Suggested level to raise a new order.</p>
                </div>
              </div>

              <p className="font-label-md text-label-md text-on-surface-variant mb-sm">Quantity per warehouse</p>
              <div className="space-y-sm">
                {warehouses.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant py-sm">
                    No warehouses yet — create one to set stock.
                  </p>
                ) : (
                  warehouses.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-sm bg-surface-container-lowest border border-outline-variant rounded hover:bg-surface-container-low transition-colors">
                      <div className="flex items-center gap-sm">
                        <Icon name="warehouse" className="text-outline" />
                        <div>
                          <p className="font-body-md text-body-md text-on-surface font-semibold">{w.name}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">{w.location ?? "—"}</p>
                        </div>
                      </div>
                      <div className="w-32">
                        <input
                          name={`qty_${w.id}`}
                          defaultValue={initial?.stock[w.id] ?? 0}
                          className="w-full bg-surface border border-outline-variant rounded p-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md text-center"
                          placeholder="Qty"
                          type="number"
                          min="0"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Product Image</h2>
              <ImageField defaultValue={initial?.imageUrl} />
            </section>

            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm p-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Organization</h2>
              <div className="space-y-md">
                <div>
                  <Label>Category</Label>
                  <select name="category_id" className={`${inputCls} appearance-none`} defaultValue={initial?.categoryId ?? ""}>
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Brand</Label>
                  <select name="brand_id" className={`${inputCls} appearance-none`} defaultValue={initial?.brandId ?? ""}>
                    <option value="">No brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </form>
  );
}
