import { getActiveOrg, getOrgProfile } from "@/lib/org";
import { getProfile } from "@/lib/data";
import { getReportSettings, DEFAULT_REPORT_SETTINGS, toClientSettings } from "@/lib/reports/agent/settings";
import { SettingsTabs } from "./SettingsTabs";

export const metadata = { title: "System Settings — Inventory Pro" };

export default async function SettingsPage() {
  const org = await getActiveOrg();
  const [profile, reportSettings, orgProfile] = org
    ? await Promise.all([getProfile(org.userId), getReportSettings(org.orgId), getOrgProfile(org.orgId)])
    : [{ fullName: null, avatarUrl: null }, DEFAULT_REPORT_SETTINGS, null];
  const canManage = org?.role === "owner" || org?.role === "admin";
  const timezone = orgProfile?.timezone || "UTC";

  return (
    <div className="flex-1 overflow-y-auto bg-surface-container-low p-md md:p-lg lg:p-xl relative">
      <div className="mb-lg max-w-container-max mx-auto">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          Manage your profile, workspace preferences and organizational data.
        </p>
      </div>

      <div className="max-w-container-max mx-auto">
        <SettingsTabs
          org={org ? { name: org.orgName, currency: org.currency, taxRate: org.taxRate, role: org.role } : null}
          profile={{ name: profile.fullName ?? "", avatarUrl: profile.avatarUrl }}
          canManage={!!canManage}
          reportSettings={toClientSettings(reportSettings)}
          timezone={timezone}
        />
      </div>
    </div>
  );
}
