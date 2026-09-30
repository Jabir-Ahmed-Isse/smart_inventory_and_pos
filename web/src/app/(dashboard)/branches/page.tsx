import Link from "next/link";
import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { getBranches, getBranchAssignments, type Branch } from "@/lib/branches/data";
import { getMembers } from "@/lib/data";
import { createBranch, updateBranch } from "@/lib/branches/actions";
import { BranchActiveToggle } from "./BranchActiveToggle";
import { BranchAccessManager } from "./BranchAccessManager";

export const metadata = { title: "Branches — Inventory Pro" };

type EmpOption = { id: string; name: string };

async function getEmployeeOptions(orgId: string): Promise<EmpOption[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("organization_id", orgId)
      .order("first_name", { ascending: true });
    if (error) return [];
    return ((data ?? []) as { id: string; first_name: string; last_name: string | null }[]).map((e) => ({
      id: e.id,
      name: `${e.first_name}${e.last_name ? ` ${e.last_name}` : ""}`,
    }));
  } catch {
    return [];
  }
}

export default async function BranchesPage() {
  const org = await requireRole(["owner", "admin"]);
  const [branches, members, assignments, employees] = await Promise.all([
    getBranches(org.orgId),
    getMembers(org.orgId, org.userId),
    getBranchAssignments(org.orgId),
    getEmployeeOptions(org.orgId),
  ]);

  const empName = new Map(employees.map((e) => [e.id, e.name]));
  const initial: Record<string, string[]> = {};
  for (const [uid, ids] of assignments) initial[uid] = ids;

  const accessMembers = members.map((m) => ({
    userId: m.userId,
    name: m.isSelf ? `${m.name} (you)` : m.name,
    role: m.role,
    orgWide: m.role === "owner" || m.role === "admin" || m.role === "accountant",
  }));

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Branches</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Business locations inside your organization. Each branch can hold one or more warehouses.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          {branches.length > 0 && (
            <Link href="/branches/compare" className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-sm">
              <Icon name="leaderboard" size={18} /> Compare
            </Link>
          )}
          <NewBranchDialog employees={employees} />
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-xl text-center">
          <div className="w-14 h-14 rounded-full bg-primary-container/30 text-primary flex items-center justify-center mx-auto mb-md">
            <Icon name="store" size={28} />
          </div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface mb-xs">No branches yet</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
            Create your first branch to start organizing warehouses, sales and staff by location.
            Your existing data stays exactly where it is.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md mb-xl">
          {branches.map((b) => (
            <div key={b.id} className="bg-surface border border-outline-variant rounded-xl shadow-sm p-lg flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center shrink-0">
                    <Icon name="store" size={20} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-label-md text-label-md text-on-surface font-semibold truncate">{b.name}</h3>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Code: {b.code}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    b.isActive ? "bg-primary-container/40 text-primary" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <Icon name={b.isActive ? "check_circle" : "cancel"} size={13} />
                  {b.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <dl className="space-y-1 font-body-sm text-body-sm text-on-surface-variant mb-md">
                {b.city && <div className="flex items-center gap-2"><Icon name="location_on" size={15} /> {b.city}</div>}
                {b.phone && <div className="flex items-center gap-2"><Icon name="call" size={15} /> {b.phone}</div>}
                {b.email && <div className="flex items-center gap-2 truncate"><Icon name="mail" size={15} /> {b.email}</div>}
                {b.managerId && empName.get(b.managerId) && (
                  <div className="flex items-center gap-2"><Icon name="badge" size={15} /> {empName.get(b.managerId)}</div>
                )}
              </dl>

              <div className="mt-auto flex items-center gap-2 pt-sm border-t border-outline-variant">
                <EditBranchDialog branch={b} employees={employees} />
                <BranchActiveToggle id={b.id} active={b.isActive} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branch access */}
      <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-lg">
        <div className="flex items-center gap-2 mb-xs">
          <Icon name="group" className="text-primary" />
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Branch access</h3>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
          Assign team members to branches. Owners and admins always have access to every branch.
        </p>
        <BranchAccessManager
          members={accessMembers}
          branches={branches.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name }))}
          initial={initial}
        />
      </div>
    </main>
  );
}

function BranchFields({ branch, employees }: { branch?: Branch; employees: EmpOption[] }) {
  return (
    <>
      {branch && <input type="hidden" name="id" value={branch.id} />}
      <div className="grid grid-cols-2 gap-md">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Branch name *</label>
          <input name="name" required defaultValue={branch?.name ?? ""} className={fieldCls} placeholder="Downtown Branch" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelCls}>Code *</label>
          <input name="code" required defaultValue={branch?.code ?? ""} className={fieldCls} placeholder="DT" style={{ textTransform: "uppercase" }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" defaultValue={branch?.phone ?? ""} className={fieldCls} placeholder="+252…" />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input name="city" defaultValue={branch?.city ?? ""} className={fieldCls} placeholder="Mogadishu" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input name="email" type="email" defaultValue={branch?.email ?? ""} className={fieldCls} placeholder="branch@company.com" />
      </div>
      <div>
        <label className={labelCls}>Address</label>
        <input name="address" defaultValue={branch?.address ?? ""} className={fieldCls} placeholder="Street, area" />
      </div>
      <div>
        <label className={labelCls}>Manager</label>
        <select name="manager_id" defaultValue={branch?.managerId ?? ""} className={`${fieldCls} appearance-none`}>
          <option value="">— None —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function NewBranchDialog({ employees }: { employees: EmpOption[] }) {
  return (
    <CrudDialog
      triggerLabel="New Branch"
      triggerIcon="add_business"
      title="Create Branch"
      submitLabel="Create branch"
      action={createBranch}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <BranchFields employees={employees} />
    </CrudDialog>
  );
}

function EditBranchDialog({ branch, employees }: { branch: Branch; employees: EmpOption[] }) {
  return (
    <CrudDialog
      triggerLabel="Edit"
      triggerIcon="edit"
      title={`Edit ${branch.name}`}
      submitLabel="Save changes"
      action={updateBranch}
      triggerClassName="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors"
    >
      <BranchFields branch={branch} employees={employees} />
    </CrudDialog>
  );
}
