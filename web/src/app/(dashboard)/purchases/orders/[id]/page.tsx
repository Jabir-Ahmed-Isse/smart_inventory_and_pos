import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { WorkflowTimeline } from "@/components/purchasing/WorkflowTimeline";
import { getActiveOrg } from "@/lib/org";
import { money } from "@/lib/data";
import { getPurchaseOrderDetail, stageIndex, STATUS_META } from "@/lib/purchasing/data";

export async function generateMetadata() {
  return { title: "Purchase Order — Inventory Pro" };
}

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view this order.</div>;
  const po = await getPurchaseOrderDetail(org.orgId, id);
  if (!po) notFound();

  const st = STATUS_META[po.status] ?? { label: po.status, cls: "", dot: "bg-outline" };
  const stage = stageIndex(po.status);
  const cancelled = po.status === "cancelled";

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div className="flex items-center gap-3">
          <Link href="/purchases/orders" className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors"><Icon name="arrow_back" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-xl text-headline-xl text-on-surface font-mono">{po.poNumber}</h1>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${st.cls}`}>{st.label}</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Created {po.created} · Buyer {po.buyer}</p>
          </div>
        </div>
      </div>

      {/* Workflow timeline */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm mb-lg">
        <WorkflowTimeline current={stage} cancelled={cancelled} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Left: content */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          {/* Ordered products */}
          <Section title="Ordered Products" icon="inventory_2">
            <div className="overflow-x-auto -mx-md">
              <table className="w-full text-left border-collapse min-w-[520px]">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="px-md py-2 font-label-md text-label-md text-on-surface-variant">Product</th>
                    <th className="px-md py-2 font-label-md text-label-md text-on-surface-variant text-right">Qty</th>
                    <th className="px-md py-2 font-label-md text-label-md text-on-surface-variant text-right">Unit Cost</th>
                    <th className="px-md py-2 font-label-md text-label-md text-on-surface-variant text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
                  {po.items.length === 0 ? (
                    <tr><td colSpan={4} className="px-md py-4 text-center text-on-surface-variant">No line items.</td></tr>
                  ) : (
                    po.items.map((it, i) => (
                      <tr key={i}>
                        <td className="px-md py-3"><div className="font-medium text-on-surface">{it.name}</div><div className="font-label-md text-label-md text-on-surface-variant">{it.sku}</div></td>
                        <td className="px-md py-3 text-right tabular-nums">{it.qty}</td>
                        <td className="px-md py-3 text-right tabular-nums">{money(it.unitCost, currency)}</td>
                        <td className="px-md py-3 text-right font-semibold tabular-nums">{money(it.lineTotal, currency)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-outline-variant">
                    <td colSpan={3} className="px-md py-3 text-right font-semibold text-on-surface">Order Total</td>
                    <td className="px-md py-3 text-right font-bold text-primary tabular-nums">{money(po.total, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          {/* Activity timeline */}
          <Section title="Activity Timeline" icon="history">
            <ol className="relative border-l border-outline-variant ml-2 space-y-4">
              <Event dot="bg-primary" title="Order created" meta={`${po.created} · ${po.buyer}`} />
              {po.status !== "draft" && <Event dot="bg-tertiary" title="Order approved / placed" meta={po.created} />}
              {(po.status === "received" || po.status === "partial") && <Event dot="bg-primary" title={po.status === "received" ? "Goods received" : "Partially received"} meta={po.updated} />}
              {cancelled && <Event dot="bg-error" title="Order cancelled" meta={po.updated} />}
            </ol>
          </Section>

          {/* Approval / invoices / attachments (scaffold) */}
          <Section title="Documents & Approvals" icon="folder">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <ScaffoldTile icon="verified" label="Approval History" note="Multi-step approvals require an approvals table." />
              <ScaffoldTile icon="description" label="Supplier Invoices" note="Attach supplier invoices once billing is enabled." />
              <ScaffoldTile icon="attach_file" label="Attachments" note="Delivery notes & docs need file storage." />
            </div>
          </Section>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-lg">
          <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Action icon="print" label="Print" />
              <Action icon="picture_as_pdf" label="PDF" />
              <Action icon="content_copy" label="Duplicate" />
              <Action icon="cancel" label="Close" tone="error" />
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mt-sm">Approve / receive actions run through Goods Receiving.</p>
            <Link href="/purchases/receiving" className="mt-sm block text-center py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors">Receive Goods</Link>
          </div>

          <InfoCard title="Supplier" icon="storefront">
            <Row label="Name" value={po.supplier?.name ?? "Unassigned"} />
            <Row label="Contact" value={po.supplier?.contact_name ?? "—"} />
            <Row label="Email" value={po.supplier?.email ?? "—"} />
            <Row label="Phone" value={po.supplier?.phone ?? "—"} />
            <Row label="Terms" value={po.supplier?.payment_terms ?? "—"} />
          </InfoCard>

          <InfoCard title="Delivery" icon="local_shipping">
            <Row label="Warehouse" value={po.warehouse?.name ?? "—"} />
            <Row label="Location" value={po.warehouse?.location ?? "—"} />
            <Row label="Expected" value={po.expected} />
          </InfoCard>

          <InfoCard title="Payment" icon="payments">
            <Row label="Order Total" value={money(po.total, currency)} strong />
            <Row label="Status" value={po.status === "received" ? "Billed on receipt" : "Pending"} />
          </InfoCard>
        </div>
      </div>
    </main>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
      <div className="flex items-center gap-2 mb-md"><Icon name={icon} className="text-primary" /><h3 className="font-headline-lg text-headline-lg text-on-surface">{title}</h3></div>
      {children}
    </div>
  );
}
function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
      <div className="flex items-center gap-2 mb-sm"><Icon name={icon} size={18} className="text-on-surface-variant" /><h4 className="font-body-md text-body-md font-semibold text-on-surface">{title}</h4></div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
      <span className={`font-body-sm text-body-sm ${strong ? "font-bold text-primary" : "text-on-surface"} text-right`}>{value}</span>
    </div>
  );
}
function Event({ dot, title, meta }: { dot: string; title: string; meta: string }) {
  return (
    <li className="ml-4">
      <span className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full ring-4 ring-surface ${dot}`} />
      <p className="font-body-sm text-body-sm text-on-surface font-medium">{title}</p>
      <p className="font-label-md text-label-md text-on-surface-variant">{meta}</p>
    </li>
  );
}
function ScaffoldTile({ icon, label, note }: { icon: string; label: string; note: string }) {
  return (
    <div className="border border-dashed border-outline-variant rounded-lg p-md text-center">
      <Icon name={icon} className="text-outline-variant mb-1" />
      <p className="font-body-sm text-body-sm text-on-surface font-medium">{label}</p>
      <p className="font-label-md text-label-md text-on-surface-variant mt-1">{note}</p>
    </div>
  );
}
function Action({ icon, label, tone }: { icon: string; label: string; tone?: "error" }) {
  return (
    <button className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors ${tone === "error" ? "text-error" : "text-on-surface"}`}>
      <Icon name={icon} size={18} />
      <span className="font-label-md text-label-md">{label}</span>
    </button>
  );
}
