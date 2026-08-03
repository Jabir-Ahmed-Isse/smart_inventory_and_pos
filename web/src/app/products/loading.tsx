export default function Loading() {
  return (
    <main className="flex-1 p-md md:p-gutter max-w-3xl mx-auto w-full animate-pulse">
      <div className="h-8 w-48 bg-surface-container-high rounded-lg mb-lg" />
      <div className="space-y-md">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-surface-container-high rounded-lg" />
        ))}
        <div className="h-11 w-40 bg-surface-container-high rounded-lg" />
      </div>
    </main>
  );
}
