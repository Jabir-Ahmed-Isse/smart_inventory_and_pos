import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { listReports, getReportById, getActiveAlerts } from "@/lib/reports/agent/history";
import type { ReportFacts } from "@/lib/reports/agent/facts";
import type { ReportInsight } from "@/lib/reports/agent/ai";

export const metadata = { title: "AI Business Reports — Inventory Pro" };

export default async function AiReportsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireRole(["owner", "admin", "manager", "accountant"]);
  const org = await getActiveOrg();
  const { id } = await searchParams;
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view reports.</div>;

  const [list, alerts] = await Promise.all([listReports(org.orgId, 30), getActiveAlerts(org.orgId)]);
  const selectedId = id ?? list[0]?.id ?? null;
  const report = selectedId ? await getReportById(org.orgId, selectedId) : null;
  const currency = org.currency;
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface flex items-center gap-2"><Icon name="smart_toy" className="text-primary" /> AI Business Reports</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Real numbers from your live data, with AI insights. Configure & generate in <Link href="/settings" className="text-primary hover:underline">Settings → AI Reports</Link>.</p>
        </div>
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div className="mb-lg bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-2 flex items-center gap-1"><Icon name="notifications_active" size={15} className="text-error" /> Active alerts ({alerts.length})</h3>
          <div className="flex flex-wrap gap-2">
            {alerts.slice(0, 12).map((a) => (
              <span key={a.id} className={`text-[12px] px-2 py-1 rounded-full ${a.severity === "critical" ? "bg-error-container/40 text-error" : a.severity === "warning" ? "bg-tertiary-container/40 text-on-surface" : "bg-surface-container-high text-on-surface-variant"}`}>{a.message}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* History list */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest font-headline-lg text-headline-lg text-on-surface text-[16px]">History</div>
            {list.length === 0 ? (
              <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No reports yet. Generate one from Settings → AI Reports.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/60 max-h-[560px] overflow-y-auto">
                {list.map((r) => (
                  <li key={r.id}>
                    <Link href={`/reports/ai?id=${r.id}`} className={`block p-md hover:bg-surface-container-low transition-colors ${r.id === selectedId ? "bg-primary/5 border-l-2 border-primary" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-body-sm text-body-sm font-semibold text-on-surface capitalize">{r.reportType}</span>
                        <span className="text-[11px] text-on-surface-variant">{r.periodStart}{r.reportType === "weekly" ? ` → ${r.periodEnd}` : ""}</span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">Sales {money(r.sales)} · Net {money(r.netProfit)}{r.unpaid > 0 ? ` · Unpaid ${money(r.unpaid)}` : ""}{r.inventoryAlerts > 0 ? ` · ⚠${r.inventoryAlerts}` : ""}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Selected report */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!report ? (
            <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center text-on-surface-variant">
              <Icon name="description" size={40} className="text-outline-variant mb-2" />
              <p className="font-body-md text-body-md">No report selected. Generate one from <Link href="/settings" className="text-primary hover:underline">Settings → AI Reports</Link>.</p>
            </div>
          ) : (
            <ReportView report={report} money={money} />
          )}
        </div>
      </div>
    </main>
  );
}

function ReportView({ report, money }: { report: { reportType: string; periodStart: string; periodEnd: string; facts: ReportFacts; insight: ReportInsight | null; aiSource: string; deliveries: { channel: string; status: string }[] }; money: (n: number) => string }) {
  const f = report.facts;
  const pct = (p: number | null) => (p == null ? "—" : `${p >= 0 ? "↑" : "↓"}${Math.abs(p)}%`);
  const ins = report.insight;

  return (
    <div className="space-y-lg">
      {/* Header + AI summary */}
      <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="font-headline-lg text-headline-lg text-on-surface capitalize">{report.reportType} report — {f.period?.label ?? report.periodStart}</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">AI: {report.aiSource}</span>
        </div>
        {ins?.summary && <p className="font-body-md text-body-md text-on-surface">{ins.summary}</p>}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <Kpi label="Sales" value={money(f.sales.total)} sub={`${f.sales.orders} orders · ${pct(f.sales.changePct)}`} tone="primary" />
        <Kpi label="Collected" value={money(f.payments.collected)} sub={`Unpaid ${money(f.payments.unpaid)}`} tone={f.payments.unpaid > 0 ? "warn" : "primary"} />
        <Kpi label="Net profit" value={money(f.profit.netProfit)} sub={f.profit.marginPct != null ? `${f.profit.marginPct}% margin` : ""} tone={f.profit.netProfit >= 0 ? "primary" : "error"} />
        <Kpi label="Inventory" value={`${f.inventory.critical + f.inventory.outOfStock} urgent`} sub={`${f.inventory.lowStock} low · ${f.inventory.totalSkus} SKUs`} tone={f.inventory.critical + f.inventory.outOfStock > 0 ? "error" : "neutral"} />
      </div>

      {/* Warnings / recommendations */}
      {ins && (ins.warnings.length > 0 || ins.recommendations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {ins.warnings.length > 0 && <ListCard icon="warning" tone="error" title="Needs attention" items={ins.warnings} />}
          {ins.recommendations.length > 0 && <ListCard icon="lightbulb" tone="primary" title="Recommended actions" items={ins.recommendations} />}
        </div>
      )}

      {/* Unpaid customers */}
      {f.unpaidOrders.length > 0 && (
        <Section icon="schedule" title={`Unpaid sales — ${money(f.payments.unpaid)}`}>
          <Table head={["Customer", "Order", "Due", "Date", "Days"]} rows={f.unpaidOrders.map((u) => [u.customerName, u.orderNumber, money(u.due), u.date, String(u.daysOutstanding)])} />
        </Section>
      )}

      {/* Receivables */}
      {f.receivables.customers.length > 0 && (
        <Section icon="account_balance_wallet" title={`Customer receivables — ${money(f.receivables.total)}`}>
          <Table head={["Customer", "Outstanding", "Orders", "Oldest (days)"]} rows={f.receivables.customers.map((c) => [c.customerName, money(c.outstanding), String(c.orders), String(c.oldestDueDays)])} />
        </Section>
      )}

      {/* Profit */}
      <Section icon="trending_up" title="Profit">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-md p-md">
          <Fact label="Revenue" value={money(f.profit.revenue)} />
          <Fact label="COGS" value={money(f.profit.cogs)} />
          <Fact label="Gross" value={money(f.profit.grossProfit)} />
          <Fact label="Expenses" value={money(f.profit.expenses)} />
          <Fact label="Net" value={money(f.profit.netProfit)} />
        </div>
      </Section>

      {/* Critical + low stock */}
      {(f.criticalStock.length > 0 || f.reorderRecommendations.length > 0) && (
        <Section icon="inventory_2" title="Inventory to act on">
          {f.criticalStock.length > 0 && <Table head={["Critical product", "Qty", "Days left", "Reorder"]} rows={f.criticalStock.slice(0, 10).map((p) => [p.name, String(p.qty), p.daysRemaining != null ? String(p.daysRemaining) : "—", p.recommendedReorder > 0 ? String(p.recommendedReorder) : "—"])} />}
          {f.reorderRecommendations.length > 0 && (
            <div className="p-md border-t border-outline-variant">
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Recommended purchases</p>
              <Table head={["Product", "Current", "Recommended", "Avg/day"]} rows={f.reorderRecommendations.map((p) => [p.name, String(p.qty), String(p.recommendedReorder), String(p.avgDailySales)])} />
            </div>
          )}
        </Section>
      )}

      {/* Sales detail */}
      <Section icon="point_of_sale" title="Sales detail">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md p-md">
          <Fact label="Avg order" value={money(f.sales.avgOrder)} />
          <Fact label="Discounts" value={money(f.sales.discounts)} />
          <Fact label="Tax" value={money(f.sales.tax)} />
          <Fact label="Top category" value={f.sales.topCategory?.category ?? "—"} />
        </div>
        {f.sales.topProducts.length > 0 && <Table head={["Top product", "Units", "Revenue"]} rows={f.sales.topProducts.slice(0, 8).map((p) => [p.name, String(p.units), money(p.revenue)])} />}
      </Section>

      {/* Reversals */}
      {f.reversals.length > 0 && (
        <Section icon="undo" title="Reversals (cancelled / refunded)">
          <Table head={["Customer", "Order", "Amount", "Status", "Date"]} rows={f.reversals.map((r) => [r.customerName, r.orderNumber, money(r.total), r.status, r.date])} />
        </Section>
      )}

      {/* Expenses */}
      {f.expenses.total > 0 && (
        <Section icon="receipt_long" title={`Expenses — ${money(f.expenses.total)}`}>
          <Table head={["Category", "Amount"]} rows={f.expenses.byCategory.map((c) => [c.category, money(c.amount)])} />
        </Section>
      )}

      {report.deliveries.length > 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">Delivered: {report.deliveries.map((d) => `${d.channel} (${d.status})`).join(", ")}</p>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "primary" | "warn" | "error" | "neutral" }) {
  const c = tone === "primary" ? "text-primary" : tone === "error" ? "text-error" : tone === "warn" ? "text-tertiary" : "text-on-surface";
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
      <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</div>
      <div className={`font-display-lg text-[22px] font-bold tabular-nums ${c}`}>{value}</div>
      {sub && <div className="text-[11px] text-on-surface-variant mt-0.5">{sub}</div>}
    </div>
  );
}
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex items-center gap-2"><Icon name={icon} className="text-primary" size={18} /><h3 className="font-headline-lg text-headline-lg text-on-surface text-[16px]">{title}</h3></div>
      {children}
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[11px] text-on-surface-variant uppercase tracking-wide">{label}</div><div className="font-body-md text-body-md font-semibold text-on-surface tabular-nums">{value}</div></div>;
}
function ListCard({ icon, tone, title, items }: { icon: string; tone: "error" | "primary"; title: string; items: string[] }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
      <h3 className={`font-label-md text-label-md uppercase tracking-wide mb-2 flex items-center gap-1 ${tone === "error" ? "text-error" : "text-primary"}`}><Icon name={icon} size={15} /> {title}</h3>
      <ul className="space-y-1">{items.map((it, i) => <li key={i} className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface"><Icon name="chevron_right" size={14} className="text-on-surface-variant mt-0.5 shrink-0" /> {it}</li>)}</ul>
    </div>
  );
}
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead><tr className="border-b border-outline-variant bg-surface-container-lowest">{head.map((h, i) => <th key={i} className={`p-2.5 font-label-md text-label-md text-on-surface-variant ${i > 0 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-outline-variant/50">
          {rows.map((r, i) => <tr key={i} className="hover:bg-surface-container-low">{r.map((c, j) => <td key={j} className={`p-2.5 font-body-sm text-body-sm ${j > 0 ? "text-right tabular-nums text-on-surface" : "text-on-surface font-medium"}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
