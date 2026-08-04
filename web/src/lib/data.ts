import { createClient } from "@/lib/supabase/server";

export type StockStatus = "in" | "low" | "out";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  brand: string;
  qty: number;
  minStock: number;
  status: StockStatus;
  bar: number; // 0-100 for the stock-level bar
  imageUrl: string | null;
};

type RawProduct = {
  id: string;
  name: string;
  sku: string;
  retail_price: number;
  min_stock: number;
  image_url: string | null;
  categories: { name: string } | null;
  brands: { name: string } | null;
  inventory_levels: { quantity: number }[] | null;
};

function deriveStatus(qty: number, minStock: number): StockStatus {
  if (qty <= 0) return "out";
  if (qty <= minStock) return "low";
  return "in";
}

/** All products for an org with total on-hand quantity + derived stock status. */
export async function getProductsWithStock(orgId: string): Promise<ProductRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, sku, retail_price, min_stock, image_url, categories(name), brands(name), inventory_levels(quantity)",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as RawProduct[];

  return rows.map((p) => {
    const qty = (p.inventory_levels ?? []).reduce(
      (sum, l) => sum + (l.quantity ?? 0),
      0,
    );
    const status = deriveStatus(qty, p.min_stock);
    const target = Math.max(p.min_stock * 3, 1);
    const bar = status === "out" ? 0 : Math.min(100, Math.round((qty / target) * 100));
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.retail_price,
      category: p.categories?.name ?? "—",
      brand: p.brands?.name ?? "—",
      qty,
      minStock: p.min_stock,
      status,
      bar,
      imageUrl: p.image_url,
    };
  });
}

export type ProductStats = { total: number; low: number; out: number };

export function computeProductStats(rows: ProductRow[]): ProductStats {
  return {
    total: rows.length,
    low: rows.filter((r) => r.status === "low").length,
    out: rows.filter((r) => r.status === "out").length,
  };
}

export type DashboardMetrics = {
  productCount: number;
  customerCount: number;
  lowStockCount: number;
  inventoryValue: number;
  netProfit: number;
  lowStockItems: ProductRow[];
  topProducts: (ProductRow & { value: number })[];
};

/** Aggregate metrics for the executive dashboard, derived from live org data. */
export async function getDashboardMetrics(orgId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();

  const [products, customersRes, txnRes] = await Promise.all([
    getProductsWithStock(orgId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("transactions")
      .select("type, amount")
      .eq("organization_id", orgId),
  ]);

  const inventoryValue = products.reduce((sum, p) => sum + p.qty * p.price, 0);
  const lowStockItems = products.filter(
    (p) => p.status === "low" || p.status === "out",
  );
  const topProducts = products
    .map((p) => ({ ...p, value: p.qty * p.price }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const txns = (txnRes.data ?? []) as { type: "income" | "expense"; amount: number }[];
  const netProfit = txns.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0,
  );

  return {
    productCount: products.length,
    customerCount: customersRes.count ?? 0,
    lowStockCount: lowStockItems.length,
    inventoryValue,
    netProfit,
    lowStockItems: lowStockItems.slice(0, 3),
    topProducts,
  };
}

/** Currency formatting that respects the org currency. */
export function money(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function compactMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  segment: string | null;
  loyaltyPoints: number;
  creditLimit: number;
};

export async function getCustomers(orgId: string): Promise<CustomerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name, email, phone, segment, loyalty_points, credit_limit")
    .eq("organization_id", orgId)
    .order("loyalty_points", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    segment: c.segment,
    loyaltyPoints: c.loyalty_points,
    creditLimit: c.credit_limit,
  }));
}

// ---------------------------------------------------------------------------
// Warehouses (with aggregated inventory)
// ---------------------------------------------------------------------------
export type WarehouseRow = {
  id: string;
  name: string;
  location: string | null;
  isPrimary: boolean;
  items: number;
  value: number;
  capacity: number; // 0-100 illustrative utilization
};

