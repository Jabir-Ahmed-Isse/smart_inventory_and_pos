"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import { getAccountMappings, postLedgerEntry } from "@/lib/accounting/ledger";
import type { ComponentType, CalcMethod, AdvanceType } from "@/lib/supabase/database.types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ROLES = ["owner", "admin", "accountant"];
function revalidatePayroll(runId?: string) {
  ["/payroll", "/payroll/runs", "/payroll/advances", "/payroll/components"].forEach((p) => revalidatePath(p));
  if (runId) revalidatePath(`/payroll/runs/${runId}`);
  revalidatePath("/accounting");
}

async function guard() {
  const org = await getActiveOrg();
  if (!org) return { org: null, error: "You are not signed in." };
  if (!ROLES.includes(org.role)) return { org: null, error: "Only owners, admins or accountants can run payroll." };
  return { org, error: null as string | null };
}

const round = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Setup + components
// ---------------------------------------------------------------------------
export async function seedPayroll(): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase.rpc("seed_payroll", { p_org: org.orgId });
  if (err) return { ok: false, error: err.message };
  revalidatePayroll();
  return { ok: true, message: "Payroll defaults installed." };
}

export async function createComponent(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  const componentType = String(formData.get("component_type") ?? "earning") as ComponentType;
  const calcMethod = String(formData.get("calc_method") ?? "fixed") as CalcMethod;
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  const rate = parseFloat(String(formData.get("rate") ?? "0")) || 0;

  const supabase = await createClient();
  const { error: err } = await supabase.from("salary_components").insert({
    organization_id: org.orgId,
    name,
    code: String(formData.get("code") ?? "").trim() || null,
    component_type: componentType,
    calc_method: calcMethod,
    amount: round(amount),
    rate,
    is_statutory: formData.get("is_statutory") === "on",
    applies_to_all: formData.get("applies_to_all") === "on",
  });
  if (err) return { ok: false, error: err.code === "23505" ? "A component with that name already exists." : err.message };
  revalidatePayroll();
  return { ok: true, message: "Component created." };
}

export async function assignComponent(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const employeeId = String(formData.get("employee_id") ?? "").trim();
  const componentId = String(formData.get("component_id") ?? "").trim();
  if (!employeeId || !componentId) return { ok: false, error: "Choose an employee and a component." };
  const amountRaw = String(formData.get("amount") ?? "").trim();

  const supabase = await createClient();
  const { error: err } = await supabase.from("employee_components").upsert(
    {
      organization_id: org.orgId,
      employee_id: employeeId,
      component_id: componentId,
      amount: amountRaw ? round(parseFloat(amountRaw)) : null,
      active: true,
    },
    { onConflict: "employee_id,component_id" },
  );
  if (err) return { ok: false, error: err.message };
  revalidatePayroll();
  return { ok: true, message: "Component assigned to employee." };
}

// ---------------------------------------------------------------------------
// Pay runs
// ---------------------------------------------------------------------------
export async function createPayRun(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const name = String(formData.get("name") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "").trim();
  const periodEnd = String(formData.get("period_end") ?? "").trim();
  if (!name || !periodStart || !periodEnd) return { ok: false, error: "Name and period dates are required." };

  const supabase = await createClient();
  const { data, error: err } = await supabase
    .from("pay_runs")
    .insert({
      organization_id: org.orgId,
      name,
      period_start: periodStart,
      period_end: periodEnd,
      pay_date: String(formData.get("pay_date") ?? "").trim() || periodEnd,
      status: "draft",
      created_by: org.userId,
    })
    .select("id")
    .single();
  if (err || !data) return { ok: false, error: err?.message ?? "Could not create pay run." };
  revalidatePayroll(data.id);
  return { ok: true, message: "Pay run created — generate payslips next." };
}

