"use client";

import { useTransition } from "react";
import { Icon } from "@/components/Icon";
import { postEntry, voidEntry } from "@/lib/accounting/actions";

export function EntryActions({ id, status }: { id: string; status: "draft" | "posted" | "void" }) {
  const [pending, start] = useTransition();
  if (status === "void") return <span className="text-on-surface-variant font-label-md text-label-md">—</span>;

  return (
    <div className="flex items-center gap-1 justify-end">
      {status === "draft" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await postEntry(id)))}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-60 transition-colors font-label-md text-label-md"
        >
          <Icon name="check" size={14} /> Post
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => void (await voidEntry(id)))}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error disabled:opacity-60 transition-colors font-label-md text-label-md"
        title="Void this entry"
      >
        <Icon name="block" size={14} /> Void
      </button>
    </div>
  );
}
