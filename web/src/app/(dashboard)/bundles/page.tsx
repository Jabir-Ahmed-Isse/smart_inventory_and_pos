import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getProductOptions, money, type Option } from "@/lib/data";
import { getBundles } from "@/lib/features/data";
import { createBundle } from "@/lib/features/actions";

export const metadata = { title: "Product Bundles — Inventory Pro" };

export default async function BundlesPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const [bundles, products] = org
    ? await Promise.all([getBundles(org.orgId), getProductOptions(org.orgId)])
    : [[], []];
  const currency = org?.currency ?? "USD";

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Product Bundles</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Group products into kits sold as a single SKU.
          </p>
        </div>
        <NewBundleDialog products={products} />
      </div>

      {bundles.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center">
          <Icon name="widgets" size={40} className="text-outline-variant mx-auto mb-2" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {org ? "No bundles yet. Create your first kit." : "Sign in to manage bundles."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {bundles.map((b) => (
            <div key={b.id} className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col shadow-sm">
              <div className="flex items-start justify-between mb-md">
                <div className="w-12 h-12 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
                  <Icon name="widgets" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${b.status === "active" ? "bg-primary-container/20 text-primary border border-primary/20" : "bg-surface-container-high text-on-surface-variant border border-outline-variant"}`}>
                  {b.status}
                </span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{b.name}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{b.sku ?? "No SKU"}</p>
              <div className="mt-auto pt-md flex items-end justify-between border-t border-outline-variant mt-md">
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant">Components</p>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">{b.itemCount}</p>
                </div>
                <p className="font-headline-lg text-headline-lg text-primary">{money(b.price, currency)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function NewBundleDialog({ products }: { products: (Option & { sku: string })[] }) {
  return (
    <CrudDialog
      triggerLabel="New Bundle"
      triggerIcon="widgets"
      title="New Bundle"
      submitLabel="Create Bundle"
      action={createBundle}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Name *</label>
          <input name="name" required className={fieldCls} placeholder="Starter Kit" type="text" />
        </div>
        <div>
          <label className={labelCls}>SKU</label>
          <input name="sku" className={fieldCls} placeholder="BND-001" type="text" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Bundle Price</label>
        <input name="price" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
      </div>
      <div className="grid grid-cols-3 gap-md">
        <div className="col-span-2">
          <label className={labelCls}>Add a component</label>
          <select name="product_id" className={`${fieldCls} appearance-none`} defaultValue="">
            <option value="">— None —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Qty</label>
          <input name="quantity" type="number" min="1" defaultValue="1" className={fieldCls} />
        </div>
      </div>
    </CrudDialog>
  );
}
