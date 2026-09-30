"use client";

import { Icon } from "@/components/Icon";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm"
    >
      <Icon name="print" size={18} /> Print / Save PDF
    </button>
  );
}