export async function getWarehousesWithStats(orgId: string): Promise<WarehouseRow[]> {
  const supabase = await createClient();
  const [whRes, invRes] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id, name, location, is_primary")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("inventory_levels")
      .select("warehouse_id, quantity, products(retail_price)")
      .eq("organization_id", orgId),
  ]);

  const inv = (invRes.data ?? []) as unknown as {
    warehouse_id: string;
    quantity: number;
    products: { retail_price: number } | null;
  }[];

  const byWh = new Map<string, { items: number; value: number }>();
  for (const l of inv) {
    const agg = byWh.get(l.warehouse_id) ?? { items: 0, value: 0 };
    agg.items += l.quantity ?? 0;
    agg.value += (l.quantity ?? 0) * (l.products?.retail_price ?? 0);
    byWh.set(l.warehouse_id, agg);
  }

  return (whRes.data ?? []).map((w) => {
    const agg = byWh.get(w.id) ?? { items: 0, value: 0 };
    return {
      id: w.id,
      name: w.name,
      location: w.location,
      isPrimary: w.is_primary,
      items: agg.items,
      value: agg.value,
      capacity: Math.min(100, Math.round((agg.items / 2000) * 100)),
    };
  });
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
export type TransactionRow = {
  id: string;
  date: string;
  description: string | null;
  category: string | null;
  amount: number;
  type: "income" | "expense";
};

export type FinanceData = {
  income: number;
  expenses: number;
  net: number;
  transactions: TransactionRow[];
  breakdown: { category: string; amount: number; pct: number }[];
};

export async function getFinance(orgId: string): Promise<FinanceData> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, created_at, description, category, amount, type")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as {
    id: string;
    created_at: string;
    description: string | null;
    category: string | null;
    amount: number;
    type: "income" | "expense";
  }[];

  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expenses = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  const expenseByCat = new Map<string, number>();
  for (const r of rows.filter((r) => r.type === "expense")) {
    const cat = r.category ?? "Other";
    expenseByCat.set(cat, (expenseByCat.get(cat) ?? 0) + r.amount);
  }
  const breakdown = [...expenseByCat.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      pct: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    income,
    expenses,
    net: income - expenses,
    transactions: rows.map((r) => ({
      id: r.id,
      date: new Date(r.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      description: r.description,
      category: r.category,
      amount: r.amount,
      type: r.type,
    })),
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
export type SupplierRow = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentTerms: string | null;
};

export async function getSuppliers(orgId: string): Promise<SupplierRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("id, name, contact_name, email, phone, address, payment_terms")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    contactName: s.contact_name,
    email: s.email,
    phone: s.phone,
    address: s.address,
    paymentTerms: s.payment_terms,
  }));
}

// ---------------------------------------------------------------------------
// Lightweight option lists (for form selects / mutations)
// ---------------------------------------------------------------------------
export type Option = { id: string; name: string };
export type WarehouseOption = { id: string; name: string; location: string | null };

// ---------------------------------------------------------------------------
// Current user's profile (name + avatar)
// ---------------------------------------------------------------------------
export async function getProfile(userId: string): Promise<{ fullName: string | null; avatarUrl: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return { fullName: data?.full_name ?? null, avatarUrl: data?.avatar_url ?? null };
}

export async function getCategoryOptions(orgId: string): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getBrandOptions(orgId: string): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getWarehouseOptions(orgId: string): Promise<WarehouseOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("warehouses")
    .select("id, name, location")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getSupplierOptions(orgId: string): Promise<Option[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getProductOptions(
  orgId: string,
): Promise<(Option & { sku: string; price: number })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, retail_price")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.retail_price }));
}

// ---------------------------------------------------------------------------
// Catalog config: categories, brands, units
// ---------------------------------------------------------------------------
export type CategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  parentId: string | null;
  parentName: string | null;
  status: "active" | "inactive";
  productCount: number;
};

