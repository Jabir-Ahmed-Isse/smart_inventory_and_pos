import { redirect } from "next/navigation";

// Removed: non-functional (required an external email/scheduler service).
export default function Page() {
  redirect("/reports");
}
