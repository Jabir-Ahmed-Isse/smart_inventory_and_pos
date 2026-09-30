import { describe, it, expect } from "vitest";
import { dailyPeriod, weeklyPeriod, localClock } from "@/lib/reports/agent/period";
import { buildWhatsAppMessage, buildWhatsAppTemplateParams } from "@/lib/reports/agent/whatsapp-message";
import { buildMetaPayload, buildTwilioBody, buildGreenApiRequest, buildCallMeBotUrl, sanitizeTemplateParam } from "@/lib/notify/whatsapp";
import { fallbackInsight } from "@/lib/reports/agent/fallback";
import type { ReportFacts } from "@/lib/reports/agent/facts";

const DAY = 86400000;

function facts(over: Partial<ReportFacts> = {}): ReportFacts {
  return {
    period: { type: "daily", label: "August 20, 2026", start: "", end: "", timezone: "Africa/Mogadishu" },
    currency: "USD",
    sales: { total: 4280, orders: 186, avgOrder: 23.01, discounts: 40, tax: 0, paidTotal: 3640, dueTotal: 640, byPaymentMethod: [], topProducts: [{ name: "Coca-Cola 500ml", sku: "CC-500", units: 184, revenue: 276 }], topCategory: { category: "Beverages", revenue: 900 }, prevTotal: 3800, changePct: 12.6 },
    payments: { collected: 3640, unpaid: 640 },
    unpaidOrders: Array.from({ length: 7 }, (_, i) => ({ orderNumber: `SO-${i}`, customerName: `Customer ${i}`, total: 100, paid: 0, due: 100 - i, date: "Aug 20", daysOutstanding: i })),
    reversals: [],
    profit: { revenue: 4280, cogs: 2100, grossProfit: 2180, expenses: 740, netProfit: 1440, marginPct: 33.6, prevNetProfit: 1200, changePct: 20 },
    expenses: { total: 740, byCategory: [{ category: "Transport", amount: 240 }], largest: [{ description: "Fuel", amount: 240 }] },
    inventory: { totalSkus: 1240, inventoryValue: 50000, outOfStock: 4, critical: 3, lowStock: 12 },
    lowStockItems: [],
    criticalStock: [],
    reorderRecommendations: [{ name: "Coca-Cola 500ml", sku: "CC-500", warehouse: "Main", qty: 42, minStock: 20, avgDailySales: 31, daysRemaining: 1.4, recommendedReorder: 140, supplier: null }],
    receivables: { total: 920, customers: [{ customerName: "Ahmed Trading", outstanding: 920, orders: 3, oldestDueDays: 18 }] },
    purchasing: { purchases: 0, purchaseOrders: 0, pendingOrders: 2 },
    branchBreakdown: [],
    ...over,
  };
}

describe("report periods (timezone-aware)", () => {
  const tz = "Africa/Mogadishu"; // UTC+3, no DST
  const ref = new Date("2026-08-20T05:00:00Z"); // 08:00 local on Aug 20

  it("daily period is the local calendar day, 24h wide", () => {
    const p = dailyPeriod(tz, ref);
    expect(p.periodStart).toBe("2026-08-20");
    expect(p.periodEnd).toBe("2026-08-20");
    expect(new Date(p.endISO).getTime() - new Date(p.startISO).getTime()).toBe(DAY);
    // start is Aug 20 00:00 +03 == Aug 19 21:00 UTC
    expect(p.startISO).toBe("2026-08-19T21:00:00.000Z");
    // previous comparable day is the 24h before
    expect(new Date(p.startISO).getTime() - new Date(p.prevStartISO).getTime()).toBe(DAY);
  });

  it("weekly period spans 7 local days and contains the reference day", () => {
    const p = weeklyPeriod(tz, ref, 1 /* Monday start */);
    expect(new Date(p.endISO).getTime() - new Date(p.startISO).getTime()).toBe(7 * DAY);
    expect(p.periodStart <= "2026-08-20").toBe(true);
    expect("2026-08-20" <= p.periodEnd).toBe(true);
  });

  it("localClock reports the wall time in the tz", () => {
    const c = localClock(tz, ref);
    expect(c.dateKey).toBe("2026-08-20");
    expect(c.hhmm).toBe("08:00");
  });
});

describe("WhatsApp message (concise)", () => {
  const msg = buildWhatsAppMessage(facts(), null, "daily");
  it("includes headline figures", () => {
    expect(msg).toContain("Daily Report");
    expect(msg).toContain("$4,280");
    expect(msg).toContain("186 orders");
    expect(msg).toContain("Unpaid");
  });
  it("truncates long unpaid lists to the top 5", () => {
    expect(msg).toContain("Customer 0");
    expect(msg).toContain("and 2 more"); // 7 unpaid → shows 5 + "and 2 more"
    expect(msg).not.toContain("Customer 6");
  });
  it("adds a By branch block for multi-branch orgs, omits it otherwise", () => {
    expect(msg).not.toContain("By branch"); // default facts have empty branchBreakdown
    const multi = buildWhatsAppMessage(
      facts({ branchBreakdown: [
        { name: "Downtown", sales: 3000, orders: 12, sharePct: 60 },
        { name: "Airport", sales: 2000, orders: 8, sharePct: 40 },
      ] }),
      null, "weekly",
    );
    expect(multi).toContain("By branch");
    expect(multi).toContain("Downtown");
    expect(multi).toContain("60%");
  });
});