export async function getCategories(orgId: string): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const [catRes, prodRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, parent_id, status")
      .eq("organization_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("category_id")
      .eq("organization_id", orgId),
  ]);

  const counts = new Map<string, number>();
  for (const p of prodRes.data ?? []) {
    if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }
  const cats = catRes.data ?? [];
  const nameById = new Map(cats.map((c) => [c.id, c.name] as const));

  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    parentName: c.parent_id ? nameById.get(c.parent_id) ?? null : null,
    status: c.status,
    productCount: counts.get(c.id) ?? 0,
  }));
}

export type BrandRow = {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  status: "active" | "inactive";
  productCount: number;
};

export async function getBrands(orgId: string): Promise<BrandRow[]> {
  const supabase = await createClient();
  const [brandRes, prodRes] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, website, logo_url, status")
      .eq("organization_id", orgId)
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("brand_id")
      .eq("organization_id", orgId),
  ]);

  const counts = new Map<string, number>();
  for (const p of prodRes.data ?? []) {
    if (p.brand_id) counts.set(p.brand_id, (counts.get(p.brand_id) ?? 0) + 1);
  }

  return (brandRes.data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    website: b.website,
    logoUrl: b.logo_url,
    status: b.status,
    productCount: counts.get(b.id) ?? 0,
  }));
}

export type UnitRow = {
  id: string;
  name: string;
  code: string;
  baseUnit: boolean;
};

export async function getUnits(orgId: string): Promise<UnitRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id, name, code, base_unit")
    .eq("organization_id", orgId)
    .order("base_unit", { ascending: false })
    .order("name", { ascending: true });
  return (data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    code: u.code,
    baseUnit: u.base_unit,
  }));
}

// ---------------------------------------------------------------------------
// Single product (for the edit form)
// ---------------------------------------------------------------------------
export type ProductEdit = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  costPrice: number;
  retailPrice: number;
  taxRate: number;
  minStock: number;
  reorderPoint: number;
  categoryId: string | null;
  brandId: string | null;
  stock: Record<string, number>; // warehouseId -> quantity
};

export async function getProductById(orgId: string, id: string): Promise<ProductEdit | null> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select(
      "id, name, sku, barcode, description, image_url, cost_price, retail_price, tax_rate, min_stock, reorder_point, category_id, brand_id",
    )
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const { data: levels } = await supabase
    .from("inventory_levels")
    .select("warehouse_id, quantity")
    .eq("organization_id", orgId)
    .eq("product_id", id);

  const stock: Record<string, number> = {};
  for (const l of levels ?? []) stock[l.warehouse_id] = l.quantity;

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    description: p.description,
    imageUrl: p.image_url,
    costPrice: p.cost_price,
    retailPrice: p.retail_price,
    taxRate: p.tax_rate,
    minStock: p.min_stock,
    reorderPoint: p.reorder_point,
    categoryId: p.category_id,
    brandId: p.brand_id,
    stock,
  };
}

// ---------------------------------------------------------------------------
// Profiles helper (user_id -> display name), since movements/logs reference
// auth.users with no direct FK to public.profiles.
// ---------------------------------------------------------------------------
async function getProfileNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.full_name ?? "User"] as const));
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Stock movements (audit trail)
// ---------------------------------------------------------------------------
export type MovementType = "receiving" | "sale" | "transfer" | "adjustment" | "damage" | "lost" | "return";

export type MovementRow = {
  id: string;
  date: string;
  time: string;
  productName: string;
  sku: string;
  warehouseName: string;
  type: MovementType;
  quantity: number;
  reference: string | null;
  userName: string;
  userInitials: string;
};

