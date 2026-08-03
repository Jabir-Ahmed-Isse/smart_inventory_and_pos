"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";

const TABS = [
  { label: "Overview", icon: "dashboard", href: "/sales" },
  { label: "Point of Sale", icon: "point_of_sale", href: "/pos" },
  { label: "Orders", icon: "receipt_long", href: "/orders" },
  { label: "Customers", icon: "groups", href: "/customers" },
  { label: "Loyalty", icon: "loyalty", href: "/loyalty" },
  { label: "Returns", icon: "keyboard_return", href: "/sales/returns" },
  { label: "Analytics", icon: "analytics", href: "/sales/analytics" },
];

export function SalesNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-16 z-20">
      <div className="max-w-container-max mx-auto px-md md:px-lg">
        <nav className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {TABS.map((t) => {
            const active = t.href === "/sales" ? pathname === "/sales" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors shrink-0",
                  active ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
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
