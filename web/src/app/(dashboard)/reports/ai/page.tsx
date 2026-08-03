import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { getAiSnapshot } from "@/lib/ai/insights";
import { getCustomerAnalytics } from "@/lib/reports/data";

export const metadata = { title: "AI Insights — Reports" };

function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

export default async function ReportsAiPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view AI insights.</div>;

  const [snap, cust] = await Promise.all([getAiSnapshot(org.orgId, currency), getCustomerAnalytics(org.orgId)]);
  const margin = snap.income > 0 ? (snap.net / snap.income) * 100 : 0;

  let score = 50;
  score += margin >= 20 ? 22 : margin >= 8 ? 12 : margin >= 0 ? 4 : -18;
  score += snap.trendPct >= 0 ? 12 : -10;
  score += snap.outOfStockCount === 0 ? 8 : snap.outOfStockCount > 3 ? -10 : -2;
  score += snap.deadStock.length === 0 ? 6 : snap.deadStock.length > 5 ? -8 : -2;
  score = clamp(score);
  const grade = score >= 80 ? "Excellent" : score >= 65 ? "Healthy" : score >= 45 ? "Fair" : "Needs Attention";
  const scoreColor = score >= 80 ? "#0b7a52" : score >= 65 ? "#1f6f8b" : score >= 45 ? "#e5a05a" : "#c05c6d";
  const dash = (score / 100) * 264;

  const retRate = cust.withOrders ? Math.round((cust.returning / cust.withOrders) * 100) : 0;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon name="auto_awesome" filled /></div>
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">AI Insights</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Forecasts, reorder intelligence and business health, computed from your live data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col items-center text-center">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md self-start">Business Health Score</h3>
          <div className="relative w-[170px] h-[170px]">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-container-high, #e2e8e3)" strokeWidth="9" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} 264`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg text-[38px] font-bold text-on-surface leading-none tabular-nums">{score}</span>
              <span className="font-label-md text-label-md" style={{ color: scoreColor }}>{grade}</span>
            </div>
          </div>
        </div>

        <InsightCard icon="trending_up" title="Sales Forecast" tone="primary">
          <ul className="space-y-2">
            <Bullet>Last 30 days: <b>{money(snap.revenue30d, currency)}</b>; last 7: {money(snap.revenue7d, currency)}.</Bullet>
            <Bullet>Weekly trend {snap.trendPct >= 0 ? "up" : "down"} <b>{Math.abs(Math.round(snap.trendPct))}%</b> vs the prior week.</Bullet>
            <Bullet>Next-month run-rate ≈ <b>{money(snap.revenue30d, currency)}</b>.</Bullet>
          </ul>
        </InsightCard>

        <InsightCard icon="local_shipping" title="Demand Forecast" tone="secondary">
          {snap.topSellers.length ? (
            <ul className="space-y-2">
              {snap.topSellers.slice(0, 4).map((t) => (
                <Bullet key={t.sku}><b>{t.name}</b> — {t.unitsSold} sold ({money(t.revenue, currency)}). Keep well stocked.</Bullet>
              ))}
            </ul>
          ) : <p className="font-body-sm text-body-sm text-on-surface-variant">No sales yet to forecast demand.</p>}
        </InsightCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
        <InsightCard icon="autorenew" title="Smart Reorder" tone="warning">
          {snap.reorder.length ? (
            <ul className="space-y-2">
              {snap.reorder.slice(0, 5).map((r) => (
                <Bullet key={r.sku}>
                  <b>{r.name}</b> — {r.qty} left. Order ~<b>{r.suggestedOrder}</b>.{" "}
                  <span className={r.urgency === "out" ? "text-error" : "text-tertiary"}>({r.urgency})</span>
                </Bullet>
              ))}
            </ul>
          ) : <p className="font-body-sm text-body-sm text-on-surface-variant">Stock levels are healthy — nothing to reorder.</p>}
        </InsightCard>

        <InsightCard icon="hourglass_disabled" title="Dead Stock Detection" tone="warning">
          {snap.deadStock.length ? (
            <ul className="space-y-2">
              {snap.deadStock.slice(0, 5).map((d) => (
                <Bullet key={d.sku}><b>{d.name}</b> — {d.qty} units, {money(d.value, currency)} tied up. {d.note}</Bullet>
              ))}
            </ul>
          ) : <p className="font-body-sm text-body-sm text-on-surface-variant">No dead stock detected. 🎉</p>}
        </InsightCard>

        <InsightCard icon="groups" title="Customer Insights" tone="secondary">
          <ul className="space-y-2">
            <Bullet>{cust.total} customers, {cust.withOrders} have purchased.</Bullet>
            <Bullet>Repeat rate <b>{retRate}%</b> ({cust.returning} returning).</Bullet>
            {cust.top[0]?.spend > 0 && <Bullet>Top customer <b>{cust.top[0].name}</b> spent {money(cust.top[0].spend, currency)}.</Bullet>}
            <Bullet>Avg lifetime value {money(cust.avgClv, currency)}.</Bullet>
          </ul>
        </InsightCard>

        <InsightCard icon="savings" title="Profit Optimization" tone="primary">
          <ul className="space-y-2">
            <Bullet>Net {money(snap.net, currency)} on {money(snap.income, currency)} income — {Math.round(margin)}% margin.</Bullet>
            {snap.expenses > snap.income * 0.7 && <Bullet className="text-error">Expenses are high vs income — trim overheads.</Bullet>}
            <Bullet>Push your top sellers and repeat customers to lift margin fastest.</Bullet>
          </ul>
        </InsightCard>

        <InsightCard icon="inventory_2" title="Inventory Intelligence" tone="warning">
          <ul className="space-y-2">
            <Bullet>{snap.productCount} products, {money(snap.inventoryValue, currency)} tied up in stock.</Bullet>
            <Bullet>{snap.lowStockCount} low, {snap.outOfStockCount} out of stock.</Bullet>
            {snap.outOfStockCount > 0 && <Bullet className="text-error">Out-of-stock items are lost sales — restock priority.</Bullet>}
          </ul>
        </InsightCard>

        <InsightCard icon="ecg_heart" title="Overall Assessment" tone="secondary">
          <p className="font-body-sm text-body-sm text-on-surface">
            Business health is <b style={{ color: scoreColor }}>{grade.toLowerCase()}</b> ({score}/100).{" "}
            {score >= 65 ? "Momentum is good — reinvest in top performers." : "Focus on margins, reorders and collecting from customers."}
          </p>
        </InsightCard>
      </div>
    </main>
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
