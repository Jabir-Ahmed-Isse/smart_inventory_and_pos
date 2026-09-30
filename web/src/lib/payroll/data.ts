import { createClient } from "@/lib/supabase/server";
import type {
  ComponentType,
  CalcMethod,
  PayrunStatus,
  PayslipStatus,
  AdvanceType,
  AdvanceStatus,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SalaryComponent = {
  id: string;
  name: string;
  code: string | null;
  componentType: ComponentType;
  calcMethod: CalcMethod;
  amount: number;
  rate: number;
  isStatutory: boolean;
  appliesToAll: boolean;
  active: boolean;
};

export type PayRunSummary = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayrunStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  payslipCount: number;
};

export type PayslipRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  basic: number;
  totalEarnings: number;
  totalDeductions: number;
  advanceRepayment: number;
  gross: number;
  netPay: number;
  status: PayslipStatus;
  items: { label: string; itemType: ComponentType; amount: number }[];
  adjustments: { id: string; label: string; type: ComponentType; amount: number }[];
};

export type Advance = {
  id: string;
  employeeId: string;
  employeeName: string;
  advanceType: AdvanceType;
  amount: number;
  installments: number;
  installmentAmount: number;
  balance: number;
  repaid: number;
  reason: string | null;
  status: AdvanceStatus;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------
export async function loadComponents(orgId: string): Promise<SalaryComponent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("salary_components")
    .select("id, name, code, component_type, calc_method, amount, rate, is_statutory, applies_to_all, active")
    .eq("organization_id", orgId)
    .order("component_type")
    .order("name");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    componentType: c.component_type,
    calcMethod: c.calc_method,
    amount: c.amount,
    rate: c.rate,
    isStatutory: c.is_statutory,
    appliesToAll: c.applies_to_all,
    active: c.active,
  }));
}

export async function loadPayRuns(orgId: string): Promise<PayRunSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pay_runs")
    .select("id, name, period_start, period_end, pay_date, status, total_gross, total_deductions, total_net, payslips(count)")
    .eq("organization_id", orgId)
    .order("period_start", { ascending: false });

  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    period_start: string;
    period_end: string;
    pay_date: string;
    status: PayrunStatus;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    payslips: { count: number }[];
  }[]).map((r) => ({
    id: r.id,
    name: r.name,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    payDate: r.pay_date,
    status: r.status,
    totalGross: r.total_gross,
    totalDeductions: r.total_deductions,
    totalNet: r.total_net,
    payslipCount: r.payslips?.[0]?.count ?? 0,
  }));
}

export async function loadPayRun(orgId: string, id: string): Promise<{ run: PayRunSummary; payslips: PayslipRow[] } | null> {
  const supabase = await createClient();
  const { data: run } = await supabase
    .from("pay_runs")
    .select("id, name, period_start, period_end, pay_date, status, total_gross, total_deductions, total_net")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (!run) return null;

  const [{ data: slips }, { data: adjRows }] = await Promise.all([
    supabase
      .from("payslips")
      .select("id, employee_id, basic, total_earnings, total_deductions, advance_repayment, gross, net_pay, status, employees(first_name, last_name), payslip_items(label, item_type, amount)")
      .eq("organization_id", orgId)
      .eq("pay_run_id", id),
    supabase
      .from("pay_adjustments")
      .select("id, employee_id, label, adjustment_type, amount")
      .eq("organization_id", orgId)
      .eq("pay_run_id", id),
  ]);

  const adjByEmp = new Map<string, { id: string; label: string; type: ComponentType; amount: number }[]>();
  for (const a of (adjRows ?? []) as { id: string; employee_id: string; label: string; adjustment_type: ComponentType; amount: number }[]) {
    const list = adjByEmp.get(a.employee_id) ?? [];
    list.push({ id: a.id, label: a.label, type: a.adjustment_type, amount: a.amount });
    adjByEmp.set(a.employee_id, list);
  }

  const payslips: PayslipRow[] = ((slips ?? []) as unknown as {
    id: string;
    employee_id: string;
    basic: number;
    total_earnings: number;
    total_deductions: number;
    advance_repayment: number;
    gross: number;
    net_pay: number;
    status: PayslipStatus;
    employees: { first_name: string; last_name: string | null } | null;
    payslip_items: { label: string; item_type: ComponentType; amount: number }[];
  }[]).map((s) => ({
    id: s.id,
    employeeId: s.employee_id,
    employeeName: s.employees ? `${s.employees.first_name}${s.employees.last_name ? " " + s.employees.last_name : ""}` : "—",
    basic: s.basic,
    totalEarnings: s.total_earnings,
    totalDeductions: s.total_deductions,
    advanceRepayment: s.advance_repayment,
    gross: s.gross,
    netPay: s.net_pay,
    status: s.status,
    items: (s.payslip_items ?? []).map((i) => ({ label: i.label, itemType: i.item_type, amount: i.amount })),
    adjustments: adjByEmp.get(s.employee_id) ?? [],
  })).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return {
    run: {
      id: run.id,
      name: run.name,
      periodStart: run.period_start,
      periodEnd: run.period_end,
      payDate: run.pay_date,
      status: run.status,
      totalGross: run.total_gross,
      totalDeductions: run.total_deductions,
      totalNet: run.total_net,
      payslipCount: payslips.length,
    },
    payslips,
  };
}

