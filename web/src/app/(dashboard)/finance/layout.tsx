import { FinanceNav } from "./FinanceNav";
import { requireRole } from "@/lib/rbac";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "accountant"]);
  return (
    <div className="flex flex-col min-h-full">
      <FinanceNav />
      {children}
    </div>
  );
}
