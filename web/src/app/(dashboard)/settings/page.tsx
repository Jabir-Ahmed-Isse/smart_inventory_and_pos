import { getActiveOrg } from "@/lib/org";
import { getProfile } from "@/lib/data";
import { SettingsTabs } from "./SettingsTabs";

export const metadata = { title: "System Settings — Inventory Pro" };

export default async function SettingsPage() {
  const org = await getActiveOrg();
  const profile = org ? await getProfile(org.userId) : { fullName: null, avatarUrl: null };
  const canManage = org?.role === "owner" || org?.role === "admin";

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
        />
      </div>
    </div>
  );
}
