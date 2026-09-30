import { Suspense } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { getBranchContext } from "@/lib/branches/context";
import {
  getProductsPage,
  getProductStatsCount,
  getBranchStockMap,
  getBranchStockStats,
  getCategoryOptions,
  getBrandOptions,
  PRODUCTS_PAGE_SIZE,
  type StockStatus,
} from "@/lib/data";
import { ProductsExplorer } from "./ProductsExplorer";

export const metadata = { title: "Products — Inventory Pro" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// The shell (header + actions) is a plain component so it streams to the browser
// INSTANTLY on navigation and on every filter/page change — it never waits for a
// query. Only the data (KPIs + table) sits behind Suspense and shows a skeleton.
export default function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <main className="flex-1 p-md md:p-lg lg:p-xl bg-surface-bright pb-32">
      <div className="max-w-[1440px] mx-auto space-y-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
          <div>
            <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">Products</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
              Manage your inventory catalog and track stock levels across warehouses.
            </p>
          </div>
          <div className="flex items-center gap-md">
            <button className="flex items-center gap-sm px-md py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm">
              <Icon name="download" size={18} /> Export
            </button>
            <Link href="/products/import" className="flex items-center gap-sm px-md py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm">
              <Icon name="upload_file" size={18} /> Import
            </Link>
            <Link href="/products/new" className="flex items-center gap-sm px-md py-sm rounded-lg bg-[#10b981] text-white font-label-md text-label-md hover:bg-[#059669] transition-colors shadow-sm active:scale-95">
              <Icon name="add" size={18} /> Add Product
            </Link>
          </div>
        </div>

        <Suspense fallback={<ProductsSkeleton />}>
          <ProductsData searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function ProductsData({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const org = await getActiveOrg();
  if (!org) return <ProductsExplorer hasOrg={false} anyProducts={false} rows={[]} currency="USD" total={0} pageCount={1} page={1} pageSize={PRODUCTS_PAGE_SIZE} categories={[]} brands={[]} q="" category="" brand="" min="" max="" statuses={[]} />;

  const q = one(sp.q);
  const category = one(sp.category);
  const brand = one(sp.brand);
  const min = one(sp.min);
  const max = one(sp.max);
  const statuses = (one(sp.status) ? one(sp.status).split(",") : []).filter((s): s is StockStatus => ["in", "low", "out"].includes(s));
  const page = Math.max(1, parseInt(one(sp.page), 10) || 1);

  // Branch context: when a specific branch is selected (or the user is locked to
  // one), show THAT branch's stock levels + KPIs so the catalog matches POS.
  const branchCtx = await getBranchContext(org);
  const branchId = branchCtx.activeBranchId;
  const branchName = branchId ? branchCtx.branches.find((b) => b.id === branchId)?.name ?? null : null;

  const [pageData, orgStats, cats, brs, branchStock, branchStats] = await Promise.all([
    getProductsPage(org.orgId, {
      page, q, category, brand, statuses,
      min: min ? Number(min) : undefined,
      max: max ? Number(max) : undefined,
    }),
    getProductStatsCount(org.orgId),
    getCategoryOptions(org.orgId),
    getBrandOptions(org.orgId),
    branchId ? getBranchStockMap(org.orgId, branchId) : Promise.resolve(null),
    branchId ? getBranchStockStats(org.orgId, branchId) : Promise.resolve(null),
  ]);
  const currency = org.currency;

  // Override each row's quantity/status/bar with the branch figure when scoped.
  const rows = branchStock
    ? pageData.rows.map((r) => {
        const qty = branchStock.get(r.id) ?? 0;
        const status: StockStatus = qty <= 0 ? "out" : r.minStock > 0 && qty <= r.minStock ? "low" : "in";
        const target = Math.max(r.minStock * 3, 1);
        const bar = status === "out" ? 0 : Math.min(100, Math.round((qty / target) * 100));
        return { ...r, qty, status, bar };
      })
    : pageData.rows;
  const stats = branchStats ?? orgStats;

  return (
    <>
      {branchName && (
        <div className="rounded-xl border border-secondary/30 bg-secondary-container/10 px-md py-sm font-body-sm text-body-sm text-on-surface flex items-center gap-2">
          <Icon name="store" size={18} className="text-secondary" />
          Showing stock for <b className="text-on-surface">{branchName}</b>. Switch to “All Branches” in the top bar for company-wide totals.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <Kpi label="Total Products" value={stats.total.toLocaleString()} icon="inventory_2" tone="neutral" />
        <Kpi label="Low Stock" value={stats.low.toLocaleString()} icon="warning" tone="warning" />
        <Kpi label="Out of Stock" value={stats.out.toLocaleString()} icon="error" tone="negative" />
      </div>
      <ProductsExplorer
        hasOrg
        anyProducts={stats.total > 0}
        rows={rows}
        currency={currency}
        total={pageData.total}
        pageCount={pageData.pageCount}
        page={pageData.page}
        pageSize={PRODUCTS_PAGE_SIZE}
        categories={cats.map((c) => c.name)}
        brands={brs.map((b) => b.name)}
        q={q}
        category={category}
        brand={brand}
        min={min}
        max={max}
        statuses={statuses}
      />
    </>
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-lg animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-surface-container-high rounded-xl" />)}
      </div>
      <div className="flex flex-col lg:flex-row gap-lg">
        <div className="w-full lg:w-64 h-64 bg-surface-container-high rounded-xl shrink-0" />
        <div className="flex-1 border border-outline-variant rounded-xl overflow-hidden">
          <div className="h-11 bg-surface-container-high/60" />
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 border-b border-outline-variant/60 bg-surface-container-high/30" />)}
        </div>
      </div>
    </div>
  );
}
