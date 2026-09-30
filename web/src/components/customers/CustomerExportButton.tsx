"use client";

import { Icon } from "@/components/Icon";

type Customer = {
  name: string;
  email: string | null;
  phone: string | null;
  segment: string | null;
  creditLimit: number;
  loyaltyPoints: number;
};

const HEADERS = ["Name", "Email", "Phone", "Segment", "Credit limit", "Loyalty points"];

function csvCell(v: string | number | null): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function CustomerExportButton({ customers }: { customers: Customer[] }) {
  function download() {
    const rows = customers.map((c) =>
      [c.name, c.email, c.phone, c.segment, c.creditLimit, c.loyaltyPoints].map(csvCell).join(","),
    );
    const csv = [HEADERS.join(","), ...rows].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={customers.length === 0}
      className="flex-1 md:flex-none flex items-center justify-center gap-sm border border-outline-variant text-on-surface hover:bg-surface-container hover:border-outline disabled:opacity-50 px-lg py-sm rounded font-label-md text-label-md transition-all"
      title="Download all customers as CSV"
    >
      <Icon name="download" size={18} /> Export
    </button>
  );
}
