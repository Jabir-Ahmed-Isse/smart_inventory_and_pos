"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import type { EmploymentType, PayFrequency, EmployeeStatus, AttendanceStatus } from "@/lib/supabase/database.types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const HR_ROLES = ["owner", "admin", "manager", "accountant"];
const HR_PATHS = ["/hr", "/hr/employees", "/hr/departments", "/hr/leave", "/hr/attendance"];
function revalidateHr() {
  for (const p of HR_PATHS) revalidatePath(p);
}

async function guard() {
  const org = await getActiveOrg();
  if (!org) return { org: null, error: "You are not signed in." };
  if (!HR_ROLES.includes(org.role)) return { org: null, error: "Not allowed." };
  return { org, error: null as string | null };
}

/** Seed standard leave types. */
export async function seedHr(): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase.rpc("seed_hr", { p_org: org.orgId });
  if (err) return { ok: false, error: err.message };
  revalidateHr();
  return { ok: true, message: "Leave types installed." };
}

export async function createDepartment(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Department name is required." };
  const supabase = await createClient();
  const { error: err } = await supabase.from("departments").insert({
    organization_id: org.orgId,
    name,
    code: String(formData.get("code") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (err) return { ok: false, error: err.code === "23505" ? "A department with that name already exists." : err.message };
  revalidateHr();
  return { ok: true, message: "Department created." };
}

export async function createPosition(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Position title is required." };
  const supabase = await createClient();
  const { error: err } = await supabase.from("positions").insert({
    organization_id: org.orgId,
    title,
    department_id: String(formData.get("department_id") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (err) return { ok: false, error: err.message };
  revalidateHr();
  return { ok: true, message: "Position created." };
}

export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };

  const firstName = String(formData.get("first_name") ?? "").trim();
  if (!firstName) return { ok: false, error: "First name is required." };

  const salary = parseFloat(String(formData.get("base_salary") ?? "0")) || 0;
  if (salary < 0) return { ok: false, error: "Salary can't be negative." };

  const supabase = await createClient();

  let employeeNumber = String(formData.get("employee_number") ?? "").trim();
  if (!employeeNumber) {
    const { count } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.orgId);
    employeeNumber = `EMP-${String((count ?? 0) + 1).padStart(4, "0")}`;
  }

  const { error: err } = await supabase.from("employees").insert({
    organization_id: org.orgId,
    employee_number: employeeNumber,
    first_name: firstName,
    last_name: String(formData.get("last_name") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    gender: String(formData.get("gender") ?? "").trim() || null,
    national_id: String(formData.get("national_id") ?? "").trim() || null,
    department_id: String(formData.get("department_id") ?? "").trim() || null,
    position_id: String(formData.get("position_id") ?? "").trim() || null,
    employment_type: (String(formData.get("employment_type") ?? "full_time") as EmploymentType),
    hire_date: String(formData.get("hire_date") ?? "").trim() || new Date().toISOString().slice(0, 10),
    base_salary: Math.round(salary * 100) / 100,
    pay_frequency: (String(formData.get("pay_frequency") ?? "monthly") as PayFrequency),
    bank_name: String(formData.get("bank_name") ?? "").trim() || null,
    bank_account: String(formData.get("bank_account") ?? "").trim() || null,
    mobile_money: String(formData.get("mobile_money") ?? "").trim() || null,
    emergency_contact_name: String(formData.get("emergency_contact_name") ?? "").trim() || null,
    emergency_contact_phone: String(formData.get("emergency_contact_phone") ?? "").trim() || null,
  });
  if (err) return { ok: false, error: err.code === "23505" ? `Employee number ${employeeNumber} already exists.` : err.message };
  revalidateHr();
  return { ok: true, message: "Employee added." };
}

export async function setEmployeeStatus(id: string, status: EmployeeStatus): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const patch: { status: EmployeeStatus; termination_date?: string } = { status };
  if (status === "terminated") patch.termination_date = new Date().toISOString().slice(0, 10);
  const { error: err } = await supabase.from("employees").update(patch).eq("id", id).eq("organization_id", org.orgId);
  if (err) return { ok: false, error: err.message };
  revalidateHr();
  return { ok: true, message: "Employee updated." };
}

function inclusiveDays(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 0;
  return Math.floor((e - s) / 86400000) + 1;
}

export async function createLeaveRequest(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };

  const employeeId = String(formData.get("employee_id") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  if (!employeeId) return { ok: false, error: "Choose an employee." };
  if (!startDate || !endDate) return { ok: false, error: "Start and end dates are required." };
  if (endDate < startDate) return { ok: false, error: "End date must be on or after the start date." };

  const daysField = parseFloat(String(formData.get("days") ?? ""));
  const days = Number.isFinite(daysField) && daysField > 0 ? daysField : inclusiveDays(startDate, endDate);

  const supabase = await createClient();
  const { error: err } = await supabase.from("leave_requests").insert({
    organization_id: org.orgId,
    employee_id: employeeId,
    leave_type_id: String(formData.get("leave_type_id") ?? "").trim() || null,
    start_date: startDate,
    end_date: endDate,
    days,
    reason: String(formData.get("reason") ?? "").trim() || null,
    status: "pending",
    created_by: org.userId,
  });
  if (err) return { ok: false, error: err.message };
  revalidateHr();
  return { ok: true, message: "Leave request submitted." };
}

export async function decideLeave(id: string, decision: "approved" | "rejected" | "cancelled"): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const supabase = await createClient();
  const { error: err } = await supabase
    .from("leave_requests")
    .update({ status: decision, approved_by: org.userId, approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", org.orgId);
  if (err) return { ok: false, error: err.message };
  revalidateHr();
  return { ok: true, message: `Leave ${decision}.` };
}

export async function markAttendance(formData: FormData): Promise<ActionResult> {
  const { org, error } = await guard();
  if (!org) return { ok: false, error: error! };
  const employeeId = String(formData.get("employee_id") ?? "").trim();
  const workDate = String(formData.get("work_date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!employeeId) return { ok: false, error: "Choose an employee." };

  const checkIn = String(formData.get("check_in") ?? "").trim() || null;
  const checkOut = String(formData.get("check_out") ?? "").trim() || null;
  let hours = parseFloat(String(formData.get("hours") ?? "")) || 0;
  if (!hours && checkIn && checkOut) {
    const [ih, im] = checkIn.split(":").map(Number);
    const [oh, om] = checkOut.split(":").map(Number);
    hours = Math.max(0, Math.round(((oh * 60 + om - (ih * 60 + im)) / 60) * 100) / 100);
  }

  const supabase = await createClient();
  const { error: err } = await supabase.from("attendance").upsert(
    {
      organization_id: org.orgId,
      employee_id: employeeId,
      work_date: workDate,
      status: (String(formData.get("status") ?? "present") as AttendanceStatus),
      check_in: checkIn,
      check_out: checkOut,
      hours,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
    { onConflict: "employee_id,work_date" },
  );
  if (err) return { ok: false, error: err.message };
  revalidateHr();
  return { ok: true, message: "Attendance recorded." };
}
