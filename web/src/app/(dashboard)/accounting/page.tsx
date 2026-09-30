import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { SeedAccountingCard, BackfillButton } from "@/components/accounting/SetupControls";
import { getActiveOrg } from "@/lib/org";
import { money, compactMoney } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { loadLedger, accountingOverview } from "@/lib/accounting/data";

export const metadata = { title: "Accounting — Inventory Pro" };

export default async function AccountingOverviewPage() {
  const org = await getActiveOrg();
  if (!org) return <div className="p-xl text-center text-on-surface-variant">Sign in to view accounting.</div>;

  const currency = org.currency;
  const ledger = await loadLedger(org.orgId);

  if (!ledger.isSetUp) {
    return (
      <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
        <div className="mb-lg">
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Accounting</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Double-entry general ledger for your business.</p>
        </div>
        <SeedAccountingCard />
      </main>
    );
  }

  const supabase = await createClient();
  const { count: entryCount } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.orgId)
    .eq("status", "posted");

  const o = accountingOverview(ledger, entryCount ?? 0);

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Accounting</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Live double-entry ledger — every sale, purchase and journal posts here.
          </p>
        </div>
        <BackfillButton />
      </div>

      {/* Ledger integrity badges */}
      <div className="flex flex-wrap gap-sm mb-lg">
        <Badge ok={o.trialBalanced} label={o.trialBalanced ? "Trial balance is balanced" : "Trial balance out of balance"} />
        <Badge ok={o.bsBalanced} label={o.bsBalanced ? "Balance sheet balances" : "Balance sheet out of balance"} />
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high font-label-md text-label-md text-on-surface-variant">
          <Icon name="account_tree" size={15} /> {o.accountCount} accounts · {o.entryCount} posted entries
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-md mb-lg">
        <Kpi label="Cash & Bank" value={compactMoney(o.cash, currency)} icon="account_balance" tone="neutral" />
        <Kpi label="Receivables" value={compactMoney(o.receivables, currency)} icon="call_received" tone={o.receivables > 0 ? "warning" : "neutral"} sub="owed to you" />
        <Kpi label="Payables" value={compactMoney(o.payables, currency)} icon="call_made" tone={o.payables > 0 ? "negative" : "neutral"} sub="you owe" />
        <Kpi label="Revenue" value={compactMoney(o.revenue, currency)} icon="trending_up" tone="positive" />
        <Kpi label="Expenses" value={compactMoney(o.expenses, currency)} icon="trending_down" tone="warning" />
        <Kpi label="Net Income" value={compactMoney(o.netIncome, currency)} icon="account_balance_wallet" tone={o.netIncome >= 0 ? "positive" : "negative"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Recent ledger activity */}
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-md border-b border-outline-variant flex items-center justify-between">
            <h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Ledger Activity</h3>
            <Link href="/accounting/journal" className="text-primary font-label-md text-label-md hover:underline">View journal</Link>
          </div>
          <div className="flex-1 divide-y divide-outline-variant/60">
            {o.recentEntries.length === 0 ? (
              <p className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">No posted entries yet. Record a journal or sync your operations.</p>
            ) : (
              o.recentEntries.map((e) => (
                <div key={e.entryId} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                    <Icon name={sourceIcon(e.source)} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body-sm text-body-sm text-on-surface truncate">{e.memo ?? e.reference ?? e.entryNumber}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant">{e.entryNumber} · {new Date(e.entryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <span className="font-label-md text-label-md px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant capitalize">{e.source}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-md">Statements</h3>
          <div className="space-y-2">
            <QuickLink href="/accounting/balance-sheet" icon="account_balance" label="Balance Sheet" desc="Assets, liabilities & equity" />
            <QuickLink href="/accounting/profit-loss" icon="assessment" label="Profit & Loss" desc="Revenue, COGS & expenses" />
            <QuickLink href="/accounting/trial-balance" icon="balance" label="Trial Balance" desc="Every account's debit/credit" />
            <QuickLink href="/accounting/general-ledger" icon="list_alt" label="General Ledger" desc="Drill into any account" />
            <QuickLink href="/accounting/chart-of-accounts" icon="account_tree" label="Chart of Accounts" desc="Manage your accounts" />
          </div>
        </div>
      </div>
    </main>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-md text-label-md ${ok ? "bg-primary-container/20 text-primary" : "bg-error-container/30 text-error"}`}>
      <Icon name={ok ? "check_circle" : "error"} size={15} filled /> {label}
    </span>
  );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface-variant group-hover:text-primary flex items-center justify-center shrink-0">
        <Icon name={icon} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body-sm text-body-sm text-on-surface">{label}</p>
        <p className="font-label-md text-label-md text-on-surface-variant">{desc}</p>
      </div>
      <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
    </Link>
  );
}

function sourceIcon(source: string): string {
  switch (source) {
    case "sale": return "point_of_sale";
    case "purchase": return "shopping_cart";
    case "payment": return "payments";
    case "payroll": return "badge";
    case "opening": return "flag";
    default: return "edit_note";
  }
}
