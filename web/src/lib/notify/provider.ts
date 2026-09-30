// ---------------------------------------------------------------------------
// Notification provider abstraction. The report agent depends ONLY on this
// interface — providers (in-app, email, WhatsApp) are pluggable/replaceable.
// A message is only "sent" when the provider actually confirms it; an
// unconfigured provider returns "skipped", never a fake success.
// ---------------------------------------------------------------------------

export type DeliveryStatus = "sent" | "failed" | "skipped";
export type DeliveryResult = { status: DeliveryStatus; detail: string };

/** An explicit WhatsApp template to send (overrides free text / the default template). */
export type MessageTemplate = { name: string; languageCode?: string; params?: string[] };

export type OutboundMessage = {
  to: string | null;
  /** Free-form text. Used by generic providers and by Meta inside the 24h window. */
  text: string;
  /**
   * Ordered body variables ({{1}}, {{2}}, …) for the operator's configured Meta
   * report template (WHATSAPP_TEMPLATE_NAME). Ignored unless a default template
   * is configured and no explicit `template` is supplied.
   */
  templateParams?: string[];
  /** Force a specific template (e.g. Meta's built-in "hello_world" for connectivity tests). */
  template?: MessageTemplate;
};

export interface NotificationProvider {
  readonly channel: string;
  /** Whether real credentials are present. If false, send() returns "skipped". */
  readonly configured: boolean;
  send(msg: OutboundMessage): Promise<DeliveryResult>;
}
