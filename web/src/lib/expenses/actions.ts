"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { resolveWriteBranchId } from "@/lib/branches/context";
import { getAccountMappings, postLedgerEntry } from "@/lib/accounting/ledger";
import type { Recurrence } from "@/lib/supabase/database.types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ROLES = ["owner", "admin", "accountant", "manager"];
function revalidateExpenses() {
  ["/expenses", "/expenses/bills", "/expenses/recurring", "/expenses/categories", "/accounting", "/finance"].forEach((p) => revalidatePath(p));
}
async function guard() {
  const org = await getActiveOrg();
  if (!org) return { org: null, error: "You are not signed in." };
  if (!ROLES.includes(org.role)) return { org: null, error: "Not allowed." };
  return { org, error: null as string | null };
}
const round = (n: number) => Math.round(n * 100) / 100;

function advance(dateISO: string, r: Recurrence): string {
  const d = new Date(`${dateISO}T00:00:00`);
  if (r === "weekly") d.setDate(d.getDate() + 7);
  else if (r === "monthly") d.setMonth(d.getMonth() + 1);
  else if (r === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

async function nextExpenseNumber(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string): Promise<string> {
  const { count } = await supabase.from("expenses").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  return `EXP-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// Setup + categories
// ---------------------------------------------------------------------------
export async function seedExpenses(): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase.rpc("seed_expenses", { p_org: org.orgId });
  if (err) return { ok: false, error: err.message };
  revalidateExpenses();
  return { ok: true, message: "Expense categories installed." };
}

export async function createExpenseCategory(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  const supabase = await createClient();
  const { error: err } = await supabase.from("expense_categories").insert({
    organization_id: org.orgId,
    name,
    account_id: String(formData.get("account_id") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (err) return { ok: false, error: err.code === "23505" ? "A category with that name already exists." : err.message };
  revalidateExpenses();
  return { ok: true, message: "Category created." };
}

// ---------------------------------------------------------------------------
// Expenses / bills
// ---------------------------------------------------------------------------
export async function createExpense(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  if (amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  const tax = parseFloat(String(formData.get("tax_amount") ?? "0")) || 0;

  const supabase = await createClient();
  // Branch tag: an explicit form value, else the active/primary branch. A blank
  // value keeps the expense company-level (branch_id NULL).
  const formBranch = String(formData.get("branch_id") ?? "").trim();
  const branchId = formBranch || (await resolveWriteBranchId(org));
  const { error: err } = await supabase.from("expenses").insert({
    organization_id: org.orgId,
    expense_number: await nextExpenseNumber(supabase, org.orgId),
    category_id: String(formData.get("category_id") ?? "").trim() || null,
    supplier_id: String(formData.get("supplier_id") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    amount: round(amount),
    tax_amount: round(tax),
    total: round(amount + tax),
    expense_date: String(formData.get("expense_date") ?? "").trim() || new Date().toISOString().slice(0, 10),
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    status: "draft",
    created_by: org.userId,
    ...(branchId ? { branch_id: branchId } : {}),
  } as never);
  if (err) return { ok: false, error: err.message };
  revalidateExpenses();
  return { ok: true, message: "Expense recorded." };
}

/** Approve an expense: recognise it as a payable in the ledger. */
export async function approveExpense(id: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();

  const { data: exp } = await supabase
    .from("expenses")
    .select("id, expense_number, description, amount, tax_amount, total, expense_date, status, category_id")
    .eq("id", id).eq("organization_id", org.orgId).maybeSingle();
  if (!exp) return { ok: false, error: "Expense not found." };
  if (exp.status !== "draft") return { ok: false, error: "Only draft expenses can be approved." };

  let journalId: string | null = null;
  const map = await getAccountMappings(supabase, org.orgId);

  // Resolve the expense account: the category's mapped account, else Other Expense.
  let expenseAccount: string | null = map.other_expense ?? null;
  if (exp.category_id) {
    const { data: cat } = await supabase.from("expense_categories").select("account_id").eq("id", exp.category_id).maybeSingle();
    if (cat?.account_id) expenseAccount = cat.account_id;
  }

  if (expenseAccount && map.accounts_payable) {
    const taxToVat = exp.tax_amount > 0 && map.sales_tax_payable;
    journalId = await postLedgerEntry(supabase, org.orgId, {
      date: exp.expense_date,
      memo: exp.description ?? `Expense ${exp.expense_number}`,
      reference: exp.expense_number,
      source: "purchase",
      sourceId: id,
      createdBy: org.userId,
      lines: [
        { accountId: expenseAccount, description: "Expense", debit: taxToVat ? exp.amount : exp.total, credit: 0 },
        ...(taxToVat ? [{ accountId: map.sales_tax_payable, description: "Input VAT", debit: exp.tax_amount, credit: 0 }] : []),
        { accountId: map.accounts_payable, description: "Payable", debit: 0, credit: exp.total },
      ],
    });
  }

  const { error: err } = await supabase.from("expenses")
    .update({ status: "approved", approved_by: org.userId, approved_at: new Date().toISOString(), journal_entry_id: journalId })
    .eq("id", id).eq("organization_id", org.orgId);
  if (err) return { ok: false, error: err.message };

  revalidateExpenses();
  return { ok: true, message: journalId ? "Approved and posted to the ledger." : "Approved (set up accounting to post to the ledger)." };
}

/** Pay an approved expense: settle the payable from cash. */
export async function payExpense(id: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();

  const { data: exp } = await supabase
    .from("expenses").select("id, expense_number, total, status, expense_date")
    .eq("id", id).eq("organization_id", org.orgId).maybeSingle();
  if (!exp) return { ok: false, error: "Expense not found." };
  if (exp.status !== "approved") return { ok: false, error: "Approve the expense first." };

  let paymentId: string | null = null;
  const map = await getAccountMappings(supabase, org.orgId);
  if (map.accounts_payable && map.cash) {
    paymentId = await postLedgerEntry(supabase, org.orgId, {
      date: new Date().toISOString().slice(0, 10),
      memo: `Payment — ${exp.expense_number}`,
      reference: exp.expense_number,
      source: "payment",
      sourceId: id,
      createdBy: org.userId,
      lines: [
        { accountId: map.accounts_payable, description: "Settle payable", debit: exp.total, credit: 0 },
        { accountId: map.cash, description: "Cash / bank", debit: 0, credit: exp.total },
      ],
    });
  }

  const { error: err } = await supabase.from("expenses").update({ status: "paid", payment_entry_id: paymentId }).eq("id", id).eq("organization_id", org.orgId);
  if (err) return { ok: false, error: err.message };

  revalidateExpenses();
  return { ok: true, message: "Expense paid." };
}

export async function cancelExpense(id: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase.from("expenses").update({ status: "cancelled" }).eq("id", id).eq("organization_id", org.orgId).eq("status", "draft");
  if (err) return { ok: false, error: err.message };
  revalidateExpenses();
  return { ok: true, message: "Expense cancelled." };
}

// ---------------------------------------------------------------------------
// Recurring
// ---------------------------------------------------------------------------
export async function createRecurringExpense(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const name = String(formData.get("name") ?? "").trim();
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  if (!name) return { ok: false, error: "Name is required." };
  if (amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };

  const start = String(formData.get("start_date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { error: err } = await supabase.from("recurring_expenses").insert({
    organization_id: org.orgId,
    name,
    category_id: String(formData.get("category_id") ?? "").trim() || null,
    supplier_id: String(formData.get("supplier_id") ?? "").trim() || null,
    amount: round(amount),
    tax_amount: round(parseFloat(String(formData.get("tax_amount") ?? "0")) || 0),
    recurrence: (String(formData.get("recurrence") ?? "monthly") as Recurrence),
    start_date: start,
    next_due_date: String(formData.get("next_due_date") ?? "").trim() || start,
    created_by: org.userId,
  });
  if (err) return { ok: false, error: err.message };
  revalidateExpenses();
  return { ok: true, message: "Recurring expense created." };
}

/** Create expense bills for every recurring template that is due, and roll the schedule forward. */
export async function generateDueExpenses(): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due } = await supabase
    .from("recurring_expenses")
    .select("id, name, category_id, supplier_id, amount, tax_amount, recurrence, next_due_date")
    .eq("organization_id", org.orgId)
    .eq("active", true)
    .lte("next_due_date", today);

  let created = 0;
  for (const r of due ?? []) {
    const { error: insErr } = await supabase.from("expenses").insert({
      organization_id: org.orgId,
      expense_number: await nextExpenseNumber(supabase, org.orgId),
      category_id: r.category_id,
      supplier_id: r.supplier_id,
      description: r.name,
      amount: r.amount,
      tax_amount: r.tax_amount,
      total: round(r.amount + r.tax_amount),
      expense_date: r.next_due_date,
      status: "draft",
      recurring_id: r.id,
      created_by: org.userId,
    });
    if (!insErr) {
      created++;
      await supabase.from("recurring_expenses").update({ next_due_date: advance(r.next_due_date, r.recurrence) }).eq("id", r.id);
    }
  }

  revalidateExpenses();
  return { ok: true, message: `Generated ${created} bill(s) from recurring schedules.` };
}

export async function toggleRecurring(id: string, active: boolean): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase.from("recurring_expenses").update({ active }).eq("id", id).eq("organization_id", org.orgId);
  if (err) return { ok: false, error: err.message };
  revalidateExpenses();
  return { ok: true };
}
