import { Icon } from "@/components/Icon";
import { CrudDialog, fieldCls, labelCls } from "@/components/CrudDialog";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getMembers, type MemberRole } from "@/lib/data";
import { createOrgUser } from "@/lib/admin/actions";
import { RoleSelect } from "./RoleSelect";

export const metadata = { title: "Roles & Permissions — Inventory Pro" };

const ROLE_INFO: Record<MemberRole, { desc: string; caps: string[] }> = {
  owner: { desc: "Full control of the workspace and billing.", caps: ["Everything admins can do", "Transfer or delete the workspace"] },
  admin: { desc: "Full system access except billing ownership.", caps: ["Manage users & roles", "All inventory, POS, finance & reports"] },
  manager: { desc: "Branch oversight & approvals.", caps: ["Manage inventory & purchasing", "Process sales & view reports"] },
  staff: { desc: "Sell at POS; places due orders.", caps: ["Ring up sales at POS", "Places unpaid (due) orders — a cashier settles them"] },
  cashier: { desc: "Takes payments into accounts.", caps: ["Settle due orders into a bank / mobile account", "Sell at POS & take payment"] },
  accountant: { desc: "Finance, reports & payments.", caps: ["Manage accounts & settle payments", "View finance & reports; no inventory changes"] },
};

const ROLE_ORDER: MemberRole[] = ["owner", "admin", "manager", "staff", "cashier", "accountant"];

export default async function RolesPage() {
  await requireRole(["owner", "admin"]);
  const org = await getActiveOrg();
  const members = org ? await getMembers(org.orgId, org.userId) : [];
  const canManage = org?.role === "owner" || org?.role === "admin";

  const counts = new Map<MemberRole, number>();
  for (const m of members) counts.set(m.role, (counts.get(m.role) ?? 0) + 1);

  return (
    <main className="p-md md:p-lg min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-lg flex flex-col sm:flex-row sm:items-end sm:justify-between gap-md">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Roles &amp; Permissions</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Team access levels across your workspace.{!canManage && " Only owners and admins can change roles."}
          </p>
        </div>
        {canManage && <CreateUserDialog />}
      </div>

      <div className="flex flex-col lg:flex-row gap-lg flex-1 min-h-0">
        {/* Roles list */}
        <div className="w-full lg:w-80 flex flex-col gap-md min-h-0">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Roles</h3>
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-sm flex flex-col gap-xs">
              {ROLE_ORDER.map((role) => {
                const info = ROLE_INFO[role];
                const n = counts.get(role) ?? 0;
                return (
                  <div key={role} className="w-full flex flex-col items-start p-md rounded-lg hover:bg-surface-container-high transition-colors">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-on-surface capitalize">{role}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">{n} user{n === 1 ? "" : "s"}</span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">{info.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Members + capabilities */}
        <div className="flex-1 bg-surface border border-outline-variant rounded-xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="px-lg py-lg border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="text-headline-lg font-headline-lg text-on-surface">Team Members</h3>
            <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">
              {members.length} member{members.length === 1 ? "" : "s"} in this workspace.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant sticky top-0">
                  <th className="py-3 px-lg font-label-md text-label-md text-on-surface-variant">Member</th>
                  <th className="py-3 px-lg font-label-md text-label-md text-on-surface-variant">Joined</th>
                  <th className="py-3 px-lg font-label-md text-label-md text-on-surface-variant text-right">Role</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10 px-lg text-center text-on-surface-variant">
                      {org ? "No members found." : "Sign in to view members."}
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.userId} className="border-b border-outline-variant/40 hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold">{m.initials}</div>
                          <div>
                            <div className="font-medium text-on-surface">{m.name}{m.isSelf && <span className="text-on-surface-variant font-normal"> (you)</span>}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-lg text-on-surface-variant">{m.joined}</td>
                      <td className="py-3 px-lg text-right">
                        <RoleSelect userId={m.userId} role={m.role} disabled={!canManage} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Capability reference */}
          <div className="border-t border-outline-variant p-lg bg-surface-container-lowest">
            <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">What each role can do</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {ROLE_ORDER.map((role) => (
                <div key={role} className="border border-outline-variant rounded-lg p-3 bg-surface">
                  <div className="font-bold text-on-surface capitalize mb-1">{role}</div>
                  <ul className="space-y-1">
                    {ROLE_INFO[role].caps.map((c) => (
                      <li key={c} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                        <Icon name="check" size={14} className="text-primary shrink-0 mt-0.5" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const CREATABLE_ROLES: { value: MemberRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff (sells, places due orders)" },
  { value: "cashier", label: "Cashier (takes payments)" },
  { value: "accountant", label: "Accountant" },
];

function CreateUserDialog() {
  return (
    <CrudDialog
      triggerLabel="Create User"
      triggerIcon="person_add"
      title="Add a Team Member"
      submitLabel="Create User"
      action={createOrgUser}
      triggerClassName="px-lg py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity flex items-center gap-sm shadow-sm"
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant -mt-xs">
        Creates a login for this workspace. Share the email and password with them; they can change it later.
      </p>
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
          <label className={labelCls}>Temporary Password *</label>
          <input name="password" required type="text" minLength={6} className={fieldCls} placeholder="min 6 characters" />
        </div>
        <div>
          <label className={labelCls}>Role *</label>
          <select name="role" required className={`${fieldCls} appearance-none`} defaultValue="staff">
            {CREATABLE_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>
    </CrudDialog>
  );
}
