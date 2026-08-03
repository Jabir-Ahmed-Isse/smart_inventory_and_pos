import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { RevenueExpenseBars, TrendLine } from "@/components/finance/Charts";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, financeSummary } from "@/lib/finance/data";

export const metadata = { title: "Cash Flow — Inventory Pro" };

export default async function CashFlowPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  const s = raw ? financeSummary(raw) : null;

  if (!s) return <div className="p-xl text-center text-on-surface-variant">Sign in to view cash flow.</div>;

  const cashIn = s.months.reduce((a, m) => a + m.income, 0);
  const cashOut = s.months.reduce((a, m) => a + m.expense, 0);
  const operating = cashIn - cashOut;

  // Simple forecast: average net of the last 3 months, projected 3 months out.
  const recent = s.cashFlow.slice(-3).map((c) => c.net);
  const avgNet = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const lastCum = s.cashFlow[s.cashFlow.length - 1]?.cumulative ?? 0;
  const forecastLabels = ["+1m", "+2m", "+3m"];
  let cum = lastCum;
  const forecast = forecastLabels.map(() => (cum += avgNet));

  const combinedLabels = [...s.cashFlow.map((c) => c.label), ...forecastLabels];
  const combinedValues = [...s.cashFlow.map((c) => Math.round(c.cumulative)), ...forecast.map((v) => Math.round(v))];

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Cash Flow</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Operating cash flow, trend and a simple 3-month forecast.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Operating Cash Flow" value={compactMoney(operating, currency)} icon="waterfall_chart" tone={operating >= 0 ? "positive" : "negative"} sub="last 6 months" />
        <Kpi label="Cash In" value={compactMoney(cashIn, currency)} icon="south_west" tone="positive" />
        <Kpi label="Cash Out" value={compactMoney(cashOut, currency)} icon="north_east" tone="warning" />
        <Kpi label="Avg Monthly Net" value={compactMoney(avgNet, currency)} icon="insights" tone={avgNet >= 0 ? "positive" : "negative"} trend={{ dir: avgNet >= 0 ? "up" : "down", label: "forecast" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Income vs Expenses</h3>
          <div className="h-[300px]">
            <RevenueExpenseBars labels={s.months.map((m) => m.label)} income={s.months.map((m) => m.income)} expense={s.months.map((m) => m.expense)} />
          </div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Cash Position &amp; Forecast</h3>
            <span className="font-label-md text-label-md text-tertiary flex items-center gap-1"><Icon name="auto_awesome" size={14} /> projected</span>
          </div>
          <div className="h-[300px]">
            <TrendLine labels={combinedLabels} values={combinedValues} label="Cumulative cash" color="#1f6f8b" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-lg">
        <div className="p-md border-b border-outline-variant"><h3 className="font-headline-lg text-headline-lg text-on-surface">Monthly Cash Flow</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Month</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Cash In</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Cash Out</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Net</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {s.months.map((m, i) => {
                const net = m.income - m.expense;
                return (
                  <tr key={m.label} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md text-on-surface font-medium">{m.label}</td>
                    <td className="p-md text-right text-primary tabular-nums">{money(m.income, currency)}</td>
                    <td className="p-md text-right text-error tabular-nums">{money(m.expense, currency)}</td>
                    <td className={`p-md text-right font-semibold tabular-nums ${net >= 0 ? "text-primary" : "text-error"}`}>{net < 0 ? "−" : ""}{money(Math.abs(net), currency)}</td>
                    <td className="p-md text-right text-on-surface tabular-nums">{money(s.cashFlow[i]?.cumulative ?? 0, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
