import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
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
  Boxes,
  Store,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  LogOut,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_USERS } from '../../mock/mockUsers';
import { UserRole } from '../../types/auth';

interface RoleMeta {
  role: UserRole;
  title: string;
  department: string;
  description: string;
  keyPermissions: string[];
  defaultPath: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
  avatarBg: string;
  icon: typeof Building2;
}

const ROLE_METAS: Record<UserRole, RoleMeta> = {
  DIRECTOR: {
    role: 'DIRECTOR',
    title: 'Director',
    department: 'Global Executive Board',
    description: 'Full ERP governance, executive multi-tier approvals, board financials & full audit visibility.',
    keyPermissions: ['Global Master Approvals', 'Price & Discount Limits', 'P&L & Financial Reports', 'Enterprise Audit'],
    defaultPath: '/',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800 border-purple-200',
    accentBorder: 'hover:border-purple-400 group-hover:border-purple-400',
    avatarBg: 'bg-purple-600 text-white',
    icon: Building2,
  },
  MANAGER: {
    role: 'MANAGER',
    title: 'Operations Manager',
    department: 'Operations & Controls',
    description: 'Operational approvals, customer commercial limits, high discount authorizations & inventory audit.',
    keyPermissions: ['Operational Approvals', 'Customer Credit Limits', 'GRN & Stock Oversight', 'Module Audits'],
    defaultPath: '/',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800 border-primary-border',
    accentBorder: 'hover:border-blue-400 group-hover:border-blue-400',
    avatarBg: 'bg-primary text-primary-foreground',
    icon: Briefcase,
  },
  SALES_MANAGER: {
    role: 'SALES_MANAGER',
    title: 'Sales Manager',
    department: 'Sales & Approvals',
    description: 'Sales pipeline monitoring, standard order approvals, credit term evaluations & quotation sign-offs.',
    keyPermissions: ['Quotation Approvals', 'Standard Order Authorizations', 'Credit Term Requests', 'Rep Commission Hub'],
    defaultPath: '/approvals',
    badgeBg: 'bg-primary-light',
    badgeText: 'text-primary-text border-primary-border',
    accentBorder: 'hover:border-primary group-hover:border-primary',
    avatarBg: 'bg-primary text-primary-foreground',
    icon: TrendingUp,
  },
  FINANCE_MANAGER: {
    role: 'FINANCE_MANAGER',
    title: 'Finance Manager',
    department: 'Finance & Ledger',
    description: 'Complete double-entry journal desk, Chart of Accounts, supplier payment approvals & P&L balance sheets.',
    keyPermissions: ['Finance Desk & Journals', 'Payment Approvals', 'Chart of Accounts', 'P&L / Balance Sheet'],
    defaultPath: '/finance',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800 border-emerald-200',
    accentBorder: 'hover:border-emerald-400 group-hover:border-emerald-400',
    avatarBg: 'bg-emerald-600 text-white',
    icon: Landmark,
  },
  AREA_MANAGER: {
    role: 'AREA_MANAGER',
    title: 'Area Manager',
    department: 'Regional Hub Oversight',
    description: 'Western Province Central regional hub management, local customer accounts & area order visibility.',
    keyPermissions: ['Regional Territory Orders', 'Territory Customers', 'Rep Allocation', 'Area Performance'],
    defaultPath: '/orders',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800 border-cyan-200',
    accentBorder: 'hover:border-cyan-400 group-hover:border-cyan-400',
    avatarBg: 'bg-cyan-600 text-white',
    icon: MapPin,
  },
  SALES_REP: {
    role: 'SALES_REP',
    title: 'Sales Representative',
    department: 'Field Sales',
    description: 'Customer visits, client quotation generation, order creation for 14 assigned clients & commission earnings.',
    keyPermissions: ['Field Quotation Entry', '14 Assigned Customers', 'Sales Order Booking', 'Commission Tracking'],
    defaultPath: '/quotations',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800 border-amber-200',
    accentBorder: 'hover:border-amber-400 group-hover:border-amber-400',
    avatarBg: 'bg-amber-600 text-white',
    icon: ShoppingBag,
  },
  STOCK_KEEPER: {
    role: 'STOCK_KEEPER',
    title: 'Stock Keeper',
    department: 'Warehouse & Logistics',
    description: 'Goods Received Notes (GRN), warehouse movements, order picking & dispatch validation.',
    keyPermissions: ['GRN Creation & Intake', 'Warehouse Stock Balances', 'Order Picking & Dispatch', 'Transfer Notes'],
    defaultPath: '/inventory',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800 border-orange-200',
    accentBorder: 'hover:border-orange-400 group-hover:border-orange-400',
    avatarBg: 'bg-orange-600 text-white',
    icon: Boxes,
  },
  CASHIER: {
    role: 'CASHIER',
    title: 'Showroom Cashier',
    department: 'Retail Showroom POS',
    description: 'Showroom retail point-of-sale checkout, cash drawer reconciliation & daily shift session management.',
    keyPermissions: ['POS Terminal Checkout', 'Barcode Scanning', 'Cash Drawer Balancing', 'Shift Session Closes'],
    defaultPath: '/pos',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800 border-rose-200',
    accentBorder: 'hover:border-rose-400 group-hover:border-rose-400',
    avatarBg: 'bg-rose-600 text-white',
    icon: Store,
  },
};

