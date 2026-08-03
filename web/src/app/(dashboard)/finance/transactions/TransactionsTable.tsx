"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";

export type TxnView = {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  reference: string;
  amount: number;
};

function toCsv(rows: TxnView[]): string {
  const head = ["Date", "Transaction ID", "Description", "Category", "Type", "Reference", "Amount"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.date, r.id, r.description, r.category, r.type, r.reference, r.amount].map(esc).join(","));
  return [head.map(esc).join(","), ...lines].join("\n");
}

export function TransactionsTable({ rows, currency }: { rows: TxnView[]; currency: string }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [cat, setCat] = useState("all");

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (cat !== "all" && r.category !== cat) return false;
      if (needle && !`${r.description} ${r.category} ${r.id} ${r.reference}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, type, cat]);

  const income = filtered.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expense = filtered.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls =
    "bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-md border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-sm bg-surface-container-lowest">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search description, category, ID…" className={`${inputCls} w-full pl-9`} />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputCls}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={exportCsv} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors">
          <Icon name="download" size={16} /> Export CSV
        </button>
      </div>

      {/* Summary strip */}
      <div className="px-md py-2 flex flex-wrap gap-x-lg gap-y-1 border-b border-outline-variant bg-surface-container-lowest/50 font-label-md text-label-md">
        <span className="text-on-surface-variant">{filtered.length} of {rows.length} transactions</span>
        <span className="text-primary">Income {fmt(income)}</span>
        <span className="text-error">Expense {fmt(expense)}</span>
        <span className="text-on-surface font-semibold">Net {fmt(income - expense)}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {["Date", "Transaction ID", "Description", "Category", "Type", "Amount"].map((h) => (
                <th key={h} className={`p-md font-label-md text-label-md text-on-surface-variant ${h === "Amount" ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-xl text-center text-on-surface-variant">No transactions match your filters.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-md text-on-surface-variant whitespace-nowrap">{r.date}</td>
                  <td className="p-md font-mono text-xs text-on-surface-variant">{r.id.slice(0, 8)}</td>
                  <td className="p-md text-on-surface">{r.description || "—"}</td>
                  <td className="p-md text-on-surface-variant">{r.category}</td>
                  <td className="p-md">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${r.type === "income" ? "bg-primary-container/20 text-primary" : "bg-error-container/30 text-error"}`}>
                      <Icon name={r.type === "income" ? "south_west" : "north_east"} size={12} /> {r.type}
                    </span>
                  </td>
                  <td className={`p-md text-right font-semibold ${r.type === "income" ? "text-primary" : "text-error"}`}>
                    {r.type === "income" ? "+" : "−"}{fmt(r.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
