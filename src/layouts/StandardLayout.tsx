import { Outlet, useLocation } from 'react-router-dom';

export function StandardLayout() {
  const location = useLocation();
  const isPosTerminal = location.pathname === '/pos';

  if (isPosTerminal) {
    return (
      <main className="flex-1 h-full min-h-0 w-full overflow-hidden flex flex-col">
        <Outlet />
      </main>
    );
  }

  return (
    <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 lg:p-6 w-full pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-6">
      <Outlet />
    </main>
  );
}