/** Compute payslips for every active employee. Only allowed while the run is a draft. */
export async function generatePayslips(runId: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();

  const { data: run } = await supabase.from("pay_runs").select("id, status").eq("id", runId).eq("organization_id", org.orgId).maybeSingle();
  if (!run) return { ok: false, error: "Pay run not found." };
  if (run.status !== "draft") return { ok: false, error: "Only draft pay runs can be regenerated." };

  // Clear any previous draft payslips (cascades to items).
  await supabase.from("payslips").delete().eq("pay_run_id", runId).eq("organization_id", org.orgId);

  const [{ data: employees }, { data: components }, { data: empComps }, { data: advances }, { data: adjustments }] = await Promise.all([
    supabase.from("employees").select("id, first_name, base_salary").eq("organization_id", org.orgId).neq("status", "terminated"),
    supabase.from("salary_components").select("id, name, component_type, calc_method, amount, rate, applies_to_all, active").eq("organization_id", org.orgId).eq("active", true),
    supabase.from("employee_components").select("employee_id, component_id, amount, active").eq("organization_id", org.orgId).eq("active", true),
    supabase.from("employee_advances").select("id, employee_id, balance, installment_amount, status").eq("organization_id", org.orgId).eq("status", "disbursed"),
    supabase.from("pay_adjustments").select("employee_id, label, adjustment_type, amount").eq("organization_id", org.orgId).eq("pay_run_id", runId),
  ]);

  const comps = components ?? [];
  const compById = new Map(comps.map((c) => [c.id, c]));
  const assignsByEmp = new Map<string, { component_id: string; amount: number | null }[]>();
  for (const a of empComps ?? []) {
    const list = assignsByEmp.get(a.employee_id) ?? [];
    list.push({ component_id: a.component_id, amount: a.amount });
    assignsByEmp.set(a.employee_id, list);
  }
  const advByEmp = new Map<string, { balance: number; installment_amount: number }[]>();
  for (const a of advances ?? []) {
    const list = advByEmp.get(a.employee_id) ?? [];
    list.push({ balance: a.balance, installment_amount: a.installment_amount });
    advByEmp.set(a.employee_id, list);
  }
  // One-off bonuses / deductions for THIS run only.
  const adjByEmp = new Map<string, { label: string; type: ComponentType; amount: number }[]>();
  for (const a of adjustments ?? []) {
    const list = adjByEmp.get(a.employee_id) ?? [];
    list.push({ label: a.label, type: a.adjustment_type, amount: a.amount });
    adjByEmp.set(a.employee_id, list);
  }

  let tGross = 0, tDed = 0, tNet = 0;

  for (const emp of employees ?? []) {
    const basic = emp.base_salary ?? 0;
    const items: { component_id: string | null; label: string; item_type: ComponentType; amount: number }[] = [
      { component_id: null, label: "Basic Salary", item_type: "earning", amount: round(basic) },
    ];

    const valueOf = (c: { calc_method: CalcMethod; amount: number; rate: number }, override: number | null) =>
      override != null ? override : c.calc_method === "percent_basic" ? round((basic * c.rate) / 100) : c.amount;

    // Applies-to-all components
    for (const c of comps.filter((c) => c.applies_to_all)) {
      const amt = round(valueOf(c, null));
      if (amt > 0) items.push({ component_id: c.id, label: c.name, item_type: c.component_type, amount: amt });
    }
    // Employee-specific assignments (skip if the component already applied to all)
    for (const a of assignsByEmp.get(emp.id) ?? []) {
      const c = compById.get(a.component_id);
      if (!c || c.applies_to_all) continue;
      const amt = round(valueOf(c, a.amount));
      if (amt > 0) items.push({ component_id: c.id, label: c.name, item_type: c.component_type, amount: amt });
    }

    // One-off adjustments for this run (bonuses, overtime, ad-hoc deductions)
    for (const adj of adjByEmp.get(emp.id) ?? []) {
      const amt = round(adj.amount);
      if (amt > 0) items.push({ component_id: null, label: adj.label, item_type: adj.type, amount: amt });
    }

    const earnings = items.filter((i) => i.item_type === "earning").reduce((s, i) => s + i.amount, 0);
    const deductions = items.filter((i) => i.item_type === "deduction").reduce((s, i) => s + i.amount, 0);

    // Advance / loan repayment this period
    let advanceRepayment = 0;
    for (const adv of advByEmp.get(emp.id) ?? []) {
      const due = adv.installment_amount > 0 ? Math.min(adv.installment_amount, adv.balance) : adv.balance;
      advanceRepayment += Math.max(0, round(due));
    }
    advanceRepayment = round(advanceRepayment);
    if (advanceRepayment > 0) items.push({ component_id: null, label: "Advance / Loan Repayment", item_type: "deduction", amount: advanceRepayment });

    const gross = round(earnings);
    const net = round(gross - deductions - advanceRepayment);

    const { data: slip, error: slipErr } = await supabase
      .from("payslips")
      .insert({
        organization_id: org.orgId,
        pay_run_id: runId,
        employee_id: emp.id,
        basic: round(basic),
        total_earnings: gross,
        total_deductions: round(deductions),
        advance_repayment: advanceRepayment,
        gross,
        net_pay: net,
        status: "draft",
      })
      .select("id")
      .single();
    if (slipErr || !slip) return { ok: false, error: slipErr?.message ?? "Could not create payslip." };

    await supabase.from("payslip_items").insert(
      items.map((i) => ({ organization_id: org.orgId, payslip_id: slip.id, component_id: i.component_id, label: i.label, item_type: i.item_type, amount: i.amount })),
    );

    tGross += gross;
    tDed += deductions + advanceRepayment;
    tNet += net;
  }

  await supabase
    .from("pay_runs")
    .update({ total_gross: round(tGross), total_deductions: round(tDed), total_net: round(tNet) })
    .eq("id", runId)
    .eq("organization_id", org.orgId);

  revalidatePayroll(runId);
  return { ok: true, message: `Generated ${(employees ?? []).length} payslip(s).` };
}

