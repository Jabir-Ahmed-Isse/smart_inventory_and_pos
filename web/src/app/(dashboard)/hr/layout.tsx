import { HrNav } from "./HrNav";
import { requireRole } from "@/lib/rbac";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "manager", "accountant"]);
  return (
    <div className="flex flex-col min-h-full">
      <HrNav />
      {children}
    </div>
  );
}
