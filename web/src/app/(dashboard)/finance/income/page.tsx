import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { TrendLine, Donut } from "@/components/finance/Charts";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { loadFinance, incomeAnalytics } from "@/lib/finance/data";
import { RecordTransactionDialog } from "@/components/finance/RecordTransactionDialog";

export const metadata = { title: "Income — Inventory Pro" };

const COLORS = ["#0b7a52", "#1f6f8b", "#e5a05a", "#8a5cf6", "#c05c6d", "#cfd8d1"];

export default async function IncomePage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  const a = raw ? incomeAnalytics(raw) : null;

  if (!a) return <div className="p-xl text-center text-on-surface-variant">Sign in to view income.</div>;

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Income</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Revenue received, trends and where it comes from.</p>
        </div>
        <RecordTransactionDialog defaultType="income" triggerLabel="Add Income" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <Kpi label="Total Income" value={compactMoney(a.total, currency)} icon="trending_up" tone="positive" />
        <Kpi label="Today" value={money(a.today, currency)} icon="today" tone="neutral" />
        <Kpi label="This Week" value={money(a.week, currency)} icon="date_range" tone="neutral" />
        <Kpi label="This Month" value={money(a.month, currency)} icon="calendar_month" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Income Trend</h3>
          <div className="h-[300px]">
            <TrendLine labels={a.months.map((m) => m.label)} values={a.months.map((m) => m.amount)} label="Income" />
          </div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Revenue Sources</h3>
          {a.sources.length === 0 ? (
            <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-lg">No income yet.</p>
          ) : (
            <>
              <div className="h-[170px] relative mb-md">
                <Donut labels={a.sources.map((s) => s.category)} values={a.sources.map((s) => s.amount)} />
              </div>
              <ul className="space-y-2">
                {a.sources.map((s, i) => (
                  <li key={s.category} className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className="flex items-center gap-2 text-on-surface">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {s.category}
                    </span>
                    <span className="text-on-surface-variant">{money(s.amount, currency)} · {s.pct}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden mt-lg">
        <div className="p-md border-b border-outline-variant"><h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Income</h3></div>
        <div className="divide-y divide-outline-variant/60">
          {a.recent.length === 0 ? (
            <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No income yet.</p>
          ) : (
            a.recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center shrink-0"><Icon name="south_west" size={16} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-sm text-body-sm text-on-surface truncate">{t.description ?? t.category ?? "—"}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant">{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {t.category ?? "—"}</p>
                </div>
                <span className="font-body-sm text-body-sm font-semibold text-primary">+{money(t.amount, currency)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
