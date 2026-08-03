"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";

export type Column = { key: string; label: string };
export type Dataset = { label: string; icon: string; columns: Column[]; rows: Record<string, string | number>[] };

export function CustomReportBuilder({ datasets }: { datasets: Record<string, Dataset> }) {
  const names = Object.keys(datasets);
  const [active, setActive] = useState(names[0] ?? "");
  const ds = datasets[active];
  const [cols, setCols] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  // Default: all columns on for the active dataset.
  const visible = ds ? ds.columns.filter((c) => cols[`${active}.${c.key}`] ?? true) : [];

  const rows = useMemo(() => {
    if (!ds) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return ds.rows;
    return ds.rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(needle)));
  }, [ds, q]);

  function toggle(key: string) {
    setCols((c) => ({ ...c, [`${active}.${key}`]: !(c[`${active}.${key}`] ?? true) }));
  }

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = visible.map((c) => esc(c.label)).join(",");
    const body = rows.map((r) => visible.map((c) => esc(r[c.key] ?? "")).join(",")).join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.toLowerCase().replace(/\s+/g, "-")}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ds) return <p className="text-on-surface-variant">No data available.</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-lg">
      {/* Builder panel */}
      <div className="lg:col-span-1 space-y-md">
        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">1 · Dataset</h3>
          <div className="space-y-1">
            {names.map((n) => (
              <button
                key={n}
                onClick={() => setActive(n)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-body-sm text-body-sm transition-colors ${active === n ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container-high"}`}
              >
                <Icon name={datasets[n].icon} size={18} /> {datasets[n].label}
                <span className="ml-auto text-xs opacity-70">{datasets[n].rows.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide mb-sm">2 · Columns</h3>
          <div className="space-y-1">
            {ds.columns.map((c) => (
              <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-high cursor-pointer font-body-sm text-body-sm text-on-surface">
                <input type="checkbox" checked={cols[`${active}.${c.key}`] ?? true} onChange={() => toggle(c.key)} className="rounded border-outline-variant text-primary focus:ring-primary" />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <button onClick={exportCsv} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm">
          <Icon name="download" size={16} /> Export CSV
        </button>
        <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-high transition-colors">
          <Icon name="picture_as_pdf" size={16} /> Print / PDF
        </button>
      </div>

      {/* Preview */}
      <div className="lg:col-span-3 bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex flex-col sm:flex-row sm:items-center gap-sm bg-surface-container-lowest">
          <div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface">{ds.label} Report</h3>
            <p className="font-label-md text-label-md text-on-surface-variant">{rows.length} rows · {visible.length} columns</p>
          </div>
          <div className="relative sm:ml-auto">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-2 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
          </div>
        </div>
        <div className="overflow-auto max-h-[560px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {visible.map((c) => <th key={c.key} className="p-md font-label-md text-label-md text-on-surface-variant whitespace-nowrap">{c.label}</th>)}
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
              {rows.length === 0 ? (
                <tr><td colSpan={visible.length || 1} className="p-xl text-center text-on-surface-variant">No rows.</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors">
                    {visible.map((c) => <td key={c.key} className="p-md text-on-surface whitespace-nowrap">{r[c.key] ?? "—"}</td>)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
