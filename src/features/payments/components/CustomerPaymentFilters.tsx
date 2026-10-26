import React from 'react';
import { CustomerPaymentFilterType } from '../../../rules/customerPaymentRules';
import { Search, X, Users, AlertCircle, Clock, MapPin, CheckCircle2, DollarSign } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface FilterCounts {
  all: number;
  outstanding: number;
  overdue: number;
  nearby: number;
  pendingCollection: number;
  settled: number;
}

interface CustomerPaymentFiltersProps {
  activeFilter: CustomerPaymentFilterType;
  onFilterChange: (filter: CustomerPaymentFilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: FilterCounts;
  className?: string;
}

export function CustomerPaymentFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  counts,
  className,
}: CustomerPaymentFiltersProps) {
  const filterTabs: {
    id: CustomerPaymentFilterType;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    activeClass: string;
  }[] = [
    {
      id: 'ALL',
      label: 'All Customers',
      count: counts.all,
      icon: Users,
      activeClass: 'bg-white text-slate-900 border-slate-300 shadow-xs',
    },
    {
      id: 'OUTSTANDING',
      label: 'Outstanding',
      count: counts.outstanding,
      icon: DollarSign,
      activeClass: 'bg-white text-blue-900 border-blue-300 shadow-xs',
    },
    {
      id: 'OVERDUE',
      label: 'Overdue',
      count: counts.overdue,
      icon: AlertCircle,
      activeClass: 'bg-white text-rose-900 border-rose-300 shadow-xs',
    },
    {
      id: 'NEARBY',
      label: 'Nearby',
      count: counts.nearby,
      icon: MapPin,
      activeClass: 'bg-white text-emerald-900 border-emerald-300 shadow-xs',
    },
    {
      id: 'PENDING_COLLECTION',
      label: 'Pending Collection',
      count: counts.pendingCollection,
      icon: Clock,
      activeClass: 'bg-white text-amber-900 border-amber-300 shadow-xs',
    },
    {
      id: 'SETTLED',
      label: 'Fully Settled',
      count: counts.settled,
      icon: CheckCircle2,
      activeClass: 'bg-white text-emerald-900 border-emerald-300 shadow-xs',
    },
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Prominent Mobile Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by customer name, code, phone, or route..."
          className="w-full h-11 pl-10 pr-9 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Horizontal Scrollable Filter Chips with Counter Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 select-none shrink-0 border active:scale-95',
                isActive
                  ? tab.activeClass
                  : 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  isActive
                    ? tab.id === 'OVERDUE'
                      ? 'text-rose-600'
                      : tab.id === 'NEARBY'
                      ? 'text-emerald-600'
                      : tab.id === 'PENDING_COLLECTION'
                      ? 'text-amber-600'
                      : 'text-primary'
                    : 'text-slate-400'
                )}
              />
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[10.5px] px-1.5 py-0.2 rounded-full font-bold tabular-nums',
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-600'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
