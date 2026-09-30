import { createClient } from "@/lib/supabase/server";
import type {
  EmploymentType,
  EmployeeStatus,
  PayFrequency,
  LeaveStatus,
  AttendanceStatus,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  departmentId: string | null;
  departmentName: string | null;
  positionId: string | null;
  positionTitle: string | null;
  managerId: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  hireDate: string;
  baseSalary: number;
  payFrequency: PayFrequency;
  photoUrl: string | null;
};

export type Department = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  managerEmployeeId: string | null;
  headcount: number;
};

export type Position = { id: string; title: string; departmentId: string | null; departmentName: string | null };

export type LeaveType = { id: string; name: string; code: string | null; isPaid: boolean; defaultDays: number; color: string | null };

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string | null;
  leaveTypeName: string | null;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
};

export type AttendanceRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  workDate: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  hours: number;
};

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------
export async function loadEmployees(orgId: string): Promise<Employee[]> {
  const supabase = await createClient();
  // `employees` has TWO relationships to `departments` (department_id, and the
  // reverse departments.manager_employee_id), so the embed must name the FK
  // column explicitly — otherwise PostgREST errors on the ambiguity and the
  // whole query returns null (an empty roster despite rows existing).
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, employee_number, first_name, last_name, email, phone, department_id, position_id, manager_id, employment_type, status, hire_date, base_salary, pay_frequency, photo_url, departments!department_id(name), positions!position_id(title)",
    )
    .eq("organization_id", orgId)
    .order("employee_number", { ascending: true });
  if (error) console.error("loadEmployees failed:", error.message);

  const rows = (data ?? []) as unknown as {
    id: string;
    employee_number: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    department_id: string | null;
    position_id: string | null;
    manager_id: string | null;
    employment_type: EmploymentType;
    status: EmployeeStatus;
    hire_date: string;
    base_salary: number;
    pay_frequency: PayFrequency;
    photo_url: string | null;
    departments: { name: string } | null;
    positions: { title: string } | null;
  }[];

  return rows.map((e) => ({
    id: e.id,
    employeeNumber: e.employee_number,
    firstName: e.first_name,
    lastName: e.last_name,
    fullName: `${e.first_name}${e.last_name ? " " + e.last_name : ""}`,
    email: e.email,
    phone: e.phone,
    departmentId: e.department_id,
    departmentName: e.departments?.name ?? null,
    positionId: e.position_id,
    positionTitle: e.positions?.title ?? null,
    managerId: e.manager_id,
    employmentType: e.employment_type,
    status: e.status,
    hireDate: e.hire_date,
    baseSalary: e.base_salary,
    payFrequency: e.pay_frequency,
    photoUrl: e.photo_url,
  }));
}

export async function loadDepartments(orgId: string): Promise<Department[]> {
  const supabase = await createClient();
  const [deptRes, empRes] = await Promise.all([
    supabase.from("departments").select("id, name, code, description, manager_employee_id").eq("organization_id", orgId).order("name"),
    supabase.from("employees").select("department_id").eq("organization_id", orgId).neq("status", "terminated"),
  ]);

  const counts = new Map<string, number>();
  for (const r of (empRes.data ?? []) as { department_id: string | null }[]) {
    if (r.department_id) counts.set(r.department_id, (counts.get(r.department_id) ?? 0) + 1);
  }

  return ((deptRes.data ?? []) as { id: string; name: string; code: string | null; description: string | null; manager_employee_id: string | null }[]).map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    managerEmployeeId: d.manager_employee_id,
    headcount: counts.get(d.id) ?? 0,
  }));
}

export async function loadPositions(orgId: string): Promise<Position[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("positions")
    .select("id, title, department_id, departments(name)")
    .eq("organization_id", orgId)
    .order("title");
  return ((data ?? []) as unknown as { id: string; title: string; department_id: string | null; departments: { name: string } | null }[]).map((p) => ({
    id: p.id,
    title: p.title,
    departmentId: p.department_id,
    departmentName: p.departments?.name ?? null,
  }));
}

