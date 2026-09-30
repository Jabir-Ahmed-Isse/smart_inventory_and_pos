import { redirect } from "next/navigation";

// Superseded by the double-entry statements in the Accounting module.
export default function Page() {
  redirect("/accounting");
}
