import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type ReportSettings = {
  enabled: boolean;
  dailyEnabled: boolean;
  dailyTime: string; // "HH:MM"
  weeklyEnabled: boolean;
  weeklyDow: number; // 0=Sun … 6=Sat
  weeklyTime: string;
  deliverInApp: boolean;
  deliverWhatsapp: boolean;
  deliverEmail: boolean;
  whatsappNumber: string | null;
  whatsappStatus: string; // not_configured | connected | error
  // Email (SMTP) — configurable in-app. The password is server-side only; the
  // settings page blanks it and sets emailHasPassword before sending to the client.
  emailSmtpHost: string | null;
  emailSmtpPort: number | null;
  emailSmtpSecure: boolean;
  emailSmtpUser: string | null;
  emailSmtpPass: string | null;
  emailHasPassword: boolean;
  emailFrom: string | null;
  emailTo: string | null;
  emailStatus: string; // not_configured | pending | connected | error
  lastDailyPeriod: string | null;
  lastWeeklyPeriod: string | null;
};

export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  enabled: false,
  dailyEnabled: true,
  dailyTime: "08:00",
  weeklyEnabled: false,
  weeklyDow: 1,
  weeklyTime: "08:00",
  deliverInApp: true,
  deliverWhatsapp: false,
  deliverEmail: false,
  whatsappNumber: null,
  whatsappStatus: "not_configured",
  emailSmtpHost: null,
  emailSmtpPort: null,
  emailSmtpSecure: true,
  emailSmtpUser: null,
  emailSmtpPass: null,
  emailHasPassword: false,
  emailFrom: null,
  emailTo: null,
  emailStatus: "not_configured",
  lastDailyPeriod: null,
  lastWeeklyPeriod: null,
};

type Row = {
  enabled: boolean; daily_enabled: boolean; daily_time: string; weekly_enabled: boolean; weekly_dow: number; weekly_time: string;
  deliver_inapp: boolean; deliver_whatsapp: boolean; deliver_email: boolean; whatsapp_number: string | null; whatsapp_status: string;
  email_smtp_host?: string | null; email_smtp_port?: number | null; email_smtp_secure?: boolean | null;
  email_smtp_user?: string | null; email_smtp_pass?: string | null; email_from?: string | null; email_to?: string | null; email_status?: string | null;
  last_daily_period: string | null; last_weekly_period: string | null;
};

export function shapeReportSettings(r: Row | null): ReportSettings {
  if (!r) return { ...DEFAULT_REPORT_SETTINGS };
  return {
    enabled: r.enabled,
    dailyEnabled: r.daily_enabled,
    dailyTime: (r.daily_time ?? "08:00").slice(0, 5),
    weeklyEnabled: r.weekly_enabled,
    weeklyDow: r.weekly_dow,
    weeklyTime: (r.weekly_time ?? "08:00").slice(0, 5),
    deliverInApp: r.deliver_inapp,
    deliverWhatsapp: r.deliver_whatsapp,
    deliverEmail: r.deliver_email,
    whatsappNumber: r.whatsapp_number,
    whatsappStatus: r.whatsapp_status ?? "not_configured",
    emailSmtpHost: r.email_smtp_host ?? null,
    emailSmtpPort: r.email_smtp_port ?? null,
    emailSmtpSecure: r.email_smtp_secure ?? true,
    emailSmtpUser: r.email_smtp_user ?? null,
    emailSmtpPass: r.email_smtp_pass ?? null,
    emailHasPassword: !!r.email_smtp_pass,
    emailFrom: r.email_from ?? null,
    emailTo: r.email_to ?? null,
    emailStatus: r.email_status ?? "not_configured",
    lastDailyPeriod: r.last_daily_period,
    lastWeeklyPeriod: r.last_weekly_period,
  };
}

/** Reads the org's agent settings (defaults if the row/table isn't there yet). */
export async function getReportSettings(orgId: string, client?: SupabaseClient): Promise<ReportSettings> {
  try {
    const supabase = (client ?? (await createClient())) as unknown as SupabaseClient;
    const { data, error } = await supabase.from("ai_report_settings").select("*").eq("organization_id", orgId).maybeSingle();
    if (error) return { ...DEFAULT_REPORT_SETTINGS };
    return shapeReportSettings((data as Row | null) ?? null);
  } catch {
    return { ...DEFAULT_REPORT_SETTINGS };
  }
}

/** Client-safe copy: never expose the stored SMTP password to the browser. */
export function toClientSettings(s: ReportSettings): ReportSettings {
  return { ...s, emailSmtpPass: null, emailHasPassword: !!s.emailSmtpPass };
}
