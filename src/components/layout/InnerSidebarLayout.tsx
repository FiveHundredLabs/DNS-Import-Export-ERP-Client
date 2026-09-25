import { Outlet } from 'react-router-dom';
import { InnerSidebar, InnerSidebarProps } from '../common/InnerSidebar';

export interface InnerSidebarLayoutProps extends InnerSidebarProps {
  contentClassName?: string;
}

export function InnerSidebarLayout({
  contentClassName = 'p-4 md:p-6 lg:p-8',
  ...sidebarProps
}: InnerSidebarLayoutProps) {
  return (
    <div className="flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Secondary Extended Sidebar - Fixed position alongside primary navigation */}
      <InnerSidebar {...sidebarProps} />

      {/* Main Workspace Content Area - Independently scrollable */}
      <main className={`flex-1 h-full overflow-y-auto w-full min-w-0 pb-20 md:pb-8 ${contentClassName}`}>
        <Outlet />
      </main>
    </div>
  );
}
