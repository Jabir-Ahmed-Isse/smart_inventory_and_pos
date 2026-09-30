import type { DeliveryResult } from "./provider";

// ---------------------------------------------------------------------------
// Email provider (SMTP). Vendor-neutral — works with Gmail, Outlook, or any SMTP
// host. Credentials stay server-side (env only). It NEVER reports "sent" unless
// the SMTP server accepts the message; unconfigured → "skipped".
//
// Gmail: host smtp.gmail.com, port 465 (secure), user = your address,
// pass = a Google *App Password* (not your login password — needs 2-Step
// Verification enabled, then myaccount.google.com/apppasswords).
// ---------------------------------------------------------------------------

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from?: string;
  to?: string;
};

/** Server-env SMTP config — used as the fallback under any in-app settings. */
export function envEmailConfig(): EmailConfig {
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secureEnv = process.env.SMTP_SECURE;
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number.isFinite(port) ? port : 465,
    secure: secureEnv != null ? secureEnv === "true" : port === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.REPORT_EMAIL_TO || process.env.SMTP_USER,
  };
}

export type EmailMessage = { to?: string | null; subject: string; html: string; text: string };

export interface EmailProvider {
  readonly configured: boolean;
  /** The default recipient (REPORT_EMAIL_TO, falling back to SMTP_USER). */
  readonly defaultTo: string | null;
  send(msg: EmailMessage): Promise<DeliveryResult>;
}

class SmtpEmailProvider implements EmailProvider {
  readonly configured: boolean;
  readonly defaultTo: string | null;
  constructor(private cfg: EmailConfig) {
    this.configured = !!cfg.host && !!cfg.user && !!cfg.pass;
    this.defaultTo = cfg.to ?? null;
  }

  async send(msg: EmailMessage): Promise<DeliveryResult> {
    if (!this.configured) return { status: "skipped", detail: "Email provider not configured" };
    const to = msg.to || this.cfg.to;
    if (!to) return { status: "skipped", detail: "No recipient email set" };
    try {
      // Loaded lazily so this Node-only package never enters the static module
      // graph (keeps it out of the edge/instrumentation webpack compilation).
      const nodemailer = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport({
        host: this.cfg.host,
        port: this.cfg.port,
        secure: this.cfg.secure,
        auth: { user: this.cfg.user as string, pass: this.cfg.pass as string },
        // Fail fast instead of hanging if the SMTP host is slow/unreachable.
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      });
      const info = await transport.sendMail({
        from: this.cfg.from,
        to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      });
      return { status: "sent", detail: `Delivered to ${to}${info.messageId ? ` (${info.messageId})` : ""}` };
    } catch (e) {
      return { status: "failed", detail: e instanceof Error ? e.message : "Email send failed" };
    }
  }
}

/** Build a provider from an explicit config (e.g. per-org in-app settings). */
export function emailProvider(cfg: EmailConfig): EmailProvider {
  return new SmtpEmailProvider(cfg);
}

/** Convenience: a provider from server-env config. */
export function getEmailProvider(): EmailProvider {
  return new SmtpEmailProvider(envEmailConfig());
}
