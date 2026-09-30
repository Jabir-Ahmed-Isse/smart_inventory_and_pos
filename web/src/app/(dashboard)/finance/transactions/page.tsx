import { redirect } from "next/navigation";

// Superseded by the double-entry Journal in the Accounting module.
export default function Page() {
  redirect("/accounting/journal");
}
