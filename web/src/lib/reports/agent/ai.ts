import Anthropic from "@anthropic-ai/sdk";
import type { ReportFacts } from "./facts";
import { fallbackInsight } from "./fallback";

// ---------------------------------------------------------------------------
// AI insight layer. The AI only EXPLAINS/PRIORITIZES/RECOMMENDS over the
// deterministic facts — it never computes numbers, invents customers/products,
// or claims payments. Output is strict JSON, validated before use; on any
// failure we fall back to the deterministic insight so a report ALWAYS exists.
// ---------------------------------------------------------------------------

export type ReportInsight = {
  summary: string;
  highlights: string[];
  warnings: string[];
  inventory_alerts: string[];
  payment_alerts: string[];
  financial_insights: string[];
  recommendations: string[];
};

export type InsightResult = { insight: ReportInsight; source: "gemini" | "anthropic" | "deterministic" };

const SYSTEM = `You are the Business Report analyst inside "Inventory Pro", a multi-tenant ERP/POS.
You are given a JSON object of DETERMINISTIC business facts already computed from the owner's live database.
Your job: explain, compare, prioritize, and recommend — for a busy owner who must grasp the key issues in 10 seconds.

HARD RULES:
- Use ONLY numbers, customers, products, and amounts that appear in the facts JSON. Never invent or estimate any value.
- Never claim a payment was made/reversed, or that stock exists, unless the facts say so.
- Money uses the facts.currency. Be concise and decisive. No fluff, no markdown, no emoji inside values.
- Prioritize in this order: critical financial problems, unpaid money, critical inventory, profit, sales, expenses, reorders, general insight.
- Daily = "what happened today". Weekly = "what happened this week and what trend is developing".
- If facts.branchBreakdown is non-empty, this is a MULTI-BRANCH company: call out the best and worst-performing branch by name with their share of sales (e.g. "Downtown drove 43% of sales; Bakaaraha lagged at 11%"), and flag any branch with heavy unpaid or low stock. If it's empty, do not mention branches.

Return ONLY a JSON object (no prose, no code fences) with EXACTLY these string-array fields:
{"summary": string, "highlights": string[], "warnings": string[], "inventory_alerts": string[], "payment_alerts": string[], "financial_insights": string[], "recommendations": string[]}
Keep each array to at most 5 short items. summary is one or two sentences.`;

function buildPrompt(facts: ReportFacts): string {
  return `Business facts (${facts.period.type} report, ${facts.period.label}, currency ${facts.currency}):\n\n${JSON.stringify(facts)}\n\nReturn the JSON insight object now.`;
}

/** Extracts a JSON object from a model reply (tolerates code fences / stray text). */
function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(cleaned); } catch { /* try to locate a { ... } block */ }
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s >= 0 && e > s) {
    try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
  }
  return null;
}

/** Hand-validates + coerces the model output into a safe ReportInsight, or null. */
function validate(raw: unknown): ReportInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => (x as string).trim()).filter(Boolean).slice(0, 6) : [];
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 600) : "";
  if (!summary) return null;
  return {
    summary,
    highlights: strArr(o.highlights),
    warnings: strArr(o.warnings),
    inventory_alerts: strArr(o.inventory_alerts),
    payment_alerts: strArr(o.payment_alerts),
    financial_insights: strArr(o.financial_insights),
    recommendations: strArr(o.recommendations),
  };
}

// Cap each AI attempt so a slow/hanging provider can't stall report generation;
// on timeout we move on to the next provider (or the deterministic fallback).
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 15000;

async function callGemini(key: string, prompt: string): Promise<ReportInsight | null> {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.3, responseMimeType: "application/json" },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    return validate(extractJson(text));
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(key: string, prompt: string): Promise<ReportInsight | null> {
  const client = new Anthropic({ apiKey: key, timeout: AI_TIMEOUT_MS, maxRetries: 0 });
  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
  return validate(extractJson(text));
}

/**
 * Generates the AI insight for a report. Tries Gemini, then Anthropic, then the
 * deterministic fallback — so a report is ALWAYS produced (AI is an enhancement,
 * not a dependency).
 */
export async function generateInsight(facts: ReportFacts): Promise<InsightResult> {
  const prompt = buildPrompt(facts);
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    try { const i = await callGemini(geminiKey, prompt); if (i) return { insight: i, source: "gemini" }; } catch { /* next */ }
  }
  if (anthropicKey) {
    try { const i = await callAnthropic(anthropicKey, prompt); if (i) return { insight: i, source: "anthropic" }; } catch { /* fallback */ }
  }
  return { insight: fallbackInsight(facts), source: "deterministic" };
}
