"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org";
import { getPlatformContext } from "@/lib/admin/data";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ORG_ROLES = ["admin", "manager", "staff", "cashier", "accountant"] as const;
const MISSING_KEY =
  "User creation isn't configured yet. Add SUPABASE_SERVICE_ROLE_KEY to the server environment (.env.local) and restart.";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Company admin creates a user inside their OWN organization.
// ---------------------------------------------------------------------------
export async function createOrgUser(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { ok: false, error: "Only owners and admins can create users." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "staff");

  if (!fullName) return { ok: false, error: "Enter the person's name." };
  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (!ORG_ROLES.includes(role as (typeof ORG_ROLES)[number])) {
    return { ok: false, error: "Pick a valid role." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  // 1. Create the auth user (email pre-confirmed so they can sign in immediately).
  //    The handle_new_user trigger creates their profile from user_metadata.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Could not create the user." };
  }

  // 2. Add them to this organization with the chosen role.
  const { error: memberErr } = await admin.from("organization_members").insert({
    organization_id: org.orgId,
    user_id: created.user.id,
    role,
  });
  if (memberErr) {
    // Roll back the orphaned auth user so the admin can retry cleanly.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: memberErr.message };
  }

  revalidatePath("/roles");
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Platform admin creates a new company (organization) + its owner user.
// ---------------------------------------------------------------------------
export async function createCompany(formData: FormData): Promise<ActionResult> {
  const { isPlatformAdmin } = await getPlatformContext();
  if (!isPlatformAdmin) return { ok: false, error: "Only platform admins can create companies." };

  const companyName = String(formData.get("company_name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase() || "USD";
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim().toLowerCase();
  const ownerPassword = String(formData.get("owner_password") ?? "");

  if (!companyName) return { ok: false, error: "Enter a company name." };
  if (!ownerName) return { ok: false, error: "Enter the owner's name." };
  if (!validEmail(ownerEmail)) return { ok: false, error: "Enter a valid owner email." };
  if (ownerPassword.length < 6) return { ok: false, error: "Owner password must be at least 6 characters." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  // 1. Create the owner's auth user (profile auto-created by trigger).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: ownerName },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Could not create the owner account." };
  }
  const ownerId = created.user.id;

  // 2. Create the organization owned by them.
  const { data: orgRow, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: companyName, currency, created_by: ownerId })
    .select("id")
    .single();
  if (orgErr || !orgRow) {
    await admin.auth.admin.deleteUser(ownerId);
    return { ok: false, error: orgErr?.message ?? "Could not create the company." };
  }

  // 3. Make them the owner member.
  const { error: memberErr } = await admin
    .from("organization_members")
    .insert({ organization_id: (orgRow as { id: string }).id, user_id: ownerId, role: "owner" });
  if (memberErr) {
    await admin.from("organizations").delete().eq("id", (orgRow as { id: string }).id);
    await admin.auth.admin.deleteUser(ownerId);
    return { ok: false, error: memberErr.message };
  }

  revalidatePath("/platform");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Platform admin suspends / reactivates a company (blocks/unblocks its users).
// ---------------------------------------------------------------------------
export async function setCompanyActive(formData: FormData): Promise<ActionResult> {
  const { isPlatformAdmin } = await getPlatformContext();
  if (!isPlatformAdmin) return { ok: false, error: "Only platform admins can do this." };

  const orgId = String(formData.get("org_id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!orgId) return { ok: false, error: "Missing company." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  const { error } = await admin.from("organizations").update({ is_active: active }).eq("id", orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform");
  revalidatePath(`/platform/${orgId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Platform admin creates a user inside a SPECIFIC company.
// ---------------------------------------------------------------------------
export async function createUserInCompany(formData: FormData): Promise<ActionResult> {
  const { isPlatformAdmin } = await getPlatformContext();
  if (!isPlatformAdmin) return { ok: false, error: "Only platform admins can do this." };

  const orgId = String(formData.get("org_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "staff");

  if (!orgId) return { ok: false, error: "Missing company." };
  if (!fullName) return { ok: false, error: "Enter the person's name." };
  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (!ORG_ROLES.includes(role as (typeof ORG_ROLES)[number])) {
    return { ok: false, error: "Pick a valid role." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return { ok: false, error: createErr?.message ?? "Could not create the user." };
  }

  const { error: memberErr } = await admin.from("organization_members").insert({
    organization_id: orgId,
    user_id: created.user.id,
    role,
  });
  if (memberErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: memberErr.message };
  }

  revalidatePath("/platform");
  revalidatePath(`/platform/${orgId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Platform admin grants/revokes platform-admin on another user (by email).
// ---------------------------------------------------------------------------
export async function setPlatformAdmin(formData: FormData): Promise<ActionResult> {
  const { isPlatformAdmin } = await getPlatformContext();
  if (!isPlatformAdmin) return { ok: false, error: "Only platform admins can do this." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "Enter a valid email address." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  const { data: list } = await admin.auth.admin.listUsers();
  const target = list?.users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!target) return { ok: false, error: "No user with that email." };

  const { error } = await admin.from("profiles").update({ is_platform_admin: true }).eq("id", target.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform");
  return { ok: true };
}
