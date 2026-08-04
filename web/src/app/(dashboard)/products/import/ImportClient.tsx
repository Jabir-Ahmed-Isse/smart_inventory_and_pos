"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { importProducts, type ImportRow, type ImportResult } from "@/lib/products/import";

type Cols = { item: string; quantity: string; rate: string; godown: string };

function autoMap(headers: string[]): Cols {
  const find = (...keys: string[]) =>
    headers.find((h) => keys.some((k) => h.toLowerCase().trim().includes(k))) ?? "";
  return {
    item: find("item", "product", "name", "description"),
    quantity: find("quantity", "qty", "stock", "closing"),
    rate: find("rate", "price", "cost", "unit"),
    godown: find("godown", "warehouse", "location", "store"),
  };
}

export function ImportClient() {
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [cols, setCols] = useState<Cols>({ item: "", quantity: "", rate: "", godown: "" });
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setResult(null);
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: "" });
      if (json.length === 0) throw new Error("That sheet has no rows.");
      const hs = Object.keys(json[0]);
      setHeaders(hs);
      setCols(autoMap(hs));
      setRows(json);
      setFileName(file.name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  const mapped: ImportRow[] = useMemo(() => {
    if (!cols.item) return [];
    return rows
      .map((r) => ({
        item: String(r[cols.item] ?? "").trim(),
        godown: String(r[cols.godown] ?? "").trim() || "Main Location",
        quantity: Number(r[cols.quantity] ?? 0) || 0,
        rate: Number(r[cols.rate] ?? 0) || 0,
      }))
      .filter((r) => r.item);
  }, [rows, cols]);

  const distinctItems = useMemo(() => new Set(mapped.map((r) => r.item.toLowerCase())).size, [mapped]);

  async function runImport() {
    setErr(null);
    setBusy(true);
    try {
      const res = await importProducts(mapped);
      setResult(res);
      if (res.ok) router.refresh();
      else setErr(res.error);
    } catch {
      setErr("Import failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full";

  // Success screen
  if (result?.ok) {
    return (
      <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-md"><Icon name="task_alt" size={32} filled /></div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Import complete</h2>
        <div className="grid grid-cols-2 gap-md my-lg text-left">
          <Stat label="Products imported" value={result.imported} tone="text-primary" />
          <Stat label="Units added" value={result.unitsAdded} />
          <Stat label="Skipped (already exist)" value={result.skipped} />
          <Stat label="Warehouses created" value={result.warehousesCreated} />
        </div>
        <div className="flex gap-sm justify-center">
          <Link href="/products" className="px-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors">View Products</Link>
          <button onClick={() => { setResult(null); setRows([]); setHeaders([]); setFileName(""); }} className="px-lg py-2.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Import another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Upload */}
      {rows.length === 0 ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e: DragEvent) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
          className={`w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-sm text-center py-16 px-md transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-outline-variant hover:bg-surface-container-low"}`}
        >
          <Icon name={busy ? "hourglass_empty" : "upload_file"} size={44} className="text-outline-variant" />
          <p className="font-headline-lg text-headline-lg text-on-surface">{busy ? "Reading file…" : "Upload your product file"}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Click to browse or drag & drop — Excel (.xlsx, .xls) or CSV</p>
        </button>
      ) : (
        <>
          {/* Mapping */}
          <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="description" className="text-primary shrink-0" />
                <span className="font-body-md text-body-md text-on-surface truncate">{fileName}</span>
                <span className="font-label-md text-label-md text-on-surface-variant shrink-0">· {rows.length} rows · {distinctItems} products</span>
              </div>
              <button onClick={() => { setRows([]); setHeaders([]); setFileName(""); }} className="text-on-surface-variant hover:text-error text-sm">Change file</button>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-sm">Map your columns (auto-detected):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
              {([["item", "Product name *"], ["quantity", "Quantity"], ["rate", "Price / Rate"], ["godown", "Warehouse"]] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">{label}</label>
                  <select value={cols[key]} onChange={(e) => setCols((c) => ({ ...c, [key]: e.target.value }))} className={inputCls}>
                    <option value="">— none —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!cols.item && <p className="font-body-sm text-body-sm text-error mt-sm">Pick the column that holds the product name.</p>}
          </div>

          {/* Preview */}
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest font-headline-lg text-headline-lg text-on-surface">Preview <span className="font-body-sm text-body-sm text-on-surface-variant">(first 12 of {mapped.length})</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    {["Product", "Warehouse", "Quantity", "Price"].map((h) => <th key={h} className="p-md font-label-md text-label-md text-on-surface-variant">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
                  {mapped.slice(0, 12).map((r, i) => (
                    <tr key={i}>
                      <td className="p-md text-on-surface">{r.item}</td>
                      <td className="p-md text-on-surface-variant">{r.godown}</td>
                      <td className="p-md text-on-surface-variant">{Math.max(0, Math.round(r.quantity))}</td>
                      <td className="p-md text-on-surface-variant">{r.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {err && <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">{err}</div>}

          <div className="flex items-center justify-between gap-md flex-wrap">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Ready to import <b className="text-on-surface">{distinctItems}</b> products. Duplicate names already in your catalog are skipped. Negative quantities are set to 0. SKUs are auto-generated.
            </p>
            <button onClick={runImport} disabled={busy || !cols.item || mapped.length === 0} className="px-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm flex items-center gap-2">
              <Icon name={busy ? "hourglass_empty" : "cloud_upload"} size={18} />
              {busy ? "Importing…" : `Import ${distinctItems} products`}
            </button>
          </div>
        </>
      )}

      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="border border-outline-variant/50 rounded-lg p-md bg-surface-container-lowest">
      <p className={`font-headline-xl text-headline-xl ${tone ?? "text-on-surface"} tabular-nums`}>{value.toLocaleString()}</p>
      <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
    </div>
  );
}
