import { createClient } from "@/lib/supabase/server";
import type { AccountType, JournalSource, JournalStatus } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Account = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  parentId: string | null;
  isActive: boolean;
  isSystem: boolean;
  description: string | null;
};

export type PostedLine = {
  entryId: string;
  entryNumber: string;
  entryDate: string;
  memo: string | null;
  reference: string | null;
  source: JournalSource;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  description: string | null;
  debit: number;
  credit: number;
};

export type JournalEntry = {
  id: string;
  entryNumber: string;
  entryDate: string;
  memo: string | null;
  reference: string | null;
  source: JournalSource;
  status: JournalStatus;
  lines: {
    accountId: string;
    accountCode: string;
    accountName: string;
    description: string | null;
    debit: number;
    credit: number;
  }[];
  totalDebit: number;
  totalCredit: number;
};

export type LedgerData = {
  accounts: Account[];
  postedLines: PostedLine[];
  isSetUp: boolean;
};

// ---------------------------------------------------------------------------
// Normal-balance helpers
// ---------------------------------------------------------------------------
export function isDebitNormal(type: AccountType): boolean {
  return type === "asset" || type === "expense";
}

/** Signed balance in the account's *natural* direction (always ≥ 0 for a normal account). */
export function naturalBalance(type: AccountType, debit: number, credit: number): number {
  return isDebitNormal(type) ? debit - credit : credit - debit;
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------
export async function loadAccounts(orgId: string): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name, type, subtype, parent_id, is_active, is_system, description")
    .eq("organization_id", orgId)
    .order("code", { ascending: true });

  return (data ?? []).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    subtype: a.subtype,
    parentId: a.parent_id,
    isActive: a.is_active,
    isSystem: a.is_system,
    description: a.description,
  }));
}

/** Everything the trial balance / balance sheet / P&L need: accounts + posted lines. */
export async function loadLedger(orgId: string): Promise<LedgerData> {
  const supabase = await createClient();
  const [accountsRes, linesRes] = await Promise.all([
    supabase
      .from("chart_of_accounts")
      .select("id, code, name, type, subtype, parent_id, is_active, is_system, description")
      .eq("organization_id", orgId)
      .order("code", { ascending: true }),
    supabase
      .from("journal_lines")
      .select(
        "account_id, debit, credit, description, chart_of_accounts(code, name, type), journal_entries!inner(id, entry_number, entry_date, memo, reference, source, status)",
      )
      .eq("organization_id", orgId)
      .eq("journal_entries.status", "posted"),
  ]);

  const accounts: Account[] = (accountsRes.data ?? []).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type,
    subtype: a.subtype,
    parentId: a.parent_id,
    isActive: a.is_active,
    isSystem: a.is_system,
    description: a.description,
  }));

  const rows = (linesRes.data ?? []) as unknown as {
    account_id: string;
    debit: number;
    credit: number;
    description: string | null;
    chart_of_accounts: { code: string; name: string; type: AccountType } | null;
    journal_entries: {
      id: string;
      entry_number: string;
      entry_date: string;
      memo: string | null;
      reference: string | null;
      source: JournalSource;
      status: JournalStatus;
    } | null;
  }[];

  const postedLines: PostedLine[] = rows.map((r) => ({
    entryId: r.journal_entries?.id ?? "",
    entryNumber: r.journal_entries?.entry_number ?? "",
    entryDate: r.journal_entries?.entry_date ?? "",
    memo: r.journal_entries?.memo ?? null,
    reference: r.journal_entries?.reference ?? null,
    source: r.journal_entries?.source ?? "manual",
    accountId: r.account_id,
    accountCode: r.chart_of_accounts?.code ?? "",
    accountName: r.chart_of_accounts?.name ?? "",
    accountType: r.chart_of_accounts?.type ?? "asset",
    description: r.description,
    debit: r.debit ?? 0,
    credit: r.credit ?? 0,
  }));

  return { accounts, postedLines, isSetUp: accounts.length > 0 };
}

