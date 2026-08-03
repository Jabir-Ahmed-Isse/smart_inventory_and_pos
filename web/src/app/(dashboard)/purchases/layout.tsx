import { PurchasingNav } from "@/components/PurchasingNav";
import { requireRole } from "@/lib/rbac";

export default async function PurchasingLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "manager"]);
  return (
    <div className="flex flex-col min-h-full">
      <PurchasingNav />
      {children}
    </div>
  );
}
