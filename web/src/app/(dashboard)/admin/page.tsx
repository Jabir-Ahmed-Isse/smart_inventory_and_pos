import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getMembers, getAuditLogs, type LogSeverity } from "@/lib/data";
import { RoleSelect } from "../roles/RoleSelect";

export const metadata = { title: "Administration — Inventory Pro" };

const DOT: Record<LogSeverity, string> = {
  info: "bg-primary",
  warning: "bg-tertiary-container",
  critical: "bg-error",
};

export default async function AdminPage() {
  await requireRole(["owner", "admin"]);
  const org = await getActiveOrg();
  const [members, logs] = org
    ? await Promise.all([getMembers(org.orgId, org.userId), getAuditLogs(org.orgId, 8)])
    : [[], []];
  const canManage = org?.role === "owner" || org?.role === "admin";

  return (
    <main className="p-md md:p-gutter max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="mb-lg flex justify-between items-end">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">User Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Control access, assign roles, and monitor system activity.
          </p>
        </div>
        <Link href="/roles" className="px-gutter py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-sm shadow-sm">
          <Icon name="manage_accounts" size={18} /> Manage Roles
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* Users table */}
        <div className="xl:col-span-2 flex flex-col gap-lg">
          <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden flex flex-col h-[600px]">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Team Members</h3>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{members.length} total</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant z-10">
                  <tr>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">User</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Joined</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">
                        {org ? "No members found." : "Sign in to manage users."}
                      </td>
                    </tr>
                  ) : (
                    members.map((u) => (
                      <tr key={u.userId} className="hover:bg-surface-container-low transition-colors group">
                        <td className="p-md">
                          <div className="flex items-center gap-md">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-label-md bg-secondary-container text-on-secondary-container">
                              {u.initials}
                            </div>
                            <div>
                              <div className="font-body-md text-body-md font-semibold text-on-surface">
                                {u.name}{u.isSelf && <span className="text-on-surface-variant font-normal"> (you)</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{u.joined}</td>
                        <td className="p-md text-right">
                          <RoleSelect userId={u.userId} role={u.role} disabled={!canManage} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit log */}
        <div className="xl:col-span-1 flex flex-col gap-lg">
          <div className="bg-surface rounded-xl border border-outline-variant flex flex-col h-[600px] overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex items-center gap-sm">
              <Icon name="history" className="text-primary" size={20} />
              <h3 className="font-headline-lg text-headline-lg text-on-surface">Recent Activity</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-md">
              {logs.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-8">No activity recorded yet.</p>
              ) : (
                <div className="relative border-l border-outline-variant/30 ml-sm space-y-md pb-md">
                  {logs.map((item) => (
                    <div key={item.id} className="relative pl-md">
                      <span className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-surface ${DOT[item.severity]}`} />
                      <p className="font-body-sm text-body-sm text-on-surface">
                        <strong className="font-semibold">{item.userName}</strong> — {item.action}
                      </p>
                      <p className="font-label-md text-label-md text-on-surface-variant mt-xs">{item.date} · {item.time}</p>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/logs" className="block w-full mt-sm py-sm border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors text-center">
                View Full History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
