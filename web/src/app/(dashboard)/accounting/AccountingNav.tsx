"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";

const TABS = [
  { label: "Overview", icon: "dashboard", href: "/accounting" },
  { label: "Chart of Accounts", icon: "account_tree", href: "/accounting/chart-of-accounts" },
  { label: "Journal", icon: "menu_book", href: "/accounting/journal" },
  { label: "General Ledger", icon: "list_alt", href: "/accounting/general-ledger" },
  { label: "Trial Balance", icon: "balance", href: "/accounting/trial-balance" },
  { label: "Balance Sheet", icon: "account_balance", href: "/accounting/balance-sheet" },
  { label: "Profit & Loss", icon: "assessment", href: "/accounting/profit-loss" },
  { label: "Budgets", icon: "savings", href: "/accounting/budgets" },
];

export function AccountingNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-16 z-20">
      <div className="max-w-container-max mx-auto px-md md:px-lg">
        <nav className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {TABS.map((t) => {
            const active = t.href === "/accounting" ? pathname === "/accounting" : pathname.startsWith(t.href);
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
