"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getActiveOrg } from "@/lib/org";
import { getAiSnapshot, type AiSnapshot } from "./insights";
import { money } from "@/lib/data";

export type AssistantResult =
  | { ok: true; answer: string; grounded: boolean }
  | { ok: false; error: string };

const SYSTEM = `You are the Intelligence Assistant inside "Smart Inventory & POS", an inventory and point-of-sale platform.
You answer the operator's questions about THEIR business using ONLY the JSON snapshot of their live data provided in the message.

Rules:
- Ground every figure in the snapshot. Never invent products, SKUs, or numbers that aren't there.
- Be concise and decisive: lead with the answer, then 2-4 short supporting bullets max.
- Format money in the snapshot's currency. Use "- " for bullet points (plain markdown, no tables).
- For reorder / dead-stock / low-stock questions, use the precomputed reorder[] and deadStock[] arrays.
- If the snapshot has no data to answer, say so plainly and suggest what to add (e.g. record a sale, add a product).
- You are an analyst, not a salesperson. No fluff, no emoji.`;

function grounding(s: AiSnapshot): string {
  return `Here is a live snapshot of the operator's inventory & sales data (currency: ${s.currency}). All figures are computed from their real database:\n\n${JSON.stringify(
    s,
    null,
    0,
  )}`;
}

export async function askAssistant(question: string): Promise<AssistantResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "You are not signed in." };

  const q = question.trim().slice(0, 500);
  if (!q) return { ok: false, error: "Ask a question about your inventory." };

  const snapshot = await getAiSnapshot(org.orgId, org.currency);

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const prompt = `${grounding(snapshot)}\n\nQuestion: ${q}`;

  // Prefer whichever LLM provider is configured; fall back to the deterministic
  // engine when none is set or a provider call fails.
  if (geminiKey) {
    try {
      const answer = await callGemini(geminiKey, SYSTEM, prompt);
      if (answer) return { ok: true, answer, grounded: true };
    } catch {
      /* fall through to next provider / deterministic */
    }
  }

  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const res = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (text) return { ok: true, answer: text, grounded: true };
    } catch {
      /* fall through to deterministic */
    }
  }

  // No live provider (or the call failed): answer from the built-in analyst,
  // which is fully grounded in the real snapshot. We surface the offline state
  // once via `grounded: false` (the UI can badge it) rather than appending a
  // disclaimer to every message.
  const answer = deterministicAnswer(q, snapshot);
  return { ok: true, answer, grounded: false };
}

/**
 * Calls the Google Gemini API (Generative Language REST endpoint) grounded in
 * the org snapshot. The key is sent as a header, never in the URL.
 * Override the model with GEMINI_MODEL (defaults to gemini-2.0-flash).
 */
async function callGemini(key: string, system: string, user: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

// ---------------------------------------------------------------------------
// Deterministic fallback: a rule-based analyst that answers the common
// questions straight from the snapshot. Lets the feature work end-to-end
// (grounded in real data) even before an ANTHROPIC_API_KEY is configured.
// ---------------------------------------------------------------------------
function deterministicAnswer(question: string, s: AiSnapshot): string {
  const q = question.toLowerCase();
  const cur = s.currency;
  const has = (...w: string[]) => w.some((k) => q.includes(k));

  if (s.productCount === 0) {
    return "Your workspace has no products yet, so there's nothing to analyze. Add a product and record a few sales, then ask me again.";
  }

  // Reorder / restock
  if (has("reorder", "restock", "order more", "buy", "replenish", "low stock", "running low", "low on")) {
    if (s.reorder.length === 0) {
      return "Nothing needs reordering right now — every product is above its reorder point.";
    }
    const lines = s.reorder
      .slice(0, 6)
      .map(
        (r) =>
          `- **${r.name}** (${r.sku}) — ${r.qty} on hand${
            r.urgency === "out" ? " (out of stock)" : ""
          }. Suggest ordering **${r.suggestedOrder}** units · ${r.reason}.`,
      )
      .join("\n");
    return `${s.reorder.length} product${s.reorder.length === 1 ? "" : "s"} at or below reorder point. Top priorities:\n${lines}`;
  }

  // Dead stock
  if (has("dead stock", "dead-stock", "not selling", "slow moving", "stale", "excess", "overstock")) {
    if (s.deadStock.length === 0) {
      return "No dead stock detected — everything you hold has sold within the last 90 days.";
    }
    const tied = s.deadStock.reduce((a, d) => a + d.value, 0);
    const lines = s.deadStock
      .slice(0, 6)
      .map((d) => `- **${d.name}** (${d.sku}) — ${d.qty} units, ${money(d.value, cur)} tied up · ${d.note}.`)
      .join("\n");
    return `${s.deadStock.length} SKU${s.deadStock.length === 1 ? "" : "s"} at dead-stock risk, holding ${money(
      tied,
      cur,
    )} of idle inventory:\n${lines}`;
  }

  // Revenue / sales
  if (has("revenue", "sales", "today", "how much", "earn", "made", "income", "money")) {
    const parts = [
      `- Today: **${money(s.todaySales.total, cur)}** across ${s.todaySales.count} order${
        s.todaySales.count === 1 ? "" : "s"
      }.`,
      `- Last 7 days: **${money(s.revenue7d, cur)}** · last 30 days: **${money(s.revenue30d, cur)}**.`,
      `- Net profit to date (income − expenses): **${money(s.net, cur)}**.`,
    ];
    if (s.trendPct !== 0) {
      parts.push(
        `- Week-over-week revenue is ${s.trendPct > 0 ? "up" : "down"} **${Math.abs(s.trendPct)}%**.`,
      );
    }
    return `Here's your sales picture:\n${parts.join("\n")}`;
  }

  // Top / best sellers
  if (has("top", "best", "popular", "selling well", "bestseller", "best-seller")) {
    if (s.topSellers.length === 0) {
      return "No sales have been recorded yet, so there are no top sellers to rank. Ring up a sale in the POS and I'll start tracking velocity.";
    }
    const lines = s.topSellers
      .map((t, i) => `${i + 1}. **${t.name}** (${t.sku}) — ${t.unitsSold} units, ${money(t.revenue, cur)}.`)
      .join("\n");
    return `Your best sellers by revenue:\n${lines}`;
  }

  // Inventory value / worth
  if (has("value", "worth", "inventory value", "how many", "count", "stock level", "on hand")) {
    return [
      `- You carry **${s.productCount}** products worth **${money(s.inventoryValue, cur)}** at retail.`,
      `- **${s.lowStockCount}** low on stock, **${s.outOfStockCount}** out of stock.`,
      `- Active customers: **${s.customerCount}**.`,
    ].join("\n");
  }

  // Fallback overview
  return [
    `Here's a quick read on your business:`,
    `- **${s.productCount}** products · **${money(s.inventoryValue, cur)}** inventory value.`,
    `- Today's sales: **${money(s.todaySales.total, cur)}** (${s.todaySales.count} orders).`,
    `- **${s.reorder.length}** need reordering · **${s.deadStock.length}** at dead-stock risk.`,
    ``,
    `Try asking: "what should I reorder?", "show dead stock", "today's revenue", or "top sellers".`,
  ].join("\n");
}
