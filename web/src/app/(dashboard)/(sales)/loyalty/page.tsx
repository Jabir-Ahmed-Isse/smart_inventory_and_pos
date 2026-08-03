import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getCustomers } from "@/lib/data";

export const metadata = { title: "Loyalty & Rewards — Inventory Pro" };

const TIERS = [
  { name: "Member", sub: "Base Tier", subCls: "text-on-surface-variant", icon: "shield", iconCls: "text-outline", iconWrap: "bg-surface-container", topBar: "bg-outline-variant", min: 0, max: 499, perks: ["Standard Earn Rate", "Birthday Bonus (50pt)"] },
  { name: "Silver", sub: "Mid Tier", subCls: "text-secondary", icon: "workspace_premium", iconCls: "text-secondary", iconWrap: "bg-secondary-container/20", topBar: "bg-secondary", min: 500, max: 2499, perks: ["1.25x Earn Multiplier", "Free Standard Shipping", "Early Access to Sales"], highlight: true },
  { name: "Gold", sub: "Premium Tier", subCls: "text-tertiary", icon: "stars", iconFilled: true, iconCls: "text-tertiary", iconWrap: "bg-tertiary-container/20", topBar: "bg-tertiary", min: 2500, max: Infinity, perks: ["1.5x Earn Multiplier", "Free Expedited Shipping", "Dedicated Support Line"] },
];

function compact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default async function LoyaltyPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const customers = org ? await getCustomers(org.orgId) : [];

  const activeMembers = customers.filter((c) => c.loyaltyPoints > 0);
  const totalPoints = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
  const avgPoints = activeMembers.length ? Math.round(totalPoints / activeMembers.length) : 0;

  const tierCount = (min: number, max: number) =>
    customers.filter((c) => c.loyaltyPoints >= min && c.loyaltyPoints <= max).length;

  const topMembers = [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 5);

  return (
    <main className="p-md md:p-lg xl:p-xl max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-xl">
        <div>
          <div className="flex items-center gap-2 text-on-surface-variant mb-2">
            <span className="font-label-md text-label-md uppercase tracking-wider">Administration</span>
            <Icon name="chevron_right" size={16} />
            <span className="font-label-md text-label-md text-primary">Loyalty &amp; Rewards</span>
          </div>
          <h2 className="font-headline-xl text-headline-xl text-on-background">Program Overview</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Live view of member tiers and points across your customer base.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Metrics */}
        <div className="col-span-1 md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-gutter">
          <Kpi icon="groups" tone="positive" label="Active Members" value={activeMembers.length.toLocaleString()} sub={`Of ${customers.length.toLocaleString()} total customers`} />
          <Kpi icon="toll" tone="neutral" label="Total Points Issued" value={compact(totalPoints)} sub="Across all members" />
          <Kpi icon="analytics" tone="neutral" label="Avg Points / Member" value={avgPoints.toLocaleString()} sub="Among active members" />
        </div>

        {/* Tier structure with real counts */}
        <div className="col-span-1 md:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-variant p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
                <Icon name="workspace_premium" />
              </div>
              <h3 className="font-headline-lg text-headline-lg text-on-background">Tier Structure</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
            {TIERS.map((t) => {
              const count = tierCount(t.min, t.max);
              return (
                <div key={t.name} className={`bg-surface-bright rounded-xl p-5 flex flex-col relative overflow-hidden transition-colors ${t.highlight ? "border-2 border-secondary-fixed/50 hover:border-secondary" : "border border-outline-variant/50 hover:border-outline"}`}>
                  <div className={`absolute top-0 left-0 w-full h-1 ${t.topBar}`} />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">{t.name}</h4>
                      <p className={`font-body-sm text-body-sm ${t.subCls}`}>{t.sub}</p>
                    </div>
                    <div className={`p-2 rounded-full ${t.iconWrap}`}>
                      <Icon name={t.icon} filled={t.iconFilled} className={t.iconCls} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase">Members</span>
                    <p className="font-display-lg text-3xl font-bold text-on-background mt-1">{count.toLocaleString()}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t.max === Infinity ? `${t.min.toLocaleString()}+ pts` : `${t.min.toLocaleString()} - ${t.max.toLocaleString()} pts`}
                    </p>
                  </div>
                  <div className="mt-auto">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase block mb-2">Perks</span>
                    <ul className="space-y-2">
                      {t.perks.map((p) => (
                        <li key={p} className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                          <Icon name="check" size={16} className="text-primary" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top members leaderboard */}
        <div className="col-span-1 md:col-span-5 bg-surface-container-lowest rounded-xl border border-surface-variant p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/30">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
              <Icon name="leaderboard" />
            </div>
            <h3 className="font-headline-lg text-headline-lg text-on-background">Top Members</h3>
          </div>
          {topMembers.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-8">
              {org ? "No members with points yet." : "Sign in to view members."}
            </p>
          ) : (
            <ul className="space-y-3">
              {topMembers.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container border border-surface-variant">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md text-on-background truncate">{c.name}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant">{c.segment ?? "Member"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-body-md font-semibold text-on-background">{c.loyaltyPoints.toLocaleString()}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant">pts</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

