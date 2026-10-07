import { useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Calendar,
  Store,
  Users,
  Users2,
  Package,
  Boxes,
  CreditCard,
  DollarSign,
  Award,
  ShieldCheck,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  X,
  Star,
  ArrowLeftRight,
  BookOpen,
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Compass,
  CheckCircle,
  LucideIcon,
  Landmark,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type RailCategory = 'all' | 'sales' | 'customers' | 'inventory' | 'finance' | 'approvals' | 'reports' | 'admin';

interface SidebarItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  category: RailCategory;
  groupColor: 'green' | 'purple' | 'brown' | 'blue' | 'orange';
  exact?: boolean;
  directorOnly?: boolean;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { canAccessRoute, currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<RailCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Emerald / Green Group — Procurement, Orders & Approvals
  const greenItems: SidebarItem[] = [
    { id: 'suppliers', name: 'Suppliers', path: '/finance/suppliers', icon: Store, category: 'finance', groupColor: 'green' },
    { id: 'quotations', name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, category: 'sales', groupColor: 'green' },
    { id: 'orders', name: 'Sales Orders', path: '/orders', icon: ShoppingCart, category: 'sales', groupColor: 'green' },
    { id: 'approvals', name: 'Approvals Engine', path: '/approvals', icon: CheckCircle, category: 'approvals', groupColor: 'green' },
  ];

  // 2. Purple / Violet Group — Customers, Invoices, Payments & POS
  const purpleItems: SidebarItem[] = [
    { id: 'customers', name: 'Customer Master', path: '/customers', icon: Users2, category: 'customers', groupColor: 'purple' },
    { id: 'invoices', name: 'Invoices', path: '/invoices', icon: Receipt, category: 'sales', groupColor: 'purple' },
    { id: 'payments', name: 'Payments', path: '/payments', icon: CreditCard, category: 'finance', groupColor: 'purple' },
    { id: 'pos', name: 'Showroom POS', path: '/pos', icon: Store, category: 'sales', groupColor: 'purple' },
  ];

  // 3. Brown / Bronze / Amber Group — Products & Inventory
  const brownItems: SidebarItem[] = [
    { id: 'products', name: 'Product Master', path: '/products', icon: Package, category: 'inventory', groupColor: 'brown' },
    { id: 'inventory', name: 'Inventory & GRN', path: '/inventory', icon: Boxes, category: 'inventory', groupColor: 'brown', exact: true },
    { id: 'transfers', name: 'Stock Transfers', path: '/inventory/transfers', icon: ArrowLeftRight, category: 'inventory', groupColor: 'brown' },
  ];

  // 4. Blue Group — Finance, Banking, Ledger & Warranty
  const blueItems: SidebarItem[] = [
    { id: 'finance-desk', name: 'Finance Desk', path: '/finance/desk', icon: Zap, category: 'finance', groupColor: 'blue' },
    { id: 'accounts', name: 'Chart of Accounts', path: '/finance/accounts', icon: BookOpen, category: 'finance', groupColor: 'blue' },
    { id: 'reconciliation', name: 'Bank Reconciliation', path: '/finance/reconciliation', icon: Landmark, category: 'finance', groupColor: 'blue' },
    { id: 'finance', name: 'Finance & Ledger', path: '/finance', icon: DollarSign, category: 'finance', groupColor: 'blue', exact: true },
    { id: 'warranty', name: 'Warranty Hub', path: '/warranty', icon: ShieldCheck, category: 'approvals', groupColor: 'blue' },
    { id: 'commissions', name: 'Sales Commission', path: '/commissions', icon: Award, category: 'finance', groupColor: 'blue' },
  ];

  // 5. Orange / Gold Group — Administration, Field Management & Intelligence
  const orangeItems: SidebarItem[] = [
    { id: 'teams', name: 'Team Management', path: '/teams', icon: Users, category: 'admin', groupColor: 'orange' },
    { id: 'areas', name: 'Area Management', path: '/areas', icon: Compass, category: 'admin', groupColor: 'orange' },
    { id: 'reports', name: 'Enterprise Reports', path: '/reports', icon: BarChart3, category: 'reports', groupColor: 'orange' },
    { id: 'theme', name: 'Theme & Appearance', path: '/?tab=settings', icon: Settings, category: 'admin', groupColor: 'orange', directorOnly: true },
    { id: 'role-portal', name: 'Role Switcher Portal', path: '/login', icon: Users, category: 'admin', groupColor: 'orange' },
  ];

  // Combined item list in canonical Quick Links order
  const allRawItems: SidebarItem[] = [
    ...greenItems,
    ...purpleItems,
    ...brownItems,
    ...blueItems,
    ...orangeItems,
  ];

  // Filter items by role permission and director exclusivity
  const authorizedItems = useMemo(() => {
    return allRawItems.filter((item) => {
      if (item.directorOnly && currentUser.role !== 'DIRECTOR') {
        return false;
      }
      return canAccessRoute(item.path.split('?')[0]);
    });
  }, [canAccessRoute, currentUser.role]);

  // Filter items based on active category and search input
  const displayedItems = useMemo(() => {
    let items = authorizedItems;

    // When searching, search across all items so nothing is hidden
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return items.filter(
        (item) => item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
      );
    }

    if (activeCategory !== 'all') {
      items = items.filter((item) => item.category === activeCategory);
    }

    return items;
  }, [authorizedItems, activeCategory, searchQuery]);

  // Color styles configuration matching the reference image exactly
  const colorStyles: Record<SidebarItem['groupColor'], { text: string; star: string }> = {
    green: {
      text: 'text-emerald-700',
      star: 'text-emerald-600 fill-emerald-600',
    },
    purple: {
      text: 'text-purple-700',
      star: 'text-purple-600 fill-purple-600',
    },
    brown: {
      text: 'text-amber-800',
      star: 'text-amber-700 fill-amber-700',
    },
    blue: {
      text: 'text-blue-700',
      star: 'text-blue-600 fill-blue-600',
    },
    orange: {
      text: 'text-amber-600',
      star: 'text-amber-500 fill-amber-500',
    },
  };

  // Rail category definition matching reference image icons exactly
  const railItems = [
    { id: 'all' as RailCategory, label: 'Dashboard & Quick Links', icon: LayoutGrid },
    { id: 'sales' as RailCategory, label: 'Sales & Orders', icon: Calendar },
    { id: 'customers' as RailCategory, label: 'Customers & CRM', icon: Users2 },
    { id: 'inventory' as RailCategory, label: 'Inventory & Products', icon: Boxes },
    { id: 'finance' as RailCategory, label: 'Finance & Payments', icon: CreditCard },
    { id: 'approvals' as RailCategory, label: 'Approvals & Warranty', icon: ShieldCheck },
    { id: 'reports' as RailCategory, label: 'Enterprise Reports', icon: BarChart3 },
    { id: 'admin' as RailCategory, label: 'Administration', icon: Settings },
  ];

  // User initials for the top rail badge
  const userInitials = useMemo(() => {
    if (!currentUser?.name) return 'AS';
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return currentUser.name.substring(0, 2).toUpperCase();
  }, [currentUser]);

  // Determine panel title
  const panelTitle = useMemo(() => {
    switch (activeCategory) {
      case 'sales':
        return 'Sales & Orders';
      case 'customers':
        return 'Customers & POS';
      case 'inventory':
        return 'Inventory Hub';
      case 'finance':
        return 'Finance & Ledger';
      case 'approvals':
        return 'Approvals & Hub';
      case 'reports':
        return 'Analytics & Reports';
      case 'admin':
        return 'Administration';
      default:
        return 'Dashboard';
    }
  }, [activeCategory]);

  const isDashboardActive = location.pathname === '/' && !location.search.includes('tab=settings');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Dual-Column Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full select-none transition-transform duration-200 ease-in-out md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ========================================================================= */}
        {/* COLUMN 1: LEFT ICON RAIL (DOCK) */}
        {/* ========================================================================= */}
        <div className="flex w-13 sm:w-14 flex-col items-center justify-between border-r border-slate-200/90 bg-[#f8f9fa] py-3 shrink-0 z-10">
          {/* Top Rail Stack: Avatar + Module Category Icons */}
          <div className="flex flex-col items-center w-full gap-2.5">
            {/* Vertical Stack of Category Navigation Icons */}
            <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
              {railItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeCategory === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'all') {
                        setActiveCategory('all');
                        navigate('/');
                      } else if (activeCategory === item.id) {
                        setActiveCategory('all');
                      } else {
                        setActiveCategory(item.id);
                      }
                    }}
                    title={item.label}
                    aria-label={item.label}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150',
                      isActive
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Rail: Help & Support / Role Portal */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <NavLink
              to="/login"
              onClick={onClose}
              title="Help & Role Portal"
              aria-label="Help & Role Portal"
              className={({ isActive }) =>
                cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-slate-400 hover:bg-slate-200/70 hover:text-slate-700'
                )
              }
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: EXPANDED SUB-NAVIGATION FLYOUT PANEL */}
        {/* ========================================================================= */}
        <div className="flex w-58 sm:w-62 flex-col border-r border-slate-200/90 bg-white">
          {/* Mobile Close Bar Header (Required for Mobile UX & Accessibility Tests) */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 md:hidden">
            <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Navigation</span>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Panel Header: Active Section Title & Search Input */}
          <div className="p-3.5 pb-2.5 space-y-2.5 border-b border-slate-100/80">
            {/* Panel Title */}
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
                {panelTitle}
              </h2>
              {activeCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className="text-[11px] font-medium text-slate-400 hover:text-primary transition-colors"
                >
                  Show All
                </button>
              )}
            </div>

            {/* Real-time Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-7 rounded-md bg-slate-50 border border-slate-200/90 text-[13px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Semantic Navigation Landmark */}
          <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2.5">
            {/* Top Dashboard Pill: Only shown on Dashboard overview, NOT on category sub-menus */}
            {activeCategory === 'all' && !searchQuery.trim() && (
              <NavLink
                to="/"
                end
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                  isDashboardActive
                    ? 'bg-[#d4d4d8] text-slate-900 font-semibold shadow-2xs'
                    : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                )}
              >
                <LayoutGrid className="h-4 w-4 shrink-0 text-slate-700" />
                <span className="truncate">Dashboard</span>
              </NavLink>
            )}

            {/* Sub-navigation Items Section */}
            <div>
              <div className="flex items-center justify-between px-2 pt-1 pb-1">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {activeCategory === 'all' ? 'Quick Links' : panelTitle}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {displayedItems.length}
                </span>
              </div>

              {/* Grouped Items List */}
              <div className="space-y-0.5">
                {displayedItems.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-400">
                    No matching modules found
                  </div>
                ) : (
                  displayedItems.map((item) => {
                    const Icon = item.icon;
                    const style = colorStyles[item.groupColor];

                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        end={item.exact}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition-all',
                            isActive
                              ? 'bg-slate-100 font-semibold text-slate-900 shadow-2xs'
                              : 'font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          )
                        }
                      >
                        {/* Left: Group Colored Icon + Item Name */}
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                          <Icon className={cn('h-4 w-4 shrink-0 transition-colors', style.text)} />
                          <span className="truncate">{item.name}</span>
                        </div>

                        {/* Right: Solid Star Matching the Group Color */}
                        <Star className={cn('h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110', style.star)} />
                      </NavLink>
                    );
                  })
                )}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