/** Add a one-off bonus / deduction to an employee for THIS run, then rebuild. */
export async function addPayAdjustment(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const runId = String(formData.get("pay_run_id") ?? "").trim();
  const employeeId = String(formData.get("employee_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("adjustment_type") ?? "earning") as ComponentType;
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  if (!runId || !employeeId) return { ok: false, error: "Missing pay run or employee." };
  if (!label) return { ok: false, error: "Enter a name (e.g. Eid Bonus)." };
  if (amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { data: run } = await supabase.from("pay_runs").select("status").eq("id", runId).eq("organization_id", org.orgId).maybeSingle();
  if (!run) return { ok: false, error: "Pay run not found." };
  if (run.status !== "draft") return { ok: false, error: "Adjustments can only be added to a draft pay run." };

  const { error: insErr } = await supabase.from("pay_adjustments").insert({
    organization_id: org.orgId,
    pay_run_id: runId,
    employee_id: employeeId,
    label,
    adjustment_type: type,
    amount: round(amount),
    created_by: org.userId,
  });
  if (insErr) return { ok: false, error: insErr.message };

  return generatePayslips(runId); // rebuild so the bonus/deduction shows immediately
}

export async function deletePayAdjustment(id: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { data: adj } = await supabase.from("pay_adjustments").select("pay_run_id").eq("id", id).eq("organization_id", org.orgId).maybeSingle();
  if (!adj) return { ok: false, error: "Adjustment not found." };
  const { data: run } = await supabase.from("pay_runs").select("status").eq("id", adj.pay_run_id).eq("organization_id", org.orgId).maybeSingle();
  if (run && run.status !== "draft") return { ok: false, error: "This pay run is locked." };
  const { error: delErr } = await supabase.from("pay_adjustments").delete().eq("id", id).eq("organization_id", org.orgId);
  if (delErr) return { ok: false, error: delErr.message };
  return generatePayslips(adj.pay_run_id);
}

/** Approve a run: post the salary accrual to the ledger and apply advance repayments. */
export async function approvePayRun(runId: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();

  const { data: run } = await supabase.from("pay_runs").select("id, name, pay_date, status").eq("id", runId).eq("organization_id", org.orgId).maybeSingle();
  if (!run) return { ok: false, error: "Pay run not found." };
  if (run.status !== "draft") return { ok: false, error: "This pay run is not a draft." };

  const { data: slips } = await supabase
    .from("payslips")
    .select("id, employee_id, gross, total_deductions, advance_repayment, net_pay")
    .eq("pay_run_id", runId)
    .eq("organization_id", org.orgId);
  if (!slips || slips.length === 0) return { ok: false, error: "Generate payslips before approving." };

  const grossTotal = round(slips.reduce((s, p) => s + p.gross, 0));
  const dedTotal = round(slips.reduce((s, p) => s + p.total_deductions, 0));
  const advTotal = round(slips.reduce((s, p) => s + p.advance_repayment, 0));
  const netTotal = round(slips.reduce((s, p) => s + p.net_pay, 0));

  // Apply advance repayments: oldest disbursed advance first, per employee.
  for (const slip of slips.filter((s) => s.advance_repayment > 0)) {
    let remaining = slip.advance_repayment;
    const { data: advs } = await supabase
      .from("employee_advances")
      .select("id, balance, installment_amount")
      .eq("organization_id", org.orgId)
      .eq("employee_id", slip.employee_id)
      .eq("status", "disbursed")
      .order("created_at", { ascending: true });
    for (const adv of advs ?? []) {
      if (remaining <= 0) break;
      const pay = round(Math.min(remaining, adv.balance));
      if (pay <= 0) continue;
      const newBalance = round(adv.balance - pay);
      await supabase.from("advance_repayments").insert({ organization_id: org.orgId, advance_id: adv.id, payslip_id: slip.id, amount: pay });
      await supabase
        .from("employee_advances")
        .update({ balance: newBalance, ...(newBalance <= 0 ? { status: "settled" } : {}) })
        .eq("id", adv.id);
      remaining = round(remaining - pay);
    }
  }

  // Post the salary accrual (best-effort — needs a Chart of Accounts).
  let journalId: string | null = null;
  const map = await getAccountMappings(supabase, org.orgId);
  if (map.salaries_expense && map.salaries_payable) {
    journalId = await postLedgerEntry(supabase, org.orgId, {
      date: run.pay_date,
      memo: `Payroll — ${run.name}`,
      reference: run.name,
      source: "payroll",
      sourceId: runId,
      createdBy: org.userId,
      lines: [
        { accountId: map.salaries_expense, description: "Salaries & wages", debit: grossTotal, credit: 0 },
        { accountId: map.salaries_payable, description: "Net pay payable", debit: 0, credit: netTotal },
        ...(dedTotal > 0 && map.deductions_payable ? [{ accountId: map.deductions_payable, description: "Payroll deductions", debit: 0, credit: dedTotal }] : []),
        ...(advTotal > 0 && map.employee_advances ? [{ accountId: map.employee_advances, description: "Advance recovery", debit: 0, credit: advTotal }] : []),
      ],
    });
  }

  await supabase.from("payslips").update({ status: "approved" }).eq("pay_run_id", runId).eq("organization_id", org.orgId);
  await supabase.from("pay_runs").update({ status: "approved", journal_entry_id: journalId }).eq("id", runId).eq("organization_id", org.orgId);

  revalidatePayroll(runId);
  return { ok: true, message: journalId ? "Pay run approved and posted to the ledger." : "Pay run approved (set up accounting to post to the ledger)." };
}

/** Mark an approved run as paid: post the cash payment of net wages. */
export async function markPayRunPaid(runId: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();

  const { data: run } = await supabase.from("pay_runs").select("id, name, pay_date, status, total_net, payment_entry_id").eq("id", runId).eq("organization_id", org.orgId).maybeSingle();
  if (!run) return { ok: false, error: "Pay run not found." };
  if (run.status !== "approved") return { ok: false, error: "Approve the pay run first." };

  let paymentId: string | null = null;
  const map = await getAccountMappings(supabase, org.orgId);
  if (map.salaries_payable && map.cash) {
    paymentId = await postLedgerEntry(supabase, org.orgId, {
      date: run.pay_date,
      memo: `Payroll payment — ${run.name}`,
      reference: run.name,
      source: "payment",
      sourceId: runId,
      createdBy: org.userId,
      lines: [
        { accountId: map.salaries_payable, description: "Settle net pay", debit: run.total_net, credit: 0 },
        { accountId: map.cash, description: "Cash / bank", debit: 0, credit: run.total_net },
      ],
    });
  }

  await supabase.from("payslips").update({ status: "paid" }).eq("pay_run_id", runId).eq("organization_id", org.orgId);
  await supabase.from("pay_runs").update({ status: "paid", payment_entry_id: paymentId }).eq("id", runId).eq("organization_id", org.orgId);

  revalidatePayroll(runId);
  return { ok: true, message: "Pay run marked as paid." };
}

// ---------------------------------------------------------------------------
// Advances & loans
// ---------------------------------------------------------------------------
export async function createAdvance(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const employeeId = String(formData.get("employee_id") ?? "").trim();
  const amount = parseFloat(String(formData.get("amount") ?? "0")) || 0;
  if (!employeeId) return { ok: false, error: "Choose an employee." };
  if (amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };

  const advanceType = String(formData.get("advance_type") ?? "advance") as AdvanceType;
  let installments = parseInt(String(formData.get("installments") ?? "1"), 10) || 1;
  if (advanceType === "advance") installments = 1;
  installments = Math.max(1, installments);
  const installmentAmount = round(amount / installments);

  const supabase = await createClient();
  const { error: err } = await supabase.from("employee_advances").insert({
    organization_id: org.orgId,
    employee_id: employeeId,
    advance_type: advanceType,
    amount: round(amount),
    installments,
    installment_amount: installmentAmount,
    balance: 0,
    reason: String(formData.get("reason") ?? "").trim() || null,
    status: "pending",
    created_by: org.userId,
  });
  if (err) return { ok: false, error: err.message };
  revalidatePayroll();
  return { ok: true, message: "Request submitted for approval." };
}

export async function decideAdvance(id: string, decision: "approved" | "rejected"): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase
    .from("employee_advances")
    .update({ status: decision, approved_by: org.userId })
    .eq("id", id)
    .eq("organization_id", org.orgId)
    .eq("status", "pending");
  if (err) return { ok: false, error: err.message };
  revalidatePayroll();
  return { ok: true, message: `Request ${decision}.` };
}

/** Disburse an approved advance: pay it out and start the repayment clock. */
export async function disburseAdvance(id: string): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();

  const { data: adv } = await supabase
    .from("employee_advances")
    .select("id, amount, status, employee_id, advance_type")
    .eq("id", id)
    .eq("organization_id", org.orgId)
    .maybeSingle();
  if (!adv) return { ok: false, error: "Advance not found." };
  if (adv.status !== "approved") return { ok: false, error: "Only approved requests can be disbursed." };

  let journalId: string | null = null;
  const map = await getAccountMappings(supabase, org.orgId);
  if (map.employee_advances && map.cash) {
    journalId = await postLedgerEntry(supabase, org.orgId, {
      date: new Date().toISOString().slice(0, 10),
      memo: `${adv.advance_type === "loan" ? "Loan" : "Advance"} disbursed`,
      source: "payment",
      sourceId: id,
      createdBy: org.userId,
      lines: [
        { accountId: map.employee_advances, description: "Employee advance", debit: adv.amount, credit: 0 },
        { accountId: map.cash, description: "Cash / bank", debit: 0, credit: adv.amount },
      ],
    });
  }

  const { error: err } = await supabase
    .from("employee_advances")
    .update({ status: "disbursed", balance: adv.amount, disbursed_at: new Date().toISOString(), journal_entry_id: journalId })
    .eq("id", id)
    .eq("organization_id", org.orgId);
  if (err) return { ok: false, error: err.message };

  revalidatePayroll();
  return { ok: true, message: journalId ? "Disbursed and posted to the ledger." : "Disbursed." };
}
