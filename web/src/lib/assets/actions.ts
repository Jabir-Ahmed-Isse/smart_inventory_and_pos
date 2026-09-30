"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { getAccountMappings, postLedgerEntry } from "@/lib/accounting/ledger";
import { monthlyDepreciation } from "@/lib/assets/data";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ROLES = ["owner", "admin", "accountant"];
function revalidateAssets() {
  ["/assets", "/accounting"].forEach((p) => revalidatePath(p));
}
async function guard() {
  const org = await getActiveOrg();
  if (!org) return { org: null, error: "You are not signed in." };
  if (!ROLES.includes(org.role)) return { org: null, error: "Not allowed." };
  return { org, error: null as string | null };
}
const round = (n: number) => Math.round(n * 100) / 100;

export async function seedAssets(): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase.rpc("seed_assets", { p_org: org.orgId });
  if (err) return { ok: false, error: err.message };
  revalidateAssets();
  return { ok: true, message: "Asset ledger mappings installed." };
}

export async function createAsset(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Asset name is required." };
  const cost = parseFloat(String(formData.get("cost") ?? "0")) || 0;
  if (cost <= 0) return { ok: false, error: "Enter a cost greater than zero." };
  const salvage = parseFloat(String(formData.get("salvage_value") ?? "0")) || 0;
  const life = parseInt(String(formData.get("useful_life_months") ?? "12"), 10) || 12;
  if (salvage >= cost) return { ok: false, error: "Salvage value must be below cost." };

  const supabase = await createClient();
  const { count } = await supabase.from("fixed_assets").select("id", { count: "exact", head: true }).eq("organization_id", org.orgId);
  const assetNumber = `FA-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const acquisitionDate = String(formData.get("acquisition_date") ?? "").trim() || new Date().toISOString().slice(0, 10);

  // Optionally record the purchase in the ledger.
  let journalId: string | null = null;
  if (formData.get("post_to_ledger") === "on") {
    const map = await getAccountMappings(supabase, org.orgId);
    if (map.fixed_assets && map.cash) {
      journalId = await postLedgerEntry(supabase, org.orgId, {
        date: acquisitionDate,
        memo: `Asset purchase — ${name}`,
        reference: assetNumber,
        source: "purchase",
        createdBy: org.userId,
        lines: [
          { accountId: map.fixed_assets, description: name, debit: round(cost), credit: 0 },
          { accountId: map.cash, description: "Cash / bank", debit: 0, credit: round(cost) },
        ],
      });
    }
  }

  const { error: err } = await supabase.from("fixed_assets").insert({
    organization_id: org.orgId,
    asset_number: assetNumber,
    name,
    category: String(formData.get("category") ?? "").trim() || null,
    acquisition_date: acquisitionDate,
    cost: round(cost),
    salvage_value: round(salvage),
    useful_life_months: Math.max(1, life),
    accumulated_depreciation: 0,
    status: "active",
    notes: String(formData.get("notes") ?? "").trim() || null,
    journal_entry_id: journalId,
    created_by: org.userId,
  });
  if (err) return { ok: false, error: err.message };
  revalidateAssets();
  return { ok: true, message: "Asset added." };
}

/** Run straight-line depreciation for a month across all active assets. */
export async function runDepreciation(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();

  const monthStr = String(formData.get("period") ?? "").trim(); // "YYYY-MM"
  const period = monthStr ? `${monthStr}-01` : `${new Date().toISOString().slice(0, 7)}-01`;

  const { data: assets } = await supabase
    .from("fixed_assets")
    .select("id, name, cost, salvage_value, useful_life_months, accumulated_depreciation")
    .eq("organization_id", org.orgId)
    .eq("status", "active");
  if (!assets || assets.length === 0) return { ok: false, error: "No active assets to depreciate." };

  // Build the per-asset amounts (skip assets already depreciated for this period).
  const { data: existing } = await supabase
    .from("depreciation_entries")
    .select("asset_id")
    .eq("organization_id", org.orgId)
    .eq("period", period);
  const done = new Set((existing ?? []).map((e) => e.asset_id));

  const charges: { assetId: string; name: string; amount: number; newAccum: number; depreciable: number }[] = [];
  for (const a of assets) {
    if (done.has(a.id)) continue;
    const depreciable = round(a.cost - a.salvage_value);
    const remaining = round(depreciable - a.accumulated_depreciation);
    if (remaining <= 0) continue;
    const monthly = monthlyDepreciation(a.cost, a.salvage_value, a.useful_life_months);
    const amount = round(Math.min(monthly, remaining));
    if (amount <= 0) continue;
    charges.push({ assetId: a.id, name: a.name, amount, newAccum: round(a.accumulated_depreciation + amount), depreciable });
  }
  if (charges.length === 0) return { ok: false, error: "Nothing to depreciate for this period (already run, or fully depreciated)." };

  const total = round(charges.reduce((s, c) => s + c.amount, 0));

  // One combined ledger entry for the whole run.
  let journalId: string | null = null;
  const map = await getAccountMappings(supabase, org.orgId);
  if (map.depreciation_expense && map.accumulated_depreciation) {
    journalId = await postLedgerEntry(supabase, org.orgId, {
      date: period,
      memo: `Depreciation — ${monthStr || period.slice(0, 7)}`,
      reference: "DEPR",
      source: "adjustment",
      createdBy: org.userId,
      lines: [
        { accountId: map.depreciation_expense, description: "Depreciation expense", debit: total, credit: 0 },
        { accountId: map.accumulated_depreciation, description: "Accumulated depreciation", debit: 0, credit: total },
      ],
    });
  }

  for (const c of charges) {
    await supabase.from("depreciation_entries").insert({ organization_id: org.orgId, asset_id: c.assetId, period, amount: c.amount, journal_entry_id: journalId });
    await supabase
      .from("fixed_assets")
      .update({ accumulated_depreciation: c.newAccum, ...(c.newAccum >= c.depreciable ? { status: "fully_depreciated" } : {}) })
      .eq("id", c.assetId)
      .eq("organization_id", org.orgId);
  }

  revalidateAssets();
  return { ok: true, message: `Depreciated ${charges.length} asset(s)${journalId ? " and posted to the ledger" : ""}.` };
}

export async function disposeAsset(id: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase.from("fixed_assets").update({ status: "disposed" }).eq("id", id).eq("organization_id", org.orgId);
  if (err) return { ok: false, error: err.message };
  revalidateAssets();
  return { ok: true, message: "Asset marked as disposed." };
}
