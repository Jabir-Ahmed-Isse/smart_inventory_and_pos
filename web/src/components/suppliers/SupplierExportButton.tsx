"use client";

import { Icon } from "@/components/Icon";

type Supplier = {
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  paymentTerms: string | null;
};

const HEADERS = ["Name", "Contact person", "Email", "Phone", "Address", "Payment terms"];

function csvCell(v: string | null): string {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function SupplierExportButton({ suppliers }: { suppliers: Supplier[] }) {
  function download() {
    const rows = suppliers.map((s) =>
      [s.name, s.contactName, s.email, s.phone, s.address, s.paymentTerms].map(csvCell).join(","),
    );
    const csv = [HEADERS.join(","), ...rows].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={suppliers.length === 0}
      className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors font-label-md text-label-md"
      title="Download all suppliers as CSV"
    >
      <Icon name="download" size={18} /> Export
    </button>
  );
}
