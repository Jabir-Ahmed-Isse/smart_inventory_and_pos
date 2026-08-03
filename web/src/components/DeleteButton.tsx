"use client";

import { useActionState } from "react";
import { Icon } from "./Icon";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Inline delete control. The button lives in a tiny form bound to the server
 * `action` via `useActionState`, so the action's `revalidatePath` removes the
 * row from the list instantly. A confirm() in onSubmit gates the submit.
 */
export function DeleteButton({
  id,
  action,
  confirmLabel = "Delete this item? This cannot be undone.",
  title = "Delete",
  size = 18,
}: {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  confirmLabel?: string;
  title?: string;
  size?: number;
}) {
  const [state, formAction, pending] = useActionState(
    async () => action(id),
    null,
  );
  const error = state && !state.ok ? state.error : null;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmLabel)) e.preventDefault();
      }}
      className="inline-flex"
    >
      <button
        type="submit"
        disabled={pending}
        title={error ?? title}
        className="text-on-surface-variant hover:text-error p-1 rounded hover:bg-error-container transition-colors disabled:opacity-50"
      >
        <Icon name={pending ? "hourglass_empty" : "delete"} size={size} />
      </button>
    </form>
  );
}