export async function getStockMovements(orgId: string, limit = 100): Promise<MovementRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stock_movements")
    .select("id, type, quantity, reference, created_at, user_id, products(name, sku), warehouses(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as {
    id: string;
    type: MovementType;
    quantity: number;
    reference: string | null;
    created_at: string;
    user_id: string | null;
    products: { name: string; sku: string } | null;
    warehouses: { name: string } | null;
  }[];

  const names = await getProfileNames(rows.map((r) => r.user_id ?? ""));

  return rows.map((r) => {
    const userName = r.user_id ? names.get(r.user_id) ?? "User" : "System";
    return {
      id: r.id,
      date: fmtDate(r.created_at),
      time: fmtTime(r.created_at),
      productName: r.products?.name ?? "—",
      sku: r.products?.sku ?? "—",
      warehouseName: r.warehouses?.name ?? "—",
      type: r.type,
      quantity: r.quantity,
      reference: r.reference,
      userName,
      userInitials: userName === "System" ? "SYS" : initialsOf(userName),
    };
  });
}

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------
export type LogSeverity = "info" | "warning" | "critical";
export type LogRow = {
  id: string;
  date: string;
  time: string;
  action: string;
  severity: LogSeverity;
  ipAddress: string | null;
  userName: string;
  userInitials: string;
};

export async function getAuditLogs(orgId: string, limit = 100): Promise<LogRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, severity, ip_address, created_at, user_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as {
    id: string;
    action: string;
    severity: LogSeverity;
    ip_address: string | null;
    created_at: string;
    user_id: string | null;
  }[];

  const names = await getProfileNames(rows.map((r) => r.user_id ?? ""));

  return rows.map((r) => {
    const userName = r.user_id ? names.get(r.user_id) ?? "User" : "System";
    return {
      id: r.id,
      date: fmtDate(r.created_at),
      time: fmtTime(r.created_at),
      action: r.action,
      severity: r.severity,
      ipAddress: r.ip_address,
      userName,
      userInitials: userName === "System" ? "SYS" : initialsOf(userName),
    };
  });
}

// ---------------------------------------------------------------------------
// Members / roles
// ---------------------------------------------------------------------------
export type MemberRole = "owner" | "admin" | "manager" | "staff" | "cashier" | "accountant";
export type MemberRow = {
  userId: string;
  name: string;
  initials: string;
  role: MemberRole;
  joined: string;
  isSelf: boolean;
};

export async function getMembers(orgId: string, selfId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as { user_id: string; role: MemberRole; created_at: string }[];
  const names = await getProfileNames(rows.map((r) => r.user_id));

  return rows.map((r) => {
    const name = names.get(r.user_id) ?? "Member";
    return {
      userId: r.user_id,
      name,
      initials: initialsOf(name),
      role: r.role,
      joined: fmtDate(r.created_at),
      isSelf: r.user_id === selfId,
    };
  });
}

// ---------------------------------------------------------------------------
// Barcodes (derived from products)
// ---------------------------------------------------------------------------
export type BarcodeRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
};

export async function getProductBarcodes(orgId: string): Promise<BarcodeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, barcode, retail_price")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    price: p.retail_price,
  }));
}

// ---------------------------------------------------------------------------
// Inventory levels (per product per warehouse) — stocktake / transfers
// ---------------------------------------------------------------------------
export type InventoryLevelRow = {
  id: string;
  productName: string;
  sku: string;
  warehouseName: string;
  quantity: number;
};

export async function getInventoryLevels(orgId: string, limit = 200): Promise<InventoryLevelRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_levels")
    .select("id, quantity, products(name, sku), warehouses(name)")
    .eq("organization_id", orgId)
    .order("quantity", { ascending: true })
    .limit(limit);

  const rows = (data ?? []) as unknown as {
    id: string;
    quantity: number;
    products: { name: string; sku: string } | null;
    warehouses: { name: string } | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    productName: r.products?.name ?? "—",
    sku: r.products?.sku ?? "—",
    warehouseName: r.warehouses?.name ?? "—",
    quantity: r.quantity,
  }));
}

