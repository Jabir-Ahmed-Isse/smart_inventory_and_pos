import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, financeSummary, profitLoss, expenseAnalytics } from "@/lib/finance/data";

export const metadata = { title: "AI Financial Insights — Inventory Pro" };

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default async function FinanceAiPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  if (!raw) return <div className="p-xl text-center text-on-surface-variant">Sign in to view AI insights.</div>;

  const s = financeSummary(raw);
  const pl = profitLoss(raw);
  const exp = expenseAnalytics(raw);

  // --- Deterministic "AI" scoring ------------------------------------------
  const cashTrend = s.cashFlow.slice(-3).map((c) => c.net);
  const avgNet = cashTrend.length ? cashTrend.reduce((a, b) => a + b, 0) / cashTrend.length : 0;
  const recRatio = s.revenue > 0 ? s.receivables / s.revenue : 0;

  let score = 50;
  score += pl.netMargin >= 20 ? 22 : pl.netMargin >= 8 ? 12 : pl.netMargin >= 0 ? 4 : -18;
  score += avgNet >= 0 ? 12 : -12;
  score += recRatio < 0.1 ? 8 : recRatio > 0.3 ? -10 : 0;
  score += exp.change <= 0 ? 8 : exp.change > 25 ? -10 : -2;
  score = clamp(score);
  const grade = score >= 80 ? "Excellent" : score >= 65 ? "Healthy" : score >= 45 ? "Fair" : "Needs Attention";
  const scoreColor = score >= 80 ? "#0b7a52" : score >= 65 ? "#1f6f8b" : score >= 45 ? "#e5a05a" : "#c05c6d";

  // Forecasts
  const incMonths = s.months.map((m) => m.income);
  const avgRev = incMonths.slice(-3).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(3, incMonths.length));
  const nextMonthRev = avgRev;
  const nextQuarterRev = avgRev * 3;

  const topExpense = exp.categories[0];
  const projectedCash = (s.cashBalance ?? 0) + avgNet * 3;

  const dash = (score / 100) * 264;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon name="auto_awesome" filled /></div>
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">AI Financial Insights</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Automated analysis of your financial health, costs and outlook.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        {/* Health score gauge */}
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col items-center justify-center text-center">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md self-start">Business Health Score</h3>
          <div className="relative w-[180px] h-[180px]">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-container-high, #e2e8e3)" strokeWidth="9" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} 264`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-[40px] font-bold text-on-surface leading-none tabular-nums">{score}</span>
              <span className="font-label-md text-label-md" style={{ color: scoreColor }}>{grade}</span>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-md">
            Weighted from profit margin, cash trend, receivables and expense growth.
          </p>
        </div>

        {/* Key drivers */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-md">
          <Driver icon="percent" label="Net Margin" value={`${Math.round(pl.netMargin)}%`} good={pl.netMargin >= 8} note={pl.netMargin >= 8 ? "Solid profitability" : "Room to improve"} />
          <Driver icon="waterfall_chart" label="Avg Monthly Cash" value={compactMoney(avgNet, currency)} good={avgNet >= 0} note={avgNet >= 0 ? "Cash-generative" : "Burning cash"} />
          <Driver icon="call_received" label="Receivables Ratio" value={`${Math.round(recRatio * 100)}%`} good={recRatio < 0.1} note={recRatio < 0.1 ? "Collections healthy" : "Chase overdue invoices"} />
          <Driver icon="trending_up" label="Expense Growth" value={`${exp.change > 0 ? "+" : ""}${exp.change}%`} good={exp.change <= 0} note={exp.change <= 0 ? "Costs under control" : "Costs rising MoM"} />
        </div>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
        <InsightCard icon="query_stats" title="Profit Recommendations" tone="primary">
          <ul className="space-y-2">
            <Bullet>Gross margin is {Math.round(pl.grossMargin)}% — {pl.grossMargin < 40 ? "review supplier pricing or raise retail prices to widen it." : "healthy; protect it as you scale volume."}</Bullet>
            {pl.opex > pl.grossProfit * 0.6 && <Bullet>Operating expenses are high relative to gross profit — trim overheads to lift net profit.</Bullet>}
            <Bullet>Every 5% margin gain on current revenue ≈ {money(s.revenue * 0.05, currency)} more profit.</Bullet>
          </ul>
        </InsightCard>

        <InsightCard icon="savings" title="Smart Cost Reduction" tone="warning">
          {topExpense ? (
            <ul className="space-y-2">
              <Bullet><b>{topExpense.category}</b> is your largest cost at {topExpense.pct}% ({money(topExpense.amount, currency)}).</Bullet>
              <Bullet>A 10% cut there saves ~{money(topExpense.amount * 0.1, currency)} per period.</Bullet>
              {exp.change > 0 && <Bullet>Expenses grew {exp.change}% vs last month — investigate the increase.</Bullet>}
            </ul>
          ) : <p className="font-body-sm text-body-sm text-on-surface-variant">No expense data yet.</p>}
        </InsightCard>

        <InsightCard icon="account_balance_wallet" title="Cash Flow Prediction" tone="secondary">
          <ul className="space-y-2">
            <Bullet>Projected cash in ~3 months: <b>{money(projectedCash, currency)}</b> (at {compactMoney(avgNet, currency)}/mo net).</Bullet>
            {avgNet < 0 && <Bullet className="text-error">Trajectory is negative — accelerate collections or reduce spend to avoid a shortfall.</Bullet>}
            {s.receivables > 0 && <Bullet>Collecting {compactMoney(s.receivables, currency)} in receivables would boost cash immediately.</Bullet>}
          </ul>
        </InsightCard>

        <InsightCard icon="trending_up" title="Revenue Forecast" tone="primary">
          <ul className="space-y-2">
            <Bullet>Next month: <b>{money(nextMonthRev, currency)}</b> (3-month average run-rate).</Bullet>
            <Bullet>Next quarter: <b>{money(nextQuarterRev, currency)}</b>.</Bullet>
            <Bullet>Grow average order value or repeat sales to beat the run-rate.</Bullet>
          </ul>
        </InsightCard>

        <InsightCard icon="receipt_long" title="Expense Analysis" tone="warning">
          <ul className="space-y-2">
            <Bullet>Total spend: {money(exp.total, currency)} across {exp.categories.length} categor{exp.categories.length === 1 ? "y" : "ies"}.</Bullet>
            <Bullet>This month {money(exp.thisMonth, currency)} vs {money(exp.lastMonth, currency)} last month.</Bullet>
            {exp.categories.slice(0, 3).map((c) => (
              <Bullet key={c.category}>{c.category}: {c.pct}% of spend.</Bullet>
            ))}
          </ul>
        </InsightCard>

        <InsightCard icon="ecg_heart" title="Overall Assessment" tone="secondary">
          <p className="font-body-sm text-body-sm text-on-surface">
            Your business is <b style={{ color: scoreColor }}>{grade.toLowerCase()}</b> ({score}/100).{" "}
            {score >= 65
              ? "Profitability and cash generation are on track — reinvest carefully and keep collections tight."
              : "Focus on widening margins and collecting receivables to strengthen the position."}
          </p>
        </InsightCard>
      </div>
    </main>
  );
}

function Driver({ icon, label, value, good, note }: { icon: string; label: string; value: string; good: boolean; note: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</span>
        <Icon name={icon} size={18} className={good ? "text-primary" : "text-tertiary"} />
      </div>
      <span className="font-headline-lg text-headline-lg text-on-surface tabular-nums">{value}</span>
      <span className={`font-label-md text-label-md ${good ? "text-primary" : "text-tertiary"}`}>{note}</span>
    </div>
  );
}

function InsightCard({ icon, title, tone, children }: { icon: string; title: string; tone: "primary" | "warning" | "secondary"; children: React.ReactNode }) {
  const toneCls = tone === "primary" ? "bg-primary/10 text-primary" : tone === "warning" ? "bg-tertiary-container/20 text-tertiary" : "bg-secondary-container/20 text-secondary";
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
      <div className="flex items-center gap-2 mb-md">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneCls}`}><Icon name={icon} size={18} /></div>
        <h3 className="font-headline-lg text-headline-lg text-on-surface">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Bullet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <li className={`flex items-start gap-2 font-body-sm text-body-sm text-on-surface ${className ?? ""}`}>
      <Icon name="chevron_right" size={16} className="text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
