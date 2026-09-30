import { redirect } from "next/navigation";

// Consolidated: cash-flow trend lives on the Finance overview.
export default function Page() {
  redirect("/finance");
}
