import { redirect } from "next/navigation";

// Merged into the Reports BI hub (same data source).
export default function Page() {
  redirect("/reports/purchases");
}
