import { describe, it, expect } from "vitest";
import {
  naturalBalance,
  accountBalances,
  trialBalance,
  balanceSheet,
  incomeStatement,
  generalLedger,
  type Account,
  type PostedLine,
  type LedgerData,
} from "@/lib/accounting/data";
import type { AccountType } from "@/lib/supabase/database.types";

// --- Fixtures -------------------------------------------------------------
function acc(code: string, name: string, type: AccountType, subtype: string | null = null): Account {
  return { id: code, code, name, type, subtype, parentId: null, isActive: true, isSystem: true, description: null };
}

const accounts: Account[] = [
  acc("1000", "Cash", "asset", "current_asset"),
  acc("1100", "Accounts Receivable", "asset", "current_asset"),
  acc("1200", "Inventory", "asset", "current_asset"),
  acc("2000", "Accounts Payable", "liability", "current_liability"),
  acc("2100", "Tax Payable", "liability", "current_liability"),
  acc("3100", "Retained Earnings", "equity", "equity"),
  acc("4000", "Sales Revenue", "income", "operating_income"),
  acc("4200", "Sales Discounts", "income", "contra_income"),
  acc("5000", "COGS", "expense", "cogs"),
  acc("6000", "Rent", "expense", "operating_expense"),
];
const byCode = new Map(accounts.map((a) => [a.code, a]));

let seq = 0;
function line(entryNo: string, code: string, debit: number, credit: number, date = "2026-08-10"): PostedLine {
  const a = byCode.get(code)!;
  return {
    entryId: entryNo,
    entryNumber: entryNo,
    entryDate: date,
    memo: entryNo,
    reference: entryNo,
    source: "manual",
    accountId: a.id,
    accountCode: a.code,
    accountName: a.name,
    accountType: a.type,
    description: `l${seq++}`,
    debit,
    credit,
  };
}

// A sale (Dr Cash 110, Cr Revenue 100, Cr Tax 10 + Dr COGS 60, Cr Inventory 60),
// a purchase (Dr Inventory 200, Cr AP 200), and rent paid (Dr Rent 50, Cr Cash 50).
const postedLines: PostedLine[] = [
  line("JE-1", "1000", 110, 0),
  line("JE-1", "4000", 0, 100),
  line("JE-1", "2100", 0, 10),
  line("JE-1", "5000", 60, 0),
  line("JE-1", "1200", 0, 60),
  line("JE-2", "1200", 200, 0, "2026-08-05"),
  line("JE-2", "2000", 0, 200, "2026-08-05"),
  line("JE-3", "6000", 50, 0, "2026-08-20"),
  line("JE-3", "1000", 0, 50, "2026-08-20"),
];

const ledger: LedgerData = { accounts, postedLines, isSetUp: true };

// --- Tests ----------------------------------------------------------------
describe("naturalBalance", () => {
  it("assets & expenses are debit-normal", () => {
    expect(naturalBalance("asset", 100, 30)).toBe(70);
    expect(naturalBalance("expense", 100, 30)).toBe(70);
  });
  it("liabilities, equity & income are credit-normal", () => {
    expect(naturalBalance("liability", 30, 100)).toBe(70);
    expect(naturalBalance("equity", 30, 100)).toBe(70);
    expect(naturalBalance("income", 30, 100)).toBe(70);
  });
});

describe("accountBalances", () => {
  const balById = new Map(accountBalances(ledger).map((b) => [b.code, b.balance]));
  it("nets cash correctly (110 in − 50 out)", () => expect(balById.get("1000")).toBe(60));
  it("nets inventory (200 in − 60 out)", () => expect(balById.get("1200")).toBe(140));
  it("credit-normal payable is positive", () => expect(balById.get("2000")).toBe(200));
  it("revenue is credit-normal positive", () => expect(balById.get("4000")).toBe(100));
});

describe("trialBalance", () => {
  const tb = trialBalance(ledger);
  it("total debits equal total credits", () => expect(tb.totalDebit).toBe(tb.totalCredit));
  it("is flagged balanced", () => expect(tb.balanced).toBe(true));
  it("debit total is 310", () => expect(tb.totalDebit).toBe(310));
  it("omits zero-activity accounts", () => {
    expect(tb.rows.find((r) => r.code === "1100")).toBeUndefined(); // AR untouched
  });
});

describe("incomeStatement", () => {
  const pl = incomeStatement(ledger);
  it("revenue = 100", () => expect(pl.revenue.total).toBe(100));
  it("COGS = 60, gross profit = 40", () => {
    expect(pl.cogs.total).toBe(60);
    expect(pl.grossProfit).toBe(40);
  });
  it("operating expenses exclude COGS (Rent 50)", () => expect(pl.expenses.total).toBe(50));
  it("net income = 40 − 50 = −10", () => expect(pl.netIncome).toBe(-10));
});

describe("balanceSheet", () => {
  const bs = balanceSheet(ledger);
  it("total assets = 200 (Cash 60 + Inventory 140)", () => expect(bs.totalAssets).toBe(200));
  it("liabilities = 210 (AP 200 + Tax 10)", () => expect(bs.liabilities.total).toBe(210));
  it("current-period net income rolls into equity (−10)", () => expect(bs.netIncome).toBe(-10));
  it("assets equal liabilities + equity", () => {
    expect(bs.totalAssets).toBe(bs.totalLiabilitiesEquity);
    expect(bs.balanced).toBe(true);
  });
  it("net income matches the income statement", () => {
    expect(bs.netIncome).toBe(incomeStatement(ledger).netIncome);
  });
});

describe("generalLedger", () => {
  const gl = generalLedger(ledger, "1000"); // Cash
  it("orders postings by date with a running balance", () => {
    expect(gl.rows.map((r) => r.running)).toEqual([110, 60]);
  });
  it("closing balance equals the account balance", () => expect(gl.closing).toBe(60));
});

describe("trialBalance detects an unbalanced ledger", () => {
  it("flags balanced=false when a credit is dropped", () => {
    const broken: LedgerData = { accounts, postedLines: postedLines.slice(0, -1), isSetUp: true };
    const tb = trialBalance(broken);
    expect(tb.balanced).toBe(false);
  });
});
