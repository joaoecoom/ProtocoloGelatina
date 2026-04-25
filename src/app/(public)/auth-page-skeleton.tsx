export function AuthPageSkeleton() {
  return (
    <div className="mx-auto min-h-dvh max-w-md animate-pulse px-6 py-12">
      <div className="mb-8 h-4 w-24 rounded bg-rose-100/80" />
      <div className="mb-2 h-9 w-40 rounded-lg bg-neutral-200/80" />
      <div className="mb-8 h-10 w-full max-w-sm rounded-lg bg-neutral-200/50" />
      <div className="glass-panel h-72 rounded-3xl bg-white/40" />
    </div>
  );
}
