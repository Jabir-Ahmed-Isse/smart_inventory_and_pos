import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import {
  getProductsWithStock,
  computeProductStats,
  money,
  type ProductRow as ProductData,
  type StockStatus,
} from "@/lib/data";

export const metadata = { title: "Products — Inventory Pro" };

export default async function ProductsPage() {
  const org = await getActiveOrg();
  const products = org ? await getProductsWithStock(org.orgId) : [];
  const stats = computeProductStats(products);
  const currency = org?.currency ?? "USD";

  return (
    <main className="flex-1 p-md md:p-lg lg:p-xl bg-surface-bright pb-32">
      <div className="max-w-[1440px] mx-auto space-y-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
          <div>
            <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">
              Products
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
              Manage your inventory catalog and track stock levels across
              warehouses.
            </p>
          </div>
          <div className="flex items-center gap-md">
            <button className="flex items-center gap-sm px-md py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm">
              <Icon name="download" size={18} />
              Export
            </button>
            <Link
              href="/products/new"
              className="flex items-center gap-sm px-md py-sm rounded-lg bg-[#10b981] text-white font-label-md text-label-md hover:bg-[#059669] transition-colors shadow-sm active:scale-95"
            >
              <Icon name="add" size={18} />
              Add Product
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          <Kpi label="Total Products" value={stats.total.toLocaleString()} icon="inventory_2" tone="neutral" />
          <Kpi label="Low Stock" value={stats.low.toLocaleString()} icon="warning" tone="warning" />
          <Kpi label="Out of Stock" value={stats.out.toLocaleString()} icon="error" tone="negative" />
        </div>

        {/* Filters + table */}
        <div className="flex flex-col lg:flex-row gap-lg">
          {/* Filters sidebar */}
          <aside className="w-full lg:w-64 shrink-0 space-y-md">
            <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
              <div className="flex items-center justify-between mb-md">
                <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wide">
                  Filters
                </h3>
                <button className="text-primary font-label-md text-label-md hover:underline">
                  Reset
                </button>
              </div>
              <div className="space-y-lg">
                <FilterSelect
                  label="Category"
                  options={["All Categories", "Electronics", "Office Supplies", "Furniture"]}
                />
                <FilterSelect label="Brand" options={["All Brands", "TechCorp", "DeskPro"]} />
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-sm">
                    Price Range
                  </label>
                  <div className="flex items-center gap-sm">
                    <input
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-sm py-sm font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary text-center"
                      placeholder="Min"
                      type="text"
                    />
                    <span className="text-outline-variant">-</span>
                    <input
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg px-sm py-sm font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-primary text-center"
                      placeholder="Max"
                      type="text"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-sm">
                    Stock Status
                  </label>
                  <div className="space-y-xs">
                    {["In Stock", "Low Stock", "Out of Stock"].map((s) => (
                      <label key={s} className="flex items-center gap-sm cursor-pointer group">
                        <input
                          defaultChecked
                          className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                          type="checkbox"
                        />
                        <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Data table */}
          <div className="flex-1 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-sm border-b border-outline-variant/50 bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center relative glass-panel border border-outline-variant rounded-md w-72 h-8 px-sm transition-all focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                <Icon name="search" size={16} className="text-outline mr-sm" />
                <input
                  className="bg-transparent border-none outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant focus:ring-0 py-0"
                  placeholder="Search products, SKUs..."
                  type="text"
                />
              </div>
              <button className="p-xs text-on-surface-variant hover:text-primary rounded hover:bg-surface-container transition-colors">
                <Icon name="more_vert" size={20} />
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-surface-container-lowest sticky top-0 z-10 border-b border-outline-variant/50">
                  <tr>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant w-[40px]">
                      <input
                        className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                        type="checkbox"
                      />
                    </th>
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
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-xl text-center">
                        <div className="flex flex-col items-center gap-sm text-on-surface-variant">
                          <Icon name="inventory_2" size={40} className="text-outline-variant" />
                          <p className="font-body-md text-body-md">
                            {org ? "No products yet." : "Sign in to view your catalog."}
                          </p>
                          {org && (
                            <Link
                              href="/products/new"
                              className="mt-xs text-primary font-label-md text-label-md hover:underline"
                            >
                              Add your first product →
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <ProductTableRow key={p.id} product={p} currency={currency} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-sm border-t border-outline-variant/50 bg-surface-container-low flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
              <p>
                Showing {products.length === 0 ? 0 : 1} to {products.length} of{" "}
                {products.length} entries
              </p>
              <div className="flex items-center gap-xs">
                <button className="p-xs rounded hover:bg-surface-container border border-transparent hover:border-outline-variant transition-colors disabled:opacity-50" disabled>
                  <Icon name="chevron_left" size={20} />
                </button>
                <button className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-semibold">
                  1
                </button>
                <button className="p-xs rounded hover:bg-surface-container border border-transparent hover:border-outline-variant transition-colors">
                  <Icon name="chevron_right" size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <label className="font-label-md text-label-md text-on-surface-variant block mb-sm">
        {label}
      </label>
      <div className="relative">
        <select className="w-full bg-surface-bright border border-outline-variant rounded-lg px-md py-sm font-body-sm text-body-sm text-on-surface appearance-none focus:ring-2 focus:ring-primary focus:border-primary">
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <Icon
          name="expand_more"
          className="absolute right-sm top-1/2 -translate-y-1/2 text-outline pointer-events-none"
        />
      </div>
    </div>
  );
}

const STATUS_META: Record<
  StockStatus,
  { label: string; pill: string; qtyClass: string; bar: string; rowExtra: string; dim: boolean }
> = {
  in: {
    label: "IN STOCK",
    pill: "bg-primary-container/20 text-primary-container border border-primary-container/30",
    qtyClass: "text-on-surface",
    bar: "bg-primary",
    rowExtra: "",
    dim: false,
  },
  low: {
    label: "LOW STOCK",
    pill: "bg-tertiary-fixed text-tertiary border border-tertiary/30",
    qtyClass: "text-tertiary-container font-semibold",
    bar: "bg-tertiary-container",
    rowExtra: "",
    dim: false,
  },
  out: {
    label: "OUT OF STOCK",
    pill: "bg-error-container text-error border border-error/30",
    qtyClass: "text-error font-semibold",
    bar: "bg-error",
    rowExtra: "bg-error-container/5",
    dim: true,
  },
};

function ProductTableRow({
  product,
  currency,
}: {
  product: ProductData;
  currency: string;
}) {
  const meta = STATUS_META[product.status];
  return (
    <tr className={`hover:bg-surface-container-lowest transition-colors group ${meta.rowExtra}`}>
      <td className="p-md">
        <input
          className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
          type="checkbox"
        />
      </td>
      <td className="p-md">
        <div className="flex items-center gap-md">
          <div
            className={`w-10 h-10 rounded border border-outline-variant/50 overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center ${meta.dim ? "opacity-50 grayscale" : ""}`}
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="w-full h-full object-cover" src={product.imageUrl} alt={product.name} />
            ) : (
              <Icon name="inventory_2" size={18} className="text-on-surface-variant" />
            )}
          </div>
          <div>
            <p className={`font-semibold ${meta.dim ? "text-on-surface-variant" : "text-on-surface"}`}>
              {product.name}
            </p>
            <p className="text-outline text-xs mt-xs">SKU: {product.sku}</p>
          </div>
        </div>
      </td>
      <td className="p-md text-on-surface-variant">{product.category}</td>
      <td className="p-md text-on-surface-variant">{product.brand}</td>
      <td className={`p-md text-right font-medium ${meta.dim ? "text-on-surface-variant" : "text-on-surface"}`}>
        {money(product.price, currency)}
      </td>
      <td className="p-md">
        <div className="flex items-center gap-sm">
          <span className={`w-10 ${meta.qtyClass}`}>{product.qty.toLocaleString()}</span>
          <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${product.bar}%` }} />
          </div>
        </div>
      </td>
      <td className="p-md text-center">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full font-label-md text-[10px] ${meta.pill}`}
        >
          {meta.label}
        </span>
      </td>
      <td className="p-md">
        <Link
          href={`/products/${product.id}/edit`}
          className="opacity-0 group-hover:opacity-100 p-xs text-outline hover:text-primary transition-all inline-flex"
        >
          <Icon name="edit" size={20} />
        </Link>
      </td>
    </tr>
  );
}
