import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { getPurchaseOrders } from "@/lib/purchasing/data";
import { POTable, type POView } from "./POTable";

export const metadata = { title: "Purchase Orders — Inventory Pro" };

export default async function PurchaseOrdersPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view purchase orders.</div>;
  const pos = await getPurchaseOrders(org.orgId);
  const rows: POView[] = pos.map((p) => ({ id: p.id, poNumber: p.poNumber, supplier: p.supplier, warehouse: p.warehouse, status: p.status, total: p.total, created: p.created, expected: p.expected, buyer: p.buyer }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Purchase Orders</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">All procurement orders across suppliers and warehouses.</p>
        </div>
        <Link href="/rfq" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm self-start">
          <Icon name="add" size={16} /> New Order
        </Link>
      </div>
      <POTable rows={rows} currency={currency} />
    </main>
  );
}
