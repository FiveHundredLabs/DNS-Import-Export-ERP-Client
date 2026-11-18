import { DashboardSkeleton } from './LoadingSkeleton';

export function PageLoadingFallback() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      <DashboardSkeleton />
    </div>
  );
}

export default PageLoadingFallback;
