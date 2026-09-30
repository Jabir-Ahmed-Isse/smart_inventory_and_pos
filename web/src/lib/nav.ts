import type { UserRole } from "@/lib/supabase/database.types";

export type NavItem = {
  label: string;
  icon: string;
  href: string;
  /** Roles allowed to see this item. Omit = everyone. */
  roles?: UserRole[];
  /** When true the route isn't built yet — rendered as a non-navigating stub. */
  stub?: boolean;
};

export type NavGroup = {
  /** Section label shown above the group (omit for the top Overview group). */
  title?: string;
  items: NavItem[];
};

// Role sets — keep the nav table readable.
const MGR: UserRole[] = ["owner", "admin", "manager"];
const MGR_ACC: UserRole[] = ["owner", "admin", "manager", "accountant"];
const FIN: UserRole[] = ["owner", "admin", "accountant"];
const ADMIN: UserRole[] = ["owner", "admin"];
const POS: UserRole[] = ["owner", "admin", "manager", "staff", "cashier"];
// Cashiers settle payments, so they see Orders too (but not the Sales dashboard).
const ORDERS: UserRole[] = ["owner", "admin", "manager", "accountant", "cashier"];

/** Grouped primary navigation. `roles` gates visibility; omit = everyone. */
export const navGroups: NavGroup[] = [
  {
    items: [{ label: "Dashboard", icon: "dashboard", href: "/dashboard" }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", icon: "inventory_2", href: "/products" },
      { label: "Categories", icon: "category", href: "/categories", roles: MGR },
      { label: "Brands", icon: "sell", href: "/brands", roles: MGR },
      { label: "Units", icon: "straighten", href: "/units", roles: MGR },
      { label: "Bundles", icon: "widgets", href: "/bundles", roles: MGR },
      { label: "Barcodes", icon: "qr_code_2", href: "/barcodes", roles: MGR },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Warehouses", icon: "warehouse", href: "/warehouse", roles: MGR },
      { label: "Locations", icon: "location_on", href: "/locations", roles: MGR },
      { label: "Stock Movements", icon: "sync_alt", href: "/stock-movements", roles: MGR },
      { label: "Transfers", icon: "swap_horiz", href: "/transfers", roles: MGR },
      { label: "Branch Stock", icon: "inventory", href: "/branch-stock", roles: POS },
      { label: "Stocktake", icon: "fact_check", href: "/stocktake", roles: MGR },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Sales", icon: "trending_up", href: "/sales", roles: MGR_ACC },
      { label: "Point of Sale", icon: "point_of_sale", href: "/pos", roles: POS },
      { label: "Orders", icon: "receipt_long", href: "/orders", roles: ORDERS },
      { label: "Customers", icon: "groups", href: "/customers" },
      { label: "Loyalty", icon: "loyalty", href: "/loyalty", roles: MGR },
      { label: "Sales Returns", icon: "keyboard_return", href: "/sales/returns", roles: MGR_ACC },
    ],
  },
  {
    title: "Purchasing",
    items: [
      { label: "Purchases", icon: "shopping_cart", href: "/purchases", roles: MGR },
      { label: "Suppliers", icon: "storefront", href: "/suppliers", roles: MGR },
      { label: "Requests for Quote", icon: "request_quote", href: "/rfq", roles: MGR },
      { label: "Shipping", icon: "local_shipping", href: "/shipping", roles: MGR },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Human Resources", icon: "groups", href: "/hr", roles: MGR_ACC },
      { label: "Payroll", icon: "payments", href: "/payroll", roles: FIN },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Accounting", icon: "account_balance", href: "/accounting", roles: FIN },
      { label: "Expenses", icon: "receipt_long", href: "/expenses", roles: MGR_ACC },
      { label: "Fixed Assets", icon: "inventory", href: "/assets", roles: FIN },
      { label: "Finance", icon: "payments", href: "/finance", roles: FIN },
      { label: "Reports", icon: "analytics", href: "/reports", roles: MGR_ACC },
    ],
  },
  {
    title: "Intelligence",
    items: [{ label: "AI Intelligence", icon: "psychology", href: "/ai", roles: MGR_ACC }],
  },
  {
    title: "Administration",
    items: [
      { label: "Overview", icon: "admin_panel_settings", href: "/admin", roles: ADMIN },
      { label: "Branches", icon: "store", href: "/branches", roles: ADMIN },
      { label: "Branch Comparison", icon: "leaderboard", href: "/branches/compare", roles: MGR_ACC },
      { label: "Roles & Permissions", icon: "manage_accounts", href: "/roles", roles: ADMIN },
      { label: "Workspace", icon: "business", href: "/workspace", roles: ADMIN },
      { label: "Audit Logs", icon: "receipt_long", href: "/logs", roles: ADMIN },
    ],
  },
];

/** Bottom-anchored secondary navigation. */
export const secondaryNav: NavItem[] = [
  { label: "Settings", icon: "tune", href: "/settings" },
  { label: "Help Center", icon: "help", href: "/help", stub: true },
  { label: "Log Out", icon: "logout", href: "/login" },
];

/** Does a role have access to an item with these `roles`? (undefined = all). */
export function roleCan(effectiveRoles: UserRole[] | undefined, allowed?: UserRole[]): boolean {
  if (!allowed) return true;
  if (!effectiveRoles || effectiveRoles.length === 0) return false;
  if (effectiveRoles.includes("owner")) return true;
  return effectiveRoles.some((r) => allowed.includes(r));
}
