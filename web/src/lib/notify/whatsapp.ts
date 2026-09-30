import type { NotificationProvider, OutboundMessage, DeliveryResult, MessageTemplate } from "./provider";

// ---------------------------------------------------------------------------
// WhatsApp provider. Deliberately NOT tied to a specific vendor: it reads a
// generic server-side config (never client-exposed). Supported shapes:
//   - "meta"   → Meta WhatsApp Cloud API (Graph endpoint + bearer token)
//   - "twilio" → Twilio WhatsApp (Basic auth SID:token, form-encoded; great for
//                a sandbox demo — free-form text, no Meta business account)
//   - "greenapi"→ GREEN-API gateway (id+token in URL path; free tier, global,
//                links the operator's own WhatsApp via QR — no business account)
//   - "callmebot"→ CallMeBot free personal API (GET; no signup; only messages the
//                number that granted the key — the owner receives their own reports)
//   - "generic"→ POST {to, from, text} to a custom WHATSAPP_API_URL
//   - unset    → mock: sends nothing, reports "skipped / not configured"
// It NEVER reports success unless the provider returns a 2xx. Credentials stay
// server-side (env only).
//
// Meta message types:
//   - Free-form text ("text") only reaches a user WITHIN 24h of them messaging
//     the business. Proactive daily/weekly reports fall outside that window, so
//     they MUST use a pre-approved message template.
//   - When WHATSAPP_TEMPLATE_NAME is set, report sends use that template with
//     `templateParams` as its {{1}}, {{2}}, … body variables. Meta forbids
//     newlines/tabs/4+ spaces inside a variable, so params are sanitised here.
//   - An explicit `msg.template` (e.g. Meta's built-in "hello_world") overrides
//     everything — used by the connectivity test.
// ---------------------------------------------------------------------------

type WaConfig = {
  provider: string;
  apiUrl?: string;
  apiToken?: string;
  sender?: string;
  accountSid?: string;
  idInstance?: string;
  templateName?: string;
  templateLang: string;
};

function readConfig(): WaConfig {
  return {
    provider: (process.env.WHATSAPP_PROVIDER || "mock").toLowerCase(),
    apiUrl: process.env.WHATSAPP_API_URL,
    apiToken: process.env.WHATSAPP_API_TOKEN,
    sender: process.env.WHATSAPP_SENDER,
    accountSid: process.env.WHATSAPP_ACCOUNT_SID,
    idInstance: process.env.WHATSAPP_GREENAPI_ID_INSTANCE,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim() || undefined,
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en_US",
  };
}

/**
 * Builds a GREEN-API sendMessage request. Pure so it can be unit-tested.
 * GREEN-API puts the instance id + token in the URL path and expects a JSON body
 * of { chatId: "<digits>@c.us", message }. Free tier, works globally, links the
 * operator's own WhatsApp via QR — no business account.
 */
export function buildGreenApiRequest(cfg: WaConfig, to: string, text: string): { url: string; body: string } {
  const base = (cfg.apiUrl?.replace(/\/+$/, "")) || "https://api.green-api.com";
  const chatId = `${to.replace(/\D/g, "")}@c.us`;
  return {
    url: `${base}/waInstance${cfg.idInstance}/sendMessage/${cfg.apiToken}`,
    body: JSON.stringify({ chatId, message: text }),
  };
}

/**
 * Builds the Twilio "Messages" POST body (application/x-www-form-urlencoded).
 * Pure so it can be unit-tested. Twilio needs E.164 numbers with a "whatsapp:"
 * prefix and sends free-form text (no template needed inside the sandbox
 * session / 24h window).
 */
export function buildTwilioBody(cfg: WaConfig, to: string, text: string): string {
  const wa = (n: string) => `whatsapp:${n.startsWith("+") ? n : `+${n}`}`;
  return new URLSearchParams({ From: wa(cfg.sender ?? ""), To: wa(to), Body: text }).toString();
}

/** Meta forbids newlines, tabs and runs of 4+ spaces inside a template variable. */
export function sanitizeTemplateParam(v: string): string {
  return v
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, "   ")
    .trim()
    .slice(0, 1024);
}

/**
 * Builds the Meta Cloud API request body for a message. Pure (no I/O) so it can
 * be unit-tested. Decides text vs template:
 *   1. explicit msg.template  → that template (params optional)
 *   2. cfg.templateName set    → the configured report template, params = msg.templateParams
 *   3. otherwise               → free-form text (24h window only)
 */
