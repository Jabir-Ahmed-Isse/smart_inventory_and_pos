import { redirect } from "next/navigation";

// Superseded by the dedicated Expenses module (bills, rent, approvals).
export default function Page() {
  redirect("/expenses");
}
