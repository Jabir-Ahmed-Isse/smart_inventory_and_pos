"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";

const TABS = [
  { label: "Overview", icon: "dashboard", href: "/purchases" },
  { label: "Purchase Orders", icon: "shopping_cart", href: "/purchases/orders" },
  { label: "Goods Receiving", icon: "local_shipping", href: "/purchases/receiving" },
  { label: "Suppliers", icon: "storefront", href: "/suppliers" },
  { label: "RFQ", icon: "request_quote", href: "/rfq" },
  { label: "Returns", icon: "keyboard_return", href: "/purchases/returns" },
  { label: "Shipping", icon: "conveyor_belt", href: "/shipping" },
  { label: "Analytics", icon: "analytics", href: "/purchases/analytics" },
];

export function PurchasingNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-16 z-20">
      <div className="max-w-container-max mx-auto px-md md:px-lg">
        <nav className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {TABS.map((t) => {
            const active = t.href === "/purchases" ? pathname === "/purchases" : pathname.startsWith(t.href);
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