describe("WhatsApp template params (Meta, single-line)", () => {
  const params = buildWhatsAppTemplateParams(facts(), null);
  it("produces exactly 6 ordered body variables", () => {
    expect(params).toHaveLength(6);
    expect(params[0]).toBe("August 20, 2026");
    expect(params[1]).toContain("$4,280");
    expect(params[1]).toContain("186 orders");
    expect(params[2]).toContain("Unpaid");
    expect(params[4]).toContain("critical");
    expect(params[5]).toContain("Reorder Coca-Cola 500ml");
  });
  it("never contains newlines (Meta rejects them in variables)", () => {
    for (const p of params) expect(p).not.toMatch(/[\r\n\t]/);
  });
  it("falls back to a healthy-stock action when nothing needs reordering", () => {
    const p = buildWhatsAppTemplateParams(facts({ reorderRecommendations: [] }), null);
    expect(p[5]).toContain("healthy");
  });
});

describe("sanitizeTemplateParam", () => {
  it("collapses newlines/tabs and caps length", () => {
    expect(sanitizeTemplateParam("a\nb\tc")).toBe("a b c");
    expect(sanitizeTemplateParam("x".repeat(2000)).length).toBe(1024);
  });
});

describe("buildMetaPayload", () => {
  const meta = { provider: "meta", templateLang: "en_US" as const };

  it("sends free-form text when no template is configured", () => {
    const p = buildMetaPayload(meta, "252616797807", { to: "252616797807", text: "hi" });
    expect(p.type).toBe("text");
    expect(p).toMatchObject({ messaging_product: "whatsapp", to: "252616797807", text: { body: "hi" } });
  });

  it("uses the configured report template with sanitized body params", () => {
    const cfg = { ...meta, templateName: "inventory_report" };
    const p = buildMetaPayload(cfg, "252616797807", { to: "252616797807", text: "ignored", templateParams: ["a\nb", "c"] }) as Record<string, any>;
    expect(p.type).toBe("template");
    expect(p.template.name).toBe("inventory_report");
    expect(p.template.language.code).toBe("en_US");
    expect(p.template.components[0].parameters).toEqual([{ type: "text", text: "a b" }, { type: "text", text: "c" }]);
  });

  it("an explicit template (hello_world) overrides everything, no body when no params", () => {
    const cfg = { ...meta, templateName: "inventory_report" };
    const p = buildMetaPayload(cfg, "252616797807", { to: "252616797807", text: "hi", template: { name: "hello_world", languageCode: "en_US" } }) as Record<string, any>;
    expect(p.type).toBe("template");
    expect(p.template.name).toBe("hello_world");
    expect(p.template.components).toBeUndefined();
  });
});

describe("buildTwilioBody", () => {
  const cfg = { provider: "twilio", templateLang: "en_US" as const, sender: "+14155238886", accountSid: "AC123" };
  it("form-encodes with whatsapp: prefixes and adds a missing +", () => {
    const body = buildTwilioBody(cfg, "252616797807", "hello there");
    const p = new URLSearchParams(body);
    expect(p.get("From")).toBe("whatsapp:+14155238886");
    expect(p.get("To")).toBe("whatsapp:+252616797807");
    expect(p.get("Body")).toBe("hello there");
  });
  it("keeps an existing + on the recipient", () => {
    const p = new URLSearchParams(buildTwilioBody(cfg, "+252616797807", "hi"));
    expect(p.get("To")).toBe("whatsapp:+252616797807");
  });
});

describe("buildGreenApiRequest", () => {
  const cfg = { provider: "greenapi", templateLang: "en_US" as const, idInstance: "1101000001", apiToken: "abc123" };
  it("puts id + token in the URL and sends a @c.us chatId", () => {
    const { url, body } = buildGreenApiRequest(cfg, "+252 616 797 807", "hi there");
    expect(url).toBe("https://api.green-api.com/waInstance1101000001/sendMessage/abc123");
    const j = JSON.parse(body);
    expect(j.chatId).toBe("252616797807@c.us");
    expect(j.message).toBe("hi there");
  });
  it("honours a custom base URL and strips a trailing slash", () => {
    const { url } = buildGreenApiRequest({ ...cfg, apiUrl: "https://7105.api.greenapi.com/" }, "252616797807", "x");
    expect(url).toBe("https://7105.api.greenapi.com/waInstance1101000001/sendMessage/abc123");
  });
});

describe("buildCallMeBotUrl", () => {
  const cfg = { provider: "callmebot", templateLang: "en_US" as const, apiToken: "9988776" };
  it("builds a GET url with phone, text and apikey (encoded)", () => {
    const url = buildCallMeBotUrl(cfg, "252616797807", "Sales up 12%");
    expect(url.startsWith("https://api.callmebot.com/whatsapp.php?")).toBe(true);
    const q = new URL(url).searchParams;
    expect(q.get("phone")).toBe("+252616797807");
    expect(q.get("text")).toBe("Sales up 12%");
    expect(q.get("apikey")).toBe("9988776");
  });
  it("keeps an existing + and honours a custom base", () => {
    const url = buildCallMeBotUrl({ ...cfg, apiUrl: "https://proxy.example.com/" }, "+252616797807", "hi");
    expect(url.startsWith("https://proxy.example.com/whatsapp.php?")).toBe(true);
    expect(new URL(url).searchParams.get("phone")).toBe("+252616797807");
  });
});

describe("deterministic fallback insight", () => {
  const ins = fallbackInsight(facts());
  it("always produces a grounded summary and arrays", () => {
    expect(ins.summary.length).toBeGreaterThan(0);
    expect(ins.summary).toContain("$4,280");
    expect(Array.isArray(ins.highlights)).toBe(true);
    expect(ins.highlights.some((h) => h.includes("$"))).toBe(true);
    expect(ins.recommendations.length).toBeGreaterThan(0);
  });
});
