"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/Icon";

const TABS = [
  { label: "Overview", icon: "dashboard", href: "/finance" },
  { label: "Transactions", icon: "receipt_long", href: "/finance/transactions" },
  { label: "Income", icon: "trending_up", href: "/finance/income" },
  { label: "Expenses", icon: "trending_down", href: "/finance/expenses" },
  { label: "Cash & Bank", icon: "account_balance", href: "/finance/cash-bank" },
  { label: "Invoices", icon: "description", href: "/finance/invoices" },
  { label: "Payments", icon: "payments", href: "/finance/payments" },
  { label: "Receivables", icon: "call_received", href: "/finance/receivables" },
  { label: "Payables", icon: "call_made", href: "/finance/payables" },
  { label: "Profit & Loss", icon: "assessment", href: "/finance/profit-loss" },
  { label: "Cash Flow", icon: "waterfall_chart", href: "/finance/cash-flow" },
  { label: "AI Insights", icon: "auto_awesome", href: "/finance/ai-insights" },
];

export function FinanceNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-16 z-20">
      <div className="max-w-container-max mx-auto px-md md:px-lg">
        <nav className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {TABS.map((t) => {
            const active = t.href === "/finance" ? pathname === "/finance" : pathname.startsWith(t.href);
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