export function buildMetaPayload(cfg: WaConfig, to: string, msg: OutboundMessage): Record<string, unknown> {
  const base = { messaging_product: "whatsapp", to };

  const asTemplate = (t: MessageTemplate, params: string[]): Record<string, unknown> => {
    const clean = params.map(sanitizeTemplateParam).filter((p) => p.length > 0);
    const components = clean.length
      ? [{ type: "body", parameters: clean.map((text) => ({ type: "text", text })) }]
      : [];
    return {
      ...base,
      type: "template",
      template: {
        name: t.name,
        language: { code: t.languageCode || cfg.templateLang },
        ...(components.length ? { components } : {}),
      },
    };
  };

  if (msg.template) return asTemplate(msg.template, msg.template.params ?? []);
  if (cfg.templateName) return asTemplate({ name: cfg.templateName }, msg.templateParams ?? [msg.text]);
  return { ...base, type: "text", text: { body: msg.text } };
}

/**
 * Builds the CallMeBot WhatsApp URL (a simple GET). Pure so it can be unit-tested.
 * CallMeBot is a free personal service: it only messages the number that granted
 * the API key, so `to` is that same owner number. No signup — perfect for a demo
 * where the business owner receives their own reports.
 */
export function buildCallMeBotUrl(cfg: WaConfig, to: string, text: string): string {
  const base = (cfg.apiUrl?.replace(/\/+$/, "")) || "https://api.callmebot.com";
  const phone = to.startsWith("+") ? to : `+${to}`;
  const qs = new URLSearchParams({ phone, text, apikey: cfg.apiToken ?? "" });
  return `${base}/whatsapp.php?${qs.toString()}`;
}

class WhatsAppProvider implements NotificationProvider {
  readonly channel = "whatsapp";
  readonly configured: boolean;
  constructor(private cfg: WaConfig) {
    this.configured =
      cfg.provider !== "mock" &&
      !!cfg.apiToken &&
      (cfg.provider === "meta" ? !!cfg.sender
        : cfg.provider === "twilio" ? !!cfg.sender && !!cfg.accountSid
        : cfg.provider === "greenapi" ? !!cfg.idInstance
        : cfg.provider === "callmebot" ? true
        : !!cfg.apiUrl);
  }

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    if (!this.configured) return { status: "skipped", detail: "WhatsApp provider not configured" };
    if (!msg.to) return { status: "skipped", detail: "No recipient number set" };
    const to = msg.to.replace(/[^\d+]/g, "");
    try {
      // CallMeBot returns HTTP 200 with a plain-text body even on some errors,
      // so it's handled separately: only a queued/success body counts as "sent".
      if (this.cfg.provider === "callmebot") {
        const r = await fetch(buildCallMeBotUrl(this.cfg, to, msg.text), { method: "GET" });
        const body = (await r.text().catch(() => "")).trim();
        const looksFailed = !r.ok || /error|invalid|not valid|apikey/i.test(body);
        if (looksFailed) return { status: "failed", detail: `CallMeBot ${r.status}${body ? `: ${body.slice(0, 160)}` : ""}` };
        return { status: "sent", detail: "Delivered via callmebot" };
      }

      let res: Response;
      if (this.cfg.provider === "meta") {
        // Meta WhatsApp Cloud API — text OR template (see buildMetaPayload).
        res = await fetch(`https://graph.facebook.com/v20.0/${this.cfg.sender}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiToken}` },
          body: JSON.stringify(buildMetaPayload(this.cfg, to, msg)),
        });
      } else if (this.cfg.provider === "twilio") {
        // Twilio WhatsApp — Basic auth (Account SID : Auth Token), form-encoded.
        // Free-form text; the sandbox needs the recipient to join first.
        const auth = Buffer.from(`${this.cfg.accountSid}:${this.cfg.apiToken}`).toString("base64");
        res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.cfg.accountSid}/Messages.json`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
          body: buildTwilioBody(this.cfg, to, msg.text),
        });
      } else if (this.cfg.provider === "greenapi") {
        // GREEN-API — id + token live in the URL path (see buildGreenApiRequest).
        const { url, body } = buildGreenApiRequest(this.cfg, to, msg.text);
        res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      } else {
        // Generic HTTP endpoint the operator configured (text only).
        res = await fetch(this.cfg.apiUrl as string, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiToken}` },
          body: JSON.stringify({ to, from: this.cfg.sender ?? null, text: msg.text }),
        });
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { status: "failed", detail: `Provider ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}` };
      }
      const usedTemplate = this.cfg.provider === "meta" && (!!msg.template || !!this.cfg.templateName);
      return { status: "sent", detail: `Delivered via ${this.cfg.provider}${usedTemplate ? " template" : ""}` };
    } catch (e) {
      return { status: "failed", detail: e instanceof Error ? e.message : "Send failed" };
    }
  }
}

export function getWhatsAppProvider(): NotificationProvider {
  return new WhatsAppProvider(readConfig());
}
