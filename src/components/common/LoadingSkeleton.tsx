import { Skeleton } from '../ui/skeleton';

export function TableLoadingSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm animate-pulse">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
      {/* Table header row */}
      <div className="flex gap-4 py-2 border-b border-slate-200">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1 rounded-md bg-slate-300/70" />
        ))}
      </div>
      {/* Table body rows */}
      <div className="space-y-3 pt-1">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-2.5 border-b border-slate-100 last:border-0 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-5 flex-1 rounded-md ${c === 0 ? 'max-w-[140px]' : c === cols - 1 ? 'max-w-[100px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 pb-12 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <CardGridSkeleton count={4} />

      {/* Main Content Grid: Chart + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200/80 bg-white space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

        <div className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-4 shadow-sm">
          <Skeleton className="h-5 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center py-2 border-b border-slate-100 last:border-0">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailViewSkeleton() {
  return (
    <div className="w-full space-y-6 pb-12 animate-pulse">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-7 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 border-r border-slate-100 last:border-0 pr-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Main Details Body */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5 p-3 rounded-xl bg-slate-50/60">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FormLoadingSkeleton() {
  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm animate-pulse">
      <div className="space-y-2 pb-4 border-b border-slate-100">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}
