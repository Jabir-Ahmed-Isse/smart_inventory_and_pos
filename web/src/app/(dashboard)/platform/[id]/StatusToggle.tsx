"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { setCompanyActive } from "@/lib/admin/actions";

export function StatusToggle({ orgId, active }: { orgId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("org_id", orgId);
      fd.set("active", String(!active));
      const res = await setCompanyActive(fd);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`px-lg py-sm rounded-lg font-label-md text-label-md flex items-center gap-sm transition-colors disabled:opacity-60 ${
          active
            ? "bg-error-container/30 text-error hover:bg-error-container/50"
            : "bg-primary text-on-primary hover:bg-primary/90 shadow-sm"
        }`}
      >
        <Icon name={active ? "block" : "check_circle"} size={18} />
        {pending ? "Saving…" : active ? "Suspend Company" : "Reactivate Company"}
      </button>
      {error && <span className="text-[11px] text-error max-w-[220px] text-right">{error}</span>}
    </div>
  );
}
