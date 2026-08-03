import { createClient } from "@/lib/supabase/server";

/**
 * Data access for the Phase 6.5 feature tables (product_bundles, bundle_items,
 * shipments, timesheets). These are added by migration
 * `20260726120000_bundles_shipping_timesheets.sql` but are not yet in the
 * generated `database.types.ts`, so this module uses an untyped client scoped
 * to just these queries. Once types are regenerated, drop the casts.
 *
 * Before the migration is applied the queries error → we return [] so the
 * screens render a graceful empty state instead of crashing.
 */
async function untypedClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await createClient()) as any;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Bundles -------------------------------------------------------------------
export type BundleRow = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  status: "active" | "inactive";
  itemCount: number;
};

export async function getBundles(orgId: string): Promise<BundleRow[]> {
  try {
    const db = await untypedClient();
    const { data, error } = await db
      .from("product_bundles")
      .select("id, name, sku, price, status, bundle_items(id)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      sku: b.sku,
      price: b.price,
      status: b.status,
      itemCount: Array.isArray(b.bundle_items) ? b.bundle_items.length : 0,
    }));
  } catch {
    return [];
  }
}

// Shipments -----------------------------------------------------------------
export type ShipmentStatus = "pending" | "in_transit" | "delivered" | "returned" | "cancelled";
export type ShipmentRow = {
  id: string;
  trackingNumber: string;
  carrier: string | null;
  destination: string | null;
  status: ShipmentStatus;
  date: string;
};

export async function getShipments(orgId: string): Promise<ShipmentRow[]> {
  try {
    const db = await untypedClient();
    const { data, error } = await db
      .from("shipments")
      .select("id, tracking_number, carrier, destination, status, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((s: any) => ({
      id: s.id,
      trackingNumber: s.tracking_number,
      carrier: s.carrier,
      destination: s.destination,
      status: s.status,
      date: fmtDate(s.created_at),
    }));
  } catch {
    return [];
  }
}

// Timesheets ----------------------------------------------------------------
export type TimesheetStatus = "open" | "submitted" | "approved" | "rejected";
export type TimesheetRow = {
  id: string;
  workDate: string;
  hours: number;
  note: string | null;
  status: TimesheetStatus;
  isSelf: boolean;
};

export async function getTimesheets(orgId: string, selfId: string): Promise<TimesheetRow[]> {
  try {
    const db = await untypedClient();
    const { data, error } = await db
      .from("timesheets")
      .select("id, work_date, hours, note, status, user_id")
      .eq("organization_id", orgId)
      .order("work_date", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((t: any) => ({
      id: t.id,
      workDate: t.work_date ? fmtDate(t.work_date) : "—",
      hours: t.hours,
      note: t.note,
      status: t.status,
      isSelf: t.user_id === selfId,
    }));
  } catch {
    return [];
  }
}
