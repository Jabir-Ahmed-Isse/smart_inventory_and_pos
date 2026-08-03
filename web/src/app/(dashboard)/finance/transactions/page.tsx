import { getActiveOrg } from "@/lib/org";
import { loadFinance } from "@/lib/finance/data";
import { RecordTransactionDialog } from "@/components/finance/RecordTransactionDialog";
import { TransactionsTable, type TxnView } from "./TransactionsTable";

export const metadata = { title: "Transactions — Inventory Pro" };

export default async function TransactionsPage() {
  const org = await getActiveOrg();
  const currency = org?.currency ?? "USD";
  const raw = org ? await loadFinance(org.orgId) : null;

  const rows: TxnView[] = (raw?.transactions ?? []).map((t) => ({
    id: t.id,
    date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    type: t.type,
    category: t.category ?? "Uncategorized",
    description: t.description ?? "",
    reference: t.reference ?? "",
    amount: t.amount,
  }));

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Transactions</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Every income and expense across your business — search, filter and export.
          </p>
        </div>
        {org && <RecordTransactionDialog />}
      </div>
      {org ? (
        <TransactionsTable rows={rows} currency={currency} />
      ) : (
        <div className="p-xl text-center text-on-surface-variant">Sign in to view transactions.</div>
      )}
    </main>
  );
}
