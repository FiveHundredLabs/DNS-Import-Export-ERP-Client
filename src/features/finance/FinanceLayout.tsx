import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLoadingFallback } from '../../components/common/PageLoadingFallback';

export function FinanceLayout() {
  return (
    <main className="relative flex-1 h-full overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6 w-full pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-6">
      <Suspense fallback={<PageLoadingFallback />}>
        <Outlet />
      </Suspense>
    </main>
  );
}
