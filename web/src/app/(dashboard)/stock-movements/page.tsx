import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getStockMovements, type MovementType } from "@/lib/data";

export const metadata = { title: "Stock Movements — Inventory Pro" };

const TYPE_META: Record<
  MovementType,
  { label: string; icon: string; pill: string; qtyCls: string; sign: 1 | -1 }
> = {
  receiving: { label: "Receiving", icon: "login", pill: "bg-primary-container/20 text-primary-fixed-dim border border-primary-container/30", qtyCls: "text-primary", sign: 1 },
  return: { label: "Return", icon: "keyboard_return", pill: "bg-primary-container/20 text-primary-fixed-dim border border-primary-container/30", qtyCls: "text-primary", sign: 1 },
  sale: { label: "Sale", icon: "logout", pill: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30", qtyCls: "text-tertiary", sign: -1 },
  transfer: { label: "Transfer", icon: "swap_horiz", pill: "bg-secondary-container/20 text-secondary border border-secondary-container/30", qtyCls: "text-secondary", sign: 1 },
  adjustment: { label: "Adjustment", icon: "build", pill: "bg-error-container/20 text-error border border-error-container/30", qtyCls: "text-error", sign: 1 },
  damage: { label: "Damage", icon: "report", pill: "bg-error-container/20 text-error border border-error-container/30", qtyCls: "text-error", sign: -1 },
  lost: { label: "Lost", icon: "help", pill: "bg-error-container/20 text-error border border-error-container/30", qtyCls: "text-error", sign: -1 },
};

function signedQty(qty: number, type: MovementType): string {
  const n = Math.abs(qty);
  return `${TYPE_META[type].sign > 0 ? "+" : "-"}${n}`;
}

export default async function StockMovementsPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const rows = org ? await getStockMovements(org.orgId) : [];

  return (
    <div className="flex-1 p-md md:p-gutter xl:p-xl max-w-container-max mx-auto w-full space-y-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-surface">
            Stock Movements
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Comprehensive history of all inventory changes across facilities.
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="px-md py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-xs">
            <Icon name="download" size={18} /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Date &amp; Time</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Product</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Warehouse</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Type</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Quantity</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Reference</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">User</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-xl text-center text-on-surface-variant">
                    {org ? "No stock movements yet. They appear as you receive, sell, or adjust stock." : "Sign in to view stock movements."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const meta = TYPE_META[r.type];
                  return (
                    <tr key={r.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-md whitespace-nowrap text-on-surface-variant">
                        <div className="font-medium">{r.date}</div>
                        <div className="text-xs">{r.time}</div>
                      </td>
                      <td className="p-md">
                        <div className="font-medium text-on-surface">{r.productName}</div>
                        <div className="text-on-surface-variant text-xs">{r.sku}</div>
                      </td>
                      <td className="p-md text-on-surface-variant">{r.warehouseName}</td>
                      <td className="p-md">
                        <span className={`inline-flex items-center gap-xs px-2 py-1 rounded-full text-xs font-medium ${meta.pill}`}>
                          <Icon name={meta.icon} size={14} /> {meta.label}
                        </span>
                      </td>
                      <td className={`p-md text-right font-medium ${meta.qtyCls}`}>{signedQty(r.quantity, r.type)}</td>
                      <td className="p-md text-on-surface-variant text-xs">{r.reference ?? "—"}</td>
                      <td className="p-md">
                        <div className="flex items-center gap-xs text-on-surface-variant">
                          <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-medium">
                            {r.userInitials}
                          </div>
                          <span>{r.userName}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-md border-t border-outline-variant flex justify-between items-center bg-surface-container-lowest text-on-surface-variant font-body-sm text-body-sm">
          <div>Showing {rows.length} most recent {rows.length === 1 ? "entry" : "entries"}</div>
        </div>
      </div>
    </div>
  );
}
