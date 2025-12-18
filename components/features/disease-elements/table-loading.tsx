export function TableLoading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-emerald-600/80" />
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="overflow-x-auto">
          <div className="flex flex-col gap-2 p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="space-y-2 px-4 pb-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-11 w-full animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
