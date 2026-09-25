import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Receipt,
  CreditCard,
  Award,
  X,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Users,
  Compass,
  Sparkles,
  Activity,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { canAccessRoute, currentUser } = useAuth();
  const location = useLocation();

  // State to toggle Dashboard sub-items (Performance Snap, Recent Activity, Insights)
  const [dashboardExpanded, setDashboardExpanded] = useState(true);

  // Group 1: General Core Operations
  const generalModules = [
    { name: 'Product Master', path: '/products', icon: Package },
    { name: 'Customer Master', path: '/customers', icon: Users2 },
    { name: 'Approvals Engine', path: '/approvals', icon: CheckCircle },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
    { name: 'Sales Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Invoices', path: '/invoices', icon: Receipt },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Inventory & GRN', path: '/inventory', icon: Boxes },
    { name: 'Showroom POS', path: '/pos', icon: Store },
  ].filter((item) => canAccessRoute(item.path));

  // Group 2: Finance & Management Analytics
  const financeModules = [
    { name: 'Finance & Ledger', path: '/finance', icon: DollarSign },
    { name: 'Warranty Hub', path: '/warranty', icon: ShieldCheck },
    { name: 'Sales Commission', path: '/commissions', icon: Award },
    { name: 'Enterprise Reports', path: '/reports', icon: BarChart3 },
  ].filter((item) => canAccessRoute(item.path));

  const isDashboardActive = location.pathname === '/';

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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/90 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close bar (Desktop sidebar header removed; branding is in main header) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 md:hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Navigation</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          {/* Main Dashboard Section with Reference Vibrant Sky-Blue Pill */}
          <div>
            <div
              onClick={() => setDashboardExpanded(!dashboardExpanded)}
              className={cn(
                'flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all cursor-pointer shadow-sm',
                isDashboardActive
                  ? 'bg-sky-500 text-white shadow-sky-500/25'
                  : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              <NavLink
                to="/"
                end
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex items-center gap-3 flex-1"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="text-xs">Dashboard</span>
              </NavLink>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDashboardExpanded(!dashboardExpanded);
                }}
                className="p-0.5 text-inherit opacity-80 hover:opacity-100"
                aria-label="Toggle dashboard submenus"
              >
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    dashboardExpanded ? 'rotate-180' : ''
                  )}
                />
              </button>
            </div>

            {/* Dashboard Sub-Items (Matching reference: Performance Snap, Recent Activity Feed, Insights) */}
            {dashboardExpanded && (
              <div className="mt-2 ml-4 pl-3 border-l-2 border-slate-100 space-y-1">
                <NavLink
                  to="/"
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors',
                      isActive
                        ? 'text-sky-600 bg-sky-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <Activity className="h-3 w-3 shrink-0" />
                  <span>Performance Snap</span>
                </NavLink>

                <NavLink
                  to="/approvals"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors',
                      isActive
                        ? 'text-sky-600 bg-sky-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <CheckCircle className="h-3 w-3 shrink-0" />
                  <span>Approvals In-Tray</span>
                </NavLink>

                <NavLink
                  to="/reports"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors',
                      isActive
                        ? 'text-sky-600 bg-sky-50 font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <Lightbulb className="h-3 w-3 shrink-0" />
                  <span>Insights & Analytics</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Group 1: GENERAL */}
          <div>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              General Operations
            </div>
            <div className="space-y-1">
              {generalModules.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                        isActive
                          ? 'bg-sky-50 text-sky-600 font-bold shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Group 2: FINANCE & ANALYTICS */}
          {financeModules.length > 0 && (
            <div>
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Finance & Audit
              </div>
              <div className="space-y-1">
                {financeModules.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                          isActive
                            ? 'bg-sky-50 text-sky-600 font-bold shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group 3: SUPPORT */}
          <div>
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Support & Roles
            </div>
            <div className="space-y-1">
              <NavLink
                to="/login"
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-sky-50 text-sky-600 font-bold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Role Switcher Portal</span>
              </NavLink>
            </div>
          </div>
        </nav>


        {/* Bottom Profile / Quick Switcher Card */}
        <div className="border-t border-slate-100 p-3">
          <NavLink
            to="/login"
            onClick={onClose}
            className="flex items-center justify-between gap-2.5 rounded-2xl bg-slate-50/80 hover:bg-sky-50/80 border border-slate-200/80 hover:border-sky-200 p-2.5 text-xs transition-colors group"
            title="Switch User Role or View Example Users"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 font-black text-xs shadow-2xs">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate text-xs">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-sky-600 bg-white border border-slate-200 rounded-lg px-2 py-1 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-500 transition-all shrink-0 shadow-2xs">
              Switch
            </span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
