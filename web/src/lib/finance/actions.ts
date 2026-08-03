"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Records a manual income or expense transaction (rent, utilities, capital, etc.). */
export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const type = String(formData.get("type") ?? "");
  if (type !== "income" && type !== "expense") return { ok: false, error: "Choose income or expense." };

  const amount = parseFloat(String(formData.get("amount") ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };

  const category = String(formData.get("category") ?? "").trim() || (type === "income" ? "Other Income" : "Other Expense");
  const description = String(formData.get("description") ?? "").trim() || null;

  // Optional backdate — otherwise defaults to now.
  const dateStr = String(formData.get("date") ?? "").trim();
  const createdAt = dateStr ? new Date(`${dateStr}T12:00:00`).toISOString() : undefined;

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    organization_id: org.orgId,
    type,
    category,
    description,
    amount: Math.round(amount * 100) / 100,
    reference: "manual",
    user_id: org.userId,
    ...(createdAt ? { created_at: createdAt } : {}),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/finance");
  revalidatePath("/finance/transactions");
  revalidatePath("/finance/income");
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/cash-flow");
  revalidatePath("/dashboard");
  return { ok: true };
}
