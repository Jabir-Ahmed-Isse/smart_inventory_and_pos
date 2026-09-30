import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { getActiveOrg, getOrgBrand } from "@/lib/org";
import { getBranchContext } from "@/lib/branches/context";
import { getOrgBranchStock } from "@/lib/branches/stock";
import { getProductsWithStock, getBranchStockMap, getCustomers, getProductPriceBounds, getFeaturedProductIds, getOrderForEdit } from "@/lib/data";
import { getActiveAccounts } from "@/lib/accounts/data";
import { canSettlePayments } from "@/lib/rbac";
import { PosTerminal, type CatalogItem } from "./PosTerminal";

export const metadata = { title: "Point of Sale — Inventory Pro" };

export default async function PosPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const org = await getActiveOrg();
  const { order: editOrderId } = await searchParams;

  if (org && !org.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-md">
        <div className="max-w-md w-full text-center bg-surface border border-outline-variant rounded-xl p-xl shadow-sm">
          <div className="w-16 h-16 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto mb-lg">
            <Icon name="block" size={32} />
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-sm">Workspace suspended</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Sales are paused for <span className="font-semibold text-on-surface">{org.orgName}</span>. Contact your
            platform administrator to restore access.
          </p>
        </div>
      </div>
    );
  }

  const [products, accounts, customers, brand, bounds, featuredIds] = org
    ? await Promise.all([
        getProductsWithStock(org.orgId),
        getActiveAccounts(org.orgId),
        getCustomers(org.orgId),
        getOrgBrand(org.orgId),
        getProductPriceBounds(org.orgId),
        getFeaturedProductIds(org.orgId),
      ])
    : [[], [], [], { logoUrl: null, tagline: null }, {} as Record<string, { min: number | null; max: number | null }>, [] as string[]];
  const featuredSet = new Set(featuredIds);

  // POS shows the CASHIER'S branch stock, not the org-wide total. When a branch
  // is in context (a scoped cashier, or an owner who picked one), override each
  // product's availability with that branch's on-hand quantity.
  const branchId = org ? (await getBranchContext(org)).activeBranchId : null;
  const branchStock = org && branchId ? await getBranchStockMap(org.orgId, branchId) : null;

  // For a branch cashier: which OTHER branches have each product in stock, so an
  // out/low item can point them to where to transfer from.
  const elsewhere = new Map<string, { name: string; qty: number }[]>();
  if (org && branchId) {
    const { branches: allBranches, rows } = await getOrgBranchStock(org.orgId);
    for (const r of rows) {
      const others = allBranches
        .filter((b) => b.id !== branchId)
        .map((b) => ({ name: b.name, qty: r.cells[b.id] ?? 0 }))
        .filter((x) => x.qty > 0)
        .sort((a, b) => b.qty - a.qty);
      if (others.length) elsewhere.set(r.productId, others);
    }
  }

  // Held/Pending/Recent lists are lazy-loaded when the Sales panel opens (keeps
  // the POS fast). Only the edit target is fetched here, and only if requested.
  const editOrder = org && editOrderId ? await getOrderForEdit(org.orgId, editOrderId) : null;
  const catalog: CatalogItem[] = products.map((p) => {
    const available = branchStock ? (branchStock.get(p.id) ?? 0) : p.qty;
    // Recompute stock status against branch availability so "Out"/"Low" is per-branch.
    const status = branchStock
      ? (available <= 0 ? "out" : p.minStock > 0 && available <= p.minStock ? "low" : "in")
      : p.status;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      status,
      imageUrl: p.imageUrl,
      available,
      category: p.category,
      minPrice: bounds[p.id]?.min ?? null,
      maxPrice: bounds[p.id]?.max ?? null,
      featured: featuredSet.has(p.id),
      elsewhere: elsewhere.get(p.id),
    };
  });
  const canPay = org ? canSettlePayments(org.role) : false;

  return (
    <div className="bg-background text-on-background h-screen flex flex-col overflow-hidden">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm flex justify-between items-center h-16 px-gutter shrink-0">
        <div className="flex items-center gap-gutter">
          <Logo name={org?.orgName ?? "Workspace"} logoUrl={brand.logoUrl} tagline={brand.tagline} />
          <div className="hidden md:flex gap-md font-label-md text-label-md text-on-surface-variant">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Workspace</Link>
            <span className="text-primary font-semibold">Sales</span>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button className="font-label-md text-label-md text-primary bg-surface-container-low hover:bg-surface-container-high px-md py-xs rounded-full transition-colors hidden sm:block">
            AI Assistant
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <Icon name="notifications" />
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <Icon name="apps" />
          </button>
          <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-high flex items-center justify-center text-on-surface-variant">
            <Icon name="person" size={20} />
          </div>
        </div>
      </nav>

      <PosTerminal
        catalog={catalog}
        currency={org?.currency ?? "USD"}
        taxRate={org?.taxRate ?? 0}
        accounts={accounts}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        canPay={canPay}
        orgId={org?.orgId ?? "anon"}
        editOrder={editOrder}
        companyName={org?.orgName ?? "Workspace"}
        logoUrl={brand.logoUrl}
        tagline={brand.tagline}
      />
    </div>
  );
}
