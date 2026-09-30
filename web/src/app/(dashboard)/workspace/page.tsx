import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg, getOrgProfile } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getWarehousesWithStats, getMembers, compactMoney } from "@/lib/data";
import { CompanyProfileForm } from "@/components/settings/CompanyProfileForm";
import { WorkspaceTabs } from "@/components/settings/WorkspaceTabs";

export const metadata = { title: "Company Workspace — Inventory Pro" };

export default async function WorkspacePage() {
  await requireRole(["owner", "admin"]);
  const org = await getActiveOrg();
  const [warehouses, members, profile] = org
    ? await Promise.all([getWarehousesWithStats(org.orgId), getMembers(org.orgId, org.userId), getOrgProfile(org.orgId)])
    : [[], [], null];
  const currency = org?.currency ?? "USD";
  const canManage = org?.role === "owner" || org?.role === "admin";

  const regions = new Set(
    warehouses.map((w) => (w.location ?? "").split(",").pop()?.trim()).filter(Boolean),
  ).size;

  return (
    <main className="flex-1 p-md md:p-gutter max-w-container-max w-full mx-auto pb-xl">
      {/* Header */}
      <div className="mb-gutter flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <div className="flex items-center gap-sm mb-xs text-on-surface-variant font-label-md text-label-md">
            <Icon name="business" size={16} />
            <span>Administration</span>
            <Icon name="chevron_right" size={14} />
            <span className="text-primary">Company Profile</span>
          </div>
          <h2 className="text-headline-xl font-headline-xl text-on-surface mb-xs">{org?.orgName ?? "Workspace"}</h2>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl">
            Manage your organizational structure, branches, and workspace across all locations.
          </p>
        </div>
        <div className="flex gap-sm shrink-0">
          <Link href="/warehouse" className="px-md py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity font-label-md text-label-md flex items-center gap-xs shadow-sm">
            <Icon name="warehouse" size={18} /> Manage Warehouses
          </Link>
        </div>
      </div>

      <WorkspaceTabs
        profile={
          profile ? (
            <div className="pb-md">
              <CompanyProfileForm profile={profile} canManage={canManage} />
            </div>
          ) : (
            <p className="text-body-md text-on-surface-variant">Sign in to manage company profile.</p>
          )
        }
        workspace={
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
            <Kpi icon="storefront" tone="neutral" label="Total Branches" value={String(warehouses.length)} />
            <Kpi icon="groups" tone="positive" label="Active Personnel" value={String(members.length)} />
            <Kpi icon="language" tone="neutral" label="Regions" value={String(Math.max(regions, warehouses.length ? 1 : 0))} />
          </div>

          {/* Branches */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl flex flex-col overflow-hidden relative">
            <div className="p-md border-b border-surface-variant flex items-center justify-between bg-surface-bright">
              <h3 className="text-headline-lg font-headline-lg text-on-surface text-[20px]">Branches &amp; Warehouses</h3>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-variant bg-surface-container-lowest">
                    {["Warehouse", "Location", "Items", "Stock Value", "Status"].map((h) => (
                      <th key={h} className="p-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {warehouses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-lg text-center text-on-surface-variant font-body-sm text-body-sm">
                        {org ? "No warehouses yet." : "Sign in to view branches."}
                      </td>
                    </tr>
                  ) : (
                    warehouses.map((w) => (
                      <tr key={w.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="p-md">
                          <div className="flex items-center gap-sm">
                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${w.isPrimary ? "bg-primary-container/20 text-primary" : "bg-surface-dim text-on-surface-variant"}`}>
                              <Icon name={w.isPrimary ? "apartment" : "warehouse"} size={18} />
                            </div>
                            <p className="text-body-sm font-body-sm font-semibold text-on-surface">{w.name}</p>
                          </div>
                        </td>
                        <td className="p-md text-body-sm font-body-sm text-on-surface-variant">{w.location ?? "—"}</td>
                        <td className="p-md text-body-sm font-body-sm text-on-surface">{w.items.toLocaleString()}</td>
                        <td className="p-md text-body-sm font-body-sm text-on-surface">{compactMoney(w.value, currency)}</td>
                        <td className="p-md">
                          {w.isPrimary ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container/20 text-primary text-[11px] font-semibold tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Primary
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-outline" /> Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: workspace summary + team */}
        <div className="lg:col-span-4 flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden flex flex-col sticky top-[88px]">
            <div className="p-md border-b border-surface-variant bg-surface-bright flex items-center gap-sm">
              <Icon name="badge" className="text-primary" />
              <h3 className="text-headline-lg font-headline-lg text-on-surface text-[18px]">Workspace</h3>
            </div>
            <div className="p-md flex flex-col gap-md">
              <SummaryRow label="Name" value={org?.orgName ?? "—"} />
              <SummaryRow label="Currency" value={org?.currency ?? "—"} />
              <SummaryRow label="Tax Rate" value={org ? `${org.taxRate}%` : "—"} />
              <SummaryRow label="Your Role" value={org?.role ?? "—"} capitalize />
            </div>
            <div className="p-md border-t border-surface-variant">
              <h4 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wide mb-sm">Team ({members.length})</h4>
              <ul className="flex flex-col gap-2">
                {members.slice(0, 6).map((m) => (
                  <li key={m.userId} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-[11px] font-bold">{m.initials}</div>
                    <span className="text-body-sm font-body-sm text-on-surface flex-1 truncate">{m.name}{m.isSelf && <span className="text-on-surface-variant"> (you)</span>}</span>
                    <span className="text-label-md font-label-md text-on-surface-variant capitalize">{m.role}</span>
                  </li>
                ))}
                {members.length === 0 && (
                  <li className="text-body-sm font-body-sm text-on-surface-variant">No members.</li>
                )}
              </ul>
              <Link href="/admin" className="block w-full mt-md py-sm border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors text-center">
                Manage Team
              </Link>
            </div>
          </div>
        </div>
      </div>
        }
      />
    </main>
  );
}

function SummaryRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-label-md font-label-md text-on-surface-variant">{label}</span>
      <span className={`text-body-sm font-body-sm text-on-surface font-medium ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}
