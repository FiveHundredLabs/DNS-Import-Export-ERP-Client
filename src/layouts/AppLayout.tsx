import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Sidebar } from '../components/common/Sidebar';
import { MobileNav } from '../components/common/MobileNav';
import { useAuth } from '../hooks/useAuth';
import { SalesRepGreetingCard } from '../features/dashboard/SalesRepGreetingCard';

export function AppLayout() {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isRepDashboard = role === 'SALES_REP' && location.pathname === '/';

  return (
    <div className="h-screen bg-canvas font-sans text-slate-800 antialiased flex flex-col overflow-hidden">
      {/* On mobile screens only, move the greeting card to the very beginning of the dashboard page, above the header */}
      {isRepDashboard && (
        <div className="block md:hidden shrink-0">
          <SalesRepGreetingCard />
        </div>
      )}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex flex-1 min-h-0 overflow-hidden bg-primary">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex min-w-0 h-full overflow-hidden bg-canvas">
          <Outlet />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

