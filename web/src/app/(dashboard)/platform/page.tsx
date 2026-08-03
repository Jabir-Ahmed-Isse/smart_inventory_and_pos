import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getPlatformContext, getCompanies } from "@/lib/admin/data";
import { createCompany, setPlatformAdmin } from "@/lib/admin/actions";

export const metadata = { title: "Platform Console — Inventory Pro" };

export default async function PlatformPage() {
  const { isPlatformAdmin } = await getPlatformContext();

  if (!isPlatformAdmin) {
    return (
      <main className="p-md md:p-lg max-w-container-max mx-auto w-full">
        <div className="max-w-lg mx-auto mt-2xl text-center bg-surface border border-outline-variant rounded-xl p-xl shadow-sm">
          <div className="w-14 h-14 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto mb-md">
            <Icon name="lock" size={28} />
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Platform admins only</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            This console is for platform administrators who create and manage companies. Ask a platform
            admin to grant you access.
          </p>
          <Link href="/admin" className="inline-flex items-center gap-2 mt-lg px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">
            <Icon name="arrow_back" size={18} /> Back to Administration
          </Link>
        </div>
      </main>
    );
  }

  const companies = await getCompanies();
  const totalMembers = companies.reduce((s, c) => s + c.members, 0);

  return (
    <main className="p-md md:p-lg max-w-container-max mx-auto w-full">
      <div className="mb-lg flex flex-col sm:flex-row sm:items-end sm:justify-between gap-md">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Platform Console</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Create companies and their owner accounts. Each company owner then manages users inside their own workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <GrantAdminDialog />
          <CreateCompanyDialog />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-md mb-lg">
        <Kpi label="Companies" value={String(companies.length)} icon="business" tone="neutral" />
        <Kpi label="Total Users" value={String(totalMembers)} icon="groups" tone="positive" />
        <Kpi label="Avg Team Size" value={companies.length ? (totalMembers / companies.length).toFixed(1) : "0"} icon="analytics" tone="neutral" />
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Companies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Company</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Owner</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Status</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Currency</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Users</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant">Created</th>
                <th className="p-md font-label-md text-label-md text-on-surface-variant text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {companies.length === 0 ? (
                <tr><td colSpan={7} className="p-xl text-center text-on-surface-variant">No companies yet. Create the first one.</td></tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-md font-semibold">
                      <Link href={`/platform/${c.id}`} className="text-primary hover:underline">{c.name}</Link>
                    </td>
                    <td className="p-md text-on-surface-variant">{c.owner}</td>
                    <td className="p-md">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.active ? "bg-primary-container/20 text-primary border border-primary/20" : "bg-error-container/30 text-error border border-error-container/40"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.active ? "bg-primary" : "bg-error"}`} />
                        {c.active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="p-md text-on-surface-variant">{c.currency}</td>
                    <td className="p-md text-right tabular-nums text-on-surface">{c.members}</td>
                    <td className="p-md text-on-surface-variant whitespace-nowrap">{c.createdAt}</td>
                    <td className="p-md text-right">
                      <Link href={`/platform/${c.id}`} className="inline-flex items-center gap-1 text-primary hover:underline font-label-md text-label-md">
                        Manage <Icon name="chevron_right" size={16} />
                      </Link>
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

function CreateCompanyDialog() {
  return (
    <CrudDialog
      triggerLabel="Create Company"
      triggerIcon="add_business"
      title="Create a Company"
      submitLabel="Create Company"
      action={createCompany}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant -mt-xs">
        Creates the company workspace and its owner login. The owner can then create their own team.
      </p>
      <div className="grid grid-cols-2 gap-md">
        <div className="col-span-2">
          <label className={labelCls}>Company Name *</label>
          <input name="company_name" required type="text" className={fieldCls} placeholder="Acme Retail Ltd" />
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <input name="currency" type="text" maxLength={3} className={fieldCls} placeholder="USD" defaultValue="USD" />
        </div>
      </div>
      <div className="border-t border-outline-variant pt-md">
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">Company Owner</p>
        <div className="space-y-md">
          <div>
            <label className={labelCls}>Owner Name *</label>
            <input name="owner_name" required type="text" className={fieldCls} placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className={labelCls}>Owner Email *</label>
              <input name="owner_email" required type="email" className={fieldCls} placeholder="owner@acme.com" />
            </div>
            <div>
              <label className={labelCls}>Temp Password *</label>
              <input name="owner_password" required type="text" minLength={6} className={fieldCls} placeholder="min 6 characters" />
            </div>
          </div>
        </div>
      </div>
    </CrudDialog>
  );
}

function GrantAdminDialog() {
  return (
    <CrudDialog
      triggerLabel="Grant Platform Admin"
      triggerIcon="shield_person"
      title="Grant Platform Admin"
      submitLabel="Grant Access"
      action={setPlatformAdmin}
      triggerClassName="px-lg py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-sm"
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant -mt-xs">
        Give an existing user platform-admin rights so they can also create and manage companies.
      </p>
      <div>
        <label className={labelCls}>User Email *</label>
        <input name="email" required type="email" className={fieldCls} placeholder="person@example.com" />
      </div>
    </CrudDialog>
  );
}
