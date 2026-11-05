import React, { useState, useEffect, useMemo } from 'react';
import { commissionService } from '../../services/CommissionService';
import { RepPersonalPerformanceData } from '../../types/commission';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  Banknote,
  Search,
  Receipt,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Percent,
  Coins,
  FileText,
} from 'lucide-react';

interface RepPersonalPerformanceViewProps {
  repId: string;
  month: string;
  isDrawer?: boolean;
}

export function RepPersonalPerformanceView({
  repId,
  month,
  isDrawer = false,
}: RepPersonalPerformanceViewProps) {
  const [data, setData] = useState<RepPersonalPerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const result = await commissionService.getRepPerformance(repId, month);
        if (isMounted) {
          setData(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load sales and cash collection records.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [repId, month]);

  const filteredInvoices = useMemo(() => {
    if (!data?.qualifyingInvoices) return [];
    return data.qualifyingInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'ALL' ? true : inv.collectionStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.qualifyingInvoices, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Computing sales and cash collection balances...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-xl text-center space-y-2">
        <AlertCircle className="h-6 w-6 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-900">Performance Data Unavailable</p>
        <p className="text-xs text-rose-600">{error || 'Could not locate representative records.'}</p>
      </div>
    );
  }

  const {
    salesRepName,
    actualSales,
    clearedCollections,
    uncollectedCash,
    cashRealizationPercentage,
    incentiveRatePercentage,
    earnedCommission,
    potentialIncentiveInPipeline,
  } = data;

  return (
    <div className={`space-y-6 ${isDrawer ? 'pb-4' : ''}`}>
      {/* Overview Context Header (Non-Drawer View) */}
      {!isDrawer && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Personal Sales & Cash Incentive Statement
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Representative: <strong className="text-slate-800">{salesRepName}</strong> | Accounting Period: <span className="font-medium text-slate-700">{month}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600 bg-slate-50">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600 inline" /> Isolated Representative Ledger
            </Badge>
          </div>
        </div>
      )}

      {/* 3 CLEAN KPI CARDS (Sales -> Cash -> Incentive) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Sales Generated */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
            1. Sales Generated
            <Receipt className="h-4 w-4 text-slate-400" />
          </span>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(actualSales)}
          </div>
          <p className="text-xs text-slate-500">
            Total invoiced sales volume across {data.qualifyingInvoices.length} orders
          </p>
        </div>

        {/* Card 2: Collected Cash */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              2. Collected Cash
            </span>
            <span className="text-xs font-semibold text-indigo-700">
              {cashRealizationPercentage}% Realized
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(clearedCollections)}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(cashRealizationPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Earned Cash Incentive */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              3. Earned Cash Incentive
            </span>
            <Badge variant="outline" className="text-[11px] font-medium border-slate-200 text-slate-700 bg-slate-50">
              {incentiveRatePercentage}% on Cash
            </Badge>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(earnedCommission)}
          </div>
          <p className="text-xs text-slate-500">
            Calculated as {incentiveRatePercentage}% of collected cash
          </p>
        </div>
      </div>

      {/* INCENTIVE CONVERSION NOTE */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            <strong>Incentive Rule:</strong> You receive <strong>{incentiveRatePercentage}%</strong> cash incentive on all cleared dealer payments. 
            {uncollectedCash > 0 ? (
              <span> Collecting the remaining <strong className="text-slate-800">{formatCurrency(uncollectedCash)}</strong> outstanding balance unlocks an additional <strong className="text-emerald-700">+{formatCurrency(potentialIncentiveInPipeline)}</strong> in earned commission.</span>
            ) : (
              <span> All invoices for this period have been fully settled in cash.</span>
            )}
          </span>
        </div>
      </div>

      {/* UNIFIED SALES & CASH COLLECTION LEDGER (Single, Cohesive Table) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Header & Search Filter */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Sales & Cash Collection Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoice deal amounts, collected cash, and individual incentive yield.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoice or dealer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 h-9 text-xs border-slate-200"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by collection status"
              className="h-9 text-xs rounded-md border border-slate-200 bg-white px-2.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Invoices</option>
              <option value="FULLY_COLLECTED">Fully Settled</option>
              <option value="PARTIALLY_COLLECTED">Partially Paid</option>
              <option value="UNCOLLECTED">Pending Collection</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow className="border-b border-slate-200">
                <TableHead className="text-xs font-semibold text-slate-600">Invoice #</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Dealer Account</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">Sale Amount</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">Collected Cash</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">Outstanding</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 min-w-32">Collection %</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">Incentive ({incentiveRatePercentage}%)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-500">
                    No records found matching your filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{inv.issueDate}</TableCell>
                    <TableCell className="text-xs text-slate-800 font-medium">{inv.customerName}</TableCell>

                    <TableCell className="text-xs font-medium text-slate-900 text-right">
                      {formatCurrency(inv.totalAmount)}
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-slate-900 text-right">
                      {formatCurrency(inv.collectedCash)}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 text-right">
                      {formatCurrency(inv.outstandingAmount)}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>{inv.collectionPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              inv.collectionStatus === 'FULLY_COLLECTED'
                                ? 'bg-emerald-600'
                                : inv.collectionStatus === 'PARTIALLY_COLLECTED'
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${inv.collectionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-bold text-emerald-600 text-right">
                      {formatCurrency(inv.earnedIncentive)}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal border-slate-200 ${
                          inv.collectionStatus === 'FULLY_COLLECTED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.collectionStatus === 'PARTIALLY_COLLECTED'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        {inv.collectionStatus === 'FULLY_COLLECTED'
                          ? 'Settled'
                          : inv.collectionStatus === 'PARTIALLY_COLLECTED'
                          ? 'Partial'
                          : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Ledger Summary Footer */}
        <div className="bg-slate-50/80 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>Total Sales: <strong className="text-slate-900">{formatCurrency(actualSales)}</strong></span>
            <span>•</span>
            <span>Cash Collected: <strong className="text-slate-900">{formatCurrency(clearedCollections)}</strong> ({cashRealizationPercentage}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Total Incentive Earned:</span>
            <span className="text-sm font-bold text-emerald-600">{formatCurrency(earnedCommission)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
