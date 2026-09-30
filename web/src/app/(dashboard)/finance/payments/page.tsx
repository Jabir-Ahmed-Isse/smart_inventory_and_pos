import { redirect } from "next/navigation";

// Consolidated: payments are tracked on Orders and in the Finance overview.
export default function Page() {
  redirect("/finance");
}
