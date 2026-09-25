import { Outlet } from 'react-router-dom';

export function StandardLayout() {
  return (
    <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
      <Outlet />
    </main>
  );
}
