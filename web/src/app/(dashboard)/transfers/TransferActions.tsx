"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { completeTransfer, cancelTransfer } from "@/lib/transfers/actions";

export function TransferActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Failed");
    });
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {err && <span className="text-[11px] text-error max-w-[160px] truncate" title={err}>{err}</span>}
      <button
        type="button"
        onClick={() => run(() => completeTransfer(id))}
        disabled={pending}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 shadow-sm"
      >
        <Icon name={pending ? "hourglass_empty" : "check"} size={15} /> Complete
      </button>
      <button
        type="button"
        onClick={() => run(() => cancelTransfer(id))}
        disabled={pending}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-60"
      >
        Cancel
      </button>
    </div>
  );
}
