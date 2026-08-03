import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { createSupplier } from "@/lib/suppliers/actions";

/** Shared "New Supplier" dialog used on the purchases and suppliers screens. */
export function AddSupplierDialog({ triggerClassName }: { triggerClassName?: string }) {
  return (
    <CrudDialog
      triggerLabel="New Supplier"
      triggerIcon="add_business"
      title="New Supplier"
      submitLabel="Create Supplier"
      action={createSupplier}
      triggerClassName={triggerClassName}
    >
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required className={fieldCls} placeholder="Apex Electronics Inc." type="text" />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Contact Name</label>
          <input name="contact_name" className={fieldCls} placeholder="Sarah Jenkins" type="text" />
        </div>
        <div>
          <label className={labelCls}>Payment Terms</label>
          <input name="payment_terms" className={fieldCls} placeholder="Net 30" type="text" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Email</label>
          <input name="email" className={fieldCls} placeholder="orders@apex.com" type="email" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" className={fieldCls} placeholder="+1 555 000 0000" type="text" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Address</label>
        <input name="address" className={fieldCls} placeholder="City, Country" type="text" />
      </div>
    </CrudDialog>
  );
}
