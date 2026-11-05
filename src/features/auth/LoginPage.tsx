import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  Building2,
  Briefcase,
  TrendingUp,
  Landmark,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  Boxes,
  PackageCheck,
  Store,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  LogOut,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';

export interface DemoRoleItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  description: string;
  defaultPath: string;
  badgeBg: string;
  badgeText: string;
  avatarBg: string;
  icon: typeof Building2;
}

export interface DemoModuleGroup {
  id: string;
  name: string;
  description: string;
  icon: typeof Building2;
  roles: DemoRoleItem[];
}

// MODULES ORGANIZED IN EXACT USER-REQUESTED ORDER (ZERO DUPLICATES):
// 1. Administrator: Director, Manager
// 2. Sales Module: Sales Manager, Area Manager, Sales Representative
// 3. Purchasing Module: Purchasing Manager, Purchasing Officer
// 4. Inventory Management Module: Stock Manager, Stock Keeper
// 5. Finance Module: Finance Manager
// 6. Showroom POS: Showroom Manager, Cashier
export const DEMO_MODULES: DemoModuleGroup[] = [
  {
    id: 'administrator',
    name: 'Administrator',
    description: 'Executive governance, operations oversight & master authorizations',
    icon: ShieldCheck,
    roles: [
      {
        id: 'usr-101',
        name: 'Saman Jayasuriya',
        email: 'director@dnserp.com',
        role: 'DIRECTOR',
        title: 'Director',
        department: 'Global Executive Board',
        description: 'Full ERP governance, executive multi-tier approvals, board financials & audit.',
        defaultPath: '/',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
        avatarBg: 'bg-purple-600 text-white',
        icon: Building2,
      },
      {
        id: 'usr-102',
        name: 'Ruwan Wijesinghe',
        email: 'manager@dnserp.com',
        role: 'MANAGER',
        title: 'Manager',
        department: 'Operations & Controls',
        description: 'Operational approvals, customer credit limits & inventory audit sign-offs.',
        defaultPath: '/',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
        avatarBg: 'bg-primary text-primary-foreground',
        icon: Briefcase,
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales Module',
    description: 'Field sales pipeline, quotations, dealer management & territory oversight',
    icon: TrendingUp,
    roles: [
      {
        id: 'usr-103',
        name: 'Kamal Perera',
        email: 'sales.manager@dnserp.com',
        role: 'SALES_MANAGER',
        title: 'Sales Manager',
        department: 'Sales & Approvals',
        description: 'Sales pipeline monitoring, quotation approvals, order authorizations & commission hub.',
        defaultPath: '/approvals',
        badgeBg: 'bg-primary-light text-primary border-primary-border',
        avatarBg: 'bg-primary text-primary-foreground',
        icon: TrendingUp,
      },
      {
        id: 'usr-105',
        name: 'Nimal Bandara',
        email: 'area.western@dnserp.com',
        role: 'AREA_MANAGER',
        title: 'Area Manager',
        department: 'Regional Hub (Kelaniya)',
        description: 'Regional hub management, local client accounts & territory order dispatch.',
        defaultPath: '/orders',
        badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        avatarBg: 'bg-cyan-600 text-white',
        icon: MapPin,
      },
      {
        id: 'usr-106',
        name: 'Kasun Wickramasinghe',
        email: 'rep.colombo@dnserp.com',
        role: 'SALES_REP',
        title: 'Sales Representative',
        department: 'Field Sales (14 Clients)',
        description: 'Customer visits, field quotation entry, order creation & commission tracking.',
        defaultPath: '/quotations',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        avatarBg: 'bg-amber-600 text-white',
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: 'purchasing',
    name: 'Purchasing Module',
    description: 'Procurement workflows, PO drafting & verification, supplier catalog agreements',
    icon: ShoppingCart,
    roles: [
      {
        id: 'usr-116',
        name: 'Malik Samarasekera',
        email: 'purchasing.manager@dnserp.com',
        role: 'PURCHASING_MANAGER',
        title: 'Purchasing Manager',
        department: 'Procurement Governance',
        description: 'PO Stage 1 verification, vendor master agreements, escalation to Manager.',
        defaultPath: '/purchasing',
        badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        avatarBg: 'bg-cyan-700 text-white',
        icon: ShoppingCart,
      },
      {
        id: 'usr-110',
        name: 'Ruwan Wickramasinghe',
        email: 'purchasing@dnserp.com',
        role: 'PURCHASING_OFFICER',
        title: 'Purchasing Officer',
        department: 'Procurement Operations',
        description: 'Purchase Order drafting, supplier price catalogs & approval requests.',
        defaultPath: '/purchasing',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
        avatarBg: 'bg-teal-600 text-white',
        icon: ShoppingCart,
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory Management Module',
    description: 'Warehouse operations, inbound GRN physical verification, stock balances & dispatch',
    icon: Boxes,
    roles: [
      {
        id: 'usr-115',
        name: 'Bandara Jayasinghe',
        email: 'stock.manager@dnserp.com',
        role: 'STOCK_MANAGER',
        title: 'Stock Manager',
        department: 'Stock Operations & Verifications',
        description: 'GRN physical verification, customer delivery note rejections & quarantine oversight.',
        defaultPath: '/approvals',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        avatarBg: 'bg-amber-700 text-white',
        icon: PackageCheck,
      },
      {
        id: 'usr-107',
        name: 'Gamini Silva',
        email: 'warehouse@dnserp.com',
        role: 'STOCK_KEEPER',
        title: 'Stock Keeper',
        department: 'Stock Intake & Picking',
        description: 'Goods Received Notes (GRN) intake, stock balances, picking & transfer notes.',
        defaultPath: '/inventory',
        badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
        avatarBg: 'bg-orange-600 text-white',
        icon: Boxes,
      },
    ],
  },
  {
    id: 'finance',
    name: 'Finance Module',
    description: 'Double-entry ledger, supplier payments, customer collections & financial P&L',
    icon: Landmark,
    roles: [
      {
        id: 'usr-104',
        name: 'Dilani Fernando',
        email: 'finance@dnserp.com',
        role: 'FINANCE_MANAGER',
        title: 'Finance Manager',
        department: 'Finance & Ledger Accounting',
        description: 'Double-entry journal desk, Chart of Accounts, landed costing & payment sign-offs.',
        defaultPath: '/finance',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        avatarBg: 'bg-emerald-600 text-white',
        icon: Landmark,
      },
    ],
  },
  {
    id: 'showroom_pos',
    name: 'Showroom POS',
    description: 'Retail point-of-sale terminal, daily drawer sessions, handover & checkout',
    icon: Store,
    roles: [
      {
        id: 'usr-111',
        name: 'Sunil Weerasinghe',
        email: 'showroom.manager@dnserp.com',
        role: 'SHOWROOM_MANAGER',
        title: 'Showroom Manager',
        department: 'Retail Showroom Operations',
        description: 'Terminal management, cash limits, shift handover approvals & override reviews.',
        defaultPath: '/pos',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        avatarBg: 'bg-emerald-600 text-white',
        icon: Store,
      },
      {
        id: 'usr-108',
        name: 'Chathura Alwis',
        email: 'cashier@dnserp.com',
        role: 'CASHIER',
        title: 'Cashier',
        department: 'Retail Point-of-Sale',
        description: 'Point-of-sale checkout, barcode scanning, cash drawer balancing & session closing.',
        defaultPath: '/pos',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        avatarBg: 'bg-rose-600 text-white',
        icon: Store,
      },
    ],
  },
];

// Flat list of all 12 unique demo roles in exact order
export const UNIQUE_DEMO_ROLES: DemoRoleItem[] = DEMO_MODULES.flatMap((m) => m.roles);

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, loginAs, logout } = useAuth();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Role selector controls
  const [activeModuleFilter, setActiveModuleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const from = (location.state as { from?: string })?.from;

  const handleQuickLogin = (userId: string, defaultPath: string) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      loginAs(userId);
      const targetPath = from || defaultPath || '/';
      setTimeout(() => {
        setIsLoading(false);
        navigate(targetPath, { replace: true });
      }, 150);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to authenticate user.');
    }
  };

  // Filter demo modules & roles
  const filteredModules = useMemo(() => {
    return DEMO_MODULES.map((mod) => {
      if (activeModuleFilter !== 'ALL' && mod.id !== activeModuleFilter) {
        return { ...mod, roles: [] };
      }

      if (!searchQuery.trim()) {
        return mod;
      }

      const q = searchQuery.toLowerCase();
      const matchingRoles = mod.roles.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          mod.name.toLowerCase().includes(q)
      );

      return { ...mod, roles: matchingRoles };
    }).filter((mod) => mod.roles.length > 0);
  }, [activeModuleFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-primary selection:text-white relative">
      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[500px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      {/* Top Header & ERP Brand Banner */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-base shadow-md shadow-primary/30 ring-1 ring-white/20">
              DNS
            </div>
            <div>
              <div className="font-bold text-white tracking-tight text-base sm:text-lg flex items-center gap-2">
                <span>DNS DISTRIBUTION ERP</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-light/20 text-primary border border-primary/30">
                  ENTERPRISE v1.0
                </span>
              </div>
              <p className="text-2xs text-slate-400 hidden sm:block">
                Industrial Electrical Distribution &bull; Role-Based Governance &bull; Full Audit Trail
              </p>
            </div>
          </div>

          {/* Active Session Indicator */}
          {isAuthenticated && currentUser && (
            <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-200">{currentUser.name}</div>
                <div className="text-[10px] text-primary font-semibold font-mono">
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
              <button
                onClick={() => {
                  const roleMeta = UNIQUE_DEMO_ROLES.find((r) => r.role === currentUser.role);
                  navigate(roleMeta?.defaultPath || '/');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow transition-all cursor-pointer"
              >
                <span>Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/80 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ROLE-BASED ACCESS PORTAL */}
        <section className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-2xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
                  <Sparkles className="h-3 w-3" />
                  Enterprise Role Portal
                </span>
                <span className="text-2xs text-slate-400 font-medium">
                  (12 Unique Roles &bull; 0 Duplicates)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Role-Based Enterprise Access
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl">
                Select your designated role below to enter the enterprise workspace with role-specific operational permissions, approval hierarchies, and dashboards.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              {/* Search Roles Input */}
              <div className="relative w-56 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search role, name, or module..."
                  className="w-full pl-8 pr-2.5 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-1">
              {/* Module Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setActiveModuleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                    activeModuleFilter === 'ALL'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
                  }`}
                >
                  All Modules ({UNIQUE_DEMO_ROLES.length})
                </button>

                {DEMO_MODULES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModuleFilter(mod.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeModuleFilter === mod.id
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-800/70 text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <span>{mod.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 font-mono">
                      {mod.roles.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Modules & Roles Categorized Display */}
              <div className="space-y-5">
                {filteredModules.map((moduleGroup) => {
                  const ModuleIcon = moduleGroup.icon;
                  return (
                    <div key={moduleGroup.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800/60 pb-1.5">
                        <div className="flex items-center gap-2">
                          <ModuleIcon className="h-3.5 w-3.5 text-primary" />
                          <span className="uppercase tracking-wider text-[11px] font-bold text-slate-200">
                            {moduleGroup.name}
                          </span>
                        </div>
                        <span className="text-2xs text-slate-500 font-normal">
                          {moduleGroup.description}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {moduleGroup.roles.map((item) => {
                          const IconComponent = item.icon;
                          const isCurrentActive = currentUser?.id === item.id;

                          return (
                            <div
                              key={item.id}
                              onClick={() => handleQuickLogin(item.id, item.defaultPath)}
                              className={`p-3.5 rounded-xl border transition-all text-xs cursor-pointer flex flex-col justify-between gap-3 group ${
                                isCurrentActive
                                  ? 'border-primary bg-primary-light/10 ring-1 ring-primary/40 shadow-md'
                                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-slate-700 shadow-2xs'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeBg}`}
                                  >
                                    <IconComponent className="h-2.5 w-2.5" />
                                    <span>{item.title}</span>
                                  </span>

                                  {isCurrentActive ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded-full">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Active
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {item.role}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <div className="font-bold text-slate-100 group-hover:text-primary transition-colors text-xs truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-2xs text-slate-400 font-mono truncate">
                                    {item.email}
                                  </div>
                                </div>

                                <p className="text-[11px] text-slate-400 line-clamp-2">
                                  {item.description}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickLogin(item.id, item.defaultPath);
                                  }}
                                  aria-label={`Login as ${item.title}`}
                                  className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer group-hover:shadow-md"
                                >
                                  <span>Login as {item.title}</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        </section>
      </main>

      {/* Standard Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/90 py-3.5 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>DNS Distribution ERP &bull; Role-Based Access Control Architecture (RBAC)</div>
          <div className="flex items-center gap-4 text-2xs text-slate-400">
            <span>Enterprise 256-bit Encrypted Session</span>
            <span>&bull;</span>
            <span>Audit Trail Enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
