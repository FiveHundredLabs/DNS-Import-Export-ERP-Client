import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Sidebar } from '../components/common/Sidebar';
import { MobileNav } from '../components/common/MobileNav';
import { useAuth } from '../hooks/useAuth';

export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen bg-slate-50 font-sans text-slate-900 antialiased flex flex-col overflow-hidden">
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex min-w-0 h-full overflow-hidden">
          <Outlet />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

