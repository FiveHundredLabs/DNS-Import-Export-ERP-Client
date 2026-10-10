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
  BookOpen,
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Compass,
  CheckCircle,
  LucideIcon,
  Landmark,
  Zap,
  Coins,
  Undo2,
  RotateCcw,
  Clock,
  Lock,
  SlidersHorizontal,
  CheckCircle2,
  Percent,
  Layers,
  Barcode,
} from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type RailCategory =
  | 'all'
  | 'sales'
  | 'customers'
  | 'inventory'
  | 'finance'
  | 'approvals'
  | 'reports'
  | 'admin';

interface SidebarItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  category: RailCategory;
  exact?: boolean;
  directorOnly?: boolean;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { canAccessRoute, currentUser } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<RailCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Automatically activate finance category when navigating within finance module (if authorized)
  useEffect(() => {
    if (location.pathname.startsWith('/finance') && canAccessRoute('/finance')) {
      setActiveCategory('finance');
    }
  }, [location.pathname, canAccessRoute]);

  // 1. Procurement, Orders & Approvals
  const procurementItems: SidebarItem[] = [
    { id: 'quotations', name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, category: 'sales' },
    { id: 'orders', name: 'Sales Orders', path: '/orders', icon: ShoppingCart, category: 'sales' },
    { id: 'approvals', name: 'Approvals Engine', path: '/approvals', icon: CheckCircle, category: 'approvals' },
    { id: 'warranty', name: 'Warranty Hub', path: '/warranty', icon: ShieldCheck, category: 'approvals' },
    { id: 'warranty-verification', name: 'Warranty Verification', path: '/warranty/verification', icon: Barcode, category: 'sales' },
  ];

  // 2. Customers, Invoices, Payments & POS
  const customerItems: SidebarItem[] = [
    { id: 'customers', name: 'Customer Master', path: '/customers', icon: Users2, category: 'customers' },
    { id: 'invoices', name: 'Invoices', path: '/invoices', icon: Receipt, category: 'sales' },
    { id: 'payments', name: 'Payments', path: '/payments', icon: CreditCard, category: 'finance' },
    { id: 'pos', name: 'Showroom POS', path: '/pos', icon: Store, category: 'sales' },
  ];

  // 3. Products & Inventory
  const inventoryItems: SidebarItem[] = [
    { id: 'products', name: 'Product Master', path: '/products', icon: Package, category: 'inventory' },
    { id: 'inventory', name: 'Inventory & GRN', path: '/inventory', icon: Boxes, category: 'inventory', exact: true },
  ];

  // 4. Finance, Banking & Ledger Core
  const financeItems: SidebarItem[] = [
    { id: 'journal', name: 'Journal Entry Voucher', path: '/finance/journal/new', icon: Zap, category: 'finance' },
    { id: 'accounts', name: 'Chart of Accounts', path: '/finance/accounts', icon: BookOpen, category: 'finance' },
    { id: 'ap-bills', name: 'Vendor Bill Costing (AP)', path: '/finance/ap/bills/new', icon: Receipt, category: 'finance' },
    { id: 'ap-advances', name: 'Advance Prepayments (AP)', path: '/finance/ap/advances', icon: Coins, category: 'finance' },
    { id: 'ap-debit-notes', name: 'Supplier Debit Notes', path: '/finance/ap/debit-notes', icon: Undo2, category: 'finance' },
    { id: 'ap-payments', name: 'Batch Supplier Payments', path: '/finance/ap/payments/new', icon: CreditCard, category: 'finance' },
    { id: 'ar-approvals', name: 'Receipt Approval Queue (AR)', path: '/finance/ar/approvals', icon: CheckCircle2, category: 'finance' },
    { id: 'ar-allocate', name: 'AR Collection Allocation', path: '/finance/ar/allocate', icon: SlidersHorizontal, category: 'finance' },
    { id: 'ar-pdc', name: 'PDC Vault (Cheques in Hand)', path: '/finance/ar/pdc-vault', icon: Clock, category: 'finance' },
    { id: 'ar-credit-notes', name: 'Customer Credit Notes', path: '/finance/ar/credit-notes', icon: RotateCcw, category: 'finance' },
    { id: 'reconciliation', name: 'Bank Reconciliation', path: '/finance/reconciliation', icon: Landmark, category: 'finance' },
    { id: 'suppliers', name: 'Suppliers', path: '/finance/suppliers', icon: Store, category: 'finance' },
    { id: 'closing', name: 'Period Closing Lock', path: '/finance/settings/closing', icon: Lock, category: 'finance' },
    { id: 'monthly-audit', name: 'Monthly Audit & Double Entry', path: '/finance/reports/monthly-audit', icon: Layers, category: 'finance' },
    { id: 'reports-hub', name: 'Financial Reports Hub', path: '/finance/reports', icon: BarChart3, category: 'finance' },
    { id: 'commissions', name: 'Sales Commission', path: '/commissions', icon: Award, category: 'finance' },
  ];

  // 5. Administration, Field Management & Intelligence
  const adminItems: SidebarItem[] = [
    { id: 'teams', name: 'Team Management', path: '/teams', icon: Users, category: 'admin' },
    { id: 'areas', name: 'Area Management', path: '/areas', icon: Compass, category: 'admin' },
    { id: 'reports', name: 'Enterprise Reports', path: '/reports', icon: BarChart3, category: 'reports' },
    { id: 'tax-settings', name: 'Global Tax Configuration', path: '/?tab=settings&section=tax', icon: Percent, category: 'admin', directorOnly: true },
    { id: 'theme', name: 'Theme & Appearance', path: '/?tab=settings&section=appearance', icon: Settings, category: 'admin', directorOnly: true },
    { id: 'role-portal', name: 'Role Switcher Portal', path: '/login', icon: Users, category: 'admin' },
  ];

  // Combined item list in canonical Quick Links order
  const allRawItems: SidebarItem[] = [
    ...procurementItems,
    ...customerItems,
    ...inventoryItems,
    ...financeItems,
    ...adminItems,
  ];

  // Filter items by role permission and director exclusivity
  const authorizedItems = useMemo(() => {
    return allRawItems.filter((item) => {
      if (item.directorOnly && currentUser.role !== 'DIRECTOR') {
        return false;
      }
      if (item.path.includes('tab=settings') && !canAccessRoute('/settings')) {
        return false;
      }
      return canAccessRoute(item.path.split('?')[0]);
    });
  }, [allRawItems, canAccessRoute, currentUser.role]);

  // Authorized favorite items
  const authorizedFavoriteItems = useMemo(() => {
    return authorizedItems.filter((item) => isFavorite(item.id));
  }, [authorizedItems, isFavorite]);

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

  // Rail category definition (No separate favorites rail item)
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

  // Filter rail categories: 'all' is always visible (Dashboard);
  // other parent categories are only visible if the user's role has permission to access at least 1 child item
  const authorizedRailItems = useMemo(() => {
    return railItems.filter((rail) => {
      if (rail.id === 'all') return true;
      return authorizedItems.some((item) => item.category === rail.id);
    });
  }, [railItems, authorizedItems]);

  // Automatically reset to 'all' if the currently active category is unauthorized for this role
  useEffect(() => {
    if (activeCategory !== 'all' && !authorizedRailItems.some((r) => r.id === activeCategory)) {
      setActiveCategory('all');
    }
  }, [activeCategory, authorizedRailItems]);

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

  // Check if a sidebar item's route is currently active
  const isItemActive = (item: SidebarItem) => {
    if (item.path.includes('?')) {
      return location.pathname + location.search === item.path;
    }
    if (item.exact) {
      return location.pathname === item.path;
    }
    if (item.path === '/') {
      return location.pathname === '/' && !location.search.includes('tab=settings');
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  // Reusable item row renderer with clean neutral content-page styling and enlarged icons
  const renderItemRow = (item: SidebarItem) => {
    const Icon = item.icon;
    const itemIsFav = isFavorite(item.id);
    const active = isItemActive(item);

    return (
      <div
        key={item.id}
        className={cn(
          'group flex items-center justify-between rounded-md text-[13px] transition-all',
          active
            ? 'bg-slate-100 font-semibold text-slate-900 shadow-2xs'
            : 'font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        {/* Left: Slate Gray Menu Item Icon (Small: h-3.5 w-3.5) + Item Name */}
        <NavLink
          to={item.path}
          end={item.exact}
          onClick={onClose}
          className="flex items-center gap-2 min-w-0 flex-1 px-2 py-1.5 focus:outline-none"
        >
          <Icon className={cn('h-3.5 w-3.5 shrink-0 transition-colors text-slate-500 group-hover:text-slate-700', active && 'text-slate-900')} />
          <span className="truncate">{item.name}</span>
        </NavLink>

        {/* Right: Interactive Star Toggle Button (Clean Gray, Small) */}
        <button
          type="button"
          onClick={(e) => toggleFavorite(item.id, item.name, e)}
          aria-label={itemIsFav ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
          title={itemIsFav ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
          className={cn(
            'flex items-center justify-center h-6 w-6 rounded-md mr-1 transition-all',
            'focus:outline-none focus:ring-1 focus:ring-slate-300',
            itemIsFav
              ? 'text-slate-600 hover:bg-slate-200/60'
              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
          )}
        >
          <Star
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-all duration-150',
              itemIsFav
                ? 'text-slate-600 fill-slate-500 scale-105'
                : 'text-slate-300 fill-none group-hover:text-slate-400 hover:text-slate-600 hover:scale-110'
            )}
          />
        </button>
      </div>
    );
  };

  // Sales Rep & Area Manager use the bottom nav on mobile — no sidebar overlay needed for them
  const isMobileNavRole = currentUser.role === 'SALES_REP' || currentUser.role === 'AREA_MANAGER';

  return (
    <>
      {/* Mobile Backdrop — hidden for mobile nav roles (they use the bottom nav instead) */}
      {isOpen && !isMobileNavRole && (
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
          // On mobile, mobile nav roles always stay hidden (translate-x-full)
          isMobileNavRole
            ? 'md:translate-x-0 -translate-x-full'
            : isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ========================================================================= */}
        {/* COLUMN 1: LEFT ICON RAIL (DOCK - MATCHES TOP HEADER) */}
        {/* ========================================================================= */}
        <div className="flex w-14 sm:w-16 flex-col items-center justify-between bg-primary text-primary-foreground py-3 shrink-0 z-10 select-none">
          {/* Top Rail Stack: Module Category Navigation Icons */}
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full px-2">
              {authorizedRailItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeCategory === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
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
                      'relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-all duration-150 group',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground shadow-xs font-semibold'
                        : 'text-primary-foreground/70 hover:bg-primary-foreground/12 hover:text-primary-foreground'
                    )}
                  >
                    {/* Clean Left Active Indicator Strip */}
                    {isActive && (
                      <span
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 sm:h-6 rounded-r-full bg-primary-foreground shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <Icon className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Rail: Help & Support / Role Portal */}
          <div className="flex flex-col items-center gap-2 w-full px-2 pt-2 border-t border-primary-foreground/15">
            <NavLink
              to="/login"
              onClick={onClose}
              title="Help & Role Portal"
              aria-label="Help & Role Portal"
              className={({ isActive }) =>
                cn(
                  'relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl transition-all duration-150 group',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground shadow-xs'
                    : 'text-primary-foreground/70 hover:bg-primary-foreground/12 hover:text-primary-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 sm:h-6 rounded-r-full bg-primary-foreground shadow-xs"
                      aria-hidden="true"
                    />
                  )}
                  <HelpCircle className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: EXPANDED SUB-NAVIGATION FLYOUT PANEL (CONTENT PAGE SHADE) */}
        {/* ========================================================================= */}
        <div className="flex w-60 sm:w-64 flex-col border-r border-slate-200/90 bg-white rounded-tl-xl md:rounded-tl-[16px] overflow-hidden">
          {/* Mobile Close Bar Header */}
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

          {/* Panel Header: Active Section Title & Optional Dashboard Search Input */}
          <div className="p-3.5 pb-2.5 space-y-2.5 border-b border-slate-100/90">
            {/* Panel Title */}
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">
                {panelTitle}
              </h2>
              {activeCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchQuery('');
                  }}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Dashboard
                </button>
              )}
            </div>

            {/* Real-time Search Input: ONLY rendered on Dashboard inner sidebar */}
            {activeCategory === 'all' && (
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
            )}
          </div>

          {/* Semantic Navigation Landmark */}
          <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2.5">
            {activeCategory === 'all' ? (
              searchQuery.trim() ? (
                /* Search Results (displayed when user searches in Dashboard search bar) */
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between px-2 pt-1 pb-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Search Results
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                      {displayedItems.length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {displayedItems.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-slate-400">
                        No matching modules found
                      </div>
                    ) : (
                      displayedItems.map((item) => renderItemRow(item))
                    )}
                  </div>
                </div>
              ) : (
                /* Dashboard Overview: Dashboard shortcut + Favorites ONLY (No "ALL MODULES") */
                <>
                  {/* Top Dashboard Pill */}
                  <NavLink
                    to="/"
                    end
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                      isDashboardActive
                        ? 'bg-slate-200 text-slate-900 font-semibold shadow-2xs'
                        : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                    )}
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0 text-slate-700" />
                    <span className="truncate">Dashboard</span>
                  </NavLink>

                  {/* Favorites section (ONLY list rendered in dashboard submenu) */}
                  <div className="space-y-0.5 pt-1">
                    <div className="flex items-center justify-between px-2 pt-1 pb-1">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-slate-500 fill-slate-500" />
                        <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                          Favorites
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {authorizedFavoriteItems.length}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {authorizedFavoriteItems.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-md">
                          <Star className="h-4 w-4 mx-auto mb-1.5 text-slate-300 fill-none" />
                          No favorite items yet
                          <p className="mt-1 text-[11px] text-slate-500">
                            Click the star on any module in category tabs to pin it here.
                          </p>
                        </div>
                      ) : (
                        authorizedFavoriteItems.map((item) => renderItemRow(item))
                      )}
                    </div>
                  </div>
                </>
              )
            ) : (
              /* Category Sub-navigation (Sales, Customers, Inventory, Finance, Approvals, Reports, Admin) */
              <div className="space-y-0.5">
                <div className="flex items-center justify-between px-2 pt-1 pb-1">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                    {panelTitle}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                    {displayedItems.length}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {displayedItems.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">
                      No modules available
                    </div>
                  ) : (
                    displayedItems.map((item) => renderItemRow(item))
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
