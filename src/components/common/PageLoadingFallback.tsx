import { DashboardSkeleton } from './LoadingSkeleton';

export function PageLoadingFallback() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DashboardSkeleton />
    </div>
  );
}

export default PageLoadingFallback;
