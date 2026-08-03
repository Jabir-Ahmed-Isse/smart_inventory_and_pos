"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type POView = {
  id: string; poNumber: string; supplier: string; warehouse: string;
  status: string; total: number; created: string; expected: string; buyer: string;
};

const STATUS: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  pending: "bg-tertiary-container/20 text-tertiary",
  partial: "bg-secondary-container/20 text-secondary",
  received: "bg-primary-container/20 text-primary",
  overdue: "bg-error-container/30 text-error",
  cancelled: "bg-surface-variant text-on-surface-variant",
};

export function POTable({ rows, currency }: { rows: POView[]; currency: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (needle && !`${r.poNumber} ${r.supplier} ${r.warehouse} ${r.buyer}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    out = [...out].sort((a, b) => (sort === "amount" ? b.total - a.total : 0));
    return out;
  }, [rows, q, status, sort]);

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["PO Number", "Supplier", "Warehouse", "Created", "Expected", "Buyer", "Status", "Amount"].map(esc).join(",");
    const body = filtered.map((r) => [r.poNumber, r.supplier, r.warehouse, r.created, r.expected, r.buyer, r.status, r.total].map(esc).join(",")).join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = "bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      <div className="p-md border-b border-outline-variant flex flex-col md:flex-row md:items-center gap-sm bg-surface-container-lowest">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PO, supplier, warehouse, buyer…" className={`${inputCls} w-full pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          <option value="all">All statuses</option>
          {Object.keys(STATUS).map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={inputCls}>
          <option value="date">Sort: Newest</option>
          <option value="amount">Sort: Amount</option>
        </select>
        <button onClick={exportCsv} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors">
          <Icon name="download" size={16} /> Export
        </button>
      </div>
      <div className="px-md py-2 border-b border-outline-variant bg-surface-container-lowest/50 font-label-md text-label-md text-on-surface-variant">
        {filtered.length} of {rows.length} orders · {fmt(filtered.reduce((s, r) => s + r.total, 0))} total
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {["PO Number", "Supplier", "Warehouse", "Created", "Expected", "Buyer", "Status", "Amount", ""].map((h) => (
                <th key={h} className={`p-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap ${h === "Amount" ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-xl text-center text-on-surface-variant">No purchase orders match your filters.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="p-md"><Link href={`/purchases/orders/${r.id}`} className="font-mono text-xs text-primary hover:underline">{r.poNumber}</Link></td>
                  <td className="p-md text-on-surface">{r.supplier}</td>
                  <td className="p-md text-on-surface-variant">{r.warehouse}</td>
                  <td className="p-md text-on-surface-variant whitespace-nowrap">{r.created}</td>
                  <td className="p-md text-on-surface-variant whitespace-nowrap">{r.expected}</td>
                  <td className="p-md text-on-surface-variant">{r.buyer}</td>
                  <td className="p-md"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS[r.status] ?? ""}`}>{r.status}</span></td>
                  <td className="p-md text-right font-semibold tabular-nums">{fmt(r.total)}</td>
                  <td className="p-md text-right"><Link href={`/purchases/orders/${r.id}`} className="text-on-surface-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="chevron_right" /></Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
