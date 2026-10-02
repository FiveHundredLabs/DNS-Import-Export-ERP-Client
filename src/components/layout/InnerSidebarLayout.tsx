import { Outlet } from 'react-router-dom';
import { InnerSidebar, InnerSidebarProps } from '../common/InnerSidebar';

export interface InnerSidebarLayoutProps extends InnerSidebarProps {
  contentClassName?: string;
}

export function InnerSidebarLayout({
  contentClassName = 'p-4 sm:p-5 lg:p-6',
  ...sidebarProps
}: InnerSidebarLayoutProps) {
  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Secondary Extended Sidebar */}
      <InnerSidebar {...sidebarProps} />

      {/* Main Workspace Content Area - Full width, hidden scrollbars while preserving scrolling */}
      <main className={`flex-1 h-full overflow-y-auto overflow-x-hidden w-full min-w-0 pb-16 md:pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${contentClassName}`}>
        <Outlet />
      </main>
    </div>
  );
}
