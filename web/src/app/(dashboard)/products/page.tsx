import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { getProductsWithStock, computeProductStats } from "@/lib/data";
import { ProductsExplorer } from "./ProductsExplorer";

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
              href="/products/import"
              className="flex items-center gap-sm px-md py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm"
            >
              <Icon name="upload_file" size={18} />
              Import
            </Link>
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

        {/* Filters + table (interactive) */}
        <ProductsExplorer products={products} currency={currency} hasOrg={!!org} />
      </div>
    </main>
  );
}
