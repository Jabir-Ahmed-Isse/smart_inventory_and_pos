"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { setBranchActive } from "@/lib/branches/actions";

export function BranchActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      await setBranchActive(id, !active);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-label-md text-label-md transition-colors disabled:opacity-60 ${
        active
          ? "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
          : "border-primary/40 text-primary hover:bg-primary-container/20"
      }`}
    >
      <Icon name={pending ? "hourglass_empty" : active ? "toggle_on" : "toggle_off"} size={16} />
      {active ? "Deactivate" : "Activate"}
    </button>
  );
}
