export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary/60" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary/40" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-secondary/30" />
      <span className="sr-only">Wird geladen…</span>
    </div>
  );
}
