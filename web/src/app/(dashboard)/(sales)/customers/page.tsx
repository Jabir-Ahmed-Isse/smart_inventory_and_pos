import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { getCustomers, money, type CustomerRow } from "@/lib/data";
import { AddCustomerDialog } from "./AddCustomerDialog";
import { CustomerExportButton } from "@/components/customers/CustomerExportButton";

export const metadata = { title: "Customers & CRM — Inventory Pro" };

const AVATARS = [
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-surface-variant text-on-surface-variant",
  "bg-primary-container text-on-primary-container",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function CustomersPage() {
  const org = await getActiveOrg();
  const customers = org ? await getCustomers(org.orgId) : [];
  const currency = org?.currency ?? "USD";

  const vip = customers.filter((c) => c.segment === "VIP").length;
  const selected = customers[0] ?? null;

  return (
    <main className="flex-1 p-md md:p-lg lg:p-gutter max-w-container-max mx-auto w-full flex flex-col gap-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 className="text-headline-xl-mobile md:text-headline-xl font-headline-xl-mobile md:font-headline-xl text-on-surface">
            Customers &amp; CRM
          </h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-xs">
            Manage customer segments, loyalty, and order history.
          </p>
        </div>
        <div className="flex items-center gap-md w-full md:w-auto">
          <CustomerExportButton customers={customers} />
          <Link href="/customers/import" className="flex-1 md:flex-none flex items-center justify-center gap-sm border border-outline-variant text-on-surface hover:bg-surface-container hover:border-outline px-lg py-sm rounded font-label-md text-label-md transition-all">
            <Icon name="upload_file" size={18} /> Import
          </Link>
          <AddCustomerDialog />
        </div>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <SegmentCard icon="group" label="All Customers" value={customers.length} />
        <SegmentCard icon="stars" label="VIP Segment" value={vip} active />
        <SegmentCard icon="loop" label="Regulars" value={customers.length - vip} />
        <SegmentCard icon="fiber_new" label="New (30d)" value={customers.length} />
      </div>

      {/* Bento: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Customer list */}
        <div className="lg:col-span-8 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
          <div className="p-md border-b border-outline-variant flex flex-wrap justify-between items-center gap-md bg-surface-container-lowest">
            <h3 className="text-body-md font-body-md font-semibold text-on-surface">Directory</h3>
            <div className="relative">
              <Icon name="filter_list" size={18} className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <select className="pl-8 pr-8 py-1.5 bg-surface border border-outline-variant rounded text-label-md font-label-md focus:ring-2 focus:ring-primary focus:border-transparent appearance-none text-on-surface">
                <option>Sort by: Loyalty (High-Low)</option>
                <option>Sort by: Name A-Z</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
                <tr>
                  <th className="p-md text-label-md font-label-md text-on-surface-variant whitespace-nowrap">Customer</th>
                  <th className="p-md text-label-md font-label-md text-on-surface-variant whitespace-nowrap">Contact</th>
                  <th className="p-md text-label-md font-label-md text-on-surface-variant whitespace-nowrap text-right">Loyalty</th>
                  <th className="p-md text-label-md font-label-md text-on-surface-variant whitespace-nowrap text-right">Credit</th>
                  <th className="p-md text-label-md font-label-md text-on-surface-variant whitespace-nowrap text-center">Segment</th>
                  <th className="p-md w-10" />
                </tr>
              </thead>
              <tbody className="text-body-sm font-body-sm divide-y divide-outline-variant/50">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-xl text-center text-on-surface-variant">
                      {org ? "No customers yet." : "Sign in to view customers."}
                    </td>
                  </tr>
                ) : (
                  customers.map((c, i) => (
                    <tr
                      key={c.id}
                      className={i === 0 ? "bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer border-l-2 border-primary" : "hover:bg-surface-container-low transition-colors cursor-pointer"}
                    >
                      <td className="p-md">
                        <div className="flex items-center gap-sm">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-md ${AVATARS[i % AVATARS.length]}`}>
                            {initials(c.name)}
                          </div>
                          <div>
                            <div className={`text-on-surface ${i === 0 ? "font-semibold" : "font-medium"}`}>{c.name}</div>
                            <div className="text-label-md text-on-surface-variant">{c.segment ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-md text-on-surface-variant">
                        <div>{c.email ?? "—"}</div>
                        <div className="text-label-md">{c.phone ?? ""}</div>
                      </td>
                      <td className="p-md text-right text-on-surface font-medium">{c.loyaltyPoints.toLocaleString()}</td>
                      <td className="p-md text-right text-on-surface-variant">{money(c.creditLimit, currency)}</td>
                      <td className="p-md text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container-low text-primary border border-primary/20 text-label-md">
                          <span className="w-2 h-2 rounded-full bg-primary" /> {c.segment ?? "—"}
                        </span>
                      </td>
                      <td className="p-md text-right">
                        <button className="text-on-surface-variant hover:text-primary">
                          <Icon name="more_vert" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-sm border-t border-outline-variant flex justify-between items-center bg-surface-container-lowest text-label-md font-label-md text-on-surface-variant">
            <span>Showing {customers.length} of {customers.length}</span>
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-4 bg-surface/80 backdrop-blur-md border border-outline-variant rounded-xl shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 z-0" />
          <div className="p-lg relative z-10 flex-1 flex flex-col gap-lg">
            {selected ? (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-md">
                    <div className="w-12 h-12 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-lg font-bold">
                      {initials(selected.name)}
                    </div>
                    <div>
                      <h3 className="text-headline-lg font-headline-lg text-on-surface leading-tight">{selected.name}</h3>
                      <p className="text-label-md font-label-md text-secondary">{selected.segment ?? "Customer"}</p>
                    </div>
                  </div>
                  <button className="text-on-surface-variant hover:text-primary p-xs">
                    <Icon name="edit" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-sm">
                  <MetricCell label="Lifetime Value" value={money(0, currency)} valueCls="text-primary" />
                  <MetricCell label="Loyalty Points" value={selected.loyaltyPoints.toLocaleString()} />
                  <MetricCell label="Total Orders" value="0" />
                  <MetricCell label="Credit Limit" value={money(selected.creditLimit, currency)} />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-xs">
                    <h4 className="text-body-md font-body-md font-semibold text-on-surface">Recent Orders</h4>
                  </div>
                  <div className="flex flex-col items-center justify-center py-lg text-center text-on-surface-variant gap-xs">
                    <Icon name="receipt_long" size={28} className="text-outline-variant" />
                    <p className="font-body-sm text-body-sm">No orders yet.</p>
                    <p className="font-label-md text-label-md">Orders appear here once POS checkout is live.</p>
                  </div>
                </div>

                <div className="pt-md border-t border-outline-variant flex gap-sm mt-auto">
                  <button className="flex-1 bg-surface-container border border-outline-variant hover:border-primary text-on-surface py-2 rounded text-label-md font-label-md transition-all flex items-center justify-center gap-xs">
                    <Icon name="mail" size={16} /> Email
                  </button>
                  <button className="flex-1 bg-primary text-on-primary hover:bg-primary/90 py-2 rounded text-label-md font-label-md transition-all shadow-sm flex items-center justify-center gap-xs">
                    <Icon name="add_shopping_cart" size={16} /> New Order
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-sm py-xl">
                <Icon name="groups" size={40} className="text-outline-variant" />
                <p className="font-body-sm text-body-sm">Select a customer to see details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function SegmentCard({
  icon,
  label,
  value,
  active,
}: {
  icon: string;
  label: string;
  value: number;
  active?: boolean;
}) {
  return (
    <button
      className={`rounded-lg p-md text-left relative overflow-hidden transition-all group ${active ? "bg-surface border-2 border-primary shadow-sm" : "bg-surface border border-outline-variant hover:border-primary focus:ring-2 focus:ring-primary"}`}
    >
      <div className={`absolute inset-0 bg-primary/5 ${active ? "" : "translate-y-full group-hover:translate-y-0 transition-transform duration-300"}`} />
      <div className="relative z-10 flex flex-col gap-xs">
        <Icon name={icon} filled={active} className={active ? "text-primary" : "text-on-surface-variant"} />
        <span className={`text-label-md font-label-md ${active ? "text-primary" : "text-on-surface-variant"}`}>{label}</span>
        <span className="text-headline-lg font-headline-lg text-on-surface">{value.toLocaleString()}</span>
      </div>
    </button>
  );
}

function MetricCell({
  label,
  value,
  valueCls,
}: {
  label: string;
  value: string;
  valueCls?: string;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-sm">
      <p className="text-label-md font-label-md text-on-surface-variant mb-xs">{label}</p>
      <p className={`text-body-md font-body-md font-semibold ${valueCls ?? "text-on-surface"}`}>{value}</p>
    </div>
  );
}
