import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createAsset } from "@/lib/assets/actions";

export function NewAssetDialog() {
  return (
    <CrudDialog triggerLabel="Add Asset" title="Add Fixed Asset" submitLabel="Add Asset" action={createAsset}
      triggerClassName="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Name *</label>
          <input name="name" required className={fieldCls} placeholder="e.g. Delivery Van" />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <input name="category" className={fieldCls} placeholder="e.g. Vehicles" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Cost *</label>
          <input name="cost" type="number" min="0" step="0.01" required className={fieldCls} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Salvage value</label>
          <input name="salvage_value" type="number" min="0" step="0.01" className={fieldCls} placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Useful life (months) *</label>
          <input name="useful_life_months" type="number" min="1" step="1" required className={fieldCls} placeholder="e.g. 60" defaultValue="60" />
        </div>
        <div>
          <label className={labelCls}>Acquisition date</label>
          <input name="acquisition_date" type="date" className={fieldCls} defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface cursor-pointer">
        <input type="checkbox" name="post_to_ledger" className="rounded border-outline-variant" defaultChecked /> Post purchase to ledger (Dr Fixed Assets · Cr Cash)
      </label>
      <div>
        <label className={labelCls}>Notes</label>
        <input name="notes" className={fieldCls} placeholder="Optional" />
      </div>
    </CrudDialog>
  );
}