export async function loadAdvances(orgId: string): Promise<Advance[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_advances")
    .select("id, employee_id, advance_type, amount, installments, installment_amount, balance, reason, status, created_at, employees(first_name, last_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as {
    id: string;
    employee_id: string;
    advance_type: AdvanceType;
    amount: number;
    installments: number;
    installment_amount: number;
    balance: number;
    reason: string | null;
    status: AdvanceStatus;
    created_at: string;
    employees: { first_name: string; last_name: string | null } | null;
  }[]).map((a) => ({
    id: a.id,
    employeeId: a.employee_id,
    employeeName: a.employees ? `${a.employees.first_name}${a.employees.last_name ? " " + a.employees.last_name : ""}` : "—",
    advanceType: a.advance_type,
    amount: a.amount,
    installments: a.installments,
    installmentAmount: a.installment_amount,
    balance: a.balance,
    repaid: a.status === "disbursed" || a.status === "settled" ? a.amount - a.balance : 0,
    reason: a.reason,
    status: a.status,
    createdAt: a.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Single payslip document (for the printable payslip)
// ---------------------------------------------------------------------------
export type PayslipDoc = {
  id: string;
  employeeName: string;
  employeeNumber: string;
  department: string | null;
  position: string | null;
  bankName: string | null;
  mobileMoney: string | null;
  runName: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  gross: number;
  totalDeductions: number;
  advanceRepayment: number;
  netPay: number;
  status: PayslipStatus;
};

export async function loadPayslip(orgId: string, payslipId: string): Promise<PayslipDoc | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payslips")
    .select(
      "id, gross, total_deductions, advance_repayment, net_pay, status, " +
        "employees(first_name, last_name, employee_number, bank_name, mobile_money, departments!department_id(name), positions!position_id(title)), " +
        "pay_runs(name, period_start, period_end, pay_date), payslip_items(label, item_type, amount)",
    )
    .eq("organization_id", orgId)
    .eq("id", payslipId)
    .maybeSingle();

  const s = data as unknown as {
    id: string;
    gross: number;
    total_deductions: number;
    advance_repayment: number;
    net_pay: number;
    status: PayslipStatus;
    employees: {
      first_name: string; last_name: string | null; employee_number: string;
      bank_name: string | null; mobile_money: string | null;
      departments: { name: string } | null; positions: { title: string } | null;
    } | null;
    pay_runs: { name: string; period_start: string; period_end: string; pay_date: string } | null;
    payslip_items: { label: string; item_type: ComponentType; amount: number }[];
  } | null;
  if (!s) return null;

  const items = s.payslip_items ?? [];
  return {
    id: s.id,
    employeeName: s.employees ? `${s.employees.first_name}${s.employees.last_name ? " " + s.employees.last_name : ""}` : "—",
    employeeNumber: s.employees?.employee_number ?? "—",
    department: s.employees?.departments?.name ?? null,
    position: s.employees?.positions?.title ?? null,
    bankName: s.employees?.bank_name ?? null,
    mobileMoney: s.employees?.mobile_money ?? null,
    runName: s.pay_runs?.name ?? "Pay run",
    periodStart: s.pay_runs?.period_start ?? "",
    periodEnd: s.pay_runs?.period_end ?? "",
    payDate: s.pay_runs?.pay_date ?? "",
    earnings: items.filter((i) => i.item_type === "earning").map((i) => ({ label: i.label, amount: i.amount })),
    deductions: items.filter((i) => i.item_type === "deduction").map((i) => ({ label: i.label, amount: i.amount })),
    gross: s.gross,
    totalDeductions: s.total_deductions,
    advanceRepayment: s.advance_repayment,
    netPay: s.net_pay,
    status: s.status,
  };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
export type PayrollOverview = {
  lastRunNet: number;
  lastRunName: string | null;
  runCount: number;
  pendingAdvances: number;
  outstandingLoans: number;
  activeComponents: number;
};

export function payrollOverview(runs: PayRunSummary[], advances: Advance[], components: SalaryComponent[]): PayrollOverview {
  const last = runs[0];
  return {
    lastRunNet: last?.totalNet ?? 0,
    lastRunName: last?.name ?? null,
    runCount: runs.length,
    pendingAdvances: advances.filter((a) => a.status === "pending" || a.status === "approved").length,
    outstandingLoans: advances.filter((a) => a.status === "disbursed").reduce((s, a) => s + a.balance, 0),
    activeComponents: components.filter((c) => c.active).length,
  };
}
