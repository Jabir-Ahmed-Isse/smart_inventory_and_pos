"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { importEmployees, type EmployeeImportRow, type EmployeeImportResult } from "@/lib/hr/import";

type Row = Record<string, string | number>;
type ColKey =
  | "firstName" | "lastName" | "email" | "phone" | "department" | "position"
  | "employmentType" | "hireDate" | "baseSalary" | "payFrequency" | "bankName" | "mobileMoney";
type Cols = Record<ColKey, string>;

const COL_LABELS: [ColKey, string][] = [
  ["firstName", "First name *"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"],
  ["department", "Department"], ["position", "Position"], ["employmentType", "Employment"],
  ["hireDate", "Hire date"], ["baseSalary", "Base salary"], ["payFrequency", "Pay cycle"],
  ["bankName", "Bank"], ["mobileMoney", "Mobile money"],
];

function autoMap(headers: string[]): Cols {
  const find = (...keys: string[]) => headers.find((h) => keys.some((k) => h.toLowerCase().trim().includes(k))) ?? "";
  return {
    firstName: find("first name", "first") || find("name"),
    lastName: find("last name", "last", "surname"),
    email: find("email", "e-mail"),
    phone: find("phone", "tel", "contact"),
    department: find("department", "dept"),
    position: find("position", "title", "role", "job"),
    employmentType: find("employment", "contract type", "type"),
    hireDate: find("hire", "joined", "start date", "date"),
    baseSalary: find("salary", "base", "wage"),
    payFrequency: find("cycle", "frequency", "pay period"),
    bankName: find("bank"),
    mobileMoney: find("mobile money", "evc", "money", "wallet"),
  };
}

export function EmployeeImportClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [cols, setCols] = useState<Cols | null>(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<EmployeeImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setErr(null); setResult(null); setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      if (json.length === 0) throw new Error("That sheet has no rows.");
      setHeaders(Object.keys(json[0]));
      setCols(autoMap(Object.keys(json[0])));
      setRows(json);
      setSource(`${file.name} · ${json.length} rows`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read that file.");
    } finally { setBusy(false); }
  }

  const mapped: EmployeeImportRow[] = useMemo(() => {
    if (!cols || !cols.firstName) return [];
    const g = (r: Row, key: ColKey) => (cols[key] ? String(r[cols[key]] ?? "").trim() : "");
    return rows
      .map((r) => ({
        firstName: g(r, "firstName"),
        lastName: g(r, "lastName"),
        email: g(r, "email"),
        phone: g(r, "phone"),
        department: g(r, "department"),
        position: g(r, "position"),
        employmentType: g(r, "employmentType"),
        hireDate: g(r, "hireDate"),
        baseSalary: g(r, "baseSalary"),
        payFrequency: g(r, "payFrequency"),
        bankName: g(r, "bankName"),
        mobileMoney: g(r, "mobileMoney"),
      }))
      .filter((r) => r.firstName);
  }, [rows, cols]);

  async function runImport() {
    setErr(null); setBusy(true);
    try {
      const res = await importEmployees(mapped);
      setResult(res);
      if (res.ok) router.refresh();
      else setErr(res.error);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed. Please try again.");
    } finally { setBusy(false); }
  }

  const inputCls = "bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full";

  if (result?.ok) {
    return (
      <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center shadow-sm max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-md"><Icon name="task_alt" size={32} filled /></div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-sm">Import complete</h2>
        <div className="grid grid-cols-2 gap-md my-lg text-left">
          <Stat label="Employees imported" value={result.imported} tone="text-primary" />
          <Stat label="Skipped (duplicates)" value={result.skipped} />
          <Stat label="Departments created" value={result.departmentsCreated} />
          <Stat label="Positions created" value={result.positionsCreated} />
        </div>
        <div className="flex gap-sm justify-center">
          <Link href="/hr/employees" className="px-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors">View Employees</Link>
          <button onClick={() => { setResult(null); setRows([]); setHeaders([]); setCols(null); setSource(""); }} className="px-lg py-2.5 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Import more</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {rows.length === 0 ? (
        <>
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: DragEvent) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-sm text-center py-16 px-md transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-outline-variant hover:bg-surface-container-low"}`}>
            <Icon name={busy ? "hourglass_empty" : "upload_file"} size={44} className="text-outline-variant" />
            <p className="font-headline-lg text-headline-lg text-on-surface">{busy ? "Reading file…" : "Upload employee file"}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Click to browse or drag &amp; drop — Excel (.xlsx, .xls) or CSV</p>
          </button>
          {err && <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">{err}</div>}
        </>
      ) : (
        <>
          <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm">
            <div className="flex items-center justify-between mb-md">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="groups" className="text-primary shrink-0" />
                <span className="font-body-md text-body-md text-on-surface truncate">{source}</span>
                <span className="font-label-md text-label-md text-on-surface-variant shrink-0">· {mapped.length} employees</span>
              </div>
              <button onClick={() => { setRows([]); setHeaders([]); setCols(null); setSource(""); }} className="text-on-surface-variant hover:text-error text-sm">Change file</button>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-sm">Map your columns (auto-detected — Department/Position are created if new):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
              {COL_LABELS.map(([key, label]) => (
                <div key={key}>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">{label}</label>
                  <select value={cols?.[key] ?? ""} onChange={(e) => setCols((c) => ({ ...(c as Cols), [key]: e.target.value }))} className={inputCls}>
                    <option value="">— none —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!cols?.firstName && <p className="font-body-sm text-body-sm text-error mt-sm">Pick the column that holds the first name.</p>}
          </div>

          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-lowest font-headline-lg text-headline-lg text-on-surface">Preview <span className="font-body-sm text-body-sm text-on-surface-variant">(first 12 of {mapped.length})</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    {["Name", "Department", "Position", "Employment", "Salary", "Pay cycle"].map((h) => <th key={h} className="p-md font-label-md text-label-md text-on-surface-variant">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/60">
                  {mapped.slice(0, 12).map((r, i) => (
                    <tr key={i}>
                      <td className="p-md text-on-surface">{r.firstName} {r.lastName}</td>
                      <td className="p-md text-on-surface-variant">{r.department || "—"}</td>
                      <td className="p-md text-on-surface-variant">{r.position || "—"}</td>
                      <td className="p-md text-on-surface-variant">{r.employmentType || "full_time"}</td>
                      <td className="p-md text-on-surface-variant">{r.baseSalary || 0}</td>
                      <td className="p-md text-on-surface-variant">{r.payFrequency || "monthly"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {err && <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">{err}</div>}

          <div className="flex items-center justify-between gap-md flex-wrap">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Duplicate emails/names already on the roster are skipped. Employee numbers auto-generate. Unmapped fields are left blank.
            </p>
            <button onClick={runImport} disabled={busy || !cols?.firstName || mapped.length === 0} className="px-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm flex items-center gap-2">
              <Icon name={busy ? "hourglass_empty" : "cloud_upload"} size={18} />
              {busy ? "Importing…" : `Import ${mapped.length} employees`}
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
