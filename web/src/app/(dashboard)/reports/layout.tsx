import { ReportsNav } from "./ReportsNav";
import { requireRole } from "@/lib/rbac";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "manager", "accountant"]);
  return (
    <div className="flex flex-col min-h-full">
      <ReportsNav />
      {children}
    </div>
  );
}
