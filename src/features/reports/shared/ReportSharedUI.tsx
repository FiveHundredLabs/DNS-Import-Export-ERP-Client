/**
 * Shared UI primitives used across all three report modules:
 * Sales, Purchasing, and Inventory.
 * Design token-compatible with FinanceReportsHubPage.tsx.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, ArrowLeft, Printer, Download } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
export { lkr, pct } from './reportMockData';

export interface ReportCardDef {
  id: string;
  title: string;
  category: string;
  description: string;
  path: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  features: string[];
}

interface ReportHubProps {
  title: string;
  subtitle: string;
  badgeLabel: string;
  cards: ReportCardDef[];
  searchPlaceholder?: string;
  countLabel?: string;
}

export function ReportHubLayout({
  title,
  subtitle,
  badgeLabel,
  cards,
  searchPlaceholder = 'Search reports by title or category...',
  countLabel = 'Reports',
}: ReportHubProps) {
  const [search, setSearch] = useState('');

  const filtered = cards.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              {badgeLabel}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 text-xs"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filtered.length}</span> {countLabel}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.id} to={report.path} className="group block">
              <Card className="h-full p-5 border-slate-200 transition-all hover:border-primary hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-primary-light text-primary border border-primary-border/40 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-semibold ${report.badgeColor}`}>
                      {report.badge}
                    </Badge>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {report.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors mt-0.5">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    {report.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary group-hover:text-primary-text">
                  <span>Open Report</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No reports match "{search}"</p>
          <p className="text-xs mt-1">Try different keywords</p>
        </div>
      )}
    </div>
  );
}

// ─── Shared Report Page Shell ──────────────────────────────────────────────────

interface ReportPageShellProps {
  backPath: string;
  backLabel: string;
  onBack?: () => void;
  hideBack?: boolean;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export function ReportPageShell({
  backPath,
  backLabel,
  onBack,
  hideBack,
  title,
  subtitle,
  badge,
  badgeColor = 'bg-primary-light text-primary-text border-primary-border',
  toolbar,
  children,
}: ReportPageShellProps) {
  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center ${hideBack ? 'justify-end' : 'justify-between'} gap-3 print:hidden`}>
        {!hideBack && (
          onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </button>
          ) : (
            <Link
              to={backPath}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </Link>
          )
        )}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {badge && (
            <Badge variant="outline" className={`text-[10px] font-semibold ${badgeColor}`}>
              {badge}
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      {/* Toolbar */}
      {toolbar && <div className="print:hidden">{toolbar}</div>}

      {/* Content */}
      {children}
    </div>
  );
}

// ─── Shared Filter Bar ─────────────────────────────────────────────────────────

type Preset = 'TODAY' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';

export interface DateRange {
  preset: Preset;
  startDate: string;
  endDate: string;
}

export function getDefaultDateRange(): DateRange {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  return { preset: 'THIS_MONTH', startDate: `${yyyy}-${mm}-01`, endDate: todayStr };
}

interface ReportFilterBarProps {
  dateRange: DateRange;
  onChange: (dr: DateRange) => void;
  extraFilters?: React.ReactNode;
  onExportCsv?: () => void;
}

export function ReportFilterBar({ dateRange, onChange, extraFilters, onExportCsv }: ReportFilterBarProps) {
  const handlePreset = (preset: Preset) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'TODAY') onChange({ preset, startDate: todayStr, endDate: todayStr });
    else if (preset === 'THIS_MONTH') onChange({ preset, startDate: `${yyyy}-${mm}-01`, endDate: todayStr });
    else if (preset === 'THIS_QUARTER') {
      const qm = Math.floor(today.getMonth() / 3) * 3 + 1;
      onChange({ preset, startDate: `${yyyy}-${String(qm).padStart(2, '0')}-01`, endDate: todayStr });
    } else if (preset === 'THIS_YEAR') onChange({ preset, startDate: `${yyyy}-01-01`, endDate: todayStr });
    else onChange({ ...dateRange, preset: 'CUSTOM' });
  };

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Period:</span>
        <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs max-w-full">
          {(['TODAY', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'CUSTOM'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                dateRange.preset === p
                  ? 'bg-white text-primary-text shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p === 'THIS_MONTH' ? 'This Month' : p === 'THIS_QUARTER' ? 'This Quarter' : p === 'THIS_YEAR' ? 'This Year' : p === 'TODAY' ? 'Today' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
        <div className="flex items-center gap-2 text-xs">
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => onChange({ ...dateRange, preset: 'CUSTOM', startDate: e.target.value })}
            className="h-8 w-36 text-xs"
          />
          <span className="text-slate-400">→</span>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => onChange({ ...dateRange, preset: 'CUSTOM', endDate: e.target.value })}
            className="h-8 w-36 text-xs"
          />
        </div>
        {extraFilters}
        {onExportCsv && (
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={onExportCsv}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── KPI Strip Card ────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: 'default' | 'green' | 'blue' | 'amber' | 'red' | 'purple';
}

const colorMap = {
  default: 'bg-primary-light/40 border-primary-border/40 text-primary-text',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
};

export function KpiCard({ label, value, sub, color = 'default' }: KpiCardProps) {
  return (
    <Card className={`border ${colorMap[color]}`}>
      <div className="p-4">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
        <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
        {sub && <span className="text-xs mt-1 block opacity-70">{sub}</span>}
      </div>
    </Card>
  );
}

// ─── Status Badge helper ───────────────────────────────────────────────────────

type StatusVariant = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'purple';

const statusColors: Record<StatusVariant, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function StatusPill({ label, variant }: { label: string; variant: StatusVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[variant]}`}>
      {label}
    </span>
  );
}

// ─── Sortable Table ────────────────────────────────────────────────────────────

export interface TableCol<T> {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface SortableTableProps<T extends Record<string, unknown>> {
  columns: TableCol<T>[];
  data: T[];
  emptyMessage?: string;
  compact?: boolean;
}

export function SortableTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = 'No data for this period.',
  compact = false,
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const cellPy = compact ? 'py-1.5' : 'py-2.5';

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => col.sortable && handleSort(String(col.key))}
                className={`px-3 ${cellPy} font-semibold text-slate-600 whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.sortable ? 'cursor-pointer select-none hover:text-primary' : ''}`}
              >
                {col.label}
                {col.sortable && sortKey === String(col.key) && (sortDir === 'asc' ? ' ↑' : ' ↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paged.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            paged.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-3 ${cellPy} text-slate-700 ${
                      col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : ''
                    }`}
                  >
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</Button>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
          </div>
        </div>
      )}
    </div>
  );
}

