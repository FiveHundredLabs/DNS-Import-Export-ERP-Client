import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  ArrowLeft,
  MoreVertical,
  Calculator,
  Coins,
} from 'lucide-react';
import { FullscreenButton } from '../header/FullscreenButton';
import { UserProfileMenu } from '../header/UserProfileMenu';
import { CurrencyConverterPopover } from '../header/CurrencyConverterPopover';
import { CalculatorPopover } from '../header/CalculatorPopover';
import { NotificationsPopover } from '../header/NotificationsPopover';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [mobileCurrencyOpen, setMobileCurrencyOpen] = useState(false);
  const [mobileCalculatorOpen, setMobileCalculatorOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    }
    if (overflowOpen) {
      document.addEventListener('mousedown', handlePointerDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [overflowOpen]);

  // Determine current page title
  const currentTitle =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/products') ? 'Product Details' :
     location.pathname.startsWith('/orders') ? 'Sales Order Details' :
     location.pathname.startsWith('/quotations') ? 'Quotation Details' :
     location.pathname.startsWith('/finance') ? 'Finance & Ledger Desk' :
     'DNS ERP Workspace');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between bg-primary text-primary-foreground px-3 sm:px-6 backdrop-blur-md transition-all shrink-0">
      {/* Left: Mobile Toggle & Enterprise Brand / Page Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {location.pathname !== '/' ? (
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-2 text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground md:hidden shrink-0 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-2 text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary-foreground md:hidden shrink-0 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {location.pathname === '/' ? (
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white p-0.5 shadow-sm ring-1 ring-white/20 transition-transform group-hover:scale-105 overflow-hidden">
              <img
                src="/logo.png"
                alt="DNS IMPORT & EXPORT"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-lg md:text-xl font-bold text-primary-foreground tracking-tight truncate leading-tight">
                  LabsCore ERP
                </h1>
                <span className="sm:hidden text-[9px] bg-white/20 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Sales
                </span>
              </div>
              <span className="hidden sm:block text-[10.5px] sm:text-[11.5px] text-primary-foreground/80 font-semibold uppercase tracking-wider -mt-0.5 truncate">
                DNS IMPORT & EXPORT (PVT) LTD.
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="hidden md:flex items-center gap-2 shrink-0 group" title="DNS ERP Dashboard">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white p-0.5 shadow-sm ring-1 ring-white/20 transition-transform group-hover:scale-105 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="DNS Logo"
                  className="h-full w-full object-contain"
                />
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

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8 justify-center">
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

      {/* Right: Enterprise Utility Toolbar & Far-Right User Profile Avatar */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
        {/* Enterprise Notifications (Always visible) */}
        <NotificationsPopover />

        {/* Desktop-only secondary tools */}
        <div className="hidden md:flex items-center gap-1.5 md:gap-2">
          {/* Currency Converter */}
          <CurrencyConverterPopover />

          {/* ERP Calculator */}
          <CalculatorPopover />

          {/* Fullscreen Button */}
          <FullscreenButton />
        </div>

        {/* Mobile Overflow Menu */}
        <div className="relative md:hidden" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setOverflowOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors cursor-pointer"
            aria-label="More utilities"
            aria-expanded={overflowOpen}
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {overflowOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-900/15 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Quick Tools
              </div>
              <button
                type="button"
                onClick={() => {
                  setOverflowOpen(false);
                  setMobileCalculatorOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
              >
                <Calculator className="h-4 w-4 text-primary" />
                <span>Field Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverflowOpen(false);
                  setMobileCurrencyOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
              >
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Currency Converter</span>
              </button>
            </div>
          )}
        </div>

        {/* Subtle Separator */}
        <div className="h-4.5 w-px bg-white/20 mx-1 sm:mx-1.5" aria-hidden="true" />

        {/* User Profile / Avatar (Far-right) */}
        <UserProfileMenu />

        {/* Mobile Dialog Modals for Tools */}
        <CurrencyConverterPopover
          hideTrigger
          isOpen={mobileCurrencyOpen}
          onOpenChange={setMobileCurrencyOpen}
        />
        <CalculatorPopover
          hideTrigger
          isOpen={mobileCalculatorOpen}
          onOpenChange={setMobileCalculatorOpen}
        />
      </div>
    </header>
  );
}
