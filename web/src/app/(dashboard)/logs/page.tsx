import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getAuditLogs, type LogSeverity } from "@/lib/data";

export const metadata = { title: "System Logs & Audit — Inventory Pro" };

const SEV_PILL: Record<LogSeverity, string> = {
  info: "bg-primary-container/30 text-primary",
  warning: "bg-[#fff3e0] text-[#e65100]",
  critical: "bg-[#ffebee] text-[#c62828]",
};

export default async function LogsPage() {
  await requireRole(["owner", "admin"]);
  const org = await getActiveOrg();
  const logs = org ? await getAuditLogs(org.orgId) : [];

  const criticalCount = logs.filter((l) => l.severity === "critical").length;
  const warningCount = logs.filter((l) => l.severity === "warning").length;

  return (
    <main className="p-md md:p-lg max-w-container-max mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-lg">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">System Logs &amp; Audit Trail</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Immutable record of security events and data changes.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded bg-surface-container-highest text-on-surface font-label-md text-label-md hover:bg-outline-variant/50 flex items-center gap-2 transition-colors">
            <Icon name="download" size={18} /> Export Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Summary widgets */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <SummaryWidget label="Critical Events" icon="dangerous" value={String(criticalCount)} valueCls={criticalCount > 0 ? "text-error" : "text-primary"} note="Recent window" />
          <SummaryWidget label="Warnings" icon="warning" value={String(warningCount)} note="Recent window" />
          <SummaryWidget label="Total Entries" icon="receipt_long" value={String(logs.length)} note="Most recent shown" />
        </div>

        {/* Log area */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
          {/* Table */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/30">
                    {["Timestamp", "Severity", "User", "Action", "IP Address"].map((h) => (
                      <th key={h} className="font-label-md text-label-md text-on-surface-variant py-3 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 px-4 text-center text-on-surface-variant">
                        {org ? "No audit log entries yet." : "Sign in to view audit logs."}
                      </td>
                    </tr>
                  ) : (
                    logs.map((l) => (
                      <tr key={l.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-on-surface-variant whitespace-nowrap">{l.date} · {l.time}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${SEV_PILL[l.severity]}`}>{l.severity}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold">{l.userInitials}</div>
                            {l.userName}
                          </div>
                        </td>
                        <td className={`py-3 px-4 max-w-[280px] ${l.severity === "critical" ? "text-error font-medium" : ""}`} title={l.action}>{l.action}</td>
                        <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">{l.ipAddress ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-outline-variant/30 flex justify-between items-center text-sm text-on-surface-variant">
              <span>Showing {logs.length} most recent {logs.length === 1 ? "entry" : "entries"}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryWidget({
  label,
  icon,
  value,
  valueCls,
  note,
}: {
  label: string;
  icon: string;
  value: string;
  valueCls?: string;
  note: string;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-md shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
        <Icon name={icon} size={20} className="text-primary" />
      </div>
      <div className={`font-headline-xl text-headline-xl text-on-surface ${valueCls ?? ""}`}>{value}</div>
      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 text-xs">{note}</p>
    </div>
  );
}
