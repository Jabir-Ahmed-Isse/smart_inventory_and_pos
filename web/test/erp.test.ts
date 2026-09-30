import { describe, it, expect } from "vitest";
import { monthlyEquivalent } from "@/lib/hr/data";
import { monthlyDepreciation, assetsOverview, type FixedAsset } from "@/lib/assets/data";
import { expensesOverview, type Expense, type RecurringExpense } from "@/lib/expenses/data";
import { payrollOverview, type PayRunSummary, type Advance, type SalaryComponent } from "@/lib/payroll/data";

const today = new Date().toISOString().slice(0, 10);

// --- HR: pay-frequency normaliser ----------------------------------------
describe("monthlyEquivalent", () => {
  it("monthly is unchanged", () => expect(monthlyEquivalent(1000, "monthly")).toBe(1000));
  it("weekly → ×52/12", () => expect(Math.round(monthlyEquivalent(1000, "weekly"))).toBe(4333));
  it("biweekly → ×26/12", () => expect(Math.round(monthlyEquivalent(1000, "biweekly"))).toBe(2167));
  it("daily → ×22", () => expect(monthlyEquivalent(100, "daily")).toBe(2200));
});

// --- Fixed assets: straight-line depreciation ----------------------------
describe("monthlyDepreciation", () => {
  it("(cost − salvage) / life", () => expect(monthlyDepreciation(10000, 1000, 60)).toBe(150));
  it("guards against zero life", () => expect(monthlyDepreciation(10000, 0, 0)).toBe(0));
});

function asset(p: Partial<FixedAsset> & { cost: number; accumulatedDepreciation: number; status: FixedAsset["status"] }): FixedAsset {
  return {
    id: "a", assetNumber: "FA-1", name: "Asset", category: "Vehicles", acquisitionDate: today,
    salvageValue: 0, usefulLifeMonths: 60, monthlyDepreciation: 100,
    bookValue: Math.round((p.cost - p.accumulatedDepreciation) * 100) / 100,
    ...p,
  };
}

describe("assetsOverview", () => {
  const o = assetsOverview([
    asset({ cost: 10000, accumulatedDepreciation: 3000, status: "active", monthlyDepreciation: 150 }),
    asset({ cost: 5000, accumulatedDepreciation: 5000, status: "fully_depreciated", monthlyDepreciation: 100 }),
    asset({ cost: 999, accumulatedDepreciation: 0, status: "disposed", monthlyDepreciation: 10 }),
  ]);
  it("excludes disposed assets from the count", () => expect(o.count).toBe(2));
  it("sums cost of non-disposed assets", () => expect(o.totalCost).toBe(15000));
  it("net book value = cost − accumulated", () => expect(o.netBookValue).toBe(7000));
  it("monthly depreciation counts only active assets", () => expect(o.monthlyDepreciation).toBe(150));
});

// --- Expenses overview ----------------------------------------------------
function exp(p: Partial<Expense> & { total: number; status: Expense["status"]; categoryName: string }): Expense {
  return {
    id: "e", expenseNumber: "EXP-1", categoryId: null, supplierId: null, supplierName: null,
    description: null, amount: p.total, taxAmount: 0, expenseDate: today, dueDate: null, ...p,
  };
}
function recur(due: boolean): RecurringExpense {
  return { id: "r", name: "Rent", categoryName: "Rent", supplierName: null, amount: 100, taxAmount: 0, total: 100, recurrence: "monthly", nextDueDate: today, active: true, due };
}

describe("expensesOverview", () => {
  const o = expensesOverview(
    [
      exp({ total: 100, status: "approved", categoryName: "Rent" }),
      exp({ total: 50, status: "paid", categoryName: "Utilities" }),
      exp({ total: 30, status: "draft", categoryName: "Rent" }),
      exp({ total: 999, status: "cancelled", categoryName: "Rent" }),
    ],
    [recur(true), recur(false)],
  );
  it("month total excludes cancelled", () => expect(o.monthTotal).toBe(180));
  it("unpaid = approved-but-not-paid", () => expect(o.unpaid).toBe(100));
  it("counts drafts awaiting approval", () => expect(o.draftCount).toBe(1));
  it("counts recurring items that are due", () => expect(o.dueRecurring).toBe(1));
  it("groups spend by category", () => {
    const rent = o.byCategory.find((c) => c.name === "Rent");
    expect(rent?.amount).toBe(130); // 100 + 30
  });
});

// --- Payroll overview -----------------------------------------------------
function run(totalNet: number, name: string): PayRunSummary {
  return { id: name, name, periodStart: today, periodEnd: today, payDate: today, status: "paid", totalGross: totalNet, totalDeductions: 0, totalNet, payslipCount: 1 };
}
function advance(status: Advance["status"], balance: number): Advance {
  return { id: "x", employeeId: "e", employeeName: "E", advanceType: "loan", amount: 900, installments: 3, installmentAmount: 300, balance, repaid: 900 - balance, reason: null, status, createdAt: today };
}
function comp(active: boolean): SalaryComponent {
  return { id: "c", name: "PAYE", code: null, componentType: "deduction", calcMethod: "percent_basic", amount: 0, rate: 6, isStatutory: true, appliesToAll: true, active };
}

describe("payrollOverview", () => {
  const o = payrollOverview(
    [run(5000, "August"), run(4800, "July")],
    [advance("pending", 0), advance("approved", 0), advance("disbursed", 300), advance("settled", 0)],
    [comp(true), comp(true), comp(false)],
  );
  it("last run net comes from the newest run", () => {
    expect(o.lastRunNet).toBe(5000);
    expect(o.lastRunName).toBe("August");
  });
  it("counts pending + approved advances", () => expect(o.pendingAdvances).toBe(2));
  it("outstanding loans = sum of disbursed balances", () => expect(o.outstandingLoans).toBe(300));
  it("counts only active components", () => expect(o.activeComponents).toBe(2));
});
