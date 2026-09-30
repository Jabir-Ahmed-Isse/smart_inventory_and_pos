"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ROLES = ["owner", "admin", "accountant"];
async function guard() {
  const org = await getActiveOrg();
  if (!org) return { org: null, error: "You are not signed in." };
  if (!ROLES.includes(org.role)) return { org: null, error: "Not allowed." };
  return { org, error: null as string | null };
}
const round = (n: number) => Math.round(n * 100) / 100;

export async function createBudget(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const name = String(formData.get("name") ?? "").trim();
  const fiscalYear = parseInt(String(formData.get("fiscal_year") ?? ""), 10) || new Date().getFullYear();
  if (!name) return { ok: false, error: "Budget name is required." };

  const supabase = await createClient();
  const { data, error: err } = await supabase
    .from("budgets")
    .insert({ organization_id: org.orgId, name, fiscal_year: fiscalYear, created_by: org.userId })
    .select("id")
    .single();
  if (err || !data) return { ok: false, error: err?.code === "23505" ? "A budget with that name already exists." : err?.message ?? "Could not create budget." };

  revalidatePath("/accounting/budgets");
  revalidatePath(`/accounting/budgets/${data.id}`);
  return { ok: true, message: "Budget created." };
}

export async function setBudgetLine(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const budgetId = String(formData.get("budget_id") ?? "").trim();
  const accountId = String(formData.get("account_id") ?? "").trim();
  const amount = parseFloat(String(formData.get("annual_amount") ?? "0")) || 0;
  if (!budgetId || !accountId) return { ok: false, error: "Choose an account." };

  const supabase = await createClient();
  const { error: err } = await supabase.from("budget_lines").upsert(
    { organization_id: org.orgId, budget_id: budgetId, account_id: accountId, annual_amount: round(amount) },
    { onConflict: "budget_id,account_id" },
  );
  if (err) return { ok: false, error: err.message };

  revalidatePath(`/accounting/budgets/${budgetId}`);
  return { ok: true, message: "Budget line saved." };
}
