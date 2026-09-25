import { Bell, Menu, ShieldCheck, Users, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur transition-all">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow">
            DNS
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight hidden sm:inline">
              DISTRIBUTION ERP
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">ENTERPRISE v1.0</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Switch User Role Action (Replaces cumbersome dropdown, opens role selection login page) */}
        <Link
          to="/login"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition-all shadow-sm"
          title="Switch User Role or Log In as another user"
        >
          <Users className="h-3.5 w-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Switch Role</span>
        </Link>

        <button
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Info */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">{currentUser.name}</div>
            <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 font-medium mt-0.5">
              <ShieldCheck className="h-3 w-3 text-indigo-500" />
              <span>{formatRole(currentUser.role)}</span>
              {currentUser.areaName && (
                <span className="text-slate-400 truncate max-w-[120px]">({currentUser.areaName})</span>
              )}
            </div>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-sm"
            title={`${currentUser.name} (${formatRole(currentUser.role)})`}
          >
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

