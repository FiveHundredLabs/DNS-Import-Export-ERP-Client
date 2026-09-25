import { useState, useEffect, useCallback } from 'react';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { ProfitLossReport } from '../../api/types';
import { ReportDateFilterBar, DateFilterState } from './ReportDateFilterBar';
import { ReportHeaderNav } from './ReportHeaderNav';
import { formatCurrency, formatPercentage } from '../../../../utils/formatters';
import { TrendingUp, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';

export function ProfitLossPage() {
  const { getProfitLoss, loading } = useFinanceLedger();
  const [report, setReport] = useState<ProfitLossReport | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_MONTH',
    startDate: '2026-09-01',
    endDate: new Date().toISOString().slice(0, 10),
  });

  const loadReport = useCallback(async () => {
    const data = await getProfitLoss({
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    });
    setReport(data);
  }, [getProfitLoss, dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const grossMarginPercent = report && report.totalRevenue > 0
    ? (report.grossProfit / report.totalRevenue) * 100
    : 0;

  const netMarginPercent = report && report.totalRevenue > 0
    ? (report.netOperatingProfit / report.totalRevenue) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <ReportHeaderNav />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profit & Loss (P&L) Statement</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Income Statement
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time financial performance statement showing gross revenues, landed COGS, and true net operating profits.
          </p>
        </div>
      </div>

      {/* Date Filter & Export Bar */}
      <ReportDateFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        reportTitle="Profit_and_Loss_Statement"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(report?.totalRevenue || 0)}
            </span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Profit</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(report?.grossProfit || 0)}
            </span>
            <span className="text-xs font-semibold text-primary">
              ({formatPercentage(grossMarginPercent)} Margin)
            </span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Operating Profit</span>
            <PieChart className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {formatCurrency(report?.netOperatingProfit || 0)}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              ({formatPercentage(netMarginPercent)} Margin)
            </span>
          </div>
        </Card>
      </div>

      {/* Structured Statement Table */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Statement of Financial Performance ({dateFilter.startDate} to {dateFilter.endDate})
          </h2>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* 1. Operating Revenue */}
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span className="text-indigo-900 uppercase tracking-wider">1. Operating Revenue</span>
              <span className="font-mono">{formatCurrency(report?.totalRevenue || 0)}</span>
            </div>

            <div className="pl-4 space-y-1.5 text-slate-600">
              {report?.revenueItems.length === 0 ? (
                <div className="text-slate-400 italic">No revenue recorded in selected date range.</div>
              ) : (
                report?.revenueItems.map((item) => (
                  <div key={item.accountId} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-primary font-semibold">{item.code}</span>
                      <span>{item.accountName}</span>
                    </span>
                    <span className="font-mono font-medium text-slate-800">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Cost of Goods Sold */}
          <div className="p-6 space-y-3 bg-slate-50/40">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span className="text-slate-800 uppercase tracking-wider">2. Direct Cost of Goods Sold (COGS)</span>
              <span className="font-mono text-slate-800">({formatCurrency(report?.totalCogs || 0)})</span>
            </div>

            <div className="pl-4 space-y-1.5 text-slate-600">
              {report?.cogsItems.length === 0 ? (
                <div className="text-slate-400 italic">No COGS recognized in period.</div>
              ) : (
                report?.cogsItems.map((item) => (
                  <div key={item.accountId} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-primary font-semibold">{item.code}</span>
                      <span>{item.accountName}</span>
                    </span>
                    <span className="font-mono font-medium text-slate-800">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gross Profit Subtotal */}
          <div className="px-6 py-4 bg-primary-light/50 flex justify-between items-center text-sm font-bold text-indigo-950 border-y border-primary-border/40">
            <span className="uppercase tracking-wider">Gross Operating Profit (Revenue − COGS)</span>
            <span className="font-mono text-base">{formatCurrency(report?.grossProfit || 0)}</span>
          </div>

          {/* 3. Operating Expenses */}
          <div className="p-6 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span className="text-rose-900 uppercase tracking-wider">3. Operating Expenses & Overheads</span>
              <span className="font-mono text-rose-700">({formatCurrency(report?.totalOperatingExpenses || 0)})</span>
            </div>

            <div className="pl-4 space-y-1.5 text-slate-600">
              {report?.expenseItems.length === 0 ? (
                <div className="text-slate-400 italic">No operating expenses in period.</div>
              ) : (
                report?.expenseItems.map((item) => (
                  <div key={item.accountId} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-primary font-semibold">{item.code}</span>
                      <span>{item.accountName}</span>
                    </span>
                    <span className="font-mono font-medium text-slate-800">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Net Operating Profit Final Total */}
          <div className="px-6 py-5 bg-emerald-50 flex justify-between items-center text-base font-bold text-emerald-950 border-t-2 border-emerald-300">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wider">Net Operating Profit (Bottom Line)</span>
              <Badge className="bg-emerald-200 text-emerald-900 border-none text-[10px]">
                Audited Ledger Output
              </Badge>
            </div>
            <span className="font-mono text-xl text-emerald-800">
              {formatCurrency(report?.netOperatingProfit || 0)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
