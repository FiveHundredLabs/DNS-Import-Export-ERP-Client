import { Outlet } from 'react-router-dom';

export function StandardLayout() {
  return (
    <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6 w-full pb-16 md:pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <Outlet />
    </main>
  );
}
