import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { getAiSnapshot, sparklinePath, type AiSnapshot } from "@/lib/ai/insights";
import { money, compactMoney } from "@/lib/data";
import { AssistantChat } from "./AssistantChat";

export const metadata = { title: "AI Intelligence — Inventory Pro" };

export default async function AiIntelligencePage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const snapshot: AiSnapshot | null = org ? await getAiSnapshot(org.orgId, currency) : null;

  const greeting = buildGreeting(snapshot, currency);
  const spark = sparklinePath(snapshot?.revenueTrend ?? []);
  const topReorder = snapshot?.reorder[0];

  return (
    <main className="flex-1 overflow-hidden p-md md:p-gutter bg-surface-container-low flex flex-col lg:flex-row gap-gutter h-[calc(100vh-4rem)]">
      {/* Chat (interactive, grounded in live data) */}
      <AssistantChat greeting={greeting} />

      {/* Insights */}
      <section className="flex-1 flex flex-col gap-gutter overflow-y-auto pr-sm">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
          {/* Revenue trend — real weekly revenue */}
          <div className="glass-panel border border-outline-variant/40 rounded-xl p-md flex flex-col h-64 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-md z-10">
              <div>
                <h3 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-xs">
                  <Icon name="trending_up" className="text-primary" />
                  Revenue Trend
                </h3>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Last 8 weeks · {money(snapshot?.revenue30d ?? 0, currency)} (30d)
                </p>
              </div>
              <span
                className={`font-label-md text-label-md px-2 py-1 rounded-full flex items-center gap-1 ${
                  (snapshot?.trendPct ?? 0) >= 0
                    ? "bg-primary/10 text-primary"
                    : "bg-error/10 text-error"
                }`}
              >
                <Icon
                  name={(snapshot?.trendPct ?? 0) >= 0 ? "arrow_upward" : "arrow_downward"}
                  size={14}
                />
                {Math.abs(snapshot?.trendPct ?? 0)}%
              </span>
            </div>
            <div className="flex-1 w-full relative z-10 mt-auto">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                {spark.area && <path d={spark.area} fill="url(#gradientPrimary)" opacity="0.2" />}
                {spark.line && (
                  <path
                    className="text-primary"
                    d={spark.line}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <defs>
                  <linearGradient id="gradientPrimary" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#006c49" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute right-3 top-1 bg-surface border border-outline-variant shadow-sm rounded-lg p-2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-label-md text-label-md text-on-surface">This week</span>
                <span className="font-body-sm text-body-sm text-primary font-semibold">
                  {compactMoney(snapshot?.revenueTrend.at(-1) ?? 0, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Dead stock risk — real */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-md flex flex-col h-64">
            <div className="flex justify-between items-start mb-md">
              <div>
                <h3 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-xs">
                  <Icon name="warning" className="text-error" />
                  Dead Stock Risk
                </h3>
                <p className="font-label-md text-label-md text-on-surface-variant">
                  No sales in 90 days
                </p>
              </div>
              {(snapshot?.deadStock.length ?? 0) > 0 && (
                <span className="bg-error-container text-on-error-container px-2 py-1 rounded-full font-label-md text-label-md flex items-center gap-1">
                  {snapshot!.deadStock.length} Flagged
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-sm pr-2">
              {!snapshot || snapshot.deadStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-xs text-on-surface-variant">
                  <Icon name="check_circle" size={28} className="text-primary" />
                  <p className="font-body-sm text-body-sm">
                    No dead stock — everything held has sold recently.
                  </p>
                </div>
              ) : (
                snapshot.deadStock.map((d) => (
                  <DeadStockRow
                    key={d.id}
                    sku={d.sku}
                    name={d.name}
                    note={`${d.qty} units · ${money(d.value, currency)} tied up`}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Smart reorder — real */}
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-md flex flex-col flex-1 min-h-[250px]">
          <div className="flex justify-between items-start mb-md">
            <div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-xs">
                <Icon name="restart_alt" className="text-tertiary" />
                Smart Reorder Suggestions
              </h3>
              <p className="font-label-md text-label-md text-on-surface-variant">
                Ranked by urgency &amp; 30-day velocity
              </p>
            </div>
            {(snapshot?.reorder.length ?? 0) > 0 && (
              <span className="bg-tertiary-fixed-dim/20 text-tertiary px-2 py-1 rounded-full font-label-md text-label-md">
                {snapshot!.reorder.length} to order
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto -mx-md">
            {!snapshot || snapshot.reorder.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-xs text-on-surface-variant py-lg">
                <Icon name="inventory_2" size={28} className="text-primary" />
                <p className="font-body-sm text-body-sm">
                  Every product is above its reorder point.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant">
                    <th className="py-sm px-md font-medium">Product</th>
                    <th className="py-sm px-md font-medium text-center">On Hand</th>
                    <th className="py-sm px-md font-medium">Signal</th>
                    <th className="py-sm px-md font-medium text-right">Suggest Order</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm">
                  {snapshot.reorder.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-surface-container-highest hover:bg-surface-container-low transition-colors"
                    >
                      <td className="py-sm px-md">
                        <div className="font-semibold text-on-surface">{r.name}</div>
                        <div className="font-label-md text-label-md text-on-surface-variant">{r.sku}</div>
                      </td>
                      <td className="py-sm px-md text-center">
                        <span
                          className={`font-semibold ${
                            r.urgency === "out"
                              ? "text-error"
                              : r.urgency === "critical"
                                ? "text-tertiary"
                                : "text-on-surface"
                          }`}
                        >
                          {r.qty}
                        </span>
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">{r.reason}</td>
                      <td className="py-sm px-md text-right font-bold text-primary">
                        +{r.suggestedOrder}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Actionable banner — top reorder priority */}
        {topReorder ? (
          <div className="bg-primary-container text-on-primary-container rounded-xl p-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-md">
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <Icon name="auto_awesome" />
              </div>
              <div>
                <h4 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold">
                  Top Priority: Reorder {topReorder.name}
                </h4>
                <p className="font-body-md text-body-md opacity-90">
                  {topReorder.qty} on hand ({topReorder.sku}). Ordering{" "}
                  {topReorder.suggestedOrder} units keeps you ahead of demand.
                </p>
              </div>
            </div>
            <a
              href="/purchases"
              className="bg-surface text-primary px-6 py-3 rounded-lg font-label-md text-label-md font-bold shadow-sm hover:bg-surface-container-lowest transition-colors whitespace-nowrap text-center"
            >
              Receive Stock
            </a>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-outline-variant p-md shadow-sm flex items-center gap-md">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
              <Icon name="check_circle" filled />
            </div>
            <div>
              <h4 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                Inventory is healthy
              </h4>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Nothing needs reordering. Ask the assistant about revenue or top sellers.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function buildGreeting(s: AiSnapshot | null, currency: string): string {
  if (!s || s.productCount === 0) {
    return "Hi — I'm your inventory analyst. Once you add products and record a few sales, I can answer questions about stock, revenue, reorders and dead stock. What would you like to know?";
  }
  const bits: string[] = [];
  if (s.reorder.length > 0) bits.push(`**${s.reorder.length}** product${s.reorder.length === 1 ? "" : "s"} need reordering`);
  if (s.deadStock.length > 0) bits.push(`**${s.deadStock.length}** at dead-stock risk`);
  bits.push(`today's sales are **${money(s.todaySales.total, currency)}**`);
  return `Hi — I've analyzed your live data. Right now ${bits.join(", ")}. Ask me anything, or tap a suggestion below.`;
}

function DeadStockRow({ sku, name, note }: { sku: string; name: string; note: string }) {
  return (
    <div className="flex justify-between items-center p-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors">
      <div className="flex items-center gap-sm min-w-0">
        <div className="w-8 h-8 rounded bg-error/10 flex items-center justify-center shrink-0">
          <Icon name="inventory" className="text-error text-sm" size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-label-md text-label-md text-on-surface truncate">
            {name} <span className="text-on-surface-variant">· {sku}</span>
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{note}</p>
        </div>
      </div>
      <a
        href="/products"
        className="text-primary hover:text-primary-fixed font-label-md text-label-md shrink-0 ml-sm"
      >
        Review
      </a>
    </div>
  );
}
