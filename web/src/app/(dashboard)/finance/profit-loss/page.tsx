import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars } from "@/components/finance/Charts";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, profitLoss } from "@/lib/finance/data";

export const metadata = { title: "Profit & Loss — Inventory Pro" };

export default async function ProfitLossPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  const pl = raw ? profitLoss(raw) : null;

  if (!pl) return <div className="p-xl text-center text-on-surface-variant">Sign in to view P&amp;L.</div>;

  const rows: { label: string; value: number; bold?: boolean; tone?: "pos" | "neg" | "muted" }[] = [
    { label: "Revenue", value: pl.revenue, tone: "pos" },
    { label: "Cost of Goods Sold", value: -pl.cogs, tone: "neg" },
    { label: "Gross Profit", value: pl.grossProfit, bold: true },
    { label: "Operating Expenses", value: -pl.opex, tone: "neg" },
    { label: "Net Profit", value: pl.netProfit, bold: true, tone: pl.netProfit >= 0 ? "pos" : "neg" },
  ];

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Profit &amp; Loss</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Accrual income statement — revenue through to net profit.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Revenue" value={compactMoney(pl.revenue, currency)} icon="payments" tone="positive" />
        <Kpi label="Gross Profit" value={compactMoney(pl.grossProfit, currency)} icon="trending_up" tone="positive" sub={`${Math.round(pl.grossMargin)}% margin`} />
        <Kpi label="Operating Expenses" value={compactMoney(pl.opex, currency)} icon="receipt_long" tone="warning" />
        <Kpi label="Net Profit" value={compactMoney(pl.netProfit, currency)} icon="account_balance_wallet" tone={pl.netProfit >= 0 ? "positive" : "negative"} sub={`${Math.round(pl.netMargin)}% margin`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Statement */}
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface-container-lowest"><h3 className="font-headline-lg text-headline-lg text-on-surface">Income Statement</h3></div>
          <div className="divide-y divide-outline-variant/60">
            {rows.map((r) => (
              <div key={r.label} className={`flex items-center justify-between px-md py-3 ${r.bold ? "bg-surface-container-lowest/60" : ""}`}>
                <span className={`font-body-md text-body-md ${r.bold ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>{r.label}</span>
                <span className={`font-body-md text-body-md tabular-nums ${r.bold ? "font-bold" : "font-medium"} ${r.tone === "pos" ? "text-primary" : r.tone === "neg" ? "text-error" : "text-on-surface"}`}>
                  {r.value < 0 ? "−" : ""}{money(Math.abs(r.value), currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly P&L */}
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Monthly Revenue vs COGS</h3>
          <div className="h-[300px]">
            <RevenueExpenseBars labels={pl.months.map((m) => m.label)} income={pl.months.map((m) => Math.round(m.revenue))} expense={pl.months.map((m) => Math.round(m.cogs))} />
          </div>
        </div>
      </div>

      {pl.opexByCategory.length > 0 && (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-lg">
          <div className="p-md border-b border-outline-variant"><h3 className="font-headline-lg text-headline-lg text-on-surface">Operating Expenses by Category</h3></div>
          <div className="divide-y divide-outline-variant/60">
            {pl.opexByCategory.map((c) => (
              <div key={c.category} className="flex items-center justify-between px-md py-3">
                <span className="font-body-sm text-body-sm text-on-surface">{c.category}</span>
                <span className="font-body-sm text-body-sm font-medium text-on-surface tabular-nums">{money(c.amount, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
