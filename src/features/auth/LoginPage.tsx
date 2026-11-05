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

// 5 MODULES ORGANIZED IN EXACT USER-REQUESTED ORDER (ZERO DUPLICATES)
// 1. Administrator: Director, Manager
// 2. Sales Module: Sales Manager, Area Manager, Sales Representative
// 3. Purchasing Module: Purchasing Manager, Purchasing Officer, Stock Manager, Stock Keeper
// 4. Finance Module: Finance Manager
// 5. Showroom POS: Showroom Manager, Cashier
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
    description: 'Procurement workflows, PO verification, warehouse GRN & physical stock',
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
      {
        id: 'usr-115',
        name: 'Bandara Jayasinghe',
        email: 'stock.manager@dnserp.com',
        role: 'STOCK_MANAGER',
        title: 'Stock Manager',
        department: 'Warehouse Operations',
        description: 'GRN physical verification, customer delivery note rejections & quarantine oversight.',
        defaultPath: '/inventory',
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
        department: 'Warehouse Intake & Picking',
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
  const { currentUser, isAuthenticated, loginWithEmail, loginAs, logout } = useAuth();

  const [email, setEmail] = useState('director@dnserp.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock demo selector controls
  const [isDemoExpanded, setIsDemoExpanded] = useState(true);
  const [activeModuleFilter, setActiveModuleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const from = (location.state as { from?: string })?.from;

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = loginWithEmail(email, password);
      const roleItem = UNIQUE_DEMO_ROLES.find((r) => r.role === user.role);
      const targetPath = from || roleItem?.defaultPath || '/';
      setTimeout(() => {
        setIsLoading(false);
        navigate(targetPath, { replace: true });
      }, 200);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Invalid work email address or password.');
    }
  };

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
      setErrorMsg(err.message || 'Failed to authenticate demo user.');
    }
  };

  const handleSelectUser = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setErrorMsg(null);
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
        {/* ========================================================================= */}
        {/* SECTION 1: ROLE-BASED MOCK / DEMO LOGIN SECTION (FOR DEMO & EVALUATION)   */}
        {/* ========================================================================= */}
        <section className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-2xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Sparkles className="h-3 w-3" />
                  Mock / Demo Login Environment
                </span>
                <span className="text-2xs text-slate-400 font-medium hidden md:inline">
                  (12 Unique Roles &bull; 0 Duplicates)
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Quick Role-Based Demonstration Login
              </h2>
              <p className="text-2xs text-slate-400 max-w-2xl">
                This panel is provided strictly for demonstration and testing. Select any module role to test role-specific approval hierarchies, inventory permissions, or dashboards.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* Search Roles Input */}
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search role or name..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Toggle Collapse Button */}
              <button
                type="button"
                onClick={() => setIsDemoExpanded(!isDemoExpanded)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isDemoExpanded ? 'Hide Roles' : 'Show Roles'}</span>
                {isDemoExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {isDemoExpanded && (
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
                              onClick={() => handleSelectUser(item.email)}
                              className={`p-3 rounded-xl border transition-all text-xs cursor-pointer flex flex-col justify-between gap-2.5 group ${
                                isCurrentActive
                                  ? 'border-primary bg-primary-light/10 ring-1 ring-primary/40'
                                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/70 hover:border-slate-700 shadow-2xs'
                              }`}
                            >
                              <div className="space-y-1.5">
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

                                <p className="text-[11px] text-slate-400 line-clamp-1">
                                  {item.description}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickLogin(item.id, item.defaultPath);
                                  }}
                                  aria-label={`Login as ${item.title}`}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-[11px] shadow-2xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <span>Login as {item.title}</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectUser(item.email);
                                  }}
                                  title="Fill credentials into sign-in form"
                                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700/60 transition-colors cursor-pointer"
                                >
                                  Fill
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
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: STANDARD ENTERPRISE LOGIN SCREEN (PRIMARY SYSTEM SIGN-IN)      */}
        {/* ========================================================================= */}
        <section className="flex flex-col items-center justify-center py-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
            {/* Header Branding */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white font-black text-xl shadow-lg shadow-primary/25 ring-1 ring-white/20 mx-auto">
                DNS
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Enterprise Access
              </h1>
              <p className="text-xs text-slate-400">
                Sign in with your enterprise credentials to access the ERP portal
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleStandardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@dnserp.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-2xs text-slate-400 font-mono">default: demo123</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary"
                  />
                  <span>Remember session</span>
                </label>
                <span className="text-2xs text-primary hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to ERP Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Standard Security Notice */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-2xs text-slate-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Authorized personnel only &bull; Corporate network logging enabled</span>
              </p>
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
