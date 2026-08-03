import { describe, it, expect } from "vitest";
import { financeSummary, profitLoss, receivables, payables, type FinanceRaw } from "@/lib/finance/data";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

const raw: FinanceRaw = {
  transactions: [
    { id: "t1", type: "income", category: "Sales Revenue", description: "sale", amount: 1000, reference: "ORD-1", createdAt: iso(1) },
    { id: "t2", type: "income", category: "Sales Revenue", description: "sale", amount: 500, reference: "ORD-2", createdAt: iso(2) },
    { id: "t3", type: "expense", category: "Inventory Restock", description: "restock", amount: 400, reference: "PO-1", createdAt: iso(3) },
    { id: "t4", type: "expense", category: "Rent", description: "office", amount: 200, reference: "manual", createdAt: iso(4) },
  ],
  salesOrders: [
    { id: "s1", orderNumber: "ORD-1", total: 1000, status: "completed", paymentMethod: "card", createdAt: iso(1), customerName: "Alice", paid: true },
    { id: "s2", orderNumber: "ORD-2", total: 500, status: "completed", paymentMethod: "cash", createdAt: iso(2), customerName: "Bob", paid: true },
    { id: "s3", orderNumber: "ORD-3", total: 300, status: "processing", paymentMethod: "credit", createdAt: iso(45), customerName: "Carol", paid: false },
    { id: "s4", orderNumber: "ORD-4", total: 999, status: "cancelled", paymentMethod: "card", createdAt: iso(5), customerName: "Dan", paid: false },
  ],
  purchaseOrders: [
    { id: "p1", poNumber: "PO-1", total: 400, status: "received", createdAt: iso(3), supplierName: "Apex" },
    { id: "p2", poNumber: "PO-2", total: 250, status: "pending", createdAt: iso(70), supplierName: "Globex" },
  ],
  cogs: 600,
};

describe("financeSummary", () => {
  const s = financeSummary(raw);
  it("sums income as revenue", () => expect(s.revenue).toBe(1500));
  it("sums expenses", () => expect(s.expenses).toBe(600));
  it("computes net profit", () => expect(s.netProfit).toBe(900));
  it("counts unpaid non-cancelled orders as receivables", () => expect(s.receivables).toBe(300));
  it("counts open POs as payables", () => expect(s.payables).toBe(250));
  it("excludes cancelled orders from receivables", () => {
    // ORD-4 (cancelled, unpaid, 999) must not be counted.
    expect(s.receivables).not.toContain(999);
  });
});

describe("profitLoss", () => {
  const pl = profitLoss(raw);
  it("revenue = non-cancelled sales orders", () => expect(pl.revenue).toBe(1800)); // 1000+500+300
  it("gross profit = revenue - COGS", () => expect(pl.grossProfit).toBe(1200)); // 1800-600
  it("opex excludes Inventory Restock", () => expect(pl.opex).toBe(200)); // only Rent
  it("net profit = gross - opex", () => expect(pl.netProfit).toBe(1000));
  it("net margin computed", () => expect(Math.round(pl.netMargin)).toBe(56)); // 1000/1800
});

describe("aging: receivables & payables", () => {
  it("receivables returns only unpaid open orders", () => {
    const rows = receivables(raw);
    expect(rows.map((r) => r.ref)).toEqual(["ORD-3"]);
    expect(rows[0].bucket).toBe("30"); // 45 days → 31-60 bucket
  });
  it("payables returns open POs with aging", () => {
    const rows = payables(raw);
    expect(rows.map((r) => r.ref)).toEqual(["PO-2"]);
    expect(rows[0].bucket).toBe("60"); // 70 days → 61-90 bucket
  });
});
