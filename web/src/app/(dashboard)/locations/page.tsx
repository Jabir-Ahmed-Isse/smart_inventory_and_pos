import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { DeleteButton } from "@/components/DeleteButton";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getWarehousesWithStats, money, compactMoney } from "@/lib/data";
import { createWarehouse, deleteWarehouse } from "@/lib/warehouses/actions";

export const metadata = { title: "Locations — Inventory Pro" };

export default async function LocationsPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const locations = org ? await getWarehousesWithStats(org.orgId) : [];
  const currency = org?.currency ?? "USD";
  const totalValue = locations.reduce((s, l) => s + l.value, 0);

  // Sales-efficiency style ranking by stock value.
  const maxValue = Math.max(1, ...locations.map((l) => l.value));
  const ranked = [...locations].sort((a, b) => b.value - a.value).slice(0, 4);

  return (
    <div className="p-4 md:p-lg lg:p-xl max-w-container-max mx-auto space-y-xl pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-surface">
            Locations
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Your warehouses and stocking locations.
          </p>
        </div>
        <NewLocationDialog />
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Summary */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-lg flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              {locations.length} active location{locations.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-md mt-lg">
            <Stat label="Locations" value={String(locations.length)} />
            <Stat label="Total Units" value={locations.reduce((s, l) => s + l.items, 0).toLocaleString()} />
            <Stat label="Stock Value" value={compactMoney(totalValue, currency)} />
          </div>
        </div>

        {/* Value ranking */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-lg flex flex-col">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-base md:text-lg mb-4">
            Stock Value by Location
          </h3>
          <div className="flex-1 flex flex-col justify-end gap-3 pt-4">
            {ranked.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">No locations yet.</p>
            ) : (
              ranked.map((l) => (
                <div key={l.id} className="flex items-end gap-3 group">
                  <div className="w-20 font-label-md text-label-md text-on-surface-variant text-right truncate">{l.name}</div>
                  <div className="flex-1 h-8 bg-surface-container rounded-r-sm overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-primary/80 group-hover:bg-primary transition-colors" style={{ width: `${Math.max(4, (l.value / maxValue) * 100)}%` }} />
                  </div>
                  <div className="w-20 font-label-md text-label-md text-on-surface font-semibold text-right">{compactMoney(l.value, currency)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Location cards */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">All Locations</h3>
        </div>
        {locations.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
            {org ? "No locations yet. Add your first warehouse." : "Sign in to view locations."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((l) => (
              <div key={l.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h4 className="font-headline-lg text-headline-lg text-base font-semibold text-on-surface">{l.name}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{l.location ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1 relative z-10">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md border ${l.isPrimary ? "bg-surface-container text-primary border-primary/20" : "bg-surface-container-high text-on-surface-variant border-outline-variant"}`}>
                      {l.isPrimary ? "Primary" : "Active"}
                    </span>
                    {l.items === 0 ? (
                      <DeleteButton
                        id={l.id}
                        action={deleteWarehouse}
                        confirmLabel={`Delete empty location "${l.name}"? This cannot be undone.`}
                        title="Delete this empty location"
                        size={16}
                      />
                    ) : (
                      <span
                        className="text-outline-variant p-1"
                        title={`Holds ${l.items} units — move or sell its stock before deleting.`}
                      >
                        <Icon name="lock" size={16} />
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5 relative z-10">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant text-[10px] mb-1 uppercase">Units On Hand</p>
                    <p className="font-headline-lg text-headline-lg text-lg text-on-surface">{l.items.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant text-[10px] mb-1 uppercase">Stock Value</p>
                    <p className="font-headline-lg text-headline-lg text-lg text-on-surface">{money(l.value, currency)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-outline-variant/20 relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-md text-label-md text-on-surface-variant">Utilization</span>
                    <span className="font-label-md text-label-md text-on-surface">{l.capacity}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${l.capacity}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewLocationDialog() {
  return (
    <CrudDialog
      triggerLabel="Add Location"
      title="New Location"
      submitLabel="Add Location"
      action={createWarehouse}
      triggerClassName="bg-primary hover:opacity-90 text-on-primary rounded-lg py-2 px-4 flex items-center gap-2 transition-colors shadow-sm font-label-md text-label-md"
    >
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="Main Warehouse" type="text" />
      </div>
      <div>
        <label className={labelCls}>Location / Address</label>
        <input name="location" className={fieldCls} placeholder="City, Country" type="text" />
      </div>
      <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
        <input name="is_primary" type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
        Set as primary location
      </label>
    </CrudDialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container rounded-lg p-md border border-outline-variant/40">
      <p className="font-label-md text-label-md text-on-surface-variant mb-xs">{label}</p>
      <p className="font-headline-lg text-headline-lg text-on-surface">{value}</p>
    </div>
  );
}
