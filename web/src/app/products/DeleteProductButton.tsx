"use client";

import { Icon } from "@/components/Icon";

export function DeleteProductButton({ action }: { action: () => void | Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Delete this product? This permanently removes it and its stock history.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="px-md py-sm rounded border border-error/40 text-error hover:bg-error-container/40 transition-colors font-label-md text-label-md flex items-center gap-xs"
      >
        <Icon name="delete" size={18} /> Delete
      </button>
    </form>
  );
}
