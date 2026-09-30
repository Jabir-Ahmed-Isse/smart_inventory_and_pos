import { redirect } from "next/navigation";

// Removed: relabelled orders, not real invoicing. Use Orders / Receivables.
export default function Page() {
  redirect("/finance");
}