// ---------------------------------------------------------------------------
// Purchase orders (RFQ / purchasing)
// ---------------------------------------------------------------------------
export type PurchaseStatus = "draft" | "pending" | "received" | "partial" | "overdue" | "cancelled";
export type PurchaseOrderRow = {
  id: string;
  poNumber: string;
  supplierName: string;
  status: PurchaseStatus;
  total: number;
  date: string;
};

export async function getPurchaseOrders(orgId: string, limit = 100): Promise<PurchaseOrderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, total, created_at, suppliers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as {
    id: string;
    po_number: string;
    status: PurchaseStatus;
    total: number;
    created_at: string;
    suppliers: { name: string } | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    poNumber: r.po_number,
    supplierName: r.suppliers?.name ?? "Unassigned",
    status: r.status,
    total: r.total,
    date: fmtDate(r.created_at),
  }));
}

// ---------------------------------------------------------------------------
// Reports (aggregate analytics across sales / inventory / finance)
// ---------------------------------------------------------------------------
export type ReportsData = {
  revenue: number;
  orders: number;
  unitsSold: number;
  avgOrderValue: number;
  inventoryValue: number;
  lowStockCount: number;
  income: number;
  expenses: number;
  net: number;
  topProducts: { name: string; sku: string; value: number; qty: number }[];
  lowStock: { name: string; sku: string; qty: number; minStock: number }[];
  expenseBreakdown: { category: string; amount: number; pct: number }[];
};

