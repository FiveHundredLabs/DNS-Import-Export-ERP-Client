import React, { useState, useMemo } from 'react';
import { User } from '../../../types/auth';
import { Payment } from '../../../types/payment';
import { CashHandover } from '../../../types/handover';
import { Invoice } from '../../../types/invoice';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import { evaluate24hHandoverStatus } from '../../../rules/paymentRules';
import { cn } from '../../../utils/cn';
import {
  Banknote,
  Send,
  ShieldCheck,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
  Users,
  Building2,
  FileText,
} from 'lucide-react';

export interface SalesRepCashManagementViewProps {
  salesReps: User[];
  payments: Payment[];
  handovers: CashHandover[];
  invoices: Invoice[];
  onSelectRep: (rep: User, initialTab?: 'CASH_IN_HAND' | 'HANDOVERS' | 'HISTORY') => void;
  onRefresh?: () => void;
}

export function SalesRepCashManagementView({
  salesReps,
  payments,
  handovers,
  invoices,
  onSelectRep,
  onRefresh,
}: SalesRepCashManagementViewProps) {
  const [search, setSearch] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HOLDING_CASH' | 'OVERDUE' | 'PENDING_HANDOVER' | 'CLEAR'>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Compute per-rep metrics
  const repMetricsList = useMemo(() => {
    return salesReps.map((rep) => {
      const repPayments = payments.filter((p) => p.salesRepId === rep.id);
      const repHandovers = handovers.filter((h) => h.salesRepId === rep.id);

      // Cash payments currently in hand
      const cashInHandPayments = repPayments.filter((p) => {
        if (p.paymentMethod !== 'CASH') return false;
        const h24 = evaluate24hHandoverStatus(p);
        return h24.handoverStatus === 'PENDING_HANDOVER' && p.status !== 'APPROVED';
      });

      const totalCashInHand = cashInHandPayments.reduce((sum, p) => sum + p.amount, 0);

      // Overdue >24h collections
      const overduePayments = cashInHandPayments.filter((p) => {
        const h24 = evaluate24hHandoverStatus(p);
        return h24.isOverdue;
      });

      // Pending handovers
      const pendingHandovers = repHandovers.filter((h) => h.status === 'PENDING_APPROVAL');
      const totalPendingHandover = pendingHandovers.reduce((sum, h) => sum + h.totalAmount, 0);

      // Approved / cleared collections
      const approvedPayments = repPayments.filter((p) => p.status === 'APPROVED');
      const totalApproved = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

      // Last handover record
      const sortedHandovers = [...repHandovers].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      const lastHandover = sortedHandovers[0] || null;

      // Invoices count collected against in cash in hand
      const targetInvoicesCount = new Set(
        cashInHandPayments.flatMap((p) => p.invoiceAllocations.map((a) => a.invoiceNumber))
      ).size;

      return {
        rep,
        totalCashInHand,
        cashInHandCount: cashInHandPayments.length,
        targetInvoicesCount,
        overdueCount: overduePayments.length,
        overduePayments,
        totalPendingHandover,
        pendingHandoverCount: pendingHandovers.length,
        totalApproved,
        lastHandover,
      };
    });
  }, [salesReps, payments, handovers]);

  // Overall totals across all sales reps
  const overallMetrics = useMemo(() => {
    const totalCashInField = repMetricsList.reduce((sum, r) => sum + r.totalCashInHand, 0);
    const activeRepsHoldingCash = repMetricsList.filter((r) => r.totalCashInHand > 0).length;
    const totalPendingHandover = repMetricsList.reduce((sum, r) => sum + r.totalPendingHandover, 0);
    const totalOverdueBreaches = repMetricsList.reduce((sum, r) => sum + r.overdueCount, 0);
    const totalApprovedMTD = repMetricsList.reduce((sum, r) => sum + r.totalApproved, 0);

    return {
      totalCashInField,
      activeRepsHoldingCash,
      totalPendingHandover,
      totalOverdueBreaches,
      totalApprovedMTD,
    };
  }, [repMetricsList]);

  // Filtered reps
  const filteredReps = useMemo(() => {
    return repMetricsList.filter((item) => {
      const rep = item.rep;
      if (territoryFilter !== 'ALL') {
        const area = (rep.areaName || '').toLowerCase();
        if (!area.includes(territoryFilter.toLowerCase())) return false;
      }

      if (statusFilter === 'HOLDING_CASH' && item.totalCashInHand <= 0) return false;
      if (statusFilter === 'OVERDUE' && item.overdueCount <= 0) return false;
      if (statusFilter === 'PENDING_HANDOVER' && item.totalPendingHandover <= 0) return false;
      if (statusFilter === 'CLEAR' && item.totalCashInHand > 0) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = rep.name.toLowerCase().includes(q);
        const matchArea = (rep.areaName || '').toLowerCase().includes(q);
        const matchPhone = (rep.phone || '').includes(q);
        if (!matchName && !matchArea && !matchPhone) return false;
      }

      return true;
    });
  }, [repMetricsList, territoryFilter, statusFilter, search]);

  // Overdue alert list
  const overdueReps = repMetricsList.filter((r) => r.overdueCount > 0);

  return (
    <div className="space-y-5">
      {/* 5 Management KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* 1. Total Cash in Field */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-900 truncate">
              Field Cash in Hand
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-amber-950 font-mono tracking-tight truncate">
            {formatCurrency(overallMetrics.totalCashInField)}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            Held across {overallMetrics.activeRepsHoldingCash} Sales Reps
          </div>
        </div>

        {/* 2. Active Reps Holding Cash */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 truncate">
              Reps Holding Cash
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {overallMetrics.activeRepsHoldingCash}{' '}
            <span className="text-xs font-normal text-slate-500">/ {salesReps.length} Reps</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active field cash floats
          </div>
        </div>

        {/* 3. Pending Finance Handover */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 truncate">
              Pending Finance Handover
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-slate-900 font-mono tracking-tight truncate">
            {formatCurrency(overallMetrics.totalPendingHandover)}
          </div>
          <div className="text-[11px] text-sky-600 mt-1 font-medium">
            Submitted batches awaiting verification
          </div>
        </div>

        {/* 4. 24-Hour Policy Breaches */}
        <div className={cn(
          "rounded-2xl border p-3.5 sm:p-4 shadow-xs flex flex-col justify-between transition-all",
          overallMetrics.totalOverdueBreaches > 0
            ? "border-rose-300 bg-rose-50/70 text-rose-950 ring-1 ring-rose-200"
            : "border-slate-200/90 bg-white"
        )}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-rose-900 truncate">
              24h Policy Overdue
            </span>
            <div className={cn(
              "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
              overallMetrics.totalOverdueBreaches > 0 ? "bg-rose-600 text-white animate-pulse" : "bg-slate-100 text-slate-500"
            )}>
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-rose-700 tracking-tight">
            {overallMetrics.totalOverdueBreaches}{' '}
            <span className="text-xs font-normal text-rose-800">Collections</span>
          </div>
          <div className="text-[11px] text-rose-800 mt-1 font-medium">
            {overallMetrics.totalOverdueBreaches > 0 ? 'Requires immediate handover' : 'All handovers on schedule'}
          </div>
        </div>

        {/* 5. Approved MTD */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 truncate">
              Cleared &amp; Banked
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-emerald-800 font-mono tracking-tight truncate">
            {formatCurrency(overallMetrics.totalApprovedMTD)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            Settled to treasury accounts
          </div>
        </div>
      </div>

      {/* Critical Overdue Alert Banner if any Rep is breaching policy */}
      {overdueReps.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-3.5 sm:p-4 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-rose-700 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                <span>Management Alert: Overdue Cash Handovers (&gt;24 Hours)</span>
                <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {overdueReps.length} Rep(s) Affected
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-800 mt-0.5">
                The following Sales Representative(s) are holding company cash past the 24-hour limit:{' '}
                {overdueReps.map((r) => `${r.rep.name} (${formatCurrency(r.totalCashInHand)})`).join(', ')}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onSelectRep(overdueReps[0].rep, 'CASH_IN_HAND')}
            className="h-8 px-3.5 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-xl shadow-xs shrink-0 gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" /> Inspect {overdueReps[0].rep.name}
          </Button>
        </div>
      )}

      {/* Filter and Control Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by Sales Rep name, territory, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>

          <select
            value={territoryFilter}
            onChange={(e) => setTerritoryFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Territories</option>
            <option value="Kelaniya">Kelaniya / Colombo</option>
            <option value="Kandy">Kandy &amp; Central</option>
            <option value="Southern">Galle &amp; Southern</option>
            <option value="Gampaha">Gampaha &amp; Negombo</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 px-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="HOLDING_CASH">Holding Cash Now (&gt;0)</option>
            <option value="OVERDUE">Overdue &gt;24h Breach</option>
            <option value="PENDING_HANDOVER">Pending Handover</option>
            <option value="CLEAR">Zero Balance (Cleared)</option>
          </select>
        </div>

        {/* View mode toggle (Cards vs Table) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === 'CARDS' ? "bg-white text-primary shadow-xs" : "text-slate-500 hover:text-slate-900"
              )}
              title="Cards View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === 'TABLE' ? "bg-white text-primary shadow-xs" : "text-slate-500 hover:text-slate-900"
              )}
              title="Dense Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2.5 text-xs rounded-xl border-slate-200 shadow-2xs gap-1 font-semibold"
              title="Refresh Sales Rep Balances"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* SALES REPS CARDS VIEW */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReps.length === 0 ? (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <Users className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Sales Representatives Found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search or territory filter.</p>
            </div>
          ) : (
            filteredReps.map((item) => {
              const rep = item.rep;
              return (
                <div
                  key={rep.id}
                  className={cn(
                    "rounded-2xl border transition-all bg-white p-5 flex flex-col justify-between shadow-xs hover:shadow-md",
                    item.overdueCount > 0
                      ? "border-rose-300 ring-1 ring-rose-200/70"
                      : "border-slate-200/90 hover:border-slate-300"
                  )}
                >
                  {/* Card Header Profile */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                          {rep.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            {rep.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span>{rep.areaName || 'Field Territory'}</span>
                            <span>· {rep.assignedCustomersCount || 14} Dealers</span>
                          </div>
                        </div>
                      </div>

                      {/* Compliance Status Pill */}
                      {item.overdueCount > 0 ? (
                        <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse gap-1 shrink-0">
                          <AlertCircle className="h-3 w-3" /> Overdue &gt;24h
                        </Badge>
                      ) : item.totalCashInHand > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold gap-1 shrink-0">
                          <Clock className="h-3 w-3" /> Active Float
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Cleared
                        </Badge>
                      )}
                    </div>

                    {/* Main Cash in Hand Box */}
                    <div className="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 block">
                          Current Cash in Hand
                        </span>
                        <span className="text-xl font-mono font-extrabold text-amber-950 mt-0.5 block">
                          {formatCurrency(item.totalCashInHand)}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-amber-800">
                        <div><strong>{item.cashInHandCount}</strong> receipts</div>
                        <div>{item.targetInvoicesCount} invoices</div>
                      </div>
                    </div>

                    {/* Secondary Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Pending Handover</span>
                        <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                          {formatCurrency(item.totalPendingHandover)}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.pendingHandoverCount} submitted batch</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Cleared to Treasury</span>
                        <span className="font-mono font-bold text-emerald-700 mt-0.5 block truncate">
                          {formatCurrency(item.totalApproved)}
                        </span>
                        <span className="text-[10px] text-slate-400">Finance verified</span>
                      </div>
                    </div>

                    {/* Last Handover Summary */}
                    <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Send className="h-3 w-3" /> Last Handover:
                      </span>
                      {item.lastHandover ? (
                        <span className="font-medium text-slate-700">
                          {formatDate(item.lastHandover.submittedAt)} ({formatCurrency(item.lastHandover.totalAmount)})
                        </span>
                      ) : (
                        <span className="italic text-slate-400">No previous handovers</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => onSelectRep(rep, 'CASH_IN_HAND')}
                      className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect Cash &amp; Invoices
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectRep(rep, 'HANDOVERS')}
                      className="text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5 text-slate-600" /> Handover History
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* SALES REPS TABLE VIEW */
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <Table className="min-w-[1050px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[11px] font-bold text-slate-600">
                <TableHead>Sales Representative</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead className="text-right">Current Cash in Hand</TableHead>
                <TableHead className="text-center">24h Compliance Status</TableHead>
                <TableHead className="text-right">Pending Handover</TableHead>
                <TableHead className="text-right">Approved Collections</TableHead>
                <TableHead>Last Handover</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {filteredReps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400 italic">
                    No sales representatives match the filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReps.map((item) => {
                  const rep = item.rep;
                  return (
                    <TableRow key={rep.id} className="hover:bg-slate-50/70">
                      <TableCell>
                        <div className="font-bold text-slate-900">{rep.name}</div>
                        <div className="text-[10px] text-slate-400">{rep.email || rep.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-700 font-medium">{rep.areaName || 'Territory'}</div>
                        <div className="text-[10px] text-slate-400">{rep.assignedCustomersCount || 14} Dealers</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono font-extrabold text-amber-900 text-sm">
                          {formatCurrency(item.totalCashInHand)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.cashInHandCount} receipts · {item.targetInvoicesCount} invoices
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.overdueCount > 0 ? (
                          <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse gap-1">
                            <AlertCircle className="h-3 w-3" /> Overdue &gt;24h ({item.overdueCount})
                          </Badge>
                        ) : item.totalCashInHand > 0 ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold gap-1">
                            <Clock className="h-3 w-3" /> Due &lt;24h
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Fully Cleared
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-800">
                        {formatCurrency(item.totalPendingHandover)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(item.totalApproved)}
                      </TableCell>
                      <TableCell>
                        {item.lastHandover ? (
                          <div className="text-slate-700">
                            <div>{formatDate(item.lastHandover.submittedAt)}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatCurrency(item.lastHandover.totalAmount)}
                            </div>
                          </div>
                        ) : (
                          <span className="italic text-slate-400 text-[10px]">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => onSelectRep(rep, 'CASH_IN_HAND')}
                            className="h-7 px-2.5 text-xs font-bold rounded-lg shadow-2xs gap-1"
                          >
                            <Eye className="h-3 w-3" /> Inspect
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectRep(rep, 'HANDOVERS')}
                            className="h-7 px-2 text-xs font-semibold rounded-lg"
                            title="View Handover History"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      )}
    </div>
  );
}

