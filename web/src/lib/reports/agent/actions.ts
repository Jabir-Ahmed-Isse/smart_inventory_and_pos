"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg, orgHasRole } from "@/lib/org";
import { dailyPeriod, weeklyPeriod } from "./period";
import { getReportSettings } from "./settings";
import { generateReport } from "./generate";
import { deliverReport } from "./deliver";
import { getWhatsAppProvider } from "@/lib/notify/whatsapp";
import { emailProvider } from "@/lib/notify/email";
import { reportEmailConfig } from "./email-config";

export type ActionResult = { ok: true } | { ok: false; error: string };

const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const timeOrDefault = (v: FormDataEntryValue | null, d: string) => {
  const s = String(v ?? "").trim();
  return /^\d{2}:\d{2}$/.test(s) ? s : d;
};

/**
 * Owner/admin saves the AI Business Report Agent configuration. Upserts one row
 * per organization. Tenant-scoped by org id + RLS on ai_report_settings.
 */
export async function updateReportSettings(formData: FormData): Promise<ActionResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) {
    return { ok: false, error: "Only owners and admins can configure reports." };
  }

  const whatsappNumber = String(formData.get("whatsapp_number") ?? "").trim() || null;
  const deliverWhatsapp = bool(formData, "deliver_whatsapp");
  // A number must be present to enable WhatsApp delivery.
  if (deliverWhatsapp && !whatsappNumber) {
    return { ok: false, error: "Enter a WhatsApp number to enable WhatsApp delivery." };
  }

  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Email (SMTP) fields, all editable in-app. The password is write-only: a blank
  // field keeps whatever is already stored (so re-saving doesn't wipe it).
  const str = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v || null; };
  const emailHost = str("email_smtp_host");
  const emailUser = str("email_smtp_user");
  const emailFrom = str("email_from");
  const emailTo = str("email_to");
  const emailSecure = bool(formData, "email_smtp_secure");
  const portRaw = parseInt(String(formData.get("email_smtp_port") ?? ""), 10);
  const emailPort = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : null;
  let emailPass = str("email_smtp_pass");
  if (emailPass) emailPass = emailPass.replace(/\s+/g, ""); // App Passwords are shown with spaces
  if (!emailPass) {
    const { data: cur } = await supabase.from("ai_report_settings").select("email_smtp_pass").eq("organization_id", org.orgId).maybeSingle();
    emailPass = (cur as { email_smtp_pass?: string | null } | null)?.email_smtp_pass ?? null;
  }
  const deliverEmail = bool(formData, "deliver_email");
  if (deliverEmail && !(emailHost || emailUser)) {
    return { ok: false, error: "Enter the email (SMTP) settings below to enable email delivery." };
  }

  const dow = parseInt(String(formData.get("weekly_dow") ?? "1"), 10);
  const row = {
    organization_id: org.orgId,
    enabled: bool(formData, "enabled"),
    daily_enabled: bool(formData, "daily_enabled"),
    daily_time: timeOrDefault(formData.get("daily_time"), "08:00"),
    weekly_enabled: bool(formData, "weekly_enabled"),
    weekly_dow: Number.isFinite(dow) && dow >= 0 && dow <= 6 ? dow : 1,
    weekly_time: timeOrDefault(formData.get("weekly_time"), "08:00"),
    deliver_inapp: bool(formData, "deliver_inapp"),
    deliver_whatsapp: deliverWhatsapp,
    deliver_email: deliverEmail,
    whatsapp_number: whatsappNumber,
    // Honest status: a saved number is only "pending" until a real test send
    // confirms it. sendTestWhatsApp() promotes it to "connected" or "error".
    whatsapp_status: whatsappNumber ? "pending" : "not_configured",
    email_smtp_host: emailHost,
    email_smtp_port: emailPort,
    email_smtp_secure: emailSecure,
    email_smtp_user: emailUser,
    email_smtp_pass: emailPass,
    email_from: emailFrom,
    email_to: emailTo,
    // "pending" once creds exist — a real test send promotes to connected/error.
    email_status: emailPass && (emailHost || emailUser) ? "pending" : "not_configured",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("ai_report_settings").upsert(row, { onConflict: "organization_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

/** Reads the org's timezone (migration-safe: falls back to UTC). */
async function orgTimezone(admin: SupabaseClient, orgId: string): Promise<string> {
  try {
    const { data, error } = await admin.from("organizations").select("timezone").eq("id", orgId).maybeSingle();
    if (error) return "UTC";
    const tz = (data as { timezone?: string | null } | null)?.timezone;
    return tz && tz.trim() ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export type GenerateResult = { ok: true; id: string | null; source: string } | { ok: false; error: string };

/**
 * Owner/admin/manager/accountant generates a report on demand (for testing or a
 * fresh pull). Runs the same pipeline as the scheduler for the CURRENT period.
 * Uses the service-role client (ai_reports has no user INSERT policy).
 */
export async function generateReportNow(type: "daily" | "weekly"): Promise<GenerateResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!orgHasRole(org, ["owner", "admin", "manager", "accountant"])) {
    return { ok: false, error: "You don't have access to generate reports." };
  }
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Reporting isn't configured on the server (missing service-role key)." };

  const tz = await orgTimezone(admin as unknown as SupabaseClient, org.orgId);
  const settings = await getReportSettings(org.orgId, admin as unknown as SupabaseClient);
  const period = type === "weekly" ? weeklyPeriod(tz, new Date(), settings.weeklyDow) : dailyPeriod(tz);

  try {
    const r = await generateReport(admin as unknown as SupabaseClient, org.orgId, org.currency, period);
    // Deliver to the org's enabled channels (in-app / WhatsApp) and log outcomes.
    await deliverReport(admin as unknown as SupabaseClient, r, settings);
    revalidatePath("/reports/ai");
    revalidatePath("/settings");
    return { ok: true, id: r.id, source: r.source };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not generate the report." };
  }
}

export type TestResult = { ok: true; detail: string } | { ok: false; error: string; status?: string };

/**
 * Sends a REAL test WhatsApp message to the org's configured number and records
 * the true outcome — updating whatsapp_status to "connected" only if the
 * provider actually confirms delivery (never faked). Owner/admin only.
 */
export async function sendTestWhatsApp(): Promise<TestResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) return { ok: false, error: "Only owners and admins can test WhatsApp." };

  const supabase = (await createClient()) as unknown as SupabaseClient;
  const setStatus = async (status: string) =>
    supabase.from("ai_report_settings").update({ whatsapp_status: status, updated_at: new Date().toISOString() }).eq("organization_id", org.orgId);

  const settings = await getReportSettings(org.orgId, supabase);
  if (!settings.whatsappNumber) return { ok: false, error: "Add and save a WhatsApp number first." };

  const provider = getWhatsAppProvider();
  if (!provider.configured) {
    await setStatus("not_configured");
    return { ok: false, error: "WhatsApp isn't set up on the server. Add WHATSAPP_PROVIDER + WHATSAPP_API_TOKEN (and SENDER/URL) to the environment.", status: "not_configured" };
  }

  // Use Meta's built-in, always-approved "hello_world" template so the test
  // reaches a cold number (free-form text is blocked outside the 24h window).
  // Generic providers ignore `template` and fall back to the text below.
  const text = `✅ Inventory Pro — test message for ${org.orgName}. Your WhatsApp business reports are connected. You'll receive daily/weekly summaries here.`;
  const res = await provider.send({ to: settings.whatsappNumber, text, template: { name: "hello_world", languageCode: "en_US" } });
  const status = res.status === "sent" ? "connected" : res.status === "skipped" ? "not_configured" : "error";
  await setStatus(status);
  revalidatePath("/settings");

  if (res.status === "sent") return { ok: true, detail: res.detail };
  return { ok: false, error: res.detail, status };
}

/**
 * Sends a REAL test email to the configured recipient (REPORT_EMAIL_TO, or the
 * SMTP user) so the operator can confirm Gmail/SMTP is wired up. Owner/admin only.
 */
export async function sendTestEmail(): Promise<TestResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };
  if (!(org.role === "owner" || org.role === "admin")) return { ok: false, error: "Only owners and admins can test email." };

  const supabase = (await createClient()) as unknown as SupabaseClient;
  const settings = await getReportSettings(org.orgId, supabase);
  const email = emailProvider(reportEmailConfig(settings));
  const setEmailStatus = async (status: string) =>
    supabase.from("ai_report_settings").update({ email_status: status, updated_at: new Date().toISOString() }).eq("organization_id", org.orgId);

  if (!email.configured) {
    await setEmailStatus("not_configured");
    return { ok: false, error: "Email isn't set up yet. Fill in the SMTP host, sender address and App Password below, Save, then test.", status: "not_configured" };
  }
  if (!email.defaultTo) return { ok: false, error: "No recipient email set. Enter a 'Send reports to' address, Save, then test." };

  const res = await email.send({
    subject: `Inventory Pro — test email for ${org.orgName}`,
    text: `This is a test email from Inventory Pro. Your automated business reports are connected and will arrive at this address.`,
    html: `<div style="font:400 15px/1.6 Arial,sans-serif;color:#28324a;padding:16px;">✅ <b>Inventory Pro</b> test email for <b>${org.orgName}</b>.<br><br>Your automated daily/weekly business reports are connected and will arrive at this address.</div>`,
  });
  await setEmailStatus(res.status === "sent" ? "connected" : "error");
  revalidatePath("/settings");
  if (res.status === "sent") return { ok: true, detail: res.detail };
  return { ok: false, error: res.detail };
}
