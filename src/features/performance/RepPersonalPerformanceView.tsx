import React, { useState, useEffect, useMemo } from 'react';
import { commissionService } from '../../services/CommissionService';
import { RepPersonalPerformanceData } from '../../types/commission';
import { SchemeProgressTracker } from './SchemeProgressTracker';
import { formatCurrency } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  TrendingUp,
  Target,
  Banknote,
  Award,
  Search,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
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

  // Detail tab state
  const [activeTab, setActiveTab] = useState<'invoices' | 'collections'>('invoices');
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [collectionSearch, setCollectionSearch] = useState<string>('');

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
          setError(err?.message || 'Failed to load personal performance records.');
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
    if (!invoiceSearch.trim()) return data.qualifyingInvoices;
    const q = invoiceSearch.toLowerCase();
    return data.qualifyingInvoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q)
    );
  }, [data?.qualifyingInvoices, invoiceSearch]);

  const filteredCollections = useMemo(() => {
    if (!data?.clearedCollectionsList) return [];
    if (!collectionSearch.trim()) return data.clearedCollectionsList;
    const q = collectionSearch.toLowerCase();
    return data.clearedCollectionsList.filter(
      (col) =>
        col.paymentNumber.toLowerCase().includes(q) ||
        col.customerName.toLowerCase().includes(q) ||
        col.paymentMethod.toLowerCase().includes(q)
    );
  }, [data?.clearedCollectionsList, collectionSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-xs text-slate-500 font-medium">Loading personal performance ledger...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-2">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-rose-900">Performance Data Unavailable</p>
        <p className="text-xs text-rose-600">{error || 'Could not locate representative records.'}</p>
      </div>
    );
  }

  const {
    salesRepName,
    targetAmount,
    actualSales,
    achievementPercentage,
    clearedCollections,
    earnedCommission,
    roleConfig,
    breakdown,
  } = data;

  const isTargetMet = achievementPercentage >= 100;
  const isSuperAchiever = achievementPercentage >= 120;

  return (
    <div className={`space-y-6 ${isDrawer ? 'pb-6' : ''}`}>
      {/* Overview Context Badge / Header */}
      {!isDrawer && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                <Award className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold tracking-tight">Personal Incentive Desk</h2>
            </div>
            <p className="text-xs text-slate-300">
              Logged in as <strong className="text-white">{salesRepName}</strong> | Period:{' '}
              <span className="font-semibold text-indigo-200">{month}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 font-medium text-xs">
              <ShieldCheck className="h-3 w-3 mr-1 inline" /> Strict Data Isolation Active
            </Badge>
          </div>
        </div>
      )}

      {/* 3 KPI CARDS (NO RANKINGS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: My Sales vs Target */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                My Sales vs. Target
              </span>
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Target className="h-4 w-4" />
              </span>
            </div>

            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(actualSales)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <span>Target: {formatCurrency(targetAmount)}</span>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-bold ${
                    isSuperAchiever
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : isTargetMet
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : achievementPercentage >= 80
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {achievementPercentage}% Pace
                </Badge>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isSuperAchiever
                    ? 'bg-purple-600'
                    : isTargetMet
                    ? 'bg-emerald-500'
                    : achievementPercentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(achievementPercentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: My Cleared Collections */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                My Cleared Collections
              </span>
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Banknote className="h-4 w-4" />
              </span>
            </div>

            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(clearedCollections)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.clearedCollectionsList.length} verified payments settled this month
              </p>
            </div>

            <div className="pt-2 text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              100% Verified Dealer Receipts
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Earned Commission (Current Tier / Payout) */}
        <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Earned Commission
              </span>
              <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>

            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(earnedCommission)}
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium truncate">
                {breakdown.rateOrTierApplied || 'Monthly Incentive'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Badge
                className={
                  earnedCommission > 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[11px]'
                    : 'bg-slate-100 text-slate-600 border-slate-200 text-[11px]'
                }
              >
                {earnedCommission > 0 ? 'Approved for Payroll' : 'Milestone In Progress'}
              </Badge>
              <span className="text-[11px] text-slate-400 font-medium">Disbursed End-of-Month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SCHEME PROGRESS TRACKER */}
      <SchemeProgressTracker
        actualSales={actualSales}
        clearedCollections={clearedCollections}
        targetAmount={targetAmount}
        roleConfig={roleConfig}
        breakdown={breakdown}
      />

      {/* DETAIL TABS: My Qualifying Invoices & My Cleared Collections */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 pt-3 bg-slate-50/70">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'invoices'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="h-4 w-4" />
              My Qualifying Invoices ({data.qualifyingInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('collections')}
              className={`pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'collections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Banknote className="h-4 w-4" />
              My Cleared Collections ({data.clearedCollectionsList.length})
            </button>
          </div>
        </div>

        {/* Tab Content: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filter by invoice # or dealer..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Total Sales Recognized: <strong className="text-slate-900">{formatCurrency(actualSales)}</strong>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/90">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">Invoice #</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Date</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Customer Account</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Invoice Amount</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Commissionable</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        No qualifying invoices found for this search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-semibold text-xs text-indigo-600">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{inv.issueDate}</TableCell>
                        <TableCell className="text-xs text-slate-800 font-medium">{inv.customerName}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900 text-right">
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 text-right">
                          {formatCurrency(inv.commissionableAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-medium ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Tab Content: COLLECTIONS */}
        {activeTab === 'collections' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filter by receipt #, customer, method..."
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Total Collections Verified: <strong className="text-slate-900">{formatCurrency(clearedCollections)}</strong>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/90">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">Receipt / Ref #</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Collection Date</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Customer Account</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Payment Method</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Amount Cleared</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        No cleared collections found for this search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCollections.map((col) => (
                      <TableRow key={col.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-semibold text-xs text-emerald-700">
                          {col.paymentNumber}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{col.collectedAt}</TableCell>
                        <TableCell className="text-xs text-slate-800 font-medium">{col.customerName}</TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <Badge variant="outline" className="text-[10px] font-normal border-slate-300">
                            {col.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-600 text-right">
                          {formatCurrency(col.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                            {col.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