export async function getReportsData(orgId: string): Promise<ReportsData> {
  const supabase = await createClient();

  const [products, finance, ordersRes, itemsRes] = await Promise.all([
    getProductsWithStock(orgId),
    getFinance(orgId),
    supabase
      .from("sales_orders")
      .select("total, status")
      .eq("organization_id", orgId),
    supabase
      .from("sales_order_items")
      .select("quantity")
      .eq("organization_id", orgId),
  ]);

  const orders = (ordersRes.data ?? []).filter((o) => o.status !== "cancelled");
  const revenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const unitsSold = (itemsRes.data ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0);

  const inventoryValue = products.reduce((s, p) => s + p.qty * p.price, 0);
  const topProducts = products
    .map((p) => ({ name: p.name, sku: p.sku, value: p.qty * p.price, qty: p.qty }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const lowStock = products
    .filter((p) => p.status === "low" || p.status === "out")
    .map((p) => ({ name: p.name, sku: p.sku, qty: p.qty, minStock: p.minStock }))
    .slice(0, 5);

  return {
    revenue,
    orders: orders.length,
    unitsSold,
    avgOrderValue: orders.length ? revenue / orders.length : 0,
    inventoryValue,
    lowStockCount: products.filter((p) => p.status === "low" || p.status === "out").length,
    income: finance.income,
    expenses: finance.expenses,
    net: finance.net,
    topProducts,
    lowStock,
    expenseBreakdown: finance.breakdown.slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// Sales orders (with due/pending tracking)
// ---------------------------------------------------------------------------
export type SalesStatus = "draft" | "processing" | "completed" | "refunded" | "cancelled";
export type SalesPayment = "cash" | "card" | "mobile" | "credit" | "bank" | null;

export type SalesOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: SalesStatus;
  paymentMethod: SalesPayment;
  date: string;
  time: string;
  paidAmount: number; // sum of income recorded against this order
  dueAmount: number; // remaining balance owed
  paid: boolean; // fully settled (nothing left owed)
  isDue: boolean; // still owes something (fully or partially unpaid)
  partiallyPaid: boolean; // some money in, but not the whole total
};

export async function getSalesOrders(orgId: string, limit = 100): Promise<SalesOrderRow[]> {
  const supabase = await createClient();
  const [ordersRes, txRes] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("id, order_number, total, status, payment_method, created_at, customers(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit),
    // Source of truth for payments: income transactions referencing the order.
    // Summed per order so partial settlements accumulate.
    supabase
      .from("transactions")
      .select("reference, amount")
      .eq("organization_id", orgId)
      .eq("type", "income"),
  ]);

  const paidByRef = new Map<string, number>();
  for (const t of txRes.data ?? []) {
    if (!t.reference) continue;
    paidByRef.set(t.reference, (paidByRef.get(t.reference) ?? 0) + Number(t.amount));
  }

  const rows = (ordersRes.data ?? []) as unknown as {
    id: string;
    order_number: string;
    total: number;
    status: SalesStatus;
    payment_method: SalesPayment;
    created_at: string;
    customers: { name: string } | null;
  }[];

  return rows.map((r) => {
    const paidAmount = Math.round((paidByRef.get(r.order_number) ?? 0) * 100) / 100;
    const dueAmount = Math.max(0, Math.round((r.total - paidAmount) * 100) / 100);
    const settled = r.status !== "cancelled" && r.status !== "refunded";
    const paid = settled && dueAmount <= 0.005;
    const isDue = settled && dueAmount > 0.005;
    return {
      id: r.id,
      orderNumber: r.order_number,
      customerName: r.customers?.name ?? "Walk-in",
      total: r.total,
      status: r.status,
      paymentMethod: r.payment_method,
      date: fmtDate(r.created_at),
      time: fmtTime(r.created_at),
      paidAmount,
      dueAmount,
      paid,
      isDue,
      partiallyPaid: isDue && paidAmount > 0.005,
    };
  });
}

// ---------------------------------------------------------------------------
// Single sales order — items + payment history
// ---------------------------------------------------------------------------
export type OrderItemRow = {
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
export type OrderPayment = {
  id: string;
  amount: number;
  date: string;
  time: string;
  description: string | null;
  accountName: string | null;
};
export type SalesOrderDetail = {
  id: string;
  orderNumber: string;
  status: SalesStatus;
  paymentMethod: SalesPayment;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  date: string;
  time: string;
  customer: { name: string; phone: string | null; email: string | null } | null;
  warehouseName: string | null;
  items: OrderItemRow[];
  payments: OrderPayment[];
  paidAmount: number;
  dueAmount: number;
  paid: boolean;
  isDue: boolean;
  partiallyPaid: boolean;
};

export async function getSalesOrderDetail(orgId: string, id: string): Promise<SalesOrderDetail | null> {
  const supabase = await createClient();

  const { data: o } = await supabase
    .from("sales_orders")
    .select(
      "id, order_number, status, payment_method, subtotal, discount, tax, total, created_at, customers(name, phone, email), warehouses(name), sales_order_items(quantity, unit_price, line_total, products(name, sku))",
    )
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!o) return null;

  // Payments = income transactions referencing this order. Tolerate a missing
  // account_id column (pre-migration) by retrying without it.
  let payRows: { id: string; amount: number; created_at: string; description: string | null; account_id: string | null }[] = [];
  const payWithAcc = await supabase
    .from("transactions")
    .select("id, amount, created_at, description, account_id")
    .eq("organization_id", orgId)
    .eq("type", "income")
    .eq("reference", o.order_number)
    .order("created_at", { ascending: true });
  if (payWithAcc.error) {
    const payNoAcc = await supabase
      .from("transactions")
      .select("id, amount, created_at, description")
      .eq("organization_id", orgId)
      .eq("type", "income")
      .eq("reference", o.order_number)
      .order("created_at", { ascending: true });
    payRows = (payNoAcc.data ?? []).map((t) => ({ ...t, account_id: null }));
  } else {
    payRows = payWithAcc.data ?? [];
  }

  const accById = new Map<string, string>();
  const accRes = await supabase.from("payment_accounts").select("id, name").eq("organization_id", orgId);
  if (!accRes.error) for (const a of accRes.data ?? []) accById.set(a.id, a.name);

  const customer = Array.isArray(o.customers) ? o.customers[0] : o.customers;
  const warehouse = Array.isArray(o.warehouses) ? o.warehouses[0] : o.warehouses;
  const items: OrderItemRow[] = (o.sales_order_items ?? []).map((li) => {
    const p = Array.isArray(li.products) ? li.products[0] : li.products;
    return {
      name: p?.name ?? "—",
      sku: p?.sku ?? null,
      quantity: li.quantity,
      unitPrice: li.unit_price,
      lineTotal: li.line_total,
    };
  });

  const paidAmount = Math.round(payRows.reduce((s, t) => s + Number(t.amount), 0) * 100) / 100;
  const dueAmount = Math.max(0, Math.round((o.total - paidAmount) * 100) / 100);
  const settled = o.status !== "cancelled" && o.status !== "refunded";
  const paid = settled && dueAmount <= 0.005;
  const isDue = settled && dueAmount > 0.005;

  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    paymentMethod: o.payment_method,
    subtotal: o.subtotal,
    discount: o.discount,
    tax: o.tax,
    total: o.total,
    createdAt: o.created_at,
    date: fmtDate(o.created_at),
    time: fmtTime(o.created_at),
    customer: customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null,
    warehouseName: warehouse?.name ?? null,
    items,
    payments: payRows.map((t) => ({
      id: t.id,
      amount: t.amount,
      date: fmtDate(t.created_at),
      time: fmtTime(t.created_at),
      description: t.description,
      accountName: t.account_id ? accById.get(t.account_id) ?? null : null,
    })),
    paidAmount,
    dueAmount,
    paid,
    isDue,
    partiallyPaid: isDue && paidAmount > 0.005,
  };
}

// ---------------------------------------------------------------------------
// Dashboard charts (revenue trend + inventory distribution)
// ---------------------------------------------------------------------------
export type ChartData = {
  revenue: { labels: string[]; values: number[] };
  inventory: { label: string; units: number; color: string }[];
  totalUnits: number;
};

const DONUT_COLORS = ["#006c49", "#0058be", "#ffb95f", "#8a5cf6", "#dde4dd"];

export async function getDashboardCharts(orgId: string): Promise<ChartData> {
  const supabase = await createClient();

  // Last 7 days revenue, bucketed by day.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const [ordersRes, products] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("total, status, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", start.toISOString()),
    getProductsWithStock(orgId),
  ]);

  const days: { key: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
    });
  }
  const byDay = new Map(days.map((d) => [d.key, 0]));
  for (const o of ordersRes.data ?? []) {
    if (o.status === "cancelled") continue;
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + (o.total ?? 0));
  }

  // Inventory units by category (top 4 + Other).
  const byCat = new Map<string, number>();
  let totalUnits = 0;
  for (const p of products) {
    totalUnits += p.qty;
    const cat = p.category && p.category !== "—" ? p.category : "Uncategorized";
    byCat.set(cat, (byCat.get(cat) ?? 0) + p.qty);
  }
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 4);
  const otherUnits = sorted.slice(4).reduce((s, [, u]) => s + u, 0);
  const inventory = top.map(([label, units], i) => ({ label, units, color: DONUT_COLORS[i] }));
  if (otherUnits > 0) inventory.push({ label: "Other", units: otherUnits, color: DONUT_COLORS[4] });

  return {
    revenue: {
      labels: days.map((d) => d.label),
      values: days.map((d) => Math.round(byDay.get(d.key) ?? 0)),
    },
    inventory,
    totalUnits,
  };
}

// ---------------------------------------------------------------------------
// Today's sales (dashboard KPI)
// ---------------------------------------------------------------------------
export async function getTodaySales(orgId: string): Promise<{ total: number; count: number }> {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("sales_orders")
    .select("total, status")
    .eq("organization_id", orgId)
    .gte("created_at", start.toISOString());

  const rows = (data ?? []).filter((r) => r.status !== "cancelled");
  return {
    total: rows.reduce((s, r) => s + r.total, 0),
    count: rows.length,
  };
}
