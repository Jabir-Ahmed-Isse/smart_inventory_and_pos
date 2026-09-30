/** Shared instant-loading skeleton for ERP module pages (header + KPI row + table).
 *  Rendered by each section's loading.tsx so a relevant skeleton appears the moment
 *  the route is ready, without waiting on any data. */
export function PageSkeleton({ kpis = 4 }: { kpis?: number }) {
  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full animate-pulse">
      <div className="h-8 w-56 bg-surface-container-high rounded-lg mb-2" />
      <div className="h-4 w-80 max-w-full bg-surface-container-high rounded mb-lg" />
      {kpis > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
          {Array.from({ length: kpis }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-container-high rounded-xl" />
          ))}
        </div>
      )}
      <div className="border border-outline-variant rounded-xl overflow-hidden">
        <div className="h-11 bg-surface-container-high/60" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-outline-variant/60 bg-surface-container-high/40" />
        ))}
      </div>
    </main>
  );
}
