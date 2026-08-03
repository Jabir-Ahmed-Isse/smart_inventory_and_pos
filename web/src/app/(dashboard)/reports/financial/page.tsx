import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, TrendLine } from "@/components/finance/Charts";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { loadFinance, financeSummary, profitLoss } from "@/lib/finance/data";

export const metadata = { title: "Financial Reports — Reports" };

export default async function FinancialReportPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view financial reports.</div>;

  const raw = await loadFinance(org.orgId);
  const s = financeSummary(raw);
  const pl = profitLoss(raw);

  // Tax collected from sales orders.
  const supabase = await createClient();
  const { data: taxRows } = await supabase.from("sales_orders").select("tax, status").eq("organization_id", org.orgId);
  const tax = (taxRows ?? []).filter((r) => r.status !== "cancelled").reduce((a, r) => a + (r.tax ?? 0), 0);

  const plRows = [
    { label: "Revenue", value: pl.revenue, tone: "pos" as const },
    { label: "Cost of Goods Sold", value: -pl.cogs, tone: "neg" as const },
    { label: "Gross Profit", value: pl.grossProfit, bold: true },
    { label: "Operating Expenses", value: -pl.opex, tone: "neg" as const },
    { label: "Net Profit", value: pl.netProfit, bold: true, tone: pl.netProfit >= 0 ? ("pos" as const) : ("neg" as const) },
  ];

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Financial Reports</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Revenue, expenses, profit &amp; loss, cash flow and tax.</p>
        </div>
        <Link href="/finance" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md self-start">
          <Icon name="open_in_new" size={16} /> Full Finance module
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Revenue" value={compactMoney(s.revenue, currency)} icon="payments" tone="positive" />
        <Kpi label="Expenses" value={compactMoney(s.expenses, currency)} icon="receipt_long" tone="warning" />
        <Kpi label="Net Profit" value={compactMoney(s.netProfit, currency)} icon="account_balance_wallet" tone={s.netProfit >= 0 ? "positive" : "negative"} sub={`${Math.round(pl.netMargin)}% margin`} />
        <Kpi label="Tax Collected" value={compactMoney(tax, currency)} icon="percent" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Profit &amp; Loss</h3></div>
          <div className="divide-y divide-outline-variant/60">
            {plRows.map((r) => (
              <div key={r.label} className={`flex items-center justify-between px-md py-3 ${r.bold ? "bg-surface-container-lowest/60" : ""}`}>
                <span className={`font-body-md text-body-md ${r.bold ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>{r.label}</span>
                <span className={`font-body-md text-body-md tabular-nums ${r.bold ? "font-bold" : "font-medium"} ${r.tone === "pos" ? "text-primary" : r.tone === "neg" ? "text-error" : "text-on-surface"}`}>
                  {r.value < 0 ? "−" : ""}{money(Math.abs(r.value), currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Cash Flow</h3>
          <div className="h-[280px]"><TrendLine labels={s.cashFlow.map((c) => c.label)} values={s.cashFlow.map((c) => Math.round(c.cumulative))} label="Cumulative cash" color="#1f6f8b" /></div>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
        <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Revenue vs Expenses</h3>
        <div className="h-[280px]"><RevenueExpenseBars labels={s.months.map((m) => m.label)} income={s.months.map((m) => Math.round(m.income))} expense={s.months.map((m) => Math.round(m.expense))} /></div>
      </div>
    </main>
  );
}
