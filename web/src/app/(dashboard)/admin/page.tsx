import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getOrgUserDirectory, getActivityFeed } from "@/lib/members/data";
import { ActivityStream } from "./ActivityStream";

export const metadata = { title: "Administration — Inventory Pro" };

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", admin: "Admin", manager: "Manager", staff: "Staff", cashier: "Cashier", accountant: "Accountant",
};

export default async function AdminPage() {
  await requireRole(["owner", "admin"]);
  const org = await getActiveOrg();
  const [users, feed] = org
    ? await Promise.all([getOrgUserDirectory(org.orgId, org.userId), getActivityFeed(org.orgId, { limit: 60 })])
    : [[], []];
  const currency = org?.currency ?? "USD";

  const rolesInUse = new Set(users.flatMap((u) => [u.primaryRole, ...u.extraRoles])).size;
  const multiRole = users.filter((u) => u.extraRoles.length > 0).length;
  const totalActions = users.reduce((s, u) => s + u.counts.total, 0);

  return (
    <main className="p-md md:p-gutter max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="mb-lg flex flex-col sm:flex-row sm:justify-between sm:items-end gap-md">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface mb-xs">User Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Everyone in {org?.orgName ?? "your workspace"} — who they are, their access, and what they do.
          </p>
        </div>
        <Link href="/roles" className="px-gutter py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center gap-sm shadow-sm shrink-0">
          <Icon name="manage_accounts" size={18} /> Manage Roles
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatTile icon="group" label="People" value={String(users.length)} tone="primary" />
        <StatTile icon="badge" label="Roles in use" value={String(rolesInUse)} tone="tertiary" />
        <StatTile icon="hub" label="Multi-role users" value={String(multiRole)} tone="secondary" />
        <StatTile icon="bolt" label="Tracked actions" value={totalActions.toLocaleString()} tone="primary" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* User directory */}
        <div className="xl:col-span-2 flex flex-col gap-lg">
          <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden flex flex-col h-[640px]">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
              <div className="flex items-center gap-sm">
                <Icon name="contacts" className="text-primary" size={20} />
                <h3 className="font-headline-lg text-headline-lg text-on-surface">User Directory</h3>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{users.length} total</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant z-10">
                  <tr>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">User</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Roles</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Activity</th>
                    <th className="p-md font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right hidden lg:table-cell">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">
                        {org ? "No members found." : "Sign in to manage users."}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.userId} className="hover:bg-surface-container-low transition-colors align-top">
                        <td className="p-md">
                          <div className="flex items-center gap-md">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-label-md text-xs font-bold bg-secondary-container text-on-secondary-container shrink-0">
                              {u.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-body-md text-body-md font-semibold text-on-surface truncate">
                                {u.name}{u.isSelf && <span className="text-on-surface-variant font-normal"> (you)</span>}
                              </div>
                              <div className="text-[11px] text-on-surface-variant truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-md hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-container/40 text-on-primary-container">
                              {ROLE_LABEL[u.primaryRole] ?? u.primaryRole}
                            </span>
                            {u.extraRoles.map((r) => (
                              <span key={r} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-container-highest text-on-surface-variant">
                                +{ROLE_LABEL[r] ?? r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-md text-right">
                          <div className="inline-flex items-center gap-2 text-[11px] text-on-surface-variant">
                            <span title="Sales" className="flex items-center gap-0.5"><Icon name="point_of_sale" size={13} className="text-primary" />{u.counts.sales}</span>
                            <span title="Purchases" className="flex items-center gap-0.5"><Icon name="local_shipping" size={13} />{u.counts.purchases}</span>
                            <span title="Money movements" className="flex items-center gap-0.5"><Icon name="payments" size={13} />{u.counts.money}</span>
                          </div>
                        </td>
                        <td className="p-md text-right font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap hidden lg:table-cell">{u.lastSeen}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity stream */}
        <div className="xl:col-span-1">
          <ActivityStream events={feed} users={users.map((u) => ({ userId: u.userId, name: u.name }))} currency={currency} />
        </div>
      </div>
    </main>
  );
}

function StatTile({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: "primary" | "secondary" | "tertiary" }) {
  const toneCls =
    tone === "primary" ? "bg-primary/10 text-primary" : tone === "secondary" ? "bg-secondary-container text-on-secondary-container" : "bg-tertiary-container/50 text-on-surface";
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-md flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${toneCls}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="min-w-0">
        <div className="font-headline-lg text-headline-lg text-on-surface leading-tight">{value}</div>
        <div className="text-[11px] text-on-surface-variant uppercase tracking-wide truncate">{label}</div>
      </div>
    </div>
  );
}
