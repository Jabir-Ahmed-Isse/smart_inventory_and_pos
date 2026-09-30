import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/database.types";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}
function relative(iso: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

export type DirectoryUser = {
  userId: string;
  name: string;
  initials: string;
  email: string;
  primaryRole: UserRole;
  extraRoles: UserRole[];
  joined: string;
  lastSeen: string;
  isSelf: boolean;
  isOwner: boolean;
  counts: { sales: number; purchases: number; money: number; total: number };
};

/**
 * Rich, cross-tenant-safe directory of everyone in ONE organization: real name,
 * email, primary + extra roles, join date, last sign-in, and how much each
 * person has actually done (sales rung, purchases raised, money movements).
 * Service-role backed (emails live in auth.users). Caller must gate to owner/admin.
 */
export async function getOrgUserDirectory(orgId: string, selfId: string): Promise<DirectoryUser[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  // Membership — try extra_roles, fall back if the column isn't migrated yet.
  let memRows: { user_id: string; role: UserRole; extra_roles: UserRole[] | null; created_at: string }[] = [];
  const full = await admin
    .from("organization_members")
    .select("user_id, role, extra_roles, created_at")
    .eq("organization_id", orgId);
  if (full.error) {
    const base = await admin
      .from("organization_members")
      .select("user_id, role, created_at")
      .eq("organization_id", orgId);
    memRows = ((base.data ?? []) as { user_id: string; role: UserRole; created_at: string }[]).map((r) => ({ ...r, extra_roles: [] }));
  } else {
    memRows = (full.data ?? []) as typeof memRows;
  }

  const [profilesRes, usersRes, salesRes, poRes, txRes] = await Promise.all([
    admin.from("profiles").select("id, full_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("sales_orders").select("user_id").eq("organization_id", orgId),
    admin.from("purchase_orders").select("user_id").eq("organization_id", orgId),
    admin.from("transactions").select("user_id").eq("organization_id", orgId),
  ]);

  const nameMap = new Map((((profilesRes.data ?? []) as { id: string; full_name: string | null }[])).map((p) => [p.id, p.full_name ?? ""] as const));
  const authMap = new Map((usersRes.data?.users ?? []).map((u) => [u.id, { email: u.email ?? "—", lastSignIn: u.last_sign_in_at ?? null }] as const));

  const tally = (rows: { user_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.user_id) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };
  const salesBy = tally(salesRes.data as { user_id: string | null }[] | null);
  const poBy = tally(poRes.data as { user_id: string | null }[] | null);
  const txBy = tally(txRes.data as { user_id: string | null }[] | null);

  return memRows
    .map((m) => {
      const auth = authMap.get(m.user_id);
      const name = nameMap.get(m.user_id) || auth?.email?.split("@")[0] || "Member";
      const sales = salesBy.get(m.user_id) ?? 0;
      const purchases = poBy.get(m.user_id) ?? 0;
      const money = txBy.get(m.user_id) ?? 0;
      return {
        userId: m.user_id,
        name,
        initials: initialsOf(name),
        email: auth?.email ?? "—",
        primaryRole: m.role,
        extraRoles: (m.extra_roles ?? []).filter((r) => r !== m.role),
        joined: fmtDate(m.created_at),
        lastSeen: relative(auth?.lastSignIn ?? null),
        isSelf: m.user_id === selfId,
        isOwner: m.role === "owner",
        counts: { sales, purchases, money, total: sales + purchases + money },
      };
    })
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || b.counts.total - a.counts.total);
}

export type ActivityType = "sale" | "purchase" | "money";
export type ActivityEvent = {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  amount: number | null;
  userId: string | null;
  userName: string;
  at: string;
  date: string;
  time: string;
};

const dOpts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const tOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

/**
 * A unified, real activity stream for one organization — who did what: sales
 * rung up, purchase orders raised, and money movements (income/expense). Built
 * from live business tables (not a synthetic audit log), so it always reflects
 * reality. Optionally filtered to one user. Service-role backed; caller gates.
 */
export async function getActivityFeed(
  orgId: string,
  opts: { limit?: number; userId?: string } = {},
): Promise<ActivityEvent[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const limit = opts.limit ?? 40;
  const per = Math.min(limit, 60);

  const buildSales = () => {
    let q = admin.from("sales_orders").select("id, order_number, total, status, user_id, created_at").eq("organization_id", orgId);
    if (opts.userId) q = q.eq("user_id", opts.userId);
    return q.order("created_at", { ascending: false }).limit(per);
  };
  const buildPo = () => {
    let q = admin.from("purchase_orders").select("id, po_number, total, status, user_id, created_at").eq("organization_id", orgId);
    if (opts.userId) q = q.eq("user_id", opts.userId);
    return q.order("created_at", { ascending: false }).limit(per);
  };
  const buildTx = () => {
    let q = admin.from("transactions").select("id, type, category, description, amount, user_id, created_at").eq("organization_id", orgId);
    if (opts.userId) q = q.eq("user_id", opts.userId);
    return q.order("created_at", { ascending: false }).limit(per);
  };

  const [salesRes, poRes, txRes] = (await Promise.all([buildSales(), buildPo(), buildTx()])) as [
    { data: { id: string; order_number: string; total: number; status: string; user_id: string | null; created_at: string }[] | null },
    { data: { id: string; po_number: string; total: number; status: string; user_id: string | null; created_at: string }[] | null },
    { data: { id: string; type: string; category: string | null; description: string | null; amount: number; user_id: string | null; created_at: string }[] | null },
  ];

  const events: ActivityEvent[] = [];
  for (const s of salesRes.data ?? [])
    events.push({ id: `s-${s.id}`, type: "sale", title: `Sale ${s.order_number}`, detail: s.status, amount: s.total, userId: s.user_id, userName: "", at: s.created_at, date: "", time: "" });
  for (const p of poRes.data ?? [])
    events.push({ id: `p-${p.id}`, type: "purchase", title: `Purchase ${p.po_number}`, detail: p.status, amount: p.total, userId: p.user_id, userName: "", at: p.created_at, date: "", time: "" });
  for (const t of txRes.data ?? [])
    events.push({ id: `t-${t.id}`, type: "money", title: t.category || t.type, detail: t.description || t.type, amount: t.amount, userId: t.user_id, userName: "", at: t.created_at, date: "", time: "" });

  events.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const top = events.slice(0, limit);

  const ids = Array.from(new Set(top.map((e) => e.userId).filter(Boolean))) as string[];
  const nameMap = new Map<string, string>();
  if (ids.length) {
    const { data } = await admin.from("profiles").select("id, full_name").in("id", ids);
    for (const p of (data ?? []) as { id: string; full_name: string | null }[]) nameMap.set(p.id, p.full_name ?? "");
  }

  return top.map((e) => ({
    ...e,
    userName: e.userId ? nameMap.get(e.userId) || "User" : "System",
    date: new Date(e.at).toLocaleDateString("en-US", dOpts),
    time: new Date(e.at).toLocaleTimeString("en-US", tOpts),
  }));
}
