"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { SettingsForm } from "./SettingsForm";
import { ProfileForm } from "./ProfileForm";
import { AiReportsTab } from "./AiReportsTab";
import type { ReportSettings } from "@/lib/reports/agent/settings";

type Tab = "profile" | "workspace" | "reports" | "preferences";
const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "profile", icon: "person", label: "Profile" },
  { key: "workspace", icon: "tune", label: "Workspace" },
  { key: "reports", icon: "smart_toy", label: "AI Reports" },
  { key: "preferences", icon: "palette", label: "Preferences" },
];

export function SettingsTabs({
  org,
  profile,
  canManage,
  reportSettings,
  timezone,
}: {
  org: { name: string; currency: string; taxRate: number; role: string } | null;
  profile: { name: string; avatarUrl: string | null };
  canManage: boolean;
  reportSettings: ReportSettings;
  timezone: string;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg lg:gap-xl items-start">
      {/* Nav */}
      <div className="lg:col-span-3 lg:sticky lg:top-6">
        <nav className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-sm px-md py-3 rounded-xl font-body-md text-body-md transition-colors whitespace-nowrap ${tab === t.key ? "bg-surface shadow-sm border border-outline-variant/30 text-primary font-medium" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent"}`}
            >
              <Icon name={t.icon} filled={tab === t.key} className={tab === t.key ? "text-primary" : ""} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="lg:col-span-9 space-y-xl">
        {tab === "profile" && (
          <Card title="Your Profile" subtitle="How you appear across the workspace.">
            <ProfileForm name={profile.name} avatarUrl={profile.avatarUrl} />
          </Card>
        )}

        {tab === "reports" && (
          <AiReportsTab settings={reportSettings} canManage={canManage} timezone={timezone} />
        )}

        {tab === "workspace" && (
          <>
            <Card title="General Information" subtitle={`Configure your organization.${!canManage ? " Only owners and admins can edit these." : ""}`}>
              {org ? (
                <SettingsForm name={org.name} currency={org.currency} taxRate={org.taxRate} canManage={canManage} />
              ) : (
                <div className="p-lg text-on-surface-variant font-body-sm text-body-sm">Sign in to manage settings.</div>
              )}
            </Card>
            <Card title="Workspace" subtitle="Your current plan and identifiers.">
              <div className="p-lg grid grid-cols-1 md:grid-cols-3 gap-lg">
                <Fact icon="badge" label="Your Role" value={org?.role ?? "—"} />
                <Fact icon="payments" label="Currency" value={org?.currency ?? "—"} />
                <Fact icon="percent" label="Tax Rate" value={org ? `${org.taxRate}%` : "—"} />
              </div>
            </Card>
          </>
        )}

        {tab === "preferences" && (
          <Card title="Preferences" subtitle="Appearance and notification preferences (saved on this device).">
            <div className="p-lg space-y-md">
              <PrefRow icon="dark_mode" title="Theme" desc="Follows your system light/dark setting automatically." control={<span className="font-label-md text-label-md text-on-surface-variant">System</span>} />
              <PrefToggle icon="notifications" title="Low-stock alerts" desc="Highlight products that need reordering." defaultOn />
              <PrefToggle icon="mail" title="Email summaries" desc="Requires connecting an email service." disabled />
              <PrefToggle icon="volume_up" title="Sound on new sale" desc="Play a chime at the POS on checkout." />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden">
      <div className="p-lg border-b border-outline-variant/30 bg-surface-bright">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">{title}</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="border border-outline-variant/40 rounded-2xl p-md bg-surface-bright flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center"><Icon name={icon} /></div>
      <div>
        <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</p>
        <p className="font-body-md text-body-md text-on-surface capitalize">{value}</p>
      </div>
    </div>
  );
}
function PrefRow({ icon, title, desc, control }: { icon: string; title: string; desc: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-outline-variant/40 rounded-xl p-md bg-surface-bright">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center"><Icon name={icon} /></div>
        <div><p className="font-body-md text-body-md text-on-surface">{title}</p><p className="font-body-sm text-body-sm text-on-surface-variant">{desc}</p></div>
      </div>
      {control}
    </div>
  );
}
function PrefToggle({ icon, title, desc, defaultOn, disabled }: { icon: string; title: string; desc: string; defaultOn?: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <PrefRow icon={icon} title={title} desc={desc} control={
      <button type="button" disabled={disabled} onClick={() => setOn((v) => !v)} className={`relative w-11 h-6 rounded-full transition-colors ${on && !disabled ? "bg-primary" : "bg-surface-variant"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${on && !disabled ? "translate-x-5" : ""}`} />
      </button>
    } />
  );
}
