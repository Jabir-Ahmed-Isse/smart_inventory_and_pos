import { PayrollNav } from "./PayrollNav";
import { requireRole } from "@/lib/rbac";

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "accountant"]);
  return (
    <div className="flex flex-col min-h-full">
      <PayrollNav />
      {children}
    </div>
  );
}
