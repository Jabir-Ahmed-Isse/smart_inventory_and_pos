import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireRole } from "@/lib/rbac";
import { ImportClient } from "./ImportClient";

export const metadata = { title: "Import Products — Inventory Pro" };

export default async function ImportProductsPage() {
  await requireRole(["owner", "admin", "manager"]);

  return (
    <main className="flex-1 p-md md:p-lg lg:p-xl bg-surface-bright pb-32">
      <div className="max-w-[1000px] mx-auto space-y-lg">
        {/* Header */}
        <div>
          <Link href="/products" className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-on-surface mb-sm transition-colors">
            <Icon name="arrow_back" size={16} /> Back to Products
          </Link>
          <h2 className="font-headline-xl text-headline-xl font-bold text-on-surface">Import Products</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Bring your existing catalog in from an Excel or CSV file. We&apos;ll match your columns,
            create any missing warehouses, generate SKUs and seed opening stock — no manual entry.
          </p>
        </div>

        <ImportClient />
      </div>
    </main>
  );
}
