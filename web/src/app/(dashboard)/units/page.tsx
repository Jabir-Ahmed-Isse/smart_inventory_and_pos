import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { DeleteButton } from "@/components/DeleteButton";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getUnits } from "@/lib/data";
import { createUnit, deleteUnit } from "@/lib/config/actions";

export const metadata = { title: "Units of Measure — Inventory Pro" };

export default async function UnitsPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const units = org ? await getUnits(org.orgId) : [];

  return (
    <main className="p-md md:p-lg xl:p-xl max-w-container-max mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">
            Units of Measure
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Configure product measurement definitions used across your catalog.
          </p>
        </div>
        <NewUnitDialog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Defined units */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50">
              <h3 className="font-headline-lg text-headline-lg text-on-surface text-[18px]">
                Defined Units
              </h3>
              <span className="bg-surface-variant text-on-surface-variant text-xs px-2 py-1 rounded-md font-label-md">
                {units.length} total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-lowest">
                    <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant">Unit Name</th>
                    <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant">Short Code</th>
                    <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant">Base Unit</th>
                    <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-on-surface-variant font-body-sm text-body-sm">
                        {org ? "No units defined yet. Add one to get started." : "Sign in to manage units."}
                      </td>
                    </tr>
                  ) : (
                    units.map((u) => (
                      <tr key={u.id} className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors group">
                        <td className="px-6 py-4 font-body-md text-body-md text-on-surface font-medium">{u.name}</td>
                        <td className="px-6 py-4 font-body-sm text-body-sm text-on-surface-variant">
                          <span className="bg-surface-variant px-2 py-1 rounded font-mono text-xs text-on-surface">{u.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          {u.baseUnit ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-container/20 text-primary text-[11px] font-medium border border-primary/20">
                              <Icon name="check" size={12} /> Base
                            </span>
                          ) : (
                            <span className="text-on-surface-variant text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <DeleteButton id={u.id} action={deleteUnit} confirmLabel={`Delete unit "${u.name}"?`} size={20} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
              <h3 className="font-headline-lg text-headline-lg text-on-surface text-[18px]">
                About Units
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-xs">
                How units are used across the platform.
              </p>
            </div>
            <div className="p-6 space-y-4 font-body-sm text-body-sm text-on-surface-variant">
              <div className="flex gap-3">
                <Icon name="straighten" size={20} className="text-primary shrink-0" />
                <p>Units define how each product is measured and sold — pieces, boxes, kilograms, litres.</p>
              </div>
              <div className="flex gap-3">
                <Icon name="star" size={20} className="text-primary shrink-0" />
                <p>Mark one unit as the <strong className="text-on-surface">base unit</strong> to use as the default measure for new products.</p>
              </div>
              <div className="flex gap-3">
                <Icon name="inventory_2" size={20} className="text-primary shrink-0" />
                <p>Stock counts, purchases and sales all reference these unit definitions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function NewUnitDialog() {
  return (
    <CrudDialog
      triggerLabel="Add Unit"
      title="New Unit"
      submitLabel="Add Unit"
      action={createUnit}
      triggerClassName="flex items-center gap-2 bg-primary text-on-primary font-label-md text-label-md py-2 px-5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm w-fit"
    >
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Name *</label>
          <input name="name" required className={fieldCls} placeholder="Piece" type="text" />
        </div>
        <div>
          <label className={labelCls}>Short Code *</label>
          <input name="code" required className={fieldCls} placeholder="pc" type="text" />
        </div>
      </div>
      <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
        <input name="base_unit" type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
        Set as base unit
      </label>
    </CrudDialog>
  );
}
