import { AccountingNav } from "./AccountingNav";
import { requireRole } from "@/lib/rbac";

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "accountant"]);
  return (
    <div className="flex flex-col min-h-full">
      <AccountingNav />
      {children}
    </div>
  );
}
