import { useState, useRef, useEffect } from 'react';
import { Customer } from '../../types/customer';
import { useCustomers } from '../../hooks/useCustomers';
import { formatCurrency } from '../../utils/formatters';
import { Search, Building2, X, ChevronDown, Check } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../../utils/cn';

export interface CustomerSelectorProps {
  onSelect: (customer: Customer) => void;
  selectedCustomerId?: string;
  assignedRepId?: string;
  className?: string;
  placeholder?: string;
  isModalMode?: boolean;
}

export function CustomerSelector({
  onSelect,
  selectedCustomerId,
  assignedRepId,
  className,
  placeholder = 'Search customer by code, name, phone...',
  isModalMode = false,
}: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(isModalMode);
  const containerRef = useRef<HTMLDivElement>(null);

  const { customers, loading } = useCustomers({
    search: searchTerm,
    assignedRepId,
    page: 1,
    pageSize: 25,
  });

  // Handle outside click to close floating dropdown
  useEffect(() => {
    if (isModalMode) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalMode]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setSearchTerm('');
    if (!isModalMode) {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="pl-9 pr-16 h-9 text-xs font-medium bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-slate-400 transition-transform duration-150',
              isOpen && !isModalMode && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Dropdown Results List */}
      {(isOpen || isModalMode) && (
        <div
          className={cn(
            isModalMode
              ? 'mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-xs'
              : 'absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in-50 slide-in-from-top-1 duration-150'
          )}
        >
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Searching Customer Master...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching customers found.
            </div>
          ) : (
            customers.map((c) => {
              const isSelected = c.id === selectedCustomerId;
              const hasOverdue = (c.financials?.overdue || 0) > 0;

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={cn(
                    'flex items-center justify-between p-3 text-xs cursor-pointer transition-colors select-none',
                    isSelected
                      ? 'bg-primary-light/70 border-l-2 border-primary'
                      : 'hover:bg-slate-50/90'
                  )}
                >
                  <div className="min-w-0 pr-3 flex-1">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                      <span className="truncate">{c.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                        {c.type}
                      </Badge>
                      {c.loyaltyTier && (
                        <Badge variant="purple" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-medium">
                          {c.loyaltyTier}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      <span className="font-mono text-slate-600">{c.code}</span>
                      {c.contactPerson && ` • ${c.contactPerson}`}
                      {c.phone && ` (${c.phone})`}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-medium text-slate-800">
                      Limit: {formatCurrency(c.commercialTerms?.creditLimit || 0)}
                    </div>
                    <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                      <span>Credit: {c.commercialTerms?.creditDays || 30}d</span>
                      <span className="mx-1">•</span>
                      <span className={hasOverdue ? 'text-amber-700 font-semibold' : ''}>
                        Outst: {formatCurrency(c.financials?.totalOutstanding || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
