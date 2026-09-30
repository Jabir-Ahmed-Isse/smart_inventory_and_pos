import { getActiveOrg } from "@/lib/org";
import { getActiveBranchId } from "@/lib/branches/context";
import { loadFinance, receivables } from "@/lib/finance/data";
import { AgingView } from "@/components/finance/AgingTable";

export const metadata = { title: "Receivables — Inventory Pro" };

export default async function ReceivablesPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId, await getActiveBranchId()) : null;
  const rows = raw ? receivables(raw) : [];

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Receivables</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Outstanding customer balances by age. Settle them from Sales → Orders.</p>
      </div>
      {org ? (
        <AgingView rows={rows} currency={currency} party="Customer" action="owed to you" emptyText="No outstanding receivables — everyone's paid up." />
      ) : (
        <div className="p-xl text-center text-on-surface-variant">Sign in to view receivables.</div>
      )}
    </main>
  );
}
