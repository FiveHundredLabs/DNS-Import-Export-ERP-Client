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
  ShieldAlert,
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
  ArrowLeftRight,
  CheckSquare,
  Truck,
  Banknote,
  Wallet,
  LayoutDashboard,
  ShoppingBag,
  UserPlus,
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
  | 'purchasing'
  | 'sales'
  | 'customers'
  | 'inventory'
  | 'finance'
  | 'approvals'
  | 'reports'
  | 'admin'
  | 'users';

interface SidebarItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  category: RailCategory;
  exact?: boolean;
  directorOnly?: boolean;
  allowedRoles?: string[];
  excludedRoles?: string[];
  badge?: string;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { canAccessRoute, currentUser, role } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const location = useLocation();
  const navigate = useNavigate();

  const isDirector = currentUser.role === 'DIRECTOR';

  const [activeCategory, setActiveCategory] = useState<RailCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Automatically activate category when navigating within modules
  useEffect(() => {
    if (isDirector) {
      const p = location.pathname;
      if (
        p.startsWith('/purchasing/orders') ||
        p.startsWith('/purchasing/grn') ||
        p.startsWith('/purchasing/returns')
      ) {
        setActiveCategory('purchasing');
      } else if (
        p.startsWith('/quotations') ||
        p.startsWith('/orders') ||
        p.startsWith('/invoices') ||
        p.startsWith('/payments/collect') ||
        p.startsWith('/pos')
      ) {
        setActiveCategory('sales');
      } else if (
        p.startsWith('/customers') ||
        p.startsWith('/purchasing/suppliers') ||
        p.startsWith('/teams') ||
        p.startsWith('/areas')
      ) {        setActiveCategory('users');
      } else if (p.startsWith('/inventory') || p.startsWith('/products')) {
        setActiveCategory('inventory');
      } else if (p.startsWith('/finance') || p === '/payments') {
        setActiveCategory('finance');
      } else if (p.startsWith('/approvals') || p.startsWith('/warranty')) {
        setActiveCategory('approvals');
      } else if (p.startsWith('/reports')) {
        setActiveCategory('reports');
      } else if (p.startsWith('/commissions') || location.search.includes('tab=settings')) {
        setActiveCategory('admin');
      } else if (p === '/' && !location.search.includes('tab=settings')) {
        setActiveCategory('all');
      }
    } else {
      if (location.pathname.startsWith('/purchasing') && (canAccessRoute('/purchasing') || canAccessRoute('/purchasing/orders'))) {
        setActiveCategory('purchasing');
      } else if (location.pathname.startsWith('/finance') && canAccessRoute('/finance')) {
        setActiveCategory('finance');
      } else if (location.pathname.startsWith('/customers')) {
        setActiveCategory('customers');
      } else if (location.pathname.startsWith('/inventory') || location.pathname.startsWith('/products')) {
        setActiveCategory('inventory');
      } else if (location.pathname.startsWith('/reports')) {
        setActiveCategory('reports');
      }
    }
  }, [location.pathname, location.search, canAccessRoute, isDirector]);

  // =========================================================================
  // DIRECTOR SPECIFICATION: 9 DEDICATED SECTIONS (Strict role isolation)
  // =========================================================================
  const directorPurchasingItems: SidebarItem[] = [
    { id: 'purchasing-orders', name: 'Purchase Orders', path: '/purchasing/orders', icon: ShoppingCart, category: 'purchasing' },
    { id: 'director-purchasing-approvals', name: 'PO Approvals', path: '/approvals', icon: ShieldCheck, category: 'purchasing' },
    { id: 'purchasing-payments', name: 'Supplier Payments (View Only)', path: '/purchasing/payments', icon: CreditCard, category: 'purchasing' },
    { id: 'purchasing-grn', name: 'Goods Received Notes (View Only)', path: '/purchasing/grn', icon: Boxes, category: 'purchasing' },
    { id: 'purchasing-returns', name: 'Supplier Returns & RMA', path: '/purchasing/returns', icon: RotateCcw, category: 'purchasing' },
  ];

  const directorSalesItems: SidebarItem[] = [
    { id: 'quotations', name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, category: 'sales' },
    { id: 'orders', name: 'Sales Orders', path: '/orders', icon: ShoppingCart, category: 'sales' },
    { id: 'invoices', name: 'Invoices', path: '/invoices', icon: Receipt, category: 'sales' },
    { id: 'customer-collections', name: 'Customer Collections', path: '/payments/collect', icon: Banknote, category: 'sales' },
    { id: 'cash-in-hand', name: 'Cash in Hand (Wallet)', path: '/payments', icon: Wallet, category: 'sales' },
    { id: 'pos', name: 'Showroom POS', path: '/pos', icon: Store, category: 'sales' },
  ];

  const directorUserManagementItems: SidebarItem[] = [
    { id: 'customers', name: 'Customer Master', path: '/customers', icon: Users2, category: 'users' },
    { id: 'customer-onboarding', name: 'Customer Onboarding', path: '/customers/onboarding', icon: UserPlus, category: 'users' },
    { id: 'purchasing-suppliers', name: 'Supplier Management', path: '/purchasing/suppliers', icon: Store, category: 'users' },
    { id: 'teams', name: 'Team Management', path: '/teams', icon: Users, category: 'users' },
    { id: 'areas', name: 'Area Management', path: '/areas', icon: Compass, category: 'users' },
  ];

  const directorInventoryItems: SidebarItem[] = [
    { id: 'inventory', name: 'Inventory Hub', path: '/inventory', icon: Boxes, category: 'inventory', exact: true },
    { id: 'delivery-notes', name: 'Delivery Notes (Read Only)', path: '/inventory/delivery-notes', icon: Truck, category: 'inventory' },
    { id: 'grn', name: 'GRN (Read Only)', path: '/inventory/grn', icon: Receipt, category: 'inventory' },
    { id: 'products', name: 'Product Master', path: '/products', icon: Package, category: 'inventory' },
    { id: 'damaged-stock', name: 'Damaged Stock & RMA', path: '/inventory/damaged-stock', icon: ShieldAlert, category: 'inventory' },
  ];

  const directorFinanceItems: SidebarItem[] = [
    { id: 'accounts', name: 'Chart of Accounts', path: '/finance/accounts', icon: BookOpen, category: 'finance' },
    { id: 'ap-bills', name: 'Vendor Bill Costing (AP)', path: '/finance/ap/bills/new', icon: Receipt, category: 'finance' },
    { id: 'ap-advances', name: 'Supplier Advance Prepayments', path: '/finance/ap/advances', icon: Coins, category: 'finance' },
    { id: 'ap-payments', name: 'Batch Supplier Payments', path: '/finance/ap/payments/new', icon: CreditCard, category: 'finance' },
    { id: 'ap-debit-notes', name: 'Supplier Debit Notes', path: '/finance/ap/debit-notes', icon: Undo2, category: 'finance' },
    { id: 'ar-handovers', name: 'Sales Rep Cash Handovers', path: '/payments', icon: Banknote, category: 'finance' },
    { id: 'ar-approvals', name: 'Receipt Approval Queue (AR)', path: '/finance/ar/approvals', icon: CheckCircle2, category: 'finance' },
    { id: 'ar-pdc', name: 'PDC Vault (Cheques in Hand)', path: '/finance/ar/pdc-vault', icon: Clock, category: 'finance' },
    { id: 'ar-allocate', name: 'AR Collection Allocation', path: '/finance/ar/allocate', icon: SlidersHorizontal, category: 'finance' },
    { id: 'ar-credit-notes', name: 'Customer Credit Notes', path: '/finance/ar/credit-notes', icon: RotateCcw, category: 'finance' },
    { id: 'journal', name: 'Journal Entry Voucher', path: '/finance/journal/new', icon: Zap, category: 'finance' },
    { id: 'cash-book', name: 'Cash Book & Vouchers', path: '/finance/cash-book', icon: Coins, category: 'finance' },
    { id: 'reconciliation', name: 'Bank Reconciliation', path: '/finance/reconciliation', icon: Landmark, category: 'finance' },
    { id: 'closing', name: 'Period Closing Lock', path: '/finance/settings/closing', icon: Lock, category: 'finance' },
    { id: 'reports-hub', name: 'Financial Reports Hub', path: '/finance/reports', icon: BarChart3, category: 'finance' },
    { id: 'monthly-audit', name: 'Monthly Audit & Double Entry', path: '/finance/reports/monthly-audit', icon: Layers, category: 'finance' },
  ];

  const directorApprovalItems: SidebarItem[] = [
    { id: 'approvals', name: 'Approval Engine', path: '/approvals', icon: CheckCircle, category: 'approvals' },
    { id: 'warranty', name: 'Warranty Hub', path: '/warranty', icon: ShieldCheck, category: 'approvals' },
    { id: 'my-approvals', name: 'My Approvals', path: '/approvals/my-approvals', icon: CheckSquare, category: 'approvals', badge: 'Assigned' },
  ];

  const directorReportItems: SidebarItem[] = [
    { id: 'purchase-reports', name: 'Purchase Reports', path: '/reports/purchasing', icon: ShoppingCart, category: 'reports' },
    { id: 'sales-reports', name: 'Sales Reports', path: '/reports/sales', icon: BarChart3, category: 'reports' },
    { id: 'inventory-reports', name: 'Inventory Reports', path: '/reports/inventory', icon: Boxes, category: 'reports' },
    { id: 'finance-reports', name: 'Finance Reports', path: '/reports/finance', icon: Landmark, category: 'reports' },
  ];

  const directorAdminItems: SidebarItem[] = [
    { id: 'credit-terms-settings', name: 'Default Credit Terms', path: '/?tab=settings&section=credit-terms', icon: CreditCard, category: 'admin' },
    { id: 'tax-settings', name: 'Global Tax Configuration', path: '/?tab=settings&section=tax', icon: Percent, category: 'admin' },
    { id: 'theme', name: 'Theme & Appearance', path: '/?tab=settings&section=appearance', icon: Settings, category: 'admin' },
    { id: 'commissions-config', name: 'Commission Configuration', path: '/commissions', icon: Award, category: 'admin' },
    { id: 'role-portal', name: 'Role Switcher Portal', path: '/login', icon: Users, category: 'admin' },
  ];

  const directorAllRawItems: SidebarItem[] = [
    ...directorPurchasingItems,
    ...directorSalesItems,
    ...directorUserManagementItems,
    ...directorInventoryItems,
    ...directorFinanceItems,
    ...directorApprovalItems,
    ...directorReportItems,
    ...directorAdminItems,
  ];

  const directorRailItems = [
    { id: 'all' as RailCategory, label: 'Director Dashboard', icon: LayoutDashboard },
    { id: 'purchasing' as RailCategory, label: 'Purchasing & Procurement', icon: ShoppingCart },
    { id: 'sales' as RailCategory, label: 'Sales & Orders', icon: ShoppingBag },
    { id: 'users' as RailCategory, label: 'User Management', icon: Users },
    { id: 'inventory' as RailCategory, label: 'Inventory Hub', icon: Boxes },
    { id: 'finance' as RailCategory, label: 'Finance', icon: Landmark },
    { id: 'approvals' as RailCategory, label: 'Approval Hub', icon: ShieldCheck },
    { id: 'reports' as RailCategory, label: 'Reports', icon: BarChart3 },
    { id: 'admin' as RailCategory, label: 'Administration', icon: Settings },
  ];

  // =========================================================================
  // STANDARD ROLE NAVIGATION (Preserved without modification for other roles)
  // =========================================================================

  // 0. Purchasing & Procurement Module
  const purchasingItems: SidebarItem[] = [
    { id: 'purchasing-dashboard', name: 'Purchasing Dashboard', path: '/purchasing', icon: LayoutGrid, category: 'purchasing', exact: true, excludedRoles: ['MANAGER'] },
    { id: 'purchasing-suppliers', name: 'Supplier Management', path: '/purchasing/suppliers', icon: Store, category: 'purchasing', excludedRoles: ['MANAGER'] },
    { id: 'purchasing-orders', name: 'Purchase Orders', path: '/purchasing/orders', icon: ShoppingCart, category: 'purchasing' },
    { id: 'purchasing-approvals', name: 'PO Approvals', path: '/approvals', icon: ShieldCheck, category: 'purchasing' },
    { id: 'purchasing-payments', name: 'Supplier Payments (View Only)', path: '/purchasing/payments', icon: CreditCard, category: 'purchasing' },
    { id: 'purchasing-grn', name: 'Goods Received Notes (View Only)', path: '/purchasing/grn', icon: Boxes, category: 'purchasing' },
    { id: 'purchasing-reports', name: 'Purchase Reports', path: '/purchasing/reports', icon: BarChart3, category: 'purchasing', excludedRoles: ['MANAGER'] },
    { id: 'purchasing-returns', name: 'Supplier Returns & RMA', path: '/purchasing/returns', icon: RotateCcw, category: 'purchasing' },
  ];

  // 1. Procurement, Orders & Approvals
  const procurementItems: SidebarItem[] = [
    { id: 'quotations', name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, category: 'sales' },
    { id: 'orders', name: 'Sales Orders', path: '/orders', icon: ShoppingCart, category: 'sales' },
    {
      id: 'approvals',
      name:
        role === 'STOCK_MANAGER'
          ? 'Stock Manager Approvals'
          : role === 'PURCHASING_MANAGER' || role === 'PURCHASING_OFFICER'
          ? 'Purchasing Approvals'
          : role === 'AREA_MANAGER'
          ? 'Order Approvals'
          : role === 'SALES_MANAGER'
          ? 'My Approvals'
          : 'Approvals Engine',
      path: '/approvals',
      icon: role === 'STOCK_MANAGER' || role === 'PURCHASING_MANAGER' ? ShieldCheck : CheckCircle,
      category: 'approvals',
      excludedRoles: ['SHOWROOM_MANAGER', 'SALES_REP', 'STOCK_KEEPER', 'CASHIER'],
    },
    {
      id: 'my-approvals',
      name: 'My Approvals',
      path: '/approvals/my-approvals',
      icon: CheckSquare,
      category: 'approvals',
      badge: 'Assigned',
      allowedRoles: ['DIRECTOR', 'MANAGER'],
    },
    { id: 'warranty', name: 'Warranty Hub', path: '/warranty', icon: ShieldCheck, category: 'approvals' },
    { id: 'warranty-verification', name: 'Warranty Verification', path: '/warranty/verification', icon: Barcode, category: 'sales', allowedRoles: ['SALES_REP', 'AREA_MANAGER'] },
  ];

  // 2. Customers, Invoices, Cash in Hand & POS
  const customerItems: SidebarItem[] = [
    { id: 'customer-collections', name: 'Customer Collections', path: '/payments/collect', icon: Banknote, category: 'sales', excludedRoles: ['CASHIER', 'SHOWROOM_MANAGER'] },
    { id: 'cash-in-hand', name: 'Cash in Hand (Wallet)', path: '/payments', icon: Wallet, category: 'sales', excludedRoles: ['CASHIER', 'SHOWROOM_MANAGER', 'STOCK_KEEPER', 'STOCK_MANAGER'] },
    { id: 'customers', name: 'Customer Master', path: '/customers', icon: Users2, category: 'customers', excludedRoles: ['CASHIER', 'SHOWROOM_MANAGER'] },
    { id: 'customer-onboarding', name: 'Customer Onboarding', path: '/customers/onboarding', icon: UserPlus, category: 'customers', excludedRoles: ['CASHIER', 'SHOWROOM_MANAGER', 'STOCK_KEEPER', 'FINANCE_MANAGER', 'PURCHASING_OFFICER'] },
    { id: 'invoices', name: 'Invoices', path: '/invoices', icon: Receipt, category: 'sales', excludedRoles: ['CASHIER', 'SHOWROOM_MANAGER'] },
    { id: 'pos', name: 'Showroom POS', path: '/pos', icon: Store, category: 'sales', excludedRoles: ['STOCK_KEEPER', 'STOCK_MANAGER'] },
    { id: 'showroom-sales-report', name: 'Showroom Sales Report', path: '/reports/sales/showroom', icon: Store, category: 'sales', allowedRoles: ['SHOWROOM_MANAGER'] },
  ];

  // 3. Products & Inventory
  const inventoryItems: SidebarItem[] = [
    { id: 'inventory', name: 'Inventory Hub', path: '/inventory', icon: Boxes, category: 'inventory', exact: true },
    { id: 'inventory-reports-stock', name: 'Inventory Reports', path: '/reports/inventory', icon: BarChart3, category: 'inventory', allowedRoles: ['STOCK_MANAGER'] },
    { id: 'grn', name: 'GRN', path: '/inventory/grn', icon: Receipt, category: 'inventory' },
    { id: 'delivery-notes', name: 'Delivery Notes', path: '/inventory/delivery-notes', icon: Truck, category: 'inventory' },
    { id: 'products', name: 'Product Master', path: '/products', icon: Package, category: 'inventory', excludedRoles: ['STOCK_KEEPER'] },
    { id: 'damaged-stock', name: 'Damaged Stock & RMA', path: '/inventory/damaged-stock', icon: ShieldAlert, category: 'inventory' },
    { id: 'inventory-pos', name: 'Showroom POS', path: '/pos', icon: Store, category: 'inventory', allowedRoles: ['STOCK_KEEPER', 'STOCK_MANAGER'] },
  ];

  // 4. Finance, Banking & Ledger Core (arranged in logical lifecycle order)
  const financeItems: SidebarItem[] = [
    // 1. Foundation & Master Data
    { id: 'accounts', name: 'Chart of Accounts', path: '/finance/accounts', icon: BookOpen, category: 'finance' },
    { id: 'suppliers', name: 'Suppliers', path: '/finance/suppliers', icon: Store, category: 'finance' },

    // 2. Procurement & Accounts Payable (AP)
    { id: 'ap-bills', name: 'Vendor Bill Costing (AP)', path: '/finance/ap/bills/new', icon: Receipt, category: 'finance' },
    { id: 'ap-advances', name: 'Supplier Advance Prepayments', path: '/finance/ap/advances', icon: Coins, category: 'finance' },
    { id: 'ap-payments', name: 'Batch Supplier Payments', path: '/finance/ap/payments/new', icon: CreditCard, category: 'finance' },
    { id: 'ap-debit-notes', name: 'Supplier Debit Notes', path: '/finance/ap/debit-notes', icon: Undo2, category: 'finance' },

    // 3. Sales & Accounts Receivable (AR)
    { id: 'ar-handovers', name: 'Sales Rep Cash Handovers', path: '/payments', icon: Banknote, category: 'finance', allowedRoles: ['DIRECTOR', 'MANAGER', 'FINANCE_MANAGER'] },
    { id: 'ar-approvals', name: 'Receipt Approval Queue (AR)', path: '/finance/ar/approvals', icon: CheckCircle2, category: 'finance' },
    { id: 'ar-pdc', name: 'PDC Vault (Cheques in Hand)', path: '/finance/ar/pdc-vault', icon: Clock, category: 'finance' },
    { id: 'ar-allocate', name: 'AR Collection Allocation', path: '/finance/ar/allocate', icon: SlidersHorizontal, category: 'finance' },
    { id: 'ar-credit-notes', name: 'Customer Credit Notes', path: '/finance/ar/credit-notes', icon: RotateCcw, category: 'finance' },

    // 4. Core Universal Journal & Adjustments
    { id: 'journal', name: 'Journal Entry Voucher', path: '/finance/journal/new', icon: Zap, category: 'finance' },

    // 5. Banking & Cash Book (BR-09)
    { id: 'cash-book', name: 'Cash Book & Vouchers', path: '/finance/cash-book', icon: Coins, category: 'finance' },
    { id: 'reconciliation', name: 'Bank Reconciliation', path: '/finance/reconciliation', icon: Landmark, category: 'finance' },

    // 6. Period Control & Year-End Close
    { id: 'closing', name: 'Period Closing Lock', path: '/finance/settings/closing', icon: Lock, category: 'finance' },

    // 7. Statutory Reports & Compliance
    { id: 'reports-hub', name: 'Financial Reports Hub', path: '/finance/reports', icon: BarChart3, category: 'finance' },
    { id: 'monthly-audit', name: 'Monthly Audit & Double Entry', path: '/finance/reports/monthly-audit', icon: Layers, category: 'finance' },
    { id: 'commissions', name: 'Sales Commission', path: '/commissions', icon: Award, category: 'finance', allowedRoles: ['DIRECTOR', 'MANAGER', 'FINANCE_MANAGER', 'SALES_MANAGER', 'AREA_MANAGER'] },
  ];

  // 5. Administration, Field Management & Intelligence
  const adminItems: SidebarItem[] = [
    { id: 'teams', name: 'Team Management', path: '/teams', icon: Users, category: 'admin' },
    { id: 'areas', name: 'Area Management', path: '/areas', icon: Compass, category: 'admin' },
    { id: 'reports', name: 'Enterprise Reports', path: '/reports', icon: BarChart3, category: 'reports', excludedRoles: ['DIRECTOR', 'MANAGER', 'FINANCE_MANAGER', 'SALES_MANAGER'] },
    { id: 'credit-terms-settings', name: 'Default Credit Terms', path: '/?tab=settings&section=credit-terms', icon: CreditCard, category: 'admin', allowedRoles: ['DIRECTOR', 'MANAGER'] },
    { id: 'commissions-config', name: 'Commission Configuration', path: '/commissions', icon: Award, category: 'admin', allowedRoles: ['DIRECTOR', 'MANAGER'] },
    { id: 'tax-settings', name: 'Global Tax Configuration', path: '/?tab=settings&section=tax', icon: Percent, category: 'admin', directorOnly: true },
    { id: 'theme', name: 'Theme & Appearance', path: '/?tab=settings&section=appearance', icon: Settings, category: 'admin', directorOnly: true },
    { id: 'role-portal', name: 'Role Switcher Portal', path: '/login', icon: Users, category: 'admin', allowedRoles: ['DIRECTOR', 'MANAGER'] },
  ];

  // 6. Reports Suite — Direct Parity between Director & Manager
  const standardReportItems: SidebarItem[] = [
    { id: 'purchase-reports', name: 'Purchase Reports', path: '/reports/purchasing', icon: ShoppingCart, category: 'reports', allowedRoles: ['DIRECTOR', 'MANAGER'] },
    { id: 'sales-reports', name: 'Sales Reports', path: '/reports/sales', icon: BarChart3, category: 'reports', allowedRoles: ['DIRECTOR', 'MANAGER', 'SALES_MANAGER'] },
    { id: 'inventory-reports', name: 'Inventory Reports', path: '/reports/inventory', icon: Boxes, category: 'reports', allowedRoles: ['DIRECTOR', 'MANAGER'] },
    { id: 'finance-reports', name: 'Finance Reports', path: '/reports/finance', icon: Landmark, category: 'reports', allowedRoles: ['DIRECTOR', 'MANAGER', 'FINANCE_MANAGER'] },
  ];

  // Combined item list in canonical Quick Links order
  const allRawItems: SidebarItem[] = [
    ...purchasingItems,
    ...procurementItems,
    ...customerItems,
    ...inventoryItems,
    ...financeItems,
    ...standardReportItems,
    ...adminItems,
  ];

  // Filter items by role permission and director exclusivity
  const authorizedItems = useMemo(() => {
    if (isDirector) {
      return directorAllRawItems;
    }
    return allRawItems.filter((item) => {
      if (item.directorOnly && currentUser.role !== 'DIRECTOR') {
        return false;
      }
      if (item.allowedRoles && !item.allowedRoles.includes(currentUser.role)) {
        return false;
      }
      if (item.excludedRoles && item.excludedRoles.includes(currentUser.role)) {
        return false;
      }
      if (item.path.includes('tab=settings') && !canAccessRoute('/settings')) {
        return false;
      }
      // If the parent area/module is restricted, do not show items in that category in the navbar
      if (item.category === 'finance' && !canAccessRoute('/finance')) {
        return false;
      }
      if (item.category === 'purchasing' && !canAccessRoute('/purchasing') && !canAccessRoute('/purchasing/orders')) {
        return false;
      }
      if (item.category === 'inventory' && !canAccessRoute('/inventory') && item.path !== '/pos') {
        return false;
      }
      return canAccessRoute(item.path.split('?')[0]);
    });
  }, [isDirector, directorAllRawItems, allRawItems, canAccessRoute, currentUser.role]);

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
    { id: 'purchasing' as RailCategory, label: 'Purchasing & Procurement', icon: ShoppingCart },
    { id: 'sales' as RailCategory, label: 'Sales & Orders', icon: ShoppingBag },
    { id: 'customers' as RailCategory, label: 'Customers & CRM', icon: Users2 },
    { id: 'inventory' as RailCategory, label: 'Inventory & Products', icon: Boxes },
    { id: 'finance' as RailCategory, label: 'Finance & Payments', icon: CreditCard },
    { id: 'approvals' as RailCategory, label: 'Approvals & Warranty', icon: ShieldCheck },
    { id: 'reports' as RailCategory, label: currentUser.role === 'SALES_MANAGER' ? 'Sales Reports' : 'Enterprise Reports', icon: BarChart3 },
    { id: 'admin' as RailCategory, label: 'Administration', icon: Settings },
  ];

  // Filter rail categories: 'all' is always visible (Dashboard);
  // other parent categories are only visible if the user's role has permission to access at least 1 child item
  const authorizedRailItems = useMemo(() => {
    if (isDirector) {
      return directorRailItems;
    }
    return railItems.filter((rail) => {
      if (rail.id === 'all') return true;
      return authorizedItems.some((item) => item.category === rail.id);
    });
  }, [isDirector, directorRailItems, railItems, authorizedItems]);

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
    if (isDirector) {
      switch (activeCategory) {
        case 'purchasing':
          return 'Purchasing & Procurement';
        case 'sales':
          return 'Sales & Orders';
        case 'users':
          return 'User Management';
        case 'inventory':
          return 'Inventory Hub';
        case 'finance':
          return 'Finance';
        case 'approvals':
          return 'Approval Hub';
        case 'reports':
          return 'Reports';
        case 'admin':
          return 'Administration';
        default:
          return 'Director Dashboard';
      }
    }
    switch (activeCategory) {
      case 'purchasing':
        return 'Purchasing & Procurement';
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
        return currentUser.role === 'SALES_MANAGER' ? 'Sales Reports' : currentUser.role === 'MANAGER' ? 'Reports' : 'Analytics & Reports';
      case 'admin':
        return 'Administration';
      default:
        return 'Dashboard';
    }
  }, [isDirector, activeCategory]);

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
    // Prevent Customer Master (/customers) from highlighting when on Customer Onboarding (/customers/onboarding)
    if (item.path === '/customers' && location.pathname.startsWith('/customers/onboarding')) {
      return false;
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  // Reusable item row renderer with clean neutral content-page styling and enlarged icons
  const renderItemRow = (item: SidebarItem) => {
    const Icon = item.icon;
    const itemIsFav = isFavorite(item.id);
    const active = isItemActive(item);
    const isCustomerMasterExempt = item.path === '/customers' && location.pathname.startsWith('/customers/onboarding');

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
          end={item.exact || isCustomerMasterExempt}
          onClick={onClose}
          className="flex items-center gap-2 min-w-0 flex-1 px-2 py-1.5 focus:outline-none"
        >
          <Icon className={cn('h-3.5 w-3.5 shrink-0 transition-colors text-slate-500 group-hover:text-slate-700', active && 'text-slate-900')} />
          <span className="truncate">{item.name}</span>
          {item.badge && (
            <span className="ml-auto mr-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              {item.badge}
            </span>
          )}
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
          'fixed inset-y-0 left-0 z-50 flex h-full select-none transition-transform duration-200 ease-in-out md:static md:translate-x-0 bg-primary',
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
        <div className="flex w-60 sm:w-64 flex-col border-r border-slate-200/90 bg-white rounded-tl-2xl md:rounded-tl-[24px] overflow-hidden">
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
                    {isDirector ? (
                      <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-700" />
                    ) : (
                      <LayoutGrid className="h-4 w-4 shrink-0 text-slate-700" />
                    )}
                    <span className="truncate">{isDirector ? 'Director Dashboard' : 'Dashboard'}</span>
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
                        <div className="px-3 py-5 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-md">
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
