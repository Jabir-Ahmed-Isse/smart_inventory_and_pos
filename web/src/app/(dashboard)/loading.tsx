export default function Loading() {
  return (
    <main className="flex-1 p-md md:p-gutter max-w-container-max mx-auto w-full animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <div className="h-8 w-56 bg-surface-container-high rounded-lg" />
          <div className="h-4 w-40 bg-surface-container-high rounded mt-sm" />
        </div>
        <div className="hidden sm:flex gap-sm">
          <div className="h-9 w-24 bg-surface-container-high rounded-md" />
          <div className="h-9 w-24 bg-surface-container-high rounded-md" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface-container-high rounded-xl" />
        ))}
      </div>

      {/* Content blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md mb-lg">
        <div className="h-72 bg-surface-container-high rounded-xl lg:col-span-2" />
        <div className="h-72 bg-surface-container-high rounded-xl" />
      </div>
      <div className="h-48 bg-surface-container-high rounded-xl" />
    </main>
  );
}
