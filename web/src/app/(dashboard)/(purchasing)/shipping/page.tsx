import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import { getShipments, type ShipmentStatus } from "@/lib/features/data";
import { createShipment } from "@/lib/features/actions";

export const metadata = { title: "Shipping & Fulfillment — Inventory Pro" };

const STATUS_PILL: Record<ShipmentStatus, string> = {
  pending: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
  in_transit: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
  delivered: "bg-primary-container/20 text-primary border border-primary/20",
  returned: "bg-secondary-container/20 text-secondary border border-secondary-container/30",
  cancelled: "bg-error-container/20 text-error border border-error-container/30",
};

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "Pending",
  in_transit: "In Transit",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

export default async function ShippingPage() {
  const org = await getActiveOrg();
  const shipments = org ? await getShipments(org.orgId) : [];

  const count = (s: ShipmentStatus) => shipments.filter((x) => x.status === s).length;

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Shipping &amp; Fulfillment</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Track outbound shipments from dispatch to delivery.
          </p>
        </div>
        <NewShipmentDialog />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Pending" value={String(count("pending"))} icon="pending" tone={count("pending") > 0 ? "warning" : "neutral"} />
        <Kpi label="In Transit" value={String(count("in_transit"))} icon="local_shipping" tone="neutral" />
        <Kpi label="Delivered" value={String(count("delivered"))} icon="check_circle" tone="positive" />
        <Kpi label="Total" value={String(shipments.length)} icon="inventory_2" tone="neutral" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface text-lg">Shipments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Tracking #</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Carrier</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Destination</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Created</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant bg-surface-container-lowest">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
                    {org ? "No shipments yet. Create one to start tracking." : "Sign in to view shipments."}
                  </td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="p-md font-mono text-body-sm text-on-surface">{s.trackingNumber}</td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{s.carrier ?? "—"}</td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{s.destination ?? "—"}</td>
                    <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{s.date}</td>
                    <td className="p-md">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_PILL[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function NewShipmentDialog() {
  return (
    <CrudDialog
      triggerLabel="New Shipment"
      triggerIcon="local_shipping"
      title="New Shipment"
      submitLabel="Create Shipment"
      action={createShipment}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <div>
        <label className={labelCls}>Tracking Number *</label>
        <input name="tracking_number" required className={fieldCls} placeholder="1Z999AA10123456784" type="text" />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Carrier</label>
          <input name="carrier" className={fieldCls} placeholder="UPS / DHL / FedEx" type="text" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" className={`${fieldCls} appearance-none`} defaultValue="pending">
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Destination</label>
        <input name="destination" className={fieldCls} placeholder="City, Country" type="text" />
      </div>
    </CrudDialog>
  );
}

