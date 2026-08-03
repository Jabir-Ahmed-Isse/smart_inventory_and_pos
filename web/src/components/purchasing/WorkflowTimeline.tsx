import { Icon } from "@/components/Icon";
import { WORKFLOW_STEPS } from "@/lib/purchasing/data";

/** Horizontal ERP purchase-workflow progress bar. `current` = active step index. */
export function WorkflowTimeline({ current, cancelled }: { current: number; cancelled?: boolean }) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <ol className="flex items-center min-w-[720px] gap-0">
        {WORKFLOW_STEPS.map((s, i) => {
          const done = !cancelled && i < current;
          const active = !cancelled && i === current;
          const state = cancelled ? "cancelled" : done ? "done" : active ? "active" : "todo";
          return (
            <li key={s.key} className="flex-1 flex items-center last:flex-none">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors " +
                    (state === "done"
                      ? "bg-primary border-primary text-on-primary"
                      : state === "active"
                        ? "bg-primary/10 border-primary text-primary"
                        : state === "cancelled"
                          ? "bg-error-container/30 border-error/40 text-error"
                          : "bg-surface border-outline-variant text-on-surface-variant")
                  }
                >
                  <Icon name={state === "done" ? "check" : s.icon} size={18} filled={state !== "todo"} />
                </div>
                <span className={`font-label-md text-label-md whitespace-nowrap ${active ? "text-primary font-semibold" : "text-on-surface-variant"}`}>{s.label}</span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-5 rounded ${done ? "bg-primary" : "bg-outline-variant"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
