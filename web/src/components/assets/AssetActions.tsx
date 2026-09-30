"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { runDepreciation, disposeAsset, seedAssets } from "@/lib/assets/actions";

export function RunDepreciationForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-sm">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-2 text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setMsg(null);
              setError(null);
              const fd = new FormData();
              fd.set("period", month);
              const r = await runDepreciation(fd);
              if (r.ok) setMsg(r.message ?? "Done.");
              else setError(r.error);
            })
          }
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm"
        >
          <Icon name={pending ? "hourglass_empty" : "trending_down"} size={16} /> {pending ? "Running…" : "Run depreciation"}
        </button>
      </div>
      {msg && <span className="font-label-md text-label-md text-primary">{msg}</span>}
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}

export function DisposeButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void (await disposeAsset(id)))}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error disabled:opacity-60 transition-colors font-label-md text-label-md">
      <Icon name="delete_sweep" size={14} /> Dispose
    </button>
  );
}

export function SeedAssetsButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending} onClick={() => start(async () => { setError(null); const r = await seedAssets(); if (!r.ok) setError(r.error); })}
        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors font-label-md text-label-md">
        <Icon name={pending ? "hourglass_empty" : "auto_awesome"} size={16} /> {pending ? "Installing…" : "Set up asset accounts"}
      </button>
      {error && <span className="font-label-md text-label-md text-error">{error}</span>}
    </div>
  );
}
