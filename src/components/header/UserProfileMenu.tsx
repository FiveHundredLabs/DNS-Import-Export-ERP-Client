import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Palette,
  ExternalLink,
  Building,
  Percent,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface UserProfileMenuProps {
  className?: string;
}

export function UserProfileMenu({ className }: UserProfileMenuProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  if (!currentUser) return null;

  // Format initials: "Saman Jayasuriya" -> "SJ"
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  const initials = getInitials(currentUser.name);

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      {/* Avatar Button: Clean circular enterprise avatar with NO permanent name beside it */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-primary font-bold text-[11px] sm:text-xs shadow-xs ring-1.5 ring-white/40 hover:ring-white/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white cursor-pointer select-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile menu"
        title={`${currentUser.name} (${formatRole(currentUser.role)})`}
      >
        {currentUser.avatar ? (
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="tracking-wide">{initials}</span>
        )}
      </button>

      {/* Enterprise Profile Dropdown Popover */}
      {isOpen && (
        <div
          role="menu"
          aria-label="User account actions"
          className="absolute right-0 mt-2.5 w-76 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl shadow-slate-900/15 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Information Card */}
          <div className="p-3.5 pb-3 border-b border-slate-100 bg-slate-50/60 rounded-xl mb-1.5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-xs ring-2 ring-primary/20">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 tracking-tight truncate leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                  {currentUser.email}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  <span>{formatRole(currentUser.role)}</span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10.5px] text-slate-500">
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3 text-slate-400" />
                DNS Distribution LK
              </span>
              <span className="font-mono text-slate-400">ID: EMP-{currentUser.id.slice(-4).toUpperCase()}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1 space-y-0.5">
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-100/90 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
                <span>Profile Settings</span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans">Overview</span>
            </Link>

            {currentUser.role === 'DIRECTOR' && (
              <Link
                to="/?tab=settings&section=tax"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-100/90 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Percent className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
                  <span>Global Tax Configuration</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">Settings</span>
              </Link>
            )}

            <Link
              to="/?tab=settings&section=appearance"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-100/90 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors" />
                <span>Theme & Appearance</span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans">Settings</span>
            </Link>
          </div>

          <div className="my-1 border-t border-slate-100" />

          {/* Destructive Action: Logout */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="h-4 w-4 text-rose-500 group-hover:text-rose-600 transition-colors" />
                <span>Logout Session</span>
              </div>
              <ExternalLink className="h-3 w-3 text-rose-400 group-hover:text-rose-600 opacity-70 group-hover:opacity-100 transition-all" />
            </button>
            <p className="px-3 pb-1 text-[10px] text-slate-400">
              Signs out and redirects to the Login portal to select a role.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
