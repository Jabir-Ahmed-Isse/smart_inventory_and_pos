export default function Loading() {
  return (
    <main className="flex-1 p-md md:p-gutter animate-pulse flex flex-col lg:flex-row gap-gutter h-[calc(100vh-4rem)]">
      {/* Catalog grid */}
      <div className="flex-1 flex flex-col gap-md">
        <div className="h-12 bg-surface-container-high rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-md flex-1 content-start">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 bg-surface-container-high rounded-xl" />
          ))}
        </div>
      </div>
      {/* Cart */}
      <div className="w-full lg:w-96 bg-surface-container-high rounded-xl" />
    </main>
  );
}
