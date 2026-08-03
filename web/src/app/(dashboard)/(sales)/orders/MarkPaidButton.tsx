"use client";

import { useActionState } from "react";
import { Icon } from "@/components/Icon";
import { markSalePaid } from "@/lib/pos/actions";

/** Settles a due order. Bound to the server action so Finance/Orders refresh instantly. */
export function MarkPaidButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [state, formAction, pending] = useActionState(async () => markSalePaid(orderId, orderNumber), null);
  const error = state && !state.ok ? state.error : null;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Mark this order as paid? The payment will be recorded in Finance.")) e.preventDefault();
      }}
      className="inline-flex"
    >
      <button
        type="submit"
        disabled={pending}
        title={error ?? "Mark as paid"}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md shadow-sm"
      >
        <Icon name={pending ? "hourglass_empty" : "paid"} size={16} />
        {pending ? "Settling…" : "Mark Paid"}
      </button>
    </form>
  );
}
