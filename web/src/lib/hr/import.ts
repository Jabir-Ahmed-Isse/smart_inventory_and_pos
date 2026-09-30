"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org";
import type { Database, EmploymentType, PayFrequency } from "@/lib/supabase/database.types";

type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"];

export type EmployeeImportRow = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  employmentType?: string;
  hireDate?: string;
  baseSalary?: number | string;
  payFrequency?: string;
  bankName?: string;
  mobileMoney?: string;
};

export type EmployeeImportResult =
  | { ok: true; imported: number; skipped: number; departmentsCreated: number; positionsCreated: number }
  | { ok: false; error: string };

const HR_ROLES = ["owner", "admin", "manager", "accountant"];

function normEmployment(s: string | undefined): EmploymentType {
  const v = (s ?? "").toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  const map: Record<string, EmploymentType> = {
    full_time: "full_time", fulltime: "full_time", full: "full_time", permanent: "full_time",
    part_time: "part_time", parttime: "part_time", part: "part_time",
    contract: "contract", contractor: "contract",
    intern: "intern", internship: "intern",
    temporary: "temporary", temp: "temporary", casual: "temporary",
  };
  return map[v] ?? "full_time";
}

function normFrequency(s: string | undefined): PayFrequency {
  const v = (s ?? "").toLowerCase();
  if (/bi|fortn/.test(v)) return "biweekly";
  if (/week/.test(v)) return "weekly";
  if (/dai|day/.test(v)) return "daily";
  return "monthly";
}

function normDate(s: string | undefined): string {
  const v = (s ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

function num(v: number | string | undefined): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Bulk-imports employees, auto-creating any departments/positions named in the data. */
export async function importEmployees(rows: EmployeeImportRow[]): Promise<EmployeeImportResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!HR_ROLES.includes(org.role)) return { ok: false, error: "Only management roles can import employees." };

  const clean = rows.filter((r) => r.firstName && r.firstName.trim());
  if (clean.length === 0) return { ok: false, error: "No valid rows found (every employee needs a first name)." };
  if (clean.length > 2000) return { ok: false, error: "Too many rows (max 2000 per import)." };

  const supabase = await createClient();

  // --- Departments: match by name, create the missing ones ------------------
  const { data: existingDepts } = await supabase.from("departments").select("id, name").eq("organization_id", org.orgId);
  const deptByName = new Map<string, string>();
  for (const d of existingDepts ?? []) deptByName.set(d.name.trim().toLowerCase(), d.id);

  const wantedDepts = [...new Set(clean.map((r) => (r.department ?? "").trim()).filter(Boolean))];
  const newDepts = wantedDepts.filter((d) => !deptByName.has(d.toLowerCase()));
  let departmentsCreated = 0;
  if (newDepts.length > 0) {
    const { data: created, error } = await supabase
      .from("departments")
      .insert(newDepts.map((name) => ({ organization_id: org.orgId, name })))
      .select("id, name");
    if (error) return { ok: false, error: `Department setup failed: ${error.message}` };
    for (const d of created ?? []) deptByName.set(d.name.trim().toLowerCase(), d.id);
    departmentsCreated = created?.length ?? 0;
  }
  const deptId = (name?: string) => (name ? deptByName.get(name.trim().toLowerCase()) ?? null : null);

  // --- Positions: match by title, create the missing ones -------------------
  const { data: existingPos } = await supabase.from("positions").select("id, title").eq("organization_id", org.orgId);
  const posByTitle = new Map<string, string>();
  for (const p of existingPos ?? []) posByTitle.set(p.title.trim().toLowerCase(), p.id);

  const wantedPos = new Map<string, string | null>(); // title -> a department it appears with
  for (const r of clean) {
    const t = (r.position ?? "").trim();
    if (t && !posByTitle.has(t.toLowerCase()) && !wantedPos.has(t.toLowerCase())) {
      wantedPos.set(t.toLowerCase(), r.department ?? null);
    }
  }
  let positionsCreated = 0;
  if (wantedPos.size > 0) {
    const titleCase = new Map(clean.filter((r) => r.position).map((r) => [r.position!.trim().toLowerCase(), r.position!.trim()]));
    const { data: created, error } = await supabase
      .from("positions")
      .insert([...wantedPos.entries()].map(([keyLower, dept]) => ({
        organization_id: org.orgId,
        title: titleCase.get(keyLower) ?? keyLower,
        department_id: deptId(dept ?? undefined),
      })))
      .select("id, title");
    if (error) return { ok: false, error: `Position setup failed: ${error.message}` };
    for (const p of created ?? []) posByTitle.set(p.title.trim().toLowerCase(), p.id);
    positionsCreated = created?.length ?? 0;
  }
  const posId = (title?: string) => (title ? posByTitle.get(title.trim().toLowerCase()) ?? null : null);

  // --- Existing employees: skip duplicates by email, else by full name ------
  const { data: existingEmp } = await supabase
    .from("employees")
    .select("email, first_name, last_name, employee_number")
    .eq("organization_id", org.orgId);
  const existingEmails = new Set((existingEmp ?? []).filter((e) => e.email).map((e) => e.email!.trim().toLowerCase()));
  const existingNames = new Set((existingEmp ?? []).map((e) => `${e.first_name} ${e.last_name ?? ""}`.trim().toLowerCase()));
  let maxNum = 0;
  for (const e of existingEmp ?? []) {
    const m = /(\d+)/.exec(e.employee_number ?? "");
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }

  // --- Build the insert payload, skipping duplicates ------------------------
  const seen = new Set<string>();
  const payload: EmployeeInsert[] = [];
  let skipped = 0;
  for (const r of clean) {
    const email = (r.email ?? "").trim().toLowerCase();
    const fullName = `${r.firstName} ${r.lastName ?? ""}`.trim().toLowerCase();
    const key = email || fullName;
    if (seen.has(key) || (email && existingEmails.has(email)) || (!email && existingNames.has(fullName))) {
      skipped++;
      continue;
    }
    seen.add(key);
    maxNum += 1;
    payload.push({
      organization_id: org.orgId,
      employee_number: `EMP-${String(maxNum).padStart(4, "0")}`,
      first_name: r.firstName.trim(),
      last_name: (r.lastName ?? "").trim() || null,
      email: (r.email ?? "").trim() || null,
      phone: (r.phone ?? "").trim() || null,
      department_id: deptId(r.department),
      position_id: posId(r.position),
      employment_type: normEmployment(r.employmentType),
      hire_date: normDate(r.hireDate),
      base_salary: Math.round(num(r.baseSalary) * 100) / 100,
      pay_frequency: normFrequency(r.payFrequency),
      bank_name: (r.bankName ?? "").trim() || null,
      mobile_money: (r.mobileMoney ?? "").trim() || null,
      status: "active" as const,
    });
  }

  if (payload.length === 0) return { ok: true, imported: 0, skipped, departmentsCreated, positionsCreated };

  const { error: insErr, count } = await supabase.from("employees").insert(payload, { count: "exact" });
  if (insErr) return { ok: false, error: `Import failed: ${insErr.message}` };

  revalidatePath("/hr");
  revalidatePath("/hr/employees");
  revalidatePath("/hr/departments");
  return { ok: true, imported: count ?? payload.length, skipped, departmentsCreated, positionsCreated };
}
