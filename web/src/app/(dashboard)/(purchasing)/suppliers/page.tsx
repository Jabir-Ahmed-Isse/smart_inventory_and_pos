import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { getSuppliers } from "@/lib/data";
import { AddSupplierDialog } from "@/components/AddSupplierDialog";
import { SupplierExportButton } from "@/components/suppliers/SupplierExportButton";

export const metadata = { title: "Suppliers — Inventory Pro" };

export default async function SuppliersPage() {
  const org = await getActiveOrg();
  const suppliers = org ? await getSuppliers(org.orgId) : [];

  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface">Suppliers</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            {suppliers.length} vendor{suppliers.length === 1 ? "" : "s"} on file.
          </p>
        </div>
        <div className="flex items-center gap-sm self-start">
          <SupplierExportButton suppliers={suppliers} />
          <Link href="/suppliers/import" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            <Icon name="upload_file" size={18} /> Import
          </Link>
          <AddSupplierDialog triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm" />
        </div>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm">
          <Icon name="storefront" size={40} className="text-on-surface-variant/50 mx-auto mb-md" />
          <p className="font-body-md text-body-md text-on-surface-variant">No suppliers yet.</p>
          <p className="font-label-md text-label-md text-on-surface-variant mt-xs">Add one, or import your whole vendor list from a file.</p>
        </div>
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-label-md text-label-md text-on-surface-variant border-b border-outline-variant bg-surface-container-lowest">
                  <th className="px-md py-3 font-medium">Supplier</th>
                  <th className="px-md py-3 font-medium">Contact</th>
                  <th className="px-md py-3 font-medium">Email</th>
                  <th className="px-md py-3 font-medium">Phone</th>
                  <th className="px-md py-3 font-medium">Payment terms</th>
                  <th className="px-md py-3 font-medium">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-high/40">
                    <td className="px-md py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center font-label-md text-label-md shrink-0">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{s.contactName ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{s.email ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant tabular-nums">{s.phone ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant">{s.paymentTerms ?? "—"}</td>
                    <td className="px-md py-3 font-body-sm text-body-sm text-on-surface-variant max-w-[220px] truncate">{s.address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
