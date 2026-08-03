import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { getSuppliers } from "@/lib/data";
import { AddSupplierDialog } from "@/components/AddSupplierDialog";

export const metadata = { title: "Supplier — Inventory Pro" };

type PoStatus = "In Transit" | "Processing" | "Awaiting Approval";

const PILL: Record<PoStatus, string> = {
  "In Transit": "bg-secondary-container/20 text-secondary border border-secondary/20",
  Processing: "bg-surface-container-highest text-on-surface-variant border border-outline-variant",
  "Awaiting Approval": "bg-surface-container-highest text-on-surface-variant border border-outline-variant",
};

const POS: { po: string; date: string; amount: string; status: PoStatus; eta: string; etaItalic?: boolean }[] = [
  { po: "PO-2023-4491", date: "Oct 12, 2023", amount: "$145,200.00", status: "In Transit", eta: "Oct 26, 2023" },
  { po: "PO-2023-4502", date: "Oct 18, 2023", amount: "$32,500.00", status: "Processing", eta: "Nov 05, 2023" },
  { po: "PO-2023-4515", date: "Oct 24, 2023", amount: "$89,000.00", status: "Awaiting Approval", eta: "Pending", etaItalic: true },
];

export default async function SupplierDetailPage() {
  const org = await getActiveOrg();
  const suppliers = org ? await getSuppliers(org.orgId) : [];
  const supplier = suppliers[0] ?? null;
  const name = supplier?.name ?? "Supplier";

  return (
    <main className="p-md md:p-lg xl:p-xl max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-lg">
        <div>
          <div className="flex items-center gap-sm font-label-md text-label-md text-on-surface-variant mb-3">
            <Link className="hover:text-primary transition-colors" href="/purchases">Purchases</Link>
            <Icon name="chevron_right" size={16} />
            <span className="hover:text-primary transition-colors">Suppliers</span>
            <Icon name="chevron_right" size={16} />
            <span className="text-on-surface">{name}</span>
          </div>
          <div className="flex items-center gap-md">
            <h2 className="font-headline-xl text-headline-xl text-on-surface">{name}</h2>
            <span className="px-3 py-1 rounded-full bg-primary-container/20 text-primary font-label-md text-label-md flex items-center gap-1">
              <Icon name="verified" size={14} /> Preferred Partner
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl">
            {supplier
              ? `Supplier record for ${name}. Performance analytics populate as purchase orders are recorded.`
              : org
                ? "No suppliers yet — add one from Purchases."
                : "Sign in to view supplier details."}
          </p>
        </div>
        <div className="flex items-center gap-sm mt-4 md:mt-0">
          <Link href="/purchases" className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center gap-2 shadow-sm">
            <Icon name="receipt_long" size={18} /> Purchases
          </Link>
          <AddSupplierDialog triggerClassName="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Profile */}
        <section className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary-container" />
          <div className="flex items-center gap-md mb-6">
            <div className="w-16 h-16 rounded-xl border border-outline-variant bg-secondary-fixed text-on-secondary-fixed flex-shrink-0 flex items-center justify-center font-headline-lg font-bold">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Details</h3>
              <p className="font-label-md text-label-md text-on-surface-variant">
                Vendor ID: {supplier ? supplier.id.slice(0, 8).toUpperCase() : "—"}
              </p>
            </div>
          </div>
          <div className="space-y-5 flex-1">
            <InfoLine icon="person" label="Primary Contact">
              <p className="font-body-md text-body-md text-on-surface">{supplier?.contactName ?? "—"}</p>
              {supplier?.email && (
                <p className="font-body-sm text-body-sm text-primary hover:underline cursor-pointer">{supplier.email}</p>
              )}
              {supplier?.phone && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">{supplier.phone}</p>
              )}
            </InfoLine>
            <InfoLine icon="location_on" label="Headquarters">
              <p className="font-body-md text-body-md text-on-surface">{supplier?.address ?? "—"}</p>
            </InfoLine>
            <InfoLine icon="request_quote" label="Payment Terms">
              <p className="font-body-md text-body-md text-on-surface">{supplier?.paymentTerms ?? "—"}</p>
            </InfoLine>
          </div>
          <div className="pt-6 mt-6 border-t border-outline-variant">
            <p className="font-label-md text-label-md text-on-surface-variant mb-3">Primary Categories</p>
            <div className="flex flex-wrap gap-2">
              {["Logic Boards", "DRAM Modules", "Sensors"].map((c) => (
                <span key={c} className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm border border-outline-variant">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Performance */}
        <section className="lg:col-span-8 flex flex-col gap-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <PerfCard label="YTD Spend" icon="payments" iconCls="text-secondary" value="$1.2M" note="+14% vs last year" noteCls="text-primary" noteIcon="trending_up" />
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">On-Time Delivery</span>
                <Icon name="local_shipping" className="text-primary" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <h4 className="font-display-lg text-display-lg text-on-surface mb-1">96%</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">SLA Target: 95%</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-surface-container flex items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="96, 100" strokeWidth="4" />
                  </svg>
                </div>
              </div>
            </div>
            <PerfCard label="Defect Rate" icon="policy" iconCls="text-tertiary-container" value="0.4%" note="Improving trend" noteCls="text-primary" noteIcon="trending_down" />
          </div>

          {/* Spend history */}
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm min-h-[200px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Spend History (Trailing 12 Mo)</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
                <Icon name="more_vert" />
              </button>
            </div>
            <div className="flex-1 w-full bg-surface-container-low rounded-lg relative overflow-hidden flex items-end justify-between px-4 pb-4 pt-8 border border-outline-variant/50">
              {[40, 55, 45, 70, 65, 80, 75].map((h, i) => (
                <div key={i} className="w-8 bg-outline-variant/40 hover:bg-primary/60 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
              <div className="w-8 bg-primary rounded-t-sm shadow-[0_0_12px_rgba(16,185,129,0.3)]" style={{ height: "90%" }} />
            </div>
          </div>
        </section>

        {/* PO table */}
        <section className="lg:col-span-12 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-4">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Active Purchase Orders</h3>
            <button className="font-label-md text-label-md text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-1">
              View All History <Icon name="arrow_forward" size={18} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  {["PO Number", "Issue Date", "Total Amount", "Status", "Expected Arrival"].map((h) => (
                    <th key={h} className="py-3 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{h}</th>
                  ))}
                  <th className="py-3 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant">
                {POS.map((p) => (
                  <tr key={p.po} className="hover:bg-surface-container transition-colors group cursor-pointer">
                    <td className="py-4 px-6 font-medium text-primary">{p.po}</td>
                    <td className="py-4 px-6">{p.date}</td>
                    <td className="py-4 px-6">{p.amount}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-label-md text-label-md ${PILL[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className={`py-4 px-6 ${p.etaItalic ? "text-on-surface-variant italic" : ""}`}>{p.eta}</td>
                    <td className="py-4 px-6 text-right">
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded bg-surface border border-outline-variant text-on-surface hover:text-primary transition-all">
                        <Icon name="visibility" size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoLine({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className="text-on-surface-variant mt-0.5" />
      <div>
        <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
        {children}
      </div>
    </div>
  );
}

function PerfCard({
  label,
  icon,
  iconCls,
  value,
  note,
  noteCls,
  noteIcon,
}: {
  label: string;
  icon: string;
  iconCls: string;
  value: string;
  note: string;
  noteCls: string;
  noteIcon: string;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{label}</span>
        <Icon name={icon} className={iconCls} />
      </div>
      <div>
        <h4 className="font-display-lg text-display-lg text-on-surface mb-1">{value}</h4>
        <p className={`font-body-sm text-body-sm flex items-center gap-1 ${noteCls}`}>
          <Icon name={noteIcon} size={16} /> {note}
        </p>
      </div>
    </div>
  );
}
