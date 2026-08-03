import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { money } from "@/lib/data";
import { getPlatformContext, getCompanyDetail } from "@/lib/admin/data";
import { createUserInCompany } from "@/lib/admin/actions";
import { StatusToggle } from "./StatusToggle";

export const metadata = { title: "Company Detail — Platform Console" };

const ROLE_CLS: Record<string, string> = {
  owner: "bg-primary-container/20 text-primary border border-primary/20",
  admin: "bg-tertiary-container/20 text-tertiary border border-tertiary-container/30",
  manager: "bg-secondary-container/20 text-secondary border border-secondary-container/30",
  staff: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
  accountant: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
};

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isPlatformAdmin } = await getPlatformContext();

  if (!isPlatformAdmin) {
    return (
      <main className="p-md md:p-lg max-w-container-max mx-auto w-full">
        <div className="max-w-lg mx-auto mt-2xl text-center bg-surface border border-outline-variant rounded-xl p-xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto mb-md"><Icon name="lock" size={28} /></div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Platform admins only</h2>
          <Link href="/admin" className="text-primary hover:underline font-label-md text-label-md">Back to Administration</Link>
        </div>
      </main>
    );
  }

  const c = await getCompanyDetail(id);
  if (!c) {
    return (
      <main className="p-md md:p-lg max-w-container-max mx-auto w-full">
        <p className="text-center text-on-surface-variant py-2xl">Company not found.</p>
        <div className="text-center"><Link href="/platform" className="text-primary hover:underline">Back to Platform Console</Link></div>
      </main>
    );
  }

  return (
    <main className="p-md md:p-lg max-w-container-max mx-auto w-full">
      <Link href="/platform" className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary font-label-md text-label-md mb-md">
        <Icon name="arrow_back" size={16} /> Platform Console
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-md mb-lg">
        <div>
          <div className="flex items-center gap-sm">
            <h1 className="font-headline-xl text-headline-xl text-on-surface">{c.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.active ? "bg-primary-container/20 text-primary border border-primary/20" : "bg-error-container/30 text-error border border-error-container/40"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.active ? "bg-primary" : "bg-error"}`} />
              {c.active ? "Active" : "Suspended"}
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            {c.currency} · Tax {c.taxRate}% · {c.timezone} · Created {c.createdAt}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-sm">
          <CreateUserInCompanyDialog orgId={c.id} />
          <StatusToggle orgId={c.id} active={c.active} />
        </div>
      </div>

      {!c.active && (
        <div className="mb-lg rounded-lg border border-error/30 bg-error-container/20 px-md py-sm font-body-sm text-body-sm text-on-error-container flex items-center gap-2">
          <Icon name="block" size={18} /> This company is suspended — its users are locked out until you reactivate it.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md mb-lg">
        <Kpi label="Team Members" value={String(c.members.length)} icon="groups" tone="positive" />
        <Kpi label="Products" value={String(c.stats.products)} icon="inventory_2" tone="neutral" />
        <Kpi label="Warehouses" value={String(c.stats.warehouses)} icon="warehouse" tone="neutral" />
        <Kpi label="Customers" value={String(c.stats.customers)} icon="person" tone="neutral" />
        <Kpi label="Sales Orders" value={String(c.stats.salesOrders)} icon="receipt_long" tone="neutral" sub={money(c.stats.revenue, c.currency)} />
        <Kpi label="Purchase Orders" value={String(c.stats.purchaseOrders)} icon="shopping_cart" tone="neutral" />
      </div>

      {/* Members */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Team Members</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Name</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Email</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Joined</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Role</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {c.members.length === 0 ? (
                <tr><td colSpan={4} className="p-lg text-center text-on-surface-variant">No members.</td></tr>
              ) : (
                c.members.map((m) => (
                  <tr key={m.userId} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md font-medium text-on-surface">{m.name}</td>
                    <td className="p-md text-on-surface-variant">{m.email}</td>
                    <td className="p-md text-on-surface-variant whitespace-nowrap">{m.joined}</td>
                    <td className="p-md text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${ROLE_CLS[m.role] ?? ""}`}>{m.role}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function CreateUserInCompanyDialog({ orgId }: { orgId: string }) {
  return (
    <CrudDialog
      triggerLabel="Add User"
      triggerIcon="person_add"
      title="Add a User to this Company"
      submitLabel="Create User"
      action={createUserInCompany}
      triggerClassName="px-lg py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-sm"
    >
      <input type="hidden" name="org_id" value={orgId} />
      <div>
        <label className={labelCls}>Full Name *</label>
        <input name="full_name" required type="text" className={fieldCls} placeholder="Jane Doe" />
      </div>
      <div>
        <label className={labelCls}>Email *</label>
        <input name="email" required type="email" className={fieldCls} placeholder="jane@company.com" />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Temp Password *</label>
          <input name="password" required type="text" minLength={6} className={fieldCls} placeholder="min 6 characters" />
        </div>
        <div>
          <label className={labelCls}>Role *</label>
          <select name="role" required className={`${fieldCls} appearance-none`} defaultValue="staff">
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="accountant">Accountant</option>
          </select>
        </div>
      </div>
    </CrudDialog>
  );
}
