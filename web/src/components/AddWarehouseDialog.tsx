import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createWarehouse } from "@/lib/warehouses/actions";

/** Shared "Add Warehouse / Location" dialog (Warehouses + Locations screens). */
export function AddWarehouseDialog({
  triggerLabel = "Add Warehouse",
  triggerClassName,
}: {
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  return (
    <CrudDialog
      triggerLabel={triggerLabel}
      triggerIcon="add"
      title="New Warehouse"
      submitLabel="Add Warehouse"
      action={createWarehouse}
      triggerClassName={triggerClassName}
    >
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="Main Warehouse" type="text" />
      </div>
      <div>
        <label className={labelCls}>Location / Address</label>
        <input name="location" className={fieldCls} placeholder="City, Country" type="text" />
      </div>
      <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
        <input name="is_primary" type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
        Set as primary location
      </label>
    </CrudDialog>
  );
}
