"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const fieldCls =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-sm text-body-sm";

export const labelCls =
  "block font-label-md text-label-md text-on-surface-variant mb-xs";

/**
 * Generic create dialog. The form is bound to the server `action` through
 * `useActionState`, so the action's own `revalidatePath` pushes the fresh
 * server-component list back to the page automatically — the new row shows
 * instantly, no client-side refresh needed. Closes the dialog on success.
 */
export function CrudDialog({
  triggerLabel,
  triggerIcon = "add",
  title,
  submitLabel = "Create",
  action,
  children,
  triggerClassName,
}: {
  triggerLabel: string;
  triggerIcon?: string;
  title: string;
  submitLabel?: string;
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  // If a just-finished submit failed, reopen the dialog to show the error.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state && !state.ok) setOpen(true);
    wasPending.current = pending;
  }, [pending, state]);

  const error = state && !state.ok ? state.error : null;

  // Keep the form mounted while the action is in flight (so an optimistic close
  // doesn't cancel it), but hide it when the user has "left".
  const mounted = open || pending;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "flex-1 md:flex-none bg-primary hover:bg-primary/90 text-on-primary font-label-md text-label-md py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
        }
      >
        <Icon name={triggerIcon} size={18} /> {triggerLabel}
      </button>

      {mounted && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-md ${open ? "" : "hidden"}`}>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-[460px] bg-surface rounded-xl border border-outline-variant shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-md border-b border-outline-variant bg-surface-container-lowest">
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-on-surface-variant hover:text-primary p-xs rounded-full"
              >
                <Icon name="close" />
              </button>
            </div>

            <form
              action={formAction}
              onSubmit={() => setOpen(false)}
              className="p-lg space-y-md"
            >
              {error && (
                <div className="rounded-lg border border-error/30 bg-error-container/40 px-md py-sm font-body-sm text-body-sm text-on-error-container">
                  {error}
                </div>
              )}
              {children}
              <div className="flex justify-end gap-sm pt-sm">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-lg py-sm rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors font-label-md text-label-md shadow-sm"
                >
                  {pending ? "Saving…" : submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
