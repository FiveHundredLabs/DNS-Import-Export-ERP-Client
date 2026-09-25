import React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Download, Printer, Filter, RotateCcw, ShieldCheck, MapPin, UserCheck } from 'lucide-react';
import { ReportFilter } from '../../types/reports';
import { User } from '../../types/auth';
import { MOCK_AREAS } from '../../mock/mockAreas';
import { MOCK_USERS } from '../../mock/mockUsers';

interface ReportsFilterToolbarProps {
  user: User | null;
  filter: ReportFilter;
  onFilterChange: (updates: Partial<ReportFilter>) => void;
  onReset: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  activeTabTitle: string;
}

export function ReportsFilterToolbar({
  user,
  filter,
  onFilterChange,
  onReset,
  onExportCSV,
  onPrint,
  activeTabTitle,
}: ReportsFilterToolbarProps) {
  const isAreaLocked = user?.role === 'AREA_MANAGER' || user?.role === 'SALES_REP';
  const isRepLocked = user?.role === 'SALES_REP';

  const reps = MOCK_USERS.filter((u) => u.role === 'SALES_REP');

  const getScopeLabel = () => {
    if (user?.role === 'SALES_REP') {
      return `Portfolio: ${user.name} (Sales Rep)`;
    }
    if (user?.role === 'AREA_MANAGER') {
      return `Territory: ${user.areaName || 'Western Province Central'} (Locked)`;
    }
    if (filter.areaId) {
      const area = MOCK_AREAS.find((a) => a.id === filter.areaId);
      return `Territory: ${area?.name || filter.areaId}`;
    }
    return 'Organization-Wide Consolidated Scope';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 px-3 py-1 font-semibold text-xs border-primary-border bg-primary-light/50 text-primary-text"
          >
            {user?.role === 'SALES_REP' ? (
              <UserCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-primary" />
            )}
            <span>{getScopeLabel()}</span>
          </Badge>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs font-medium text-slate-500">Active View: {activeTabTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </Button>
          <Button
            size="sm"
            onClick={onExportCSV}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Start Date
          </label>
          <Input
            type="date"
            value={filter.startDate || ''}
            onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
            className="h-9 text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            End Date
          </label>
          <Input
            type="date"
            value={filter.endDate || ''}
            onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
            className="h-9 text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Territory / Area
          </label>
          <select
            aria-label="Filter by Territory"
            data-testid="area-filter-select"
            value={filter.areaId || ''}
            disabled={isAreaLocked}
            onChange={(e) => onFilterChange({ areaId: e.target.value || undefined })}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">All Territories</option>
            {MOCK_AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Sales Representative
          </label>
          <select
            aria-label="Filter by Sales Representative"
            data-testid="sales-rep-filter-select"
            value={filter.salesRepId || ''}
            disabled={isRepLocked}
            onChange={(e) => onFilterChange({ salesRepId: e.target.value || undefined })}
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">All Sales Reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full h-9 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
