import { getActiveOrg } from "@/lib/org";
import { loadFinance, payables } from "@/lib/finance/data";
import { AgingView } from "@/components/finance/AgingTable";

export const metadata = { title: "Payables — Inventory Pro" };

export default async function PayablesPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;
  const rows = raw ? payables(raw) : [];

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Payables</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Outstanding supplier bills (open purchase orders) by due age.</p>
      </div>
      {org ? (
        <AgingView rows={rows} currency={currency} party="Supplier" action="you owe" emptyText="No outstanding payables — you're all settled." />
      ) : (
        <div className="p-xl text-center text-on-surface-variant">Sign in to view payables.</div>
      )}
    </main>
  );
}
