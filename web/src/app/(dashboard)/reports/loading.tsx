export default function ReportsLoading() {
  return (
    <main className="flex-1 p-md md:p-lg max-w-container-max mx-auto w-full animate-pulse">
      <div className="flex items-end justify-between mb-lg gap-md">
        <div>
          <div className="h-8 w-56 bg-surface-container-high rounded-lg" />
          <div className="h-4 w-72 bg-surface-container-high rounded mt-sm" />
        </div>
        <div className="hidden sm:flex gap-sm">
          <div className="h-9 w-28 bg-surface-container-high rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-surface-container-high rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        <div className="lg:col-span-2 h-[340px] bg-surface-container-high rounded-xl" />
        <div className="h-[340px] bg-surface-container-high rounded-xl" />
      </div>
      <div className="h-64 bg-surface-container-high rounded-xl" />
    </main>
  );
}
