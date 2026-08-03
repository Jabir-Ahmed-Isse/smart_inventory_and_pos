import { describe, it, expect } from "vitest";
import { roleCan, navGroups } from "@/lib/nav";

describe("roleCan", () => {
  it("allows everyone when no roles set", () => {
    expect(roleCan("staff", undefined)).toBe(true);
    expect(roleCan(undefined, undefined)).toBe(true);
  });
  it("blocks a role not in the allow-list", () => {
    expect(roleCan("staff", ["owner", "admin"])).toBe(false);
    expect(roleCan("accountant", ["owner", "admin", "manager"])).toBe(false);
  });
  it("allows a role in the allow-list", () => {
    expect(roleCan("admin", ["owner", "admin"])).toBe(true);
    expect(roleCan("manager", ["owner", "admin", "manager"])).toBe(true);
  });
  it("blocks undefined role against a restricted item", () => {
    expect(roleCan(undefined, ["owner", "admin"])).toBe(false);
  });
});

describe("nav access model", () => {
  const items = navGroups.flatMap((g) => g.items);
  const find = (href: string) => items.find((i) => i.href === href);

  it("Administration is owner/admin only", () => {
    expect(find("/admin")?.roles).toEqual(["owner", "admin"]);
    expect(find("/roles")?.roles).toEqual(["owner", "admin"]);
  });
  it("Finance excludes manager, includes accountant", () => {
    const fin = find("/finance")?.roles ?? [];
    expect(fin).toContain("accountant");
    expect(fin).not.toContain("manager");
    expect(fin).not.toContain("staff");
  });
  it("POS is available to staff", () => {
    expect(find("/pos")?.roles).toContain("staff");
  });
  it("Dashboard and Customers are open to all (no roles)", () => {
    expect(find("/dashboard")?.roles).toBeUndefined();
    expect(find("/customers")?.roles).toBeUndefined();
  });
});
