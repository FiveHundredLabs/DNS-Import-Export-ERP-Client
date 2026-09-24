import { Bell, Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { RoleSwitcher } from './RoleSwitcher';
import { Badge } from '../ui/badge';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { currentUser } = useAuth();

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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow">
            DNS
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight hidden sm:inline">
              DISTRIBUTION ERP
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">ENTERPRISE v1.0</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <RoleSwitcher />

        <button
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-rose-500" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
            <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
              <ShieldCheck className="h-3 w-3 text-indigo-500" />
              {currentUser.role.replace('_', ' ')}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 shadow-sm">
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
        </div>
      </div>
    </header>
  );
}
