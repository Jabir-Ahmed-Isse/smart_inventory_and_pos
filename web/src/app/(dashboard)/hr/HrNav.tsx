"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";

const TABS = [
  { label: "Overview", icon: "dashboard", href: "/hr" },
  { label: "Employees", icon: "badge", href: "/hr/employees" },
  { label: "Departments", icon: "corporate_fare", href: "/hr/departments" },
  { label: "Leave", icon: "beach_access", href: "/hr/leave" },
  { label: "Attendance", icon: "how_to_reg", href: "/hr/attendance" },
];

export function HrNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-16 z-20">
      <div className="max-w-container-max mx-auto px-md md:px-lg">
        <nav className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {TABS.map((t) => {
            const active = t.href === "/hr" ? pathname === "/hr" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors shrink-0",
                  active
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                )}
              >
                <Icon name={t.icon} size={18} filled={active} />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
