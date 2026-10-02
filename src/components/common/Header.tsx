import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  ShieldCheck,
  Users,
  LogOut,
  Search,
  ChevronDown,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed?: boolean;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'DNS ERP',
  '/products': 'Product Master',
  '/customers': 'Customer Directory',
  '/approvals': 'Approvals Engine',
  '/quotations': 'Quotations Pipeline',
  '/orders': 'Sales Orders',
  '/invoices': 'Invoice Management',
  '/payments': 'Payment Collections',
  '/inventory': 'Inventory & Warehouse Hub',
  '/pos': 'Showroom POS Terminal',
  '/finance': 'Finance & Double-Entry Ledger',
  '/warranty': 'Warranty Claim Hub',
  '/commissions': 'Sales Commissions',
  '/reports': 'Enterprise Analytics',
};

export function Header({ onToggleSidebar }: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Determine current page title
  const currentTitle =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/products') ? 'Product Details' :
     location.pathname.startsWith('/orders') ? 'Sales Order Details' :
     location.pathname.startsWith('/quotations') ? 'Quotation Details' :
     location.pathname.startsWith('/finance') ? 'Finance & Ledger Desk' :
     'DNS ERP Workspace');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 backdrop-blur-md transition-all shrink-0">
      {/* Left: Mobile Toggle & Enterprise Brand / Page Title */}
      {/* Left: Mobile Back or Menu Toggle & Enterprise Brand / Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {location.pathname !== '/' ? (
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary md:hidden shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary md:hidden shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {location.pathname === '/' ? (
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md group-hover:bg-primary-hover transition-colors">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight truncate leading-tight">
                LabsCore ERP
              </h1>
              <span className="text-[10.5px] sm:text-[11.5px] text-primary font-semibold block uppercase tracking-wider -mt-0.5 truncate">
                DNS Distribution
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="hidden md:flex items-center gap-2 shrink-0 group" title="DNS ERP Dashboard">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md group-hover:bg-primary-hover transition-colors">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-semibold text-slate-900 tracking-tight text-base">
                DNS ERP
              </span>
            </Link>
            <span className="text-slate-300 font-light hidden md:inline">/</span>
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight truncate">
              {currentTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Center: Search Bar (Reference SaaS pill shape) */}
      <div className="hidden md:flex flex-1 max-w-md mx-6 justify-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders, products, dealers..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/90 rounded-full text-sm font-normal text-slate-900 placeholder:text-slate-400 placeholder:text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          />
        </div>
      </div>

      {/* Right: Switch Role Action & Profile Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Switch Role Quick Button */}
        <Link
          to="/login"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-primary-light hover:border-primary-border text-slate-700 hover:text-primary-text text-[13px] font-medium transition-all shadow-2xs"
          title="Switch User Role or Log In as another user"
        >
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>Switch Role</span>
        </Link>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Profile Menu (Reference "Audrey Admin v" dropdown) */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-full sm:rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-expanded={profileOpen}
            aria-label="User profile menu"
          >
            {/* Avatar Circle */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-sm ring-2 ring-white">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>

            {/* Name & Role Text */}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {formatRole(currentUser.role)}
              </div>
            </div>

            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 hidden sm:block transition-transform duration-200 ${
                profileOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.email}</div>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-light text-primary-text border border-primary-border">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  {formatRole(currentUser.role)}
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/login"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-primary-light hover:text-primary-text transition-colors"
                >
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>Switch Role / User</span>
                </Link>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
