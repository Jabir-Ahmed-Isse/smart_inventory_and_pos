import type { SupabaseClient } from "@supabase/supabase-js";
import { getWhatsAppProvider } from "@/lib/notify/whatsapp";
import { emailProvider } from "@/lib/notify/email";
import { reportEmailConfig } from "./email-config";
import type { DeliveryStatus } from "@/lib/notify/provider";
import type { ReportSettings } from "./settings";
import type { GeneratedReport } from "./generate";
import { recordDelivery } from "./generate";
import { buildWhatsAppMessage, buildWhatsAppTemplateParams } from "./whatsapp-message";
import { buildReportEmail } from "./email-message";

export type DeliveryEntry = { channel: string; status: DeliveryStatus; detail: string };

/**
 * Delivers a generated report to every channel the org enabled, and records the
 * outcome on the report's delivery log. In-app is inherently "sent" (the report
 * is saved & viewable). WhatsApp goes through the provider — which only reports
 * "sent" on real confirmation; unconfigured → "skipped". Email is a stub until
 * an email provider is wired.
 */
export async function deliverReport(admin: SupabaseClient, report: GeneratedReport, settings: ReportSettings): Promise<DeliveryEntry[]> {
  const results: DeliveryEntry[] = [];

  if (settings.deliverInApp) {
    results.push({ channel: "inapp", status: "sent", detail: "Saved to report history" });
  }

  if (settings.deliverWhatsapp) {
    const provider = getWhatsAppProvider();
    if (!settings.whatsappNumber) {
      results.push({ channel: "whatsapp", status: "skipped", detail: "No WhatsApp number set" });
    } else {
      // Free-form text (used within Meta's 24h window / by generic providers) plus
      // structured params for the report template (proactive sends outside 24h).
      const text = buildWhatsAppMessage(report.facts, report.insight, report.reportType);
      const templateParams = buildWhatsAppTemplateParams(report.facts, report.insight);
      const r = await provider.send({ to: settings.whatsappNumber, text, templateParams });
      results.push({ channel: "whatsapp", status: r.status, detail: r.detail });
    }
  }

  if (settings.deliverEmail) {
    const email = emailProvider(reportEmailConfig(settings));
    if (!email.configured) {
      results.push({ channel: "email", status: "skipped", detail: "Email provider not configured" });
    } else if (!email.defaultTo) {
      results.push({ channel: "email", status: "skipped", detail: "No recipient email set (REPORT_EMAIL_TO)" });
    } else {
      const { subject, html, text } = buildReportEmail(report.facts, report.insight, report.reportType);
      const r = await email.send({ subject, html, text });
      results.push({ channel: "email", status: r.status, detail: r.detail });
    }
  }

  if (report.id) {
    for (const r of results) await recordDelivery(admin, report.id, r.channel, r.status, r.detail);
  }
  return results;
}
