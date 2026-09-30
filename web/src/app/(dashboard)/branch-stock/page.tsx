import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireRole } from "@/lib/rbac";
import { getActiveOrg } from "@/lib/org";
import { getOrgBranchStock } from "@/lib/branches/stock";

export const metadata = { title: "Branch Stock — Inventory Pro" };

export default async function BranchStockPage() {
  await requireRole(["owner", "admin", "manager", "accountant", "cashier", "staff"]);
  const org = await getActiveOrg();
  const { branches, rows } = org ? await getOrgBranchStock(org.orgId) : { branches: [], rows: [] };

  // A product is a "transfer opportunity" if it's out/low in at least one branch
  // while another branch has surplus.
  const opportunities = rows.filter((r) => {
    const vals = branches.map((b) => r.cells[b.id] ?? 0);
    const anyEmpty = vals.some((v) => v <= 0);
    const anyStock = vals.some((v) => v > 0);
    return anyEmpty && anyStock;
  }).length;

  const cellClass = (qty: number, min: number) =>
    qty <= 0 ? "text-error font-semibold"
      : min > 0 && qty <= min ? "text-tertiary font-medium"
      : "text-on-surface";

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Branch Stock</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            On-hand quantity of every product in every branch — so you can spot where to pull stock from when you run out.
          </p>
        </div>
        <Link href="/transfers" className="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm self-start">
          <Icon name="swap_horiz" size={18} /> New Transfer
        </Link>
      </div>

      {opportunities > 0 && (
        <div className="mb-lg rounded-xl border border-tertiary-container/40 bg-tertiary-container/10 px-md py-sm font-body-sm text-body-sm text-on-surface flex items-center gap-2">
          <Icon name="insights" size={18} className="text-tertiary" />
          <span><b>{opportunities}</b> product{opportunities === 1 ? " is" : "s are"} out or low in one branch but available in another — good transfer candidates.</span>
        </div>
      )}

      {rows.length === 0 || branches.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-xl text-center">
          <div className="w-14 h-14 rounded-full bg-primary-container/30 text-primary flex items-center justify-center mx-auto mb-md">
            <Icon name="inventory_2" size={28} />
          </div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Nothing to show yet</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Add branches, warehouses and products, then stock will appear here per branch.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums" style={{ minWidth: `${320 + branches.length * 110}px` }}>
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-md text-label-md text-on-surface-variant sticky left-0 bg-surface-container-low z-10">Product</th>
                  {branches.map((b) => (
                    <th key={b.id} className="p-md font-label-md text-label-md text-on-surface-variant text-right whitespace-nowrap">{b.name}</th>
                  ))}
                  <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.map((r) => {
                  const best = Math.max(...branches.map((b) => r.cells[b.id] ?? 0));
                  return (
                    <tr key={r.productId} className="hover:bg-surface-container-high transition-colors">
                      <td className="p-md sticky left-0 bg-surface z-10">
                        <div className="font-label-md text-label-md text-on-surface font-semibold">{r.name}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant text-xs">{r.sku}{r.minStock > 0 ? ` · min ${r.minStock}` : ""}</div>
                      </td>
                      {branches.map((b) => {
                        const q = r.cells[b.id] ?? 0;
                        const isBest = q > 0 && q === best;
                        return (
                          <td key={b.id} className={`p-md text-right ${cellClass(q, r.minStock)}`}>
                            {q}
                            {isBest && branches.length > 1 && <Icon name="star" size={12} className="ml-1 align-middle text-primary" />}
                          </td>
                        );
                      })}
                      <td className="p-md text-right font-semibold text-on-surface">{r.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-md border-t border-outline-variant bg-surface-container-lowest flex flex-wrap gap-md font-body-sm text-body-sm text-on-surface-variant">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-error inline-block"></span> Out of stock</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-tertiary inline-block"></span> At/below min</span>
            <span className="flex items-center gap-1"><Icon name="star" size={13} className="text-primary" /> Most stock (pull from here)</span>
          </div>
        </div>
      )}
    </main>
  );
}
