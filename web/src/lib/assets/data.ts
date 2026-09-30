import { createClient } from "@/lib/supabase/server";
import type { AssetStatus } from "@/lib/supabase/database.types";

export type FixedAsset = {
  id: string;
  assetNumber: string;
  name: string;
  category: string | null;
  acquisitionDate: string;
  cost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  accumulatedDepreciation: number;
  bookValue: number;
  monthlyDepreciation: number;
  status: AssetStatus;
};

export function monthlyDepreciation(cost: number, salvage: number, months: number): number {
  if (months <= 0) return 0;
  return Math.round(((cost - salvage) / months) * 100) / 100;
}

export async function loadAssets(orgId: string): Promise<FixedAsset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fixed_assets")
    .select("id, asset_number, name, category, acquisition_date, cost, salvage_value, useful_life_months, accumulated_depreciation, status")
    .eq("organization_id", orgId)
    .order("acquisition_date", { ascending: false });

  return (data ?? []).map((a) => ({
    id: a.id,
    assetNumber: a.asset_number,
    name: a.name,
    category: a.category,
    acquisitionDate: a.acquisition_date,
    cost: a.cost,
    salvageValue: a.salvage_value,
    usefulLifeMonths: a.useful_life_months,
    accumulatedDepreciation: a.accumulated_depreciation,
    bookValue: Math.round((a.cost - a.accumulated_depreciation) * 100) / 100,
    monthlyDepreciation: monthlyDepreciation(a.cost, a.salvage_value, a.useful_life_months),
    status: a.status,
  }));
}

export type AssetsOverview = {
  count: number;
  totalCost: number;
  totalDepreciation: number;
  netBookValue: number;
  monthlyDepreciation: number;
  byCategory: { name: string; value: number }[];
};

export function assetsOverview(assets: FixedAsset[]): AssetsOverview {
  const active = assets.filter((a) => a.status !== "disposed");
  const catMap = new Map<string, number>();
  for (const a of active) catMap.set(a.category ?? "Uncategorized", (catMap.get(a.category ?? "Uncategorized") ?? 0) + a.bookValue);
  return {
    count: active.length,
    totalCost: active.reduce((s, a) => s + a.cost, 0),
    totalDepreciation: active.reduce((s, a) => s + a.accumulatedDepreciation, 0),
    netBookValue: active.reduce((s, a) => s + a.bookValue, 0),
    monthlyDepreciation: active.filter((a) => a.status === "active").reduce((s, a) => s + a.monthlyDepreciation, 0),
    byCategory: [...catMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
  };
}