export async function loadLeaveTypes(orgId: string): Promise<LeaveType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leave_types")
    .select("id, name, code, is_paid, default_days, color")
    .eq("organization_id", orgId)
    .order("name");
  return ((data ?? []) as { id: string; name: string; code: string | null; is_paid: boolean; default_days: number; color: string | null }[]).map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    isPaid: t.is_paid,
    defaultDays: t.default_days,
    color: t.color,
  }));
}

export async function loadLeaveRequests(orgId: string): Promise<LeaveRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leave_requests")
    .select("id, employee_id, leave_type_id, start_date, end_date, days, reason, status, employees(first_name, last_name), leave_types(name)")
    .eq("organization_id", orgId)
    .order("start_date", { ascending: false });

  return ((data ?? []) as unknown as {
    id: string;
    employee_id: string;
    leave_type_id: string | null;
    start_date: string;
    end_date: string;
    days: number;
    reason: string | null;
    status: LeaveStatus;
    employees: { first_name: string; last_name: string | null } | null;
    leave_types: { name: string } | null;
  }[]).map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employees ? `${r.employees.first_name}${r.employees.last_name ? " " + r.employees.last_name : ""}` : "—",
    leaveTypeId: r.leave_type_id,
    leaveTypeName: r.leave_types?.name ?? null,
    startDate: r.start_date,
    endDate: r.end_date,
    days: r.days,
    reason: r.reason,
    status: r.status,
  }));
}

export async function loadAttendance(orgId: string, workDate: string): Promise<AttendanceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, employee_id, work_date, status, check_in, check_out, hours, employees(first_name, last_name)")
    .eq("organization_id", orgId)
    .eq("work_date", workDate);

  return ((data ?? []) as unknown as {
    id: string;
    employee_id: string;
    work_date: string;
    status: AttendanceStatus;
    check_in: string | null;
    check_out: string | null;
    hours: number;
    employees: { first_name: string; last_name: string | null } | null;
  }[]).map((a) => ({
    id: a.id,
    employeeId: a.employee_id,
    employeeName: a.employees ? `${a.employees.first_name}${a.employees.last_name ? " " + a.employees.last_name : ""}` : "—",
    workDate: a.work_date,
    status: a.status,
    checkIn: a.check_in,
    checkOut: a.check_out,
    hours: a.hours,
  }));
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
export type HrOverview = {
  headcount: number;
  active: number;
  onLeave: number;
  newHires: number;
  monthlyPayroll: number;
  pendingLeave: number;
  byDepartment: { name: string; count: number }[];
  byType: { type: EmploymentType; count: number }[];
};

/** Normalise any pay frequency to an approximate monthly figure. */
export function monthlyEquivalent(salary: number, freq: PayFrequency): number {
  switch (freq) {
    case "weekly": return salary * 52 / 12;
    case "biweekly": return salary * 26 / 12;
    case "daily": return salary * 22;
    default: return salary; // monthly
  }
}

export function hrOverview(employees: Employee[], departments: Department[], leave: LeaveRequest[]): HrOverview {
  const nonTerminated = employees.filter((e) => e.status !== "terminated");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const byType = (["full_time", "part_time", "contract", "intern", "temporary"] as EmploymentType[])
    .map((type) => ({ type, count: nonTerminated.filter((e) => e.employmentType === type).length }))
    .filter((t) => t.count > 0);

  return {
    headcount: nonTerminated.length,
    active: employees.filter((e) => e.status === "active").length,
    onLeave: employees.filter((e) => e.status === "on_leave").length,
    newHires: employees.filter((e) => e.hireDate >= monthStart).length,
    monthlyPayroll: nonTerminated.reduce((s, e) => s + monthlyEquivalent(e.baseSalary, e.payFrequency), 0),
    pendingLeave: leave.filter((l) => l.status === "pending").length,
    byDepartment: departments.map((d) => ({ name: d.name, count: d.headcount })).sort((a, b) => b.count - a.count),
    byType,
  };
}
