import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  ShieldCheck,
  MoreHorizontal,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  Package,
  Boxes,
  BarChart3,
  Award,
  CheckCircle,
  Store,
  X,
  LogOut,
  UserCheck,
  ChevronRight,
  Clock,
  Layers,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { RoleSwitcher } from './RoleSwitcher';

export function MobileNav() {
  const { role, currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  // Enable mobile bottom navigation for Sales Rep and Area Manager
  const isMobileRole = role === 'SALES_REP' || role === 'AREA_MANAGER';

  // Close "More" menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Lock body scroll when "More" drawer is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [moreOpen]);

  if (!isMobileRole) return null;

  // Active check for main items
  const isDashboardActive = location.pathname === '/';
  const isCustomersActive = location.pathname.startsWith('/customers');
  const isOrdersActive = location.pathname.startsWith('/orders');
  const isWarrantyActive = location.pathname.startsWith('/warranty');

  // Check if current page is one of the "More" sub-features
  const isMoreRouteActive =
    location.pathname.startsWith('/payments') ||
    location.pathname.startsWith('/quotations') ||
    location.pathname.startsWith('/products') ||
    location.pathname.startsWith('/inventory') ||
    location.pathname.startsWith('/commissions') ||
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/invoices') ||
    location.pathname.startsWith('/approvals');

  const handleNavClick = (path: string) => {
    setMoreOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMoreOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* 1. Fixed Bottom Navigation Bar (5 Items) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] md:hidden rounded-t-[20px] pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="grid grid-cols-5 h-[66px] items-center px-1">
          {/* 1. Dashboard */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'group flex flex-col items-center justify-center h-full py-1 transition-all select-none active:scale-95',
                isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-700'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200',
                    isActive
                      ? 'bg-primary-light text-primary font-bold shadow-2xs'
                      : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
                  )}
                >
                  <LayoutDashboard className={cn('h-5 w-5 transition-transform', isActive && 'scale-105 stroke-[2.2]')} />
                </div>
                <span
                  className={cn(
                    'text-[10.5px] tracking-tight mt-0.5 transition-colors',
                    isActive ? 'font-bold text-primary' : 'font-medium text-slate-500'
                  )}
                >
                  Dashboard
                </span>
              </>
            )}
          </NavLink>

          {/* 2. Customers */}
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              cn(
                'group flex flex-col items-center justify-center h-full py-1 transition-all select-none active:scale-95',
                isActive || isCustomersActive ? 'text-primary' : 'text-slate-400 hover:text-slate-700'
              )
            }
          >
            {() => {
              const active = isCustomersActive;
              return (
                <>
                  <div
                    className={cn(
                      'flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200',
                      active
                        ? 'bg-primary-light text-primary font-bold shadow-2xs'
                        : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
                    )}
                  >
                    <Users className={cn('h-5 w-5 transition-transform', active && 'scale-105 stroke-[2.2]')} />
                  </div>
                  <span
                    className={cn(
                      'text-[10.5px] tracking-tight mt-0.5 transition-colors',
                      active ? 'font-bold text-primary' : 'font-medium text-slate-500'
                    )}
                  >
                    Customers
                  </span>
                </>
              );
            }}
          </NavLink>

          {/* 3. Center Elevated Floating Action Button (FAB) for Orders */}
          <NavLink
            to="/orders"
            aria-label="Orders & Quick Sales"
            className="group relative flex flex-col items-center justify-center -mt-6 select-none active:scale-90 transition-transform"
          >
            <div
              className={cn(
                'flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.18)] ring-4 ring-white transition-all duration-200 cursor-pointer',
                isOrdersActive
                  ? 'bg-gradient-to-tr from-primary to-primary-hover text-white ring-primary/20 shadow-[0_10px_24px_rgba(0,0,0,0.28)] scale-105'
                  : 'bg-primary text-white hover:brightness-105'
              )}
            >
              <ShoppingCart className="h-6 w-6 stroke-[2.2] text-white" />
            </div>
            <span
              className={cn(
                'text-[10.5px] font-bold tracking-tight mt-1 transition-colors',
                isOrdersActive ? 'text-primary' : 'text-slate-700 group-hover:text-primary'
              )}
            >
              Orders
            </span>
          </NavLink>

          {/* 4. Warranty */}
          <NavLink
            to="/warranty"
            className={({ isActive }) =>
              cn(
                'group flex flex-col items-center justify-center h-full py-1 transition-all select-none active:scale-95',
                isActive || isWarrantyActive ? 'text-primary' : 'text-slate-400 hover:text-slate-700'
              )
            }
          >
            {() => {
              const active = isWarrantyActive;
              return (
                <>
                  <div
                    className={cn(
                      'flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200',
                      active
                        ? 'bg-primary-light text-primary font-bold shadow-2xs'
                        : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
                    )}
                  >
                    <ShieldCheck className={cn('h-5 w-5 transition-transform', active && 'scale-105 stroke-[2.2]')} />
                  </div>
                  <span
                    className={cn(
                      'text-[10.5px] tracking-tight mt-0.5 transition-colors',
                      active ? 'font-bold text-primary' : 'font-medium text-slate-500'
                    )}
                  >
                    Warranty
                  </span>
                </>
              );
            }}
          </NavLink>

          {/* 5. More ⋯ (Opens Bottom Sheet) */}
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            aria-expanded={moreOpen}
            aria-label="Open More features menu"
            className={cn(
              'group flex flex-col items-center justify-center h-full py-1 transition-all select-none active:scale-95 focus:outline-none',
              moreOpen || isMoreRouteActive ? 'text-primary' : 'text-slate-400 hover:text-slate-700'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200',
                moreOpen || isMoreRouteActive
                  ? 'bg-primary-light text-primary font-bold shadow-2xs'
                  : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5 transition-transform', (moreOpen || isMoreRouteActive) && 'scale-105 stroke-[2.2]')} />
            </div>
            <span
              className={cn(
                'text-[10.5px] tracking-tight mt-0.5 transition-colors',
                moreOpen || isMoreRouteActive ? 'font-bold text-primary' : 'font-medium text-slate-500'
              )}
            >
              More ⋯
            </span>
          </button>
        </div>
      </nav>

      {/* 2. "More" Navigation Bottom Sheet Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. "More" Navigation Bottom Sheet Container */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl transition-transform duration-250 ease-out border-t border-slate-200/90 md:hidden pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag Handle Bar */}
        <div className="flex justify-center pb-2">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">More Features</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {role === 'AREA_MANAGER' ? 'Area Operations & Management Hub' : 'Field Sales & Collections Desk'}
            </p>
          </div>
          <button
            onClick={() => setMoreOpen(false)}
            className="p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Badge / Territory Summary */}
        <div className="my-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm shadow-xs">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500 font-medium">
                {role === 'AREA_MANAGER' ? (currentUser.areaName || 'Western Province Area') : 'Colombo Territory Rep'}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary-text border border-primary-border">
            <UserCheck className="h-3.5 w-3.5" />
            {role.replace('_', ' ')}
          </span>
        </div>

        {/* Group 1: Sales & Field Operations */}
        <div className="space-y-2 mt-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Sales & Field Operations
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleNavClick('/payments')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/payments') && !location.pathname.includes('/collect')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Payments</div>
                <div className="text-[10.5px] text-slate-400 truncate">PDC & Receipts</div>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('/payments/collect')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.includes('/collect')
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Collect Payment</div>
                <div className="text-[10.5px] text-emerald-600 font-medium truncate">Instant FIFO</div>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('/quotations')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/quotations')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Quotations</div>
                <div className="text-[10.5px] text-slate-400 truncate">Quotes & WhatsApp</div>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('/warranty')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/warranty')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Store className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Shop Follow-ups</div>
                <div className="text-[10.5px] text-slate-400 truncate">Pending Notes</div>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('/invoices')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/invoices')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Invoices</div>
                <div className="text-[10.5px] text-slate-400 truncate">Tax &amp; Billing</div>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('/approvals')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/approvals')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Approvals</div>
                <div className="text-[10.5px] text-slate-400 truncate">Engine Queue</div>
              </div>
            </button>
          </div>
        </div>

        {/* Group 2: Catalog & Stock */}
        <div className="space-y-2 mt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Products & Inventory
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleNavClick('/products')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/products')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Products</div>
                <div className="text-[10.5px] text-slate-400 truncate">Prices & Discounts</div>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('/inventory/stock')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/inventory')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Boxes className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Warehouse Stock</div>
                <div className="text-[10.5px] text-slate-400 truncate">Live Quantities</div>
              </div>
            </button>
          </div>
        </div>

        {/* Group 3: Analytics & Approvals */}
        <div className="space-y-2 mt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Performance & Analytics
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleNavClick('/reports')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/reports')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Reports</div>
                <div className="text-[10.5px] text-slate-400 truncate">Sales & Collections</div>
              </div>
            </button>

            <button
              onClick={() => handleNavClick('/commissions')}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                location.pathname.startsWith('/commissions')
                  ? 'border-primary bg-primary-light/50 text-primary-text font-semibold'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Award className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">Targets & Incentive</div>
                <div className="text-[10.5px] text-slate-400 truncate">Commission Hub</div>
              </div>
            </button>
          </div>
        </div>

        {/* Group 4: Account Actions */}
        <div className="pt-4 border-t border-slate-100 mt-4 space-y-2.5">
          <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
              Switch Role View
            </div>
            <RoleSwitcher className="w-full" triggerClassName="w-full justify-between bg-white text-xs h-9 rounded-md" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors"
          >
            <LogOut className="h-4 w-4 text-rose-600" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </>
  );
}
