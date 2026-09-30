import { requireRole } from "@/lib/rbac";

// Purchasing-owned standalone pages (Suppliers, RFQ, Shipping) are reached from
// the sidebar as their own pages — no Purchasing sub-nav. The tab bar stays on
// the /purchases pages only. Manager-and-up, matching sidebar Purchasing access.
export default async function PurchasingSectionLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["owner", "admin", "manager"]);
  return <div className="flex flex-col min-h-full">{children}</div>;
}
