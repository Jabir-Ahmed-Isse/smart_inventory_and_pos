import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { DeleteButton } from "@/components/DeleteButton";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getBrands, getProductsWithStock, compactMoney } from "@/lib/data";
import { createBrand, deleteBrand } from "@/lib/config/actions";

export const metadata = { title: "Brand Management — Inventory Pro" };

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default async function BrandsPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const [brands, products] = org
    ? await Promise.all([getBrands(org.orgId), getProductsWithStock(org.orgId)])
    : [[], []];
  const currency = org?.currency ?? "USD";

  // Aggregate real SKU count + stock value per brand (by name).
  const agg = new Map<string, { skus: number; value: number }>();
  for (const p of products) {
    const a = agg.get(p.brand) ?? { skus: 0, value: 0 };
    a.skus += 1;
    a.value += p.qty * p.price;
    agg.set(p.brand, a);
  }
  const featured = brands[0] ?? null;

  return (
    <main className="p-md md:p-lg min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-md flex-shrink-0">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface font-semibold tracking-tight">
            Brand Management
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Manage and track manufacturer partners across your inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-surface text-on-surface border border-outline-variant rounded-lg font-label-md text-label-md font-medium hover:bg-surface-variant transition-colors flex items-center gap-2">
            <Icon name="download" size={18} /> Export
          </button>
          <NewBrandDialog />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left: brand grid */}
        <div className="lg:col-span-8 flex flex-col bg-surface rounded-xl border border-surface-variant shadow-ambient overflow-hidden">
          <div className="p-4 border-b border-surface-variant bg-surface-container-low flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-label-md text-label-md text-on-surface-variant">
                {brands.length} brand{brands.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-on-surface-variant gap-2 py-16 text-center">
                <Icon name="sell" size={40} className="text-outline-variant" />
                <p className="font-body-sm text-body-sm">
                  {org ? "No brands yet. Add your first manufacturer." : "Sign in to manage brands."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brands.map((b, i) => {
                  const stats = agg.get(b.name) ?? { skus: b.productCount, value: 0 };
                  return (
                    <div
                      key={b.id}
                      className={`bg-surface rounded-xl p-5 relative group ${i === 0 ? "border-2 border-primary shadow-sm" : "border border-surface-variant shadow-ambient hover:border-outline-variant"}`}
                    >
                      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DeleteButton
                          id={b.id}
                          action={deleteBrand}
                          confirmLabel={`Delete brand "${b.name}"?`}
                          size={16}
                        />
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-surface-container border border-outline-variant overflow-hidden flex-shrink-0 flex items-center justify-center p-2 text-primary font-bold text-lg">
                          {b.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="w-full h-full object-contain" src={b.logoUrl} alt={b.name} />
                          ) : (
                            initials(b.name)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-headline-lg text-lg font-bold text-on-surface truncate">{b.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full font-label-md text-[10px] uppercase ${b.status === "active" ? "bg-primary-container/20 text-primary border border-primary/20" : "bg-surface-container-high text-on-surface-variant border border-outline-variant"}`}>
                              {b.status}
                            </span>
                          </div>
                          {b.website && (
                            <a className="font-body-sm text-sm text-secondary hover:underline flex items-center gap-1 mb-3" href={b.website.startsWith("http") ? b.website : `https://${b.website}`} target="_blank" rel="noreferrer">
                              {b.website.replace(/^https?:\/\//, "")} <Icon name="open_in_new" size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-surface-variant">
                        <div>
                          <p className="font-label-md text-xs text-on-surface-variant mb-1">Total SKUs</p>
                          <p className="font-body-md font-semibold text-on-surface">{stats.skus.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-label-md text-xs text-on-surface-variant mb-1">Stock Value</p>
                          <p className="font-body-md font-semibold text-on-surface">{compactMoney(stats.value, currency)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: quick view */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
          <div className="bg-surface rounded-xl border border-surface-variant shadow-ambient p-5 flex-shrink-0 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="font-label-md text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 block">
                  Selected Brand
                </span>
                <h3 className="font-headline-xl text-2xl font-bold text-on-surface mb-2">
                  {featured?.name ?? "No brand"}
                </h3>
                <p className="font-body-sm text-on-surface-variant line-clamp-2 mb-4">
                  {featured
                    ? `${(agg.get(featured.name)?.skus ?? 0).toLocaleString()} SKUs · ${compactMoney(agg.get(featured.name)?.value ?? 0, currency)} in stock value.`
                    : "Add a brand to see its overview here."}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                <Icon name="verified" className="text-primary" />
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col min-h-0 bg-surface">
            <div className="p-4 border-b border-surface-variant flex justify-between items-center bg-surface-container-lowest/50">
              <h4 className="font-headline-lg text-base font-semibold text-on-surface flex items-center gap-2">
                <Icon name="leaderboard" size={20} className="text-primary" />
                Brands by Stock Value
              </h4>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {brands.length === 0 ? (
                <p className="p-4 font-body-sm text-body-sm text-on-surface-variant text-center">No data yet.</p>
              ) : (
                [...brands]
                  .sort((a, b) => (agg.get(b.name)?.value ?? 0) - (agg.get(a.name)?.value ?? 0))
                  .slice(0, 6)
                  .map((b) => (
                    <div key={b.id} className="p-3 hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-container text-on-primary-container font-label-md text-xs font-bold">
                        {initials(b.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-sm text-sm text-on-surface font-medium truncate">{b.name}</p>
                        <p className="font-label-md text-[11px] text-on-surface-variant">{(agg.get(b.name)?.skus ?? 0)} SKUs</p>
                      </div>
                      <p className="font-body-sm font-semibold text-on-surface">{compactMoney(agg.get(b.name)?.value ?? 0, currency)}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function NewBrandDialog() {
  return (
    <CrudDialog
      triggerLabel="New Brand"
      title="New Brand"
      submitLabel="Create Brand"
      action={createBrand}
      triggerClassName="px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
    >
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="NexusTech" type="text" />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Website</label>
          <input name="website" className={fieldCls} placeholder="nexustech.io" type="text" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" className={`${fieldCls} appearance-none`} defaultValue="active">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </CrudDialog>
  );
}
