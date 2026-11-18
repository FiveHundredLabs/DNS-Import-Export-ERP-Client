import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  collectionSummaryService,
  CollectionSummaryResult,
  CollectorSummaryRow,
  DateWiseCollectionRow,
} from '../../../services/CollectionSummaryService';
import { Payment } from '../../../types/payment';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';
import { useAreas } from '../../../hooks/useAreas';
import { useUsers } from '../../../hooks/useUsers';
import { cn } from '../../../utils/cn';
import {
  Banknote,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Wallet,
  Clock,
  ShieldCheck,
  AlertCircle,
  Users,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Eye,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Building,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all' | 'custom';
type ActiveTab = 'DATE_WISE' | 'REPRESENTATIVES' | 'RECEIPTS_LEDGER';

export function SalesCollectionReportPage() {
  const { currentUser, role } = useAuth();
  const { areas } = useAreas();
  const { users } = useUsers();

  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('DATE_WISE');

  // Pagination for detailed payments ledger
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [data, setData] = useState<CollectionSummaryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isAreaManager = role === 'AREA_MANAGER';
  const isSalesRep = role === 'SALES_REP';
  const isExecutive = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR', 'FINANCE_OFFICER', 'FINANCE_MANAGER'].includes(role);

  // Load collection summary data
  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await collectionSummaryService.getCollectionSummary({
        datePreset,
        startDate: datePreset === 'custom' ? startDate : undefined,
        endDate: datePreset === 'custom' ? endDate : undefined,
        areaId: selectedAreaId !== 'ALL' ? selectedAreaId : undefined,
        collectorId: selectedCollectorId !== 'ALL' ? selectedCollectorId : undefined,
        actorRole: role,
        actorUserId: currentUser.id,
        search,
        page: currentPage,
        pageSize,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load collection summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [datePreset, startDate, endDate, selectedAreaId, selectedCollectorId, search, currentPage, pageSize, role, currentUser?.id]);

  // Reset page when filters change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setCurrentPage(1);
  };

  // Collector filter options based on role
  const availableCollectors = useMemo(() => {
    if (isSalesRep) return [];
    if (isAreaManager) {
      return users.filter(
        (u) => (u.areaId === currentUser?.areaId || u.id === currentUser?.id) && u.isActive
      );
    }
    // Executives
    if (selectedAreaId !== 'ALL') {
      return users.filter((u) => u.areaId === selectedAreaId && (u.role === 'SALES_REP' || u.role === 'AREA_MANAGER'));
    }
    return users.filter((u) => u.role === 'SALES_REP' || u.role === 'AREA_MANAGER');
  }, [isSalesRep, isAreaManager, selectedAreaId, currentUser, users]);

  const kpi = data?.kpi || {
    totalCollected: 0,
    cashCollected: 0,
    chequeCollected: 0,
    bankTransferCollected: 0,
    cashHeld: 0,
    chequeHeld: 0,
    totalHeld: 0,
    totalReceipts: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── HEADER & BREADCRUMBS ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/reports/sales"
              className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Sales Reports
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-700">Collections</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Banknote className="h-6 w-6 text-emerald-600 shrink-0" />
            Sales Collection Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of customer payments, field cash &amp; cheques held in custody, and date-wise collections.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 px-3 text-xs rounded-xl border-slate-200 font-semibold gap-1.5 shadow-2xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>

          <Link to="/payments/collect">
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs gap-1.5"
            >
              <Receipt className="h-3.5 w-3.5" /> Record Collection
            </Button>
          </Link>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Preset date buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
            {(
              [
                ['today', 'Today'],
                ['yesterday', 'Yesterday'],
                ['this_week', 'This Week'],
                ['this_month', 'This Month'],
                ['all', 'All Time'],
                ['custom', 'Custom Range'],
              ] as [DatePreset, string][]
            ).map(([presetKey, label]) => (
              <button
                key={presetKey}
                type="button"
                onClick={() => handlePresetChange(presetKey)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold text-xs transition-all',
                  datePreset === presetKey
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Auditing by <strong>collectedAt</strong> timestamp</span>
          </div>
        </div>

        {/* Custom date range inputs */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 text-xs rounded-xl w-36"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 text-xs rounded-xl w-36"
              />
            </div>
          </div>
        )}

        {/* Territory and search filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Search box */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search receipt #, customer name, or rep..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>

          {/* Area selector (Visible to executives) */}
          {isExecutive && (
            <div>
              <select
                value={selectedAreaId}
                onChange={(e) => {
                  setSelectedAreaId(e.target.value);
                  setSelectedCollectorId('ALL');
                  setCurrentPage(1);
                }}
                className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Territories</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collector selector */}
          {(isExecutive || isAreaManager) && (
            <div>
              <select
                value={selectedCollectorId}
                onChange={(e) => {
                  setSelectedCollectorId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">
                  {isAreaManager ? 'All Team Members & Self' : 'All Collectors'}
                </option>
                {availableCollectors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'AREA_MANAGER' ? 'Area Mgr' : 'Sales Rep'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── 7 KPI SUMMARY CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* 1. Total Collected */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-emerald-950 truncate">Total Collected</span>
            <div className="h-6 w-6 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-emerald-950 font-mono tracking-tight truncate">
            {formatCurrency(kpi.totalCollected)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">
            {kpi.totalReceipts} receipts recorded
          </div>
        </div>

        {/* 2. Cash Collected */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-700 truncate">Cash In</span>
            <div className="h-6 w-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Banknote className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900 font-mono tracking-tight truncate">
            {formatCurrency(kpi.cashCollected)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
            Physical cash settlements
          </div>
        </div>

        {/* 3. Cheque Collected */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-700 truncate">Cheques In</span>
            <div className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-blue-900 font-mono tracking-tight truncate">
            {formatCurrency(kpi.chequeCollected)}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5 font-medium">
            Post-dated / current
          </div>
        </div>

        {/* 4. Bank Transfers */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-700 truncate">Bank Transfers</span>
            <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-indigo-900 font-mono tracking-tight truncate">
            {formatCurrency(kpi.bankTransferCollected)}
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5 font-medium">
            Direct account slips
          </div>
        </div>

        {/* 5. Cash in Hand (Held) */}
        <div className={cn(
          "rounded-2xl border p-3 shadow-xs flex flex-col justify-between transition-all",
          kpi.cashHeld > 0 ? "border-amber-300 bg-amber-50/70 text-amber-950" : "border-slate-200/90 bg-white"
        )}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-amber-900 truncate">Cash Held</span>
            <div className="h-6 w-6 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-amber-950 font-mono tracking-tight truncate">
            {formatCurrency(kpi.cashHeld)}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
            Un-handed field cash
          </div>
        </div>

        {/* 6. Cheques Held */}
        <div className={cn(
          "rounded-2xl border p-3 shadow-xs flex flex-col justify-between transition-all",
          kpi.chequeHeld > 0 ? "border-sky-300 bg-sky-50/70 text-sky-950" : "border-slate-200/90 bg-white"
        )}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-sky-900 truncate">Cheques Held</span>
            <div className="h-6 w-6 rounded-lg bg-sky-200/80 text-sky-800 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-sky-950 font-mono tracking-tight truncate">
            {formatCurrency(kpi.chequeHeld)}
          </div>
          <div className="text-[10px] text-sky-700 mt-0.5 font-medium">
            Awaiting Finance receipt
          </div>
        </div>

        {/* 7. Total Pending Handover */}
        <div className={cn(
          "rounded-2xl border p-3 shadow-xs flex flex-col justify-between transition-all col-span-2 md:col-span-1",
          kpi.totalHeld > 0 ? "border-rose-300 bg-rose-50/60 text-rose-950" : "border-slate-200/90 bg-white"
        )}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-rose-900 truncate">Total Held</span>
            <div className="h-6 w-6 rounded-lg bg-rose-200/80 text-rose-800 flex items-center justify-center shrink-0">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-rose-950 font-mono tracking-tight truncate">
            {formatCurrency(kpi.totalHeld)}
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5 font-medium">
            Pending handover float
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION ────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('DATE_WISE')}
          className={cn(
            'pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5',
            activeTab === 'DATE_WISE'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-slate-500 hover:text-slate-900'
          )}
        >
          <Calendar className="h-4 w-4" />
          Date-Wise Collection Summary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REPRESENTATIVES')}
          className={cn(
            'pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5',
            activeTab === 'REPRESENTATIVES'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-slate-500 hover:text-slate-900'
          )}
        >
          <Users className="h-4 w-4" />
          {isAreaManager ? 'Area Manager & Team Tracking' : 'Collector Balances & Custody'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECEIPTS_LEDGER')}
          className={cn(
            'pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5',
            activeTab === 'RECEIPTS_LEDGER'
              ? 'text-primary border-b-2 border-primary -mb-px'
              : 'text-slate-500 hover:text-slate-900'
          )}
        >
          <FileText className="h-4 w-4" />
          Receipts Ledger ({data?.detailedPayments?.meta?.total || 0})
        </button>
      </div>

      {/* ── TAB 1: DATE-WISE COLLECTION SUMMARY ────────────────────────────── */}
      {activeTab === 'DATE_WISE' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Date-Wise Breakdown ({data?.dateWiseSummary?.length || 0} Collection Groups)
            </span>
            <span className="text-[11px] text-slate-500">
              Each row identifies when a Sales Rep or Area Manager collected funds from customers
            </span>
          </div>

          <div className="overflow-x-auto [scrollbar-width:thin]">
            <Table className="min-w-[950px]">
              <TableHeader className="bg-slate-50">
                <TableRow className="text-[11px] font-bold text-slate-600">
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead className="text-right">Cash In</TableHead>
                  <TableHead className="text-right">Cheques In</TableHead>
                  <TableHead className="text-right">Bank Transfers</TableHead>
                  <TableHead className="text-right">Total Collected</TableHead>
                  <TableHead className="text-center">Receipts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y divide-slate-100">
                {!data?.dateWiseSummary || data.dateWiseSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400 italic">
                      No collections recorded within the selected date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.dateWiseSummary.map((row, idx) => (
                    <TableRow
                      key={`${row.date}_${row.collectorId}_${idx}`}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors',
                        row.collectorRole === 'AREA_MANAGER' && 'bg-blue-50/20'
                      )}
                    >
                      <TableCell className="font-mono font-bold text-slate-800">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900">{row.collectorName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold',
                            row.collectorRole === 'AREA_MANAGER'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          )}
                        >
                          {row.collectorRole === 'AREA_MANAGER' ? 'Area Manager' : 'Sales Rep'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {row.areaName || 'General'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-slate-800">
                        {row.cashAmount > 0 ? formatCurrency(row.cashAmount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-blue-700">
                        {row.chequeAmount > 0 ? formatCurrency(row.chequeAmount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-indigo-700">
                        {row.bankTransferAmount > 0 ? formatCurrency(row.bankTransferAmount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-black text-emerald-900 bg-emerald-50/30">
                        {formatCurrency(row.totalCollected)}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-slate-700">
                        {row.receiptCount}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── TAB 2: REPRESENTATIVE & AREA BALANCES ───────────────────────────── */}
      {activeTab === 'REPRESENTATIVES' && (
        <div className="space-y-5">
          {/* If AREA_MANAGER: Display personal collections separately as per Requirement 2 */}
          {isAreaManager && data?.areaManagerSummary && (
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    AM
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-950 flex items-center gap-2">
                      <span>Area Manager Personal Collections: {data.areaManagerSummary.collectorName}</span>
                      <Badge className="bg-blue-600 text-white text-[9px] font-bold">Personal Account</Badge>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Collections recorded personally by you (kept strictly separate from team collections).
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Personal Collected</div>
                  <div className="text-lg font-black text-blue-950 font-mono">
                    {formatCurrency(data.areaManagerSummary.totalCollected)}
                  </div>
                </div>
              </div>

              {/* Personal cash & cheque held breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-blue-200/60 text-xs">
                <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Personal Cash in Hand</span>
                  <span className="text-sm font-mono font-extrabold text-amber-900 mt-0.5 block">
                    {formatCurrency(data.areaManagerSummary.cashHeld)}
                  </span>
                </div>
                <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Personal Cheques Held</span>
                  <span className="text-sm font-mono font-extrabold text-sky-900 mt-0.5 block">
                    {formatCurrency(data.areaManagerSummary.chequeHeld)}
                  </span>
                </div>
                <div className="bg-white/80 rounded-xl p-2.5 border border-blue-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Personal Total Held</span>
                  <span className="text-sm font-mono font-extrabold text-rose-900 mt-0.5 block">
                    {formatCurrency(data.areaManagerSummary.totalHeld)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Table of assigned Sales Representatives in area */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                {isAreaManager
                  ? `Assigned Sales Representatives (${data?.teamSummary?.length || 0} Reps)`
                  : `Collector Balances & Custody (${data?.allCollectorsSummary?.length || 0} Collectors)`}
              </span>
              <span className="text-[11px] text-slate-500">
                Cash in Hand and Cheques Held are displayed separately as required
              </span>
            </div>

            <div className="overflow-x-auto [scrollbar-width:thin]">
              <Table className="min-w-[950px]">
                <TableHeader className="bg-slate-50">
                  <TableRow className="text-[11px] font-bold text-slate-600">
                    <TableHead>Collector</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead className="text-right">Total Collected</TableHead>
                    <TableHead className="text-right text-amber-900">Cash in Hand</TableHead>
                    <TableHead className="text-right text-sky-900">Cheques Held</TableHead>
                    <TableHead className="text-right text-rose-900">Total Pending Handover</TableHead>
                    <TableHead className="text-center">Receipts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y divide-slate-100">
                  {(!isAreaManager ? data?.allCollectorsSummary : data?.teamSummary)?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-400 italic">
                        No team representatives found for this territory.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (!isAreaManager ? data?.allCollectorsSummary : data?.teamSummary)?.map((rep) => (
                      <TableRow key={rep.collectorId} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell>
                          <div className="font-bold text-slate-900">{rep.collectorName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold',
                              rep.collectorRole === 'AREA_MANAGER'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {rep.collectorRole === 'AREA_MANAGER' ? 'Area Manager' : 'Sales Rep'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {rep.areaName || 'Field Territory'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900">
                          {formatCurrency(rep.totalCollected)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-extrabold text-amber-900 bg-amber-50/30">
                          {formatCurrency(rep.cashHeld)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-extrabold text-sky-900 bg-sky-50/30">
                          {formatCurrency(rep.chequeHeld)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-rose-950 bg-rose-50/30">
                          {formatCurrency(rep.totalHeld)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-semibold text-slate-700">
                          {rep.receiptCount}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: INDIVIDUAL RECEIPTS LEDGER (PAGINATED) ─────────────────── */}
      {activeTab === 'RECEIPTS_LEDGER' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs space-y-0">
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Receipt Transactions ({data?.detailedPayments?.meta?.total || 0} Total Records)
            </span>
            <div className="text-[11px] text-slate-500 font-medium">
              Showing page {currentPage} of {data?.detailedPayments?.meta?.totalPages || 1}
            </div>
          </div>

          <div className="overflow-x-auto [scrollbar-width:thin]">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-slate-50">
                <TableRow className="text-[11px] font-bold text-slate-600">
                  <TableHead className="w-28">Receipt #</TableHead>
                  <TableHead>Collected Date &amp; Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Invoice Allocations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y divide-slate-100">
                {!data?.detailedPayments?.data || data.detailedPayments.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 italic">
                      No receipt records match your filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.detailedPayments.data.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell className="font-mono font-bold text-primary">
                        {p.receiptNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{formatDate(p.collectedAt)}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{p.customerName}</div>
                        {p.customerCode && (
                          <div className="text-[10px] text-slate-400 font-mono">{p.customerCode}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800">{p.salesRepName}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {p.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-800">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.status === 'APPROVED' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                            Cleared / Banked
                          </Badge>
                        ) : p.status === 'REJECTED' ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                            Rejected (Held by Rep)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                            Pending Handover
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.invoiceAllocations && p.invoiceAllocations.length > 0 ? (
                          <div className="text-[11px] text-slate-600">
                            {p.invoiceAllocations.map((a, i) => (
                              <span key={i} className="inline-block mr-2 font-mono text-slate-700">
                                {a.invoiceNumber} ({formatCurrency(a.allocatedAmount)})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Advance Payment</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {data?.detailedPayments?.meta && data.detailedPayments.meta.totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Page <strong>{currentPage}</strong> of <strong>{data.detailedPayments.meta.totalPages}</strong> (
                {data.detailedPayments.meta.total} records)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="h-7 px-2.5 text-xs rounded-lg border-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(data.detailedPayments.meta.totalPages, p + 1))
                  }
                  disabled={currentPage >= data.detailedPayments.meta.totalPages}
                  className="h-7 px-2.5 text-xs rounded-lg border-slate-200"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
