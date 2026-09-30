import { redirect } from "next/navigation";

// Consolidated: revenue is reflected in the Finance overview and Accounting.
export default function Page() {
  redirect("/finance");
}
