import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users2,
  CheckCircle,
  FileSpreadsheet,
  ShoppingCart,
  Boxes,
  Store,
  DollarSign,
  ShieldCheck,
  BarChart3,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { canAccessRoute } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Product Master', path: '/products', icon: Package },
    { name: 'Customer Master', path: '/customers', icon: Users2 },
    { name: 'Approvals Engine', path: '/approvals', icon: CheckCircle },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
    { name: 'Sales Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Inventory & GRN', path: '/inventory', icon: Boxes },
    { name: 'Showroom POS', path: '/pos', icon: Store },
    { name: 'Finance & Ledger', path: '/finance', icon: DollarSign },
    { name: 'Warranty Hub', path: '/warranty', icon: ShieldCheck },
    { name: 'Enterprise Reports', path: '/reports', icon: BarChart3 },
  ].filter((item) => canAccessRoute(item.path));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 md:hidden">
          <span className="font-bold text-slate-900">Navigation</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Enterprise Modules
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 border border-slate-100">
            <div className="font-semibold text-slate-700">DNS ERP Core</div>
            <div className="text-[11px] text-slate-400 mt-0.5">PostgreSQL Backend Ready</div>
          </div>
        </div>
      </aside>
    </>
  );
}
