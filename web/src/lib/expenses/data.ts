import { createClient } from "@/lib/supabase/server";
import type { ExpenseStatus, Recurrence } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ExpenseCategory = { id: string; name: string; accountId: string | null; accountName: string | null; active: boolean };

export type Expense = {
  id: string;
  expenseNumber: string;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  description: string | null;
  amount: number;
  taxAmount: number;
  total: number;
  expenseDate: string;
  dueDate: string | null;
  status: ExpenseStatus;
};

export type RecurringExpense = {
  id: string;
  name: string;
  categoryName: string | null;
  supplierName: string | null;
  amount: number;
  taxAmount: number;
  total: number;
  recurrence: Recurrence;
  nextDueDate: string;
  active: boolean;
  due: boolean;
};

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------
export async function loadExpenseCategories(orgId: string): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_categories")
    .select("id, name, account_id, active, chart_of_accounts(name)")
    .eq("organization_id", orgId)
    .order("name");
  return ((data ?? []) as unknown as { id: string; name: string; account_id: string | null; active: boolean; chart_of_accounts: { name: string } | null }[]).map((c) => ({
    id: c.id,
    name: c.name,
    accountId: c.account_id,
    accountName: c.chart_of_accounts?.name ?? null,
    active: c.active,
  }));
}

export async function loadExpenses(orgId: string): Promise<Expense[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, expense_number, category_id, supplier_id, description, amount, tax_amount, total, expense_date, due_date, status, expense_categories(name), suppliers(name)")
    .eq("organization_id", orgId)
    .order("expense_date", { ascending: false });

  return ((data ?? []) as unknown as {
    id: string;
    expense_number: string;
    category_id: string | null;
    supplier_id: string | null;
    description: string | null;
    amount: number;
    tax_amount: number;
    total: number;
    expense_date: string;
    due_date: string | null;
    status: ExpenseStatus;
    expense_categories: { name: string } | null;
    suppliers: { name: string } | null;
  }[]).map((e) => ({
    id: e.id,
    expenseNumber: e.expense_number,
    categoryId: e.category_id,
    categoryName: e.expense_categories?.name ?? null,
    supplierId: e.supplier_id,
    supplierName: e.suppliers?.name ?? null,
    description: e.description,
    amount: e.amount,
    taxAmount: e.tax_amount,
    total: e.total,
    expenseDate: e.expense_date,
    dueDate: e.due_date,
    status: e.status,
  }));
}

export async function loadRecurringExpenses(orgId: string): Promise<RecurringExpense[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("recurring_expenses")
    .select("id, name, amount, tax_amount, recurrence, next_due_date, active, expense_categories(name), suppliers(name)")
    .eq("organization_id", orgId)
    .order("next_due_date");

  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    amount: number;
    tax_amount: number;
    recurrence: Recurrence;
    next_due_date: string;
    active: boolean;
    expense_categories: { name: string } | null;
    suppliers: { name: string } | null;
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    categoryName: r.expense_categories?.name ?? null,
    supplierName: r.suppliers?.name ?? null,
    amount: r.amount,
    taxAmount: r.tax_amount,
    total: r.amount + r.tax_amount,
    recurrence: r.recurrence,
    nextDueDate: r.next_due_date,
    active: r.active,
    due: r.active && r.next_due_date <= today,
  }));
}

export async function loadSuppliersLite(orgId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("id, name").eq("organization_id", orgId).order("name");
  return (data ?? []) as { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
export type ExpensesOverview = {
  monthTotal: number;
  unpaid: number;
  draftCount: number;
  dueRecurring: number;
  byCategory: { name: string; amount: number }[];
};

export function expensesOverview(expenses: Expense[], recurring: RecurringExpense[]): ExpensesOverview {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const active = expenses.filter((e) => e.status !== "cancelled");

  const catMap = new Map<string, number>();
  for (const e of active) catMap.set(e.categoryName ?? "Uncategorized", (catMap.get(e.categoryName ?? "Uncategorized") ?? 0) + e.total);

  return {
    monthTotal: active.filter((e) => e.expenseDate >= monthStart).reduce((s, e) => s + e.total, 0),
    unpaid: active.filter((e) => e.status === "approved").reduce((s, e) => s + e.total, 0),
    draftCount: expenses.filter((e) => e.status === "draft").length,
    dueRecurring: recurring.filter((r) => r.due).length,
    byCategory: [...catMap.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6),
  };
}
