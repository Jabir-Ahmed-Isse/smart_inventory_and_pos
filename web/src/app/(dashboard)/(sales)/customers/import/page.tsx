import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireRole } from "@/lib/rbac";
import { CustomerImportClient } from "./CustomerImportClient";

export const metadata = { title: "Import Customers — Inventory Pro" };

export default async function ImportCustomersPage() {
  await requireRole(["owner", "admin", "manager"]);

  return (
    <main className="flex-1 p-md md:p-lg lg:p-xl pb-32">
      <div className="max-w-[1000px] mx-auto space-y-lg">
        <div>
          <Link href="/customers" className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-on-surface mb-sm transition-colors">
            <Icon name="arrow_back" size={16} /> Back to Customers
          </Link>
          <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">Import Customers</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Add your whole customer list at once — upload an Excel or CSV file. We&apos;ll auto-detect the columns.
            Customers already on file (by name or email) are skipped.
          </p>
        </div>
        <CustomerImportClient />
      </div>
    </main>
  );
}