type FilterCategory = 'ALL' | 'MANAGEMENT' | 'FINANCE_OPS' | 'SALES_RETAIL';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, loginWithEmail, loginAs, logout } = useAuth();

  const [email, setEmail] = useState('director@dnserp.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect destination if specified
  const from = (location.state as { from?: string })?.from;

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = loginWithEmail(email, password);
      const roleMeta = ROLE_METAS[user.role];
      const targetPath = from || roleMeta?.defaultPath || '/';
      setTimeout(() => {
        setIsLoading(false);
        navigate(targetPath, { replace: true });
      }, 250);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Invalid email or password.');
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
      setErrorMsg(err.message || 'Failed to login.');
    }
  };

  const handleSelectUser = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setErrorMsg(null);
  };

  // Filter example users
  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter((user) => {
      const meta = ROLE_METAS[user.role];
      if (!meta) return true;

      // Category filter
      if (activeCategory === 'MANAGEMENT') {
        if (!['DIRECTOR', 'MANAGER', 'SALES_MANAGER'].includes(user.role)) return false;
      } else if (activeCategory === 'FINANCE_OPS') {
        if (!['FINANCE_MANAGER', 'STOCK_KEEPER'].includes(user.role)) return false;
      } else if (activeCategory === 'SALES_RETAIL') {
        if (!['AREA_MANAGER', 'SALES_REP', 'CASHIER'].includes(user.role)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = user.name.toLowerCase().includes(q);
        const matchesEmail = user.email.toLowerCase().includes(q);
        const matchesRole = user.role.toLowerCase().includes(q);
        const matchesTitle = meta.title.toLowerCase().includes(q);
        const matchesDept = meta.department.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesRole || matchesTitle || matchesDept;
      }

      return true;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      {/* Top Bar / Branding */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/25 ring-1 ring-white/20">
              DNS
            </div>
            <div>
              <div className="font-semibold text-white tracking-tight text-base sm:text-lg flex items-center gap-2">
                DNS DISTRIBUTION ERP
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary-light/20 text-primary border border-primary/30">
                  ENTERPRISE v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Import & Export Operations • Multi-Tier Approval Engine • Full Audit Compliance
              </p>
            </div>
          </div>

          {/* Active Session Info if already logged in */}
          {isAuthenticated && currentUser && (
            <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
                <div className="text-[10px] text-primary font-medium">{currentUser.role.replace('_', ' ')}</div>
              </div>
              <button
                onClick={() => navigate(ROLE_METAS[currentUser.role]?.defaultPath || '/')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow transition-colors"
              >
                Go to Workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={logout}
                title="Sign out of current session"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col justify-center">
        {/* Banner Alert if already signed in */}
        {isAuthenticated && currentUser && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-indigo-950/40 p-4 text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/30 text-primary border border-primary/40">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-white">
                  You are currently authenticated as{' '}
                  <span className="text-primary font-bold">{currentUser.name}</span> ({currentUser.role.replace('_', ' ')})
                </p>
                <p className="text-xs text-slate-400">
                  Select any example user below to switch to another role instantly, or return to your workspace.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(ROLE_METAS[currentUser.role]?.defaultPath || '/')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all shadow-md shrink-0"
            >
              Continue to Workspace
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sign In Form (4 cols) */}
          <div className="lg:col-span-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/40 backdrop-blur">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-light/20 text-primary border border-primary/30 mb-3">
                <Sparkles className="h-3 w-3 text-primary" />
                Sign In to ERP Portal
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Enterprise Access</h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your credentials or pick any role example on the right for 1-click access.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleStandardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@dnserp.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <span className="text-[11px] text-slate-400 font-mono">demo123</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
                    className="rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary"
                  />
                  <span>Remember session</span>
                </label>
                <span className="text-[11px] text-primary hover:text-primary cursor-pointer">
                  Demo credentials enabled
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

            {/* Quick Demo Helper Box */}
            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <div className="rounded-xl bg-slate-900/80 p-3.5 border border-slate-700 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>Role-Based Testing Guide</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Every user role has different permission boundaries, dashboards, and approval powers. Click any role card on the right to log in immediately as that user.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Example Users For Each Role (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 backdrop-blur">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Example Users for Each Role ({MOCK_USERS.length} Roles)
                </h2>
                <p className="text-xs text-slate-400">
                  Click <span className="font-semibold text-slate-200">"Login as Role"</span> on any user card to log in directly.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search role or name..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'ALL', label: 'All Roles (8)' },
                { id: 'MANAGEMENT', label: 'Executive & Management (3)' },
                { id: 'FINANCE_OPS', label: 'Finance & Logistics (2)' },
                { id: 'SALES_RETAIL', label: 'Sales & POS Retail (3)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as FilterCategory)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeCategory === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Role Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredUsers.map((user) => {
                const meta = ROLE_METAS[user.role];
                if (!meta) return null;
                const IconComponent = meta.icon;
                const isCurrentActive = currentUser?.id === user.id;

                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user.email)}
                    className={`group relative rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isCurrentActive
                        ? 'border-primary bg-slate-800/95 ring-2 ring-primary/30 shadow-lg'
                        : 'border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 hover:border-slate-600 shadow-md'
                    }`}
                  >
                    {/* Top Row: Role Badge & Active Indicator */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.badgeBg} ${meta.badgeText}`}
                          >
                            <IconComponent className="h-3 w-3" />
                            {meta.title}
                          </span>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">{meta.department}</span>
                        </div>

                        {isCurrentActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            Current Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                            {user.role}
                          </span>
                        )}
                      </div>

                      {/* User Persona & Identity */}
                      <div className="flex items-start gap-3 mb-2.5">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-md ${meta.avatarBg}`}
                        >
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                            {user.name}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono truncate">{user.email}</p>
                          {user.areaName && (
                            <p className="text-[11px] text-cyan-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{user.areaName}</span>
                              {user.assignedCustomersCount && (
                                <span className="text-slate-400">({user.assignedCustomersCount} clients)</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Role Scope Description */}
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-3">
                        {meta.description}
                      </p>

                      {/* Key Permissions Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3.5">
                        {meta.keyPermissions.map((perm, idx) => (
                          <span
                            key={idx}
                            className="inline-block text-[10px] px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/80 text-slate-300 font-medium"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickLogin(user.id, meta.defaultPath);
                        }}
                        className="flex-1 py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 group-hover:shadow-primary/30"
                      >
                        <span>Login as {meta.title}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(user.email);
                        }}
                        title="Fill into sign-in form"
                        className="py-2 px-2.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-900/90 py-4 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>DNS Distribution ERP &bull; Role-Based Access Control Architecture (RBAC)</div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Enterprise 256-bit Encrypted Session</span>
            <span>&bull;</span>
            <span>Audit Trail Enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
