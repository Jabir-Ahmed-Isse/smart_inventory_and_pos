import { describe, it, expect } from "vitest";
import { stageIndex, WORKFLOW_STEPS, STATUS_META } from "@/lib/purchasing/data";
import { money, compactMoney } from "@/lib/data";

describe("purchase workflow stage mapping", () => {
  it("maps statuses to workflow steps", () => {
    expect(stageIndex("draft")).toBe(0);
    expect(stageIndex("pending")).toBe(2);
    expect(stageIndex("partial")).toBe(3);
    expect(stageIndex("received")).toBe(4);
    expect(stageIndex("cancelled")).toBe(-1);
  });
  it("has a full workflow of 8 steps", () => {
    expect(WORKFLOW_STEPS.length).toBe(8);
    expect(WORKFLOW_STEPS[0].key).toBe("rfq");
    expect(WORKFLOW_STEPS[WORKFLOW_STEPS.length - 1].key).toBe("done");
  });
  it("has a label + style for every status", () => {
    for (const s of ["draft", "pending", "partial", "received", "overdue", "cancelled"]) {
      expect(STATUS_META[s]).toBeDefined();
      expect(STATUS_META[s].label.length).toBeGreaterThan(0);
    }
  });
});

describe("money formatting", () => {
  it("formats whole and fractional amounts", () => {
    expect(money(1000, "USD")).toBe("$1,000");
    expect(money(12.5, "USD")).toBe("$12.50");
  });
  it("shows exact amounts below 1M, compacts only millions+", () => {
    expect(compactMoney(1010, "USD")).toBe("$1,010");
    expect(compactMoney(1500, "USD")).toBe("$1,500");
    expect(compactMoney(999999, "USD")).toBe("$999,999");
    expect(compactMoney(1_250_000, "USD")).toBe("$1.3M");
  });
});
