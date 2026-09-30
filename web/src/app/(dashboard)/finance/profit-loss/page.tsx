import { redirect } from "next/navigation";

// Superseded by the ledger-based statement in the Accounting module.
export default function Page() {
  redirect("/accounting/profit-loss");
}
