"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

type TabKey = "profile" | "workspace";

export function WorkspaceTabs({ profile, workspace }: { profile: React.ReactNode; workspace: React.ReactNode }) {
  const [tab, setTab] = useState<TabKey>("profile");
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "profile", label: "Company Profile", icon: "corporate_fare" },
    { key: "workspace", label: "Workspace & Branches", icon: "warehouse" },
  ];
  return (
    <div>
      <div className="mb-gutter border-b border-outline-variant">
        <div className="flex gap-1 -mb-px">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 font-label-md text-label-md border-b-2 transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant"
                }`}
              >
                <Icon name={t.icon} size={18} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className={tab === "profile" ? "" : "hidden"}>{profile}</div>
      <div className={tab === "workspace" ? "" : "hidden"}>{workspace}</div>
    </div>
  );
}