/** Journal entries with their lines, most recent first. */
export async function loadJournal(orgId: string, limit = 100): Promise<JournalEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select(
      "id, entry_number, entry_date, memo, reference, source, status, journal_lines(account_id, debit, credit, description, line_no, chart_of_accounts(code, name))",
    )
    .eq("organization_id", orgId)
    .order("entry_date", { ascending: false })
    .order("entry_number", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as unknown as {
    id: string;
    entry_number: string;
    entry_date: string;
    memo: string | null;
    reference: string | null;
    source: JournalSource;
    status: JournalStatus;
    journal_lines: {
      account_id: string;
      debit: number;
      credit: number;
      description: string | null;
      line_no: number;
      chart_of_accounts: { code: string; name: string } | null;
    }[];
  }[];

  return rows.map((e) => {
    const lines = [...e.journal_lines]
      .sort((a, b) => a.line_no - b.line_no)
      .map((l) => ({
        accountId: l.account_id,
        accountCode: l.chart_of_accounts?.code ?? "",
        accountName: l.chart_of_accounts?.name ?? "",
        description: l.description,
        debit: l.debit ?? 0,
        credit: l.credit ?? 0,
      }));
    return {
      id: e.id,
      entryNumber: e.entry_number,
      entryDate: e.entry_date,
      memo: e.memo,
      reference: e.reference,
      source: e.source,
      status: e.status,
      lines,
      totalDebit: lines.reduce((s, l) => s + l.debit, 0),
      totalCredit: lines.reduce((s, l) => s + l.credit, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Derived reports (pure functions over LedgerData)
// ---------------------------------------------------------------------------
export type AccountBalance = Account & {
  debit: number; // total debit posted
  credit: number; // total credit posted
  balance: number; // natural balance
};

export function accountBalances(data: LedgerData): AccountBalance[] {
  const totals = new Map<string, { d: number; c: number }>();
  for (const l of data.postedLines) {
    const t = totals.get(l.accountId) ?? { d: 0, c: 0 };
    t.d += l.debit;
    t.c += l.credit;
    totals.set(l.accountId, t);
  }
  return data.accounts.map((a) => {
    const t = totals.get(a.id) ?? { d: 0, c: 0 };
    return { ...a, debit: t.d, credit: t.c, balance: naturalBalance(a.type, t.d, t.c) };
  });
}

export type TrialBalanceRow = { code: string; name: string; type: AccountType; debit: number; credit: number };
export type TrialBalance = { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; balanced: boolean };

export function trialBalance(data: LedgerData): TrialBalance {
  const balances = accountBalances(data).filter((a) => a.debit !== 0 || a.credit !== 0);
  const rows: TrialBalanceRow[] = balances.map((a) => {
    const net = a.debit - a.credit; // signed
    return {
      code: a.code,
      name: a.name,
      type: a.type,
      debit: net > 0 ? net : 0,
      credit: net < 0 ? -net : 0,
    };
  });
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

export type StatementLine = { code: string; name: string; amount: number };
export type StatementGroup = { title: string; lines: StatementLine[]; total: number };

export type BalanceSheet = {
  assets: StatementGroup;
  liabilities: StatementGroup;
  equity: StatementGroup;
  netIncome: number;
  totalAssets: number;
  totalLiabilitiesEquity: number;
  balanced: boolean;
};

export function balanceSheet(data: LedgerData): BalanceSheet {
  const bals = accountBalances(data);
  const group = (type: AccountType, title: string): StatementGroup => {
    const lines = bals
      .filter((a) => a.type === type && Math.abs(a.balance) > 0.001)
      .map((a) => ({ code: a.code, name: a.name, amount: a.balance }));
    return { title, lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  };

  const assets = group("asset", "Assets");
  const liabilities = group("liability", "Liabilities");
  const equity = group("equity", "Equity");

  // Current-period net income rolls into equity (retained earnings) on the sheet.
  const income = bals.filter((a) => a.type === "income").reduce((s, a) => s + a.balance, 0);
  const expense = bals.filter((a) => a.type === "expense").reduce((s, a) => s + a.balance, 0);
  const netIncome = income - expense;

  const equityWithIncome: StatementGroup = {
    title: equity.title,
    lines: [...equity.lines, { code: "—", name: "Current Period Net Income", amount: netIncome }],
    total: equity.total + netIncome,
  };

  const totalAssets = assets.total;
  const totalLiabilitiesEquity = liabilities.total + equityWithIncome.total;

  return {
    assets,
    liabilities,
    equity: equityWithIncome,
    netIncome,
    totalAssets,
    totalLiabilitiesEquity,
    balanced: Math.abs(totalAssets - totalLiabilitiesEquity) < 0.01,
  };
}

export type IncomeStatement = {
  revenue: StatementGroup;
  cogs: StatementGroup;
  grossProfit: number;
  grossMargin: number;
  expenses: StatementGroup;
  operatingIncome: number;
  netIncome: number;
  netMargin: number;
};

export function incomeStatement(data: LedgerData): IncomeStatement {
  const bals = accountBalances(data);
  const revenue: StatementGroup = (() => {
    const lines = bals
      .filter((a) => a.type === "income" && Math.abs(a.balance) > 0.001)
      .map((a) => ({ code: a.code, name: a.name, amount: a.balance }));
    return { title: "Revenue", lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  })();

  const cogs: StatementGroup = (() => {
    const lines = bals
      .filter((a) => a.type === "expense" && a.subtype === "cogs" && Math.abs(a.balance) > 0.001)
      .map((a) => ({ code: a.code, name: a.name, amount: a.balance }));
    return { title: "Cost of Goods Sold", lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  })();

  const expenses: StatementGroup = (() => {
    const lines = bals
      .filter((a) => a.type === "expense" && a.subtype !== "cogs" && Math.abs(a.balance) > 0.001)
      .map((a) => ({ code: a.code, name: a.name, amount: a.balance }));
    return { title: "Operating Expenses", lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  })();

  const grossProfit = revenue.total - cogs.total;
  const operatingIncome = grossProfit - expenses.total;
  const netIncome = operatingIncome;

  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0,
    expenses,
    operatingIncome,
    netIncome,
    netMargin: revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0,
  };
}

// General ledger for one account: chronological lines with a running balance.
export type LedgerRow = PostedLine & { running: number };
export function generalLedger(data: LedgerData, accountId: string): { account: Account | null; rows: LedgerRow[]; opening: number; closing: number } {
  const account = data.accounts.find((a) => a.id === accountId) ?? null;
  const lines = data.postedLines
    .filter((l) => l.accountId === accountId)
    .sort((a, b) => (a.entryDate < b.entryDate ? -1 : a.entryDate > b.entryDate ? 1 : a.entryNumber.localeCompare(b.entryNumber)));
  const debitNormal = account ? isDebitNormal(account.type) : true;
  let running = 0;
  const rows: LedgerRow[] = lines.map((l) => {
    running += debitNormal ? l.debit - l.credit : l.credit - l.debit;
    return { ...l, running };
  });
  return { account, rows, opening: 0, closing: running };
}

// Overview KPIs for the accounting dashboard.
export type AccountingOverview = {
  isSetUp: boolean;
  accountCount: number;
  entryCount: number;
  cash: number;
  receivables: number;
  payables: number;
  netIncome: number;
  revenue: number;
  expenses: number;
  trialBalanced: boolean;
  bsBalanced: boolean;
  recentEntries: PostedLine[];
};

export function accountingOverview(data: LedgerData, entryCount: number): AccountingOverview {
  const bals = accountBalances(data);
  const byType = (t: AccountType) => bals.filter((a) => a.type === t).reduce((s, a) => s + a.balance, 0);
  const bySubtypeBalance = (codePrefixes: string[]) =>
    bals.filter((a) => codePrefixes.some((p) => a.code.startsWith(p))).reduce((s, a) => s + a.balance, 0);

  const tb = trialBalance(data);
  const bs = balanceSheet(data);

  // Recent posted lines grouped by entry (one representative line per entry).
  const seen = new Set<string>();
  const recentEntries = [...data.postedLines]
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : a.entryDate > b.entryDate ? -1 : b.entryNumber.localeCompare(a.entryNumber)))
    .filter((l) => (seen.has(l.entryId) ? false : (seen.add(l.entryId), true)))
    .slice(0, 8);

  return {
    isSetUp: data.isSetUp,
    accountCount: data.accounts.length,
    entryCount,
    cash: bySubtypeBalance(["100", "101", "102"]), // cash + bank + mobile money
    receivables: bySubtypeBalance(["110"]),
    payables: bySubtypeBalance(["200"]),
    revenue: byType("income"),
    expenses: byType("expense"),
    netIncome: byType("income") - byType("expense"),
    trialBalanced: tb.balanced,
    bsBalanced: bs.balanced,
    recentEntries,
  };
}
