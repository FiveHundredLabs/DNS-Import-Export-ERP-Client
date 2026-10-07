import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  ShieldCheck,
  LogOut,
  Search,
  ChevronDown,
  Layers,
  ArrowLeft,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { RoleSwitcher } from './RoleSwitcher';

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

  // Fullscreen state and browser synchronization
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return (
      typeof document !== 'undefined' &&
      Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      )
    );
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Native Fullscreen request failed or was cancelled:', err);
    }
  };

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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-primary text-primary-foreground px-4 sm:px-6 backdrop-blur-md transition-all shrink-0">
      {/* Left: Mobile Toggle & Enterprise Brand / Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {location.pathname !== '/' ? (
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-2 text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground md:hidden shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-2 text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground md:hidden shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {location.pathname === '/' ? (
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-foreground text-primary font-semibold text-sm shadow-sm transition-colors">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg md:text-xl font-bold text-primary-foreground tracking-tight truncate leading-tight">
                LabsCore ERP
              </h1>
              <span className="text-[10.5px] sm:text-[11.5px] text-primary-foreground/80 font-semibold block uppercase tracking-wider -mt-0.5 truncate">
                DNS Distribution
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="hidden md:flex items-center gap-2 shrink-0 group" title="DNS ERP Dashboard">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-foreground text-primary font-semibold text-xs shadow-sm transition-colors">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-semibold text-primary-foreground tracking-tight text-base">
                DNS ERP
              </span>
            </Link>
            <span className="text-primary-foreground/50 font-light hidden md:inline">/</span>
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-primary-foreground tracking-tight truncate">
              {currentTitle}
            </h1>
          </div>
        )}
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-6 justify-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders, products, dealers..."
            className="w-full pl-9 pr-4 py-2 bg-primary-foreground/15 hover:bg-primary-foreground/20 focus:bg-white border border-primary-foreground/25 focus:border-white rounded-md text-sm font-normal text-primary-foreground focus:text-slate-900 placeholder:text-primary-foreground/70 focus:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-foreground/40 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Right: In-place Role Switcher Dropdown & Profile Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* In-place Role Switcher Dropdown (No separate login page needed) */}
        <div className="hidden sm:flex items-center">
          <RoleSwitcher triggerClassName="bg-primary-foreground/15 border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/25 hover:text-primary-foreground shadow-none" />
        </div>

        <div className="h-6 w-px bg-primary-foreground/25 hidden sm:block" />

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-md hover:bg-primary-foreground/15 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground"
            aria-expanded={profileOpen}
            aria-label="User profile menu"
          >
            {/* Avatar Circle */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground text-primary font-bold text-xs shadow-sm ring-2 ring-primary-foreground/30">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>

            {/* Name & Role Text */}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-primary-foreground leading-tight flex items-center gap-1">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-primary-foreground/80 font-medium">
                {formatRole(currentUser.role)}
              </div>
            </div>

            <ChevronDown
              className={`h-3.5 w-3.5 text-primary-foreground/80 hidden sm:block transition-transform duration-200 ${
                profileOpen ? 'rotate-180 text-primary-foreground' : ''
              }`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.email}</div>
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary-light text-primary-text border border-primary-border">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  {formatRole(currentUser.role)}
                </div>
              </div>

              <div className="py-2 px-1 border-b border-slate-100">
                <div className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Switch Active Role
                </div>
                <RoleSwitcher className="w-full" triggerClassName="w-full justify-between" />
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-primary-foreground/25 hidden sm:block" />

        {/* Top-Right Full Screen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex h-9 w-9 items-center justify-center rounded-md text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground shrink-0 cursor-pointer"
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5 transition-transform duration-150 hover:scale-105" />
          ) : (
            <Maximize className="h-5 w-5 transition-transform duration-150 hover:scale-105" />
          )}
        </button>
      </div>
    </header>
  );
}
