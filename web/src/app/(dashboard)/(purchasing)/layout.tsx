import { PurchasingNav } from "@/components/PurchasingNav";
import { requireRole } from "@/lib/rbac";

/**
 * Wraps the Purchasing-owned standalone pages (Suppliers, RFQ, Shipping) in the
 * same sticky sub-nav as /purchases, so clicking a tab keeps you in the section
 * instead of dropping you onto a bare page. Route group — no effect on URLs.
 * Manager-and-up only, matching the sidebar's Purchasing access.
 */
export default async function PurchasingSectionLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "manager"]);
  return (
    <div className="flex flex-col min-h-full">
      <PurchasingNav />
      {children}
    </div>
  );
}
