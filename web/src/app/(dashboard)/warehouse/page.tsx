import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { AddWarehouseDialog } from "@/components/AddWarehouseDialog";
import {
  getWarehousesWithStats,
  getProductsWithStock,
  compactMoney,
  type WarehouseRow,
} from "@/lib/data";

export const metadata = { title: "Warehouse — Inventory Pro" };

function compactUnits(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export default async function WarehousePage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const [warehouses, products] = org
    ? await Promise.all([getWarehousesWithStats(org.orgId), getProductsWithStock(org.orgId)])
    : [[], []];
  const currency = org?.currency ?? "USD";
  const lowStock = products.filter((p) => p.status === "low" || p.status === "out");

  return (
    <div className="p-md md:p-gutter max-w-container-max mx-auto w-full flex flex-col gap-gutter">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Warehouse Overview</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage fulfillment centers and spatial inventory.
          </p>
        </div>
        <div className="flex gap-md w-full sm:w-auto">
          <Link
            href="/transfers"
            className="flex-1 sm:flex-none flex items-center justify-center gap-sm px-lg py-3 border border-outline text-on-surface rounded-lg hover:bg-surface-container hover:border-outline-variant transition-all font-label-md text-label-md font-semibold"
          >
            <Icon name="sync_alt" />
            Transfer Stock
          </Link>
          <AddWarehouseDialog triggerClassName="flex-1 sm:flex-none flex items-center justify-center gap-sm px-lg py-3 bg-primary text-on-primary rounded-lg hover:bg-primary/90 shadow-sm transition-all font-label-md text-label-md font-semibold" />
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 flex flex-col gap-md">
          {warehouses.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl card-shadow flex flex-col items-center justify-center text-on-surface-variant gap-sm min-h-[240px]">
              <Icon name="warehouse" size={40} className="text-outline-variant" />
              <p className="font-body-md text-body-md">
                {org ? "No warehouses yet." : "Sign in to view warehouses."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {warehouses.map((w) => (
                <WarehouseCard
                  key={w.id}
                  warehouse={w}
                  items={compactUnits(w.items)}
                  value={compactMoney(w.value, currency)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="lg:col-span-4 flex flex-col gap-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md card-shadow">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
                <Icon name="warning" className="text-error" />
                Low Stock
              </h3>
              <Link href="/products" className="text-primary text-label-md font-label-md hover:underline">
                View All
              </Link>
            </div>
            <div className="flex flex-col gap-sm">
              {lowStock.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant py-md text-center">
                  All stock at healthy levels.
                </p>
              ) : (
                lowStock.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-sm hover:bg-surface-container-low rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-outline-variant"
                  >
                    <div className="flex items-center gap-sm">
                      <div className="w-10 h-10 bg-surface-container rounded border border-outline-variant flex items-center justify-center text-on-surface-variant flex-shrink-0">
                        <Icon name="inventory_2" size={20} />
                      </div>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                          {p.sku}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate w-32">
                          {p.name}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-error-container text-on-error-container rounded font-label-md text-label-md text-[10px]">
                      {p.qty} Left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarehouseCard({
  warehouse,
  items,
  value,
}: {
  warehouse: WarehouseRow;
  items: string;
  value: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md card-shadow hover-lift flex flex-col justify-between group relative overflow-hidden">
      {warehouse.isPrimary && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 rounded-bl-full -z-0" />
      )}
      <div className="z-10 relative">
        <div className="flex justify-between items-start mb-md">
          <div className="flex items-center gap-sm">
            <div className={`p-2 bg-surface-container rounded-lg ${warehouse.isPrimary ? "text-primary" : "text-on-surface-variant"}`}>
              <Icon name={warehouse.isPrimary ? "factory" : "warehouse"} />
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{warehouse.name}</h3>
              <p className="font-label-md text-label-md text-on-surface-variant">
                {warehouse.location ?? "—"}
              </p>
            </div>
          </div>
          {warehouse.isPrimary && (
            <span className="px-2 py-1 bg-surface-container-high text-on-surface rounded font-label-md text-label-md text-[10px]">
              Primary
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-sm mb-lg">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Capacity</p>
            <p className="font-headline-lg text-headline-lg text-on-surface">
              {warehouse.capacity}
              <span className="text-body-sm font-body-sm text-on-surface-variant">%</span>
            </p>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Items</p>
            <p className="font-headline-lg text-headline-lg text-on-surface">{items}</p>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Value</p>
            <p className="font-headline-lg text-headline-lg text-on-surface">{value}</p>
          </div>
        </div>
        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
          <div className="bg-primary h-full rounded-full" style={{ width: `${warehouse.capacity}%` }} />
        </div>
      </div>
    </div>
  );
}
