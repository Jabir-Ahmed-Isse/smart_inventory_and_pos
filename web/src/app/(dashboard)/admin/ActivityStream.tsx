"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import type { ActivityEvent, ActivityType } from "@/lib/members/data";

const META: Record<ActivityType, { icon: string; label: string; cls: string }> = {
  sale: { icon: "point_of_sale", label: "Sale", cls: "bg-primary/15 text-primary" },
  purchase: { icon: "local_shipping", label: "Purchase", cls: "bg-tertiary-container/50 text-on-surface" },
  money: { icon: "payments", label: "Money", cls: "bg-secondary-container text-on-secondary-container" },
};

const TYPES: (ActivityType | "all")[] = ["all", "sale", "purchase", "money"];

export function ActivityStream({
  events,
  users,
  currency,
}: {
  events: ActivityEvent[];
  users: { userId: string; name: string }[];
  currency: string;
}) {
  const [user, setUser] = useState<string>("all");
  const [type, setType] = useState<ActivityType | "all">("all");

  const money = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }),
    [currency],
  );

  const filtered = events.filter(
    (e) => (user === "all" || e.userId === user) && (type === "all" || e.type === type),
  );

  return (
    <div className="bg-surface rounded-xl border border-outline-variant flex flex-col h-[640px] overflow-hidden">
      <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
        <div className="flex items-center gap-sm">
          <Icon name="bolt" className="text-primary" size={20} />
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Activity — who did what</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-2 py-1.5 text-xs text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All people</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                type === t ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "all" ? "All" : META[t as ActivityType].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-md">
        {filtered.length === 0 ? (
          <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-10">
            No activity{user !== "all" ? " for this person" : ""} yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((e) => {
              const m = META[e.type];
              return (
                <li key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.cls}`}>
                    <Icon name={m.icon} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-body-sm text-on-surface truncate">
                      <span className="font-semibold">{e.userName}</span> · {e.title}
                    </p>
                    <p className="text-[11px] text-on-surface-variant truncate capitalize">{e.detail} · {e.date}, {e.time}</p>
                  </div>
                  {e.amount != null && (
                    <span className="text-body-sm font-body-sm font-semibold text-on-surface whitespace-nowrap">{money.format(e.amount)}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="px-md py-2 border-t border-outline-variant text-[11px] text-on-surface-variant text-center">
        Showing {filtered.length} of {events.length} recent events
      </div>
    </div>
  );
}
