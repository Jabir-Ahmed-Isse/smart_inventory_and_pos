import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireRole } from "@/lib/rbac";
import { SupplierImportClient } from "./SupplierImportClient";

export const metadata = { title: "Import Suppliers — Inventory Pro" };

export default async function ImportSuppliersPage() {
  await requireRole(["owner", "admin", "manager"]);

  return (
    <main className="flex-1 p-md md:p-lg lg:p-xl pb-32">
      <div className="max-w-[1000px] mx-auto space-y-lg">
        <div>
          <Link href="/suppliers" className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-on-surface mb-sm transition-colors">
            <Icon name="arrow_back" size={16} /> Back to Suppliers
          </Link>
          <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">Import Suppliers</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Add your whole vendor list at once — upload an Excel or CSV file. We&apos;ll auto-detect the columns.
            Suppliers already on file (by name or email) are skipped.
          </p>
        </div>
        <SupplierImportClient />
      </div>
    </main>
  );
}
