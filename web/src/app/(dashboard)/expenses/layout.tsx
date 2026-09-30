import { ExpensesNav } from "./ExpensesNav";
import { requireRole } from "@/lib/rbac";

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "accountant", "manager"]);
  return (
    <div className="flex flex-col min-h-full">
      <ExpensesNav />
      {children}
    </div>
  );
}
