import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, UserRole } from '../../../types/auth';
import { MOCK_USERS } from '../../../mock/mockUsers';
import { Search, Check, User as UserIcon, X, ChevronDown, ShieldCheck } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface UserSearchPickerProps {
  selectedUserId?: string;
  onSelectUser: (user: User) => void;
  allowedRoles?: UserRole[];
  placeholder?: string;
  className?: string;
}

export function UserSearchPicker({
  selectedUserId,
  onSelectUser,
  allowedRoles = ['FINANCE_MANAGER', 'CASHIER', 'MANAGER', 'DIRECTOR'],
  placeholder = 'Search by name, role, or email (e.g. Nimal, Finance)...',
  className,
}: UserSearchPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Eligible users (filtered by allowed roles for receiving handovers)
  const eligibleUsers = useMemo(() => {
    return MOCK_USERS.filter((u) => u.isActive && allowedRoles.includes(u.role));
  }, [allowedRoles]);

  const selectedUser = useMemo(() => {
    return MOCK_USERS.find((u) => u.id === selectedUserId);
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return eligibleUsers;
    const q = query.toLowerCase().trim();
    return eligibleUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.title && u.title.toLowerCase().includes(q))
    );
  }, [eligibleUsers, query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleBadge = (user: User) => {
    if (user.title) return user.title;
    switch (user.role) {
      case 'FINANCE_MANAGER':
        return 'Finance Officer';
      case 'CASHIER':
        return 'Remittance Cashier';
      case 'DIRECTOR':
        return 'Executive Director';
      case 'MANAGER':
        return 'General Manager';
      default:
        return user.role;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full space-y-1.5', className)}>
      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
        <span>Receiving Finance Person *</span>
        <span className="text-[10.5px] text-slate-400 font-normal">Finance Dept / Remittance Desk</span>
      </label>

      {/* Selected Card View (GitHub style) */}
      {selectedUser && !isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-300 bg-white hover:border-primary/50 hover:bg-slate-50/70 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {getInitials(selectedUser.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {selectedUser.name}
                </span>
                <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  {getRoleBadge(selectedUser)}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono block truncate">
                {selectedUser.email} • {selectedUser.phone}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="text-xs text-primary font-semibold hover:underline px-2 py-1 shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        /* Search Input Box */
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-9 h-11 text-xs rounded-2xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          )}
        </div>
      )}

      {/* GitHub-style Popover List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Available Finance Personnel ({filteredUsers.length})
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No matching finance recipients found for "{query}".
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = user.id === selectedUserId;
              return (
                <div
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex items-center justify-between p-2.5 hover:bg-slate-50/90 cursor-pointer transition-colors text-xs',
                    isSelected && 'bg-primary-light/30'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{user.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-700 shrink-0">
                          {getRoleBadge(user)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
