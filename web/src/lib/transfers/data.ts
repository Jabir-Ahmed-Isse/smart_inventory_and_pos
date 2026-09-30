import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type TransferStatus = "pending" | "completed" | "cancelled";

export type TransferRow = {
  id: string;
  transferNumber: string;
  productId: string | null;
  quantity: number;
  sourceWarehouseId: string | null;
  destWarehouseId: string | null;
  sourceBranchId: string | null;
  destBranchId: string | null;
  status: TransferStatus;
  notes: string | null;
  createdAt: string;
};

type Raw = {
  id: string; transfer_number: string; product_id: string | null; quantity: number;
  source_warehouse_id: string | null; dest_warehouse_id: string | null;
  source_branch_id: string | null; dest_branch_id: string | null;
  status: TransferStatus; notes: string | null; created_at: string;
};

/** List an org's stock transfers (newest first). Migration-safe → [] if absent. */
export async function getTransferRequests(orgId: string, limit = 100): Promise<TransferRow[]> {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("stock_transfers")
      .select("id, transfer_number, product_id, quantity, source_warehouse_id, dest_warehouse_id, source_branch_id, dest_branch_id, status, notes, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return ((data ?? []) as Raw[]).map((r) => ({
      id: r.id,
      transferNumber: r.transfer_number,
      productId: r.product_id,
      quantity: r.quantity,
      sourceWarehouseId: r.source_warehouse_id,
      destWarehouseId: r.dest_warehouse_id,
      sourceBranchId: r.source_branch_id,
      destBranchId: r.dest_branch_id,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}
