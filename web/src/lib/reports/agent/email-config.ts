import { envEmailConfig, type EmailConfig } from "@/lib/notify/email";
import type { ReportSettings } from "./settings";

/**
 * Resolves the effective SMTP config for an org: in-app settings take priority,
 * falling back to server-env values for anything not set in the app. This lets an
 * owner configure email entirely in Settings → AI Reports, while still honouring
 * env config if that's how the operator prefers to run it.
 */
export function reportEmailConfig(s: ReportSettings): EmailConfig {
  const env = envEmailConfig();
  const user = s.emailSmtpUser || env.user;
  return {
    host: s.emailSmtpHost || env.host,
    port: s.emailSmtpPort ?? env.port,
    secure: s.emailSmtpHost ? s.emailSmtpSecure : env.secure, // in-app host → use in-app secure flag
    user,
    pass: s.emailSmtpPass || env.pass,
    from: s.emailFrom || env.from || user || undefined,
    to: s.emailTo || env.to || user || undefined,
  };
}
