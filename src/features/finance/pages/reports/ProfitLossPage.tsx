import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { ProfitLossReport } from '../../api/types';
import { ReportDateFilterBar, DateFilterState } from './ReportDateFilterBar';
import { ReportHeaderNav } from './ReportHeaderNav';
import { CorporateReportHeader } from '../../components/CorporateReportHeader';
import { CorporateSignatureBlock } from '../../components/CorporateSignatureBlock';
import { reportPdfService } from '../../services/reportPdfService';
import { formatCurrency, formatPercentage } from '../../../../utils/formatters';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ChevronDown,
  ChevronRight,
  GitCompare,
  Printer,
  FileDown,
} from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

function computePriorPeriod(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const priorEnd = new Date(start);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - diffDays + 1);
  return {
    startDate: priorStart.toISOString().slice(0, 10),
    endDate: priorEnd.toISOString().slice(0, 10),
  };
}

function calculateVariance(current: number, prior: number) {
  const diff = Number((current - prior).toFixed(2));
  if (prior === 0) {
    if (current === 0) return { diff: 0, percent: 0, label: '0.0%' };
    return { diff, percent: current > 0 ? 100 : -100, label: current > 0 ? '+100.0%' : '-100.0%' };
  }
  const pct = Number(((diff / Math.abs(prior)) * 100).toFixed(1));
  const sign = pct > 0 ? '+' : '';
  return { diff, percent: pct, label: `${sign}${pct.toFixed(1)}%` };
}

export function ProfitLossPage() {
  const { getProfitLoss } = useFinanceLedger();
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [priorReport, setPriorReport] = useState<ProfitLossReport | null>(null);
  const [comparePrior, setComparePrior] = useState<boolean>(false);

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_MONTH',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });

  const [priorDateFilter, setPriorDateFilter] = useState<{ startDate: string; endDate: string }>(
    () => computePriorPeriod('2026-09-01', '2026-09-30')
  );

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    cogs: true,
    expenses: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const loadReport = useCallback(async () => {
    const data = await getProfitLoss({
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    });
    setReport(data);

    if (comparePrior) {
      const priorData = await getProfitLoss({
        startDate: priorDateFilter.startDate,
        endDate: priorDateFilter.endDate,
      });
      setPriorReport(priorData);
    } else {
      setPriorReport(null);
    }
  }, [getProfitLoss, dateFilter.startDate, dateFilter.endDate, comparePrior, priorDateFilter.startDate, priorDateFilter.endDate]);

  useEffect(() => {
    setPriorDateFilter(computePriorPeriod(dateFilter.startDate, dateFilter.endDate));
  }, [dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const grossMarginPercent =
    report && report.totalRevenue > 0
      ? (report.grossProfit / report.totalRevenue) * 100
      : 0;

  const netMarginPercent =
    report && report.totalRevenue > 0
      ? (report.netOperatingProfit / report.totalRevenue) * 100
      : 0;

  const handlePrint = () => {
    reportPdfService.triggerPrint(`DNS_Profit_Loss_${dateFilter.startDate}_to_${dateFilter.endDate}`);
  };

  // Helper maps for prior period item lookups
  const priorRevenueMap = new Map((priorReport?.revenueItems || []).map((i) => [i.accountId, i.amount]));
  const priorCogsMap = new Map((priorReport?.cogsItems || []).map((i) => [i.accountId, i.amount]));
  const priorExpenseMap = new Map((priorReport?.expenseItems || []).map((i) => [i.accountId, i.amount]));

  const revVariance = calculateVariance(report?.totalRevenue || 0, priorReport?.totalRevenue || 0);
  const cogsVariance = calculateVariance(report?.totalCogs || 0, priorReport?.totalCogs || 0);
  const grossProfitVariance = calculateVariance(report?.grossProfit || 0, priorReport?.grossProfit || 0);
  const opexVariance = calculateVariance(report?.totalOperatingExpenses || 0, priorReport?.totalOperatingExpenses || 0);
  const netProfitVariance = calculateVariance(report?.netOperatingProfit || 0, priorReport?.netOperatingProfit || 0);

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <div className="print:hidden">
        <ReportHeaderNav />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Profit & Loss (P&L) Statement</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Income Statement
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time financial performance statement showing gross revenues, landed COGS, and true net operating profits.
          </p>
        </div>
      </div>

      {/* Corporate Report Header */}
      <CorporateReportHeader
        title="Statement of Comprehensive Income (Profit & Loss)"
        subtitle="Real-time financial performance statement showing gross revenues, landed COGS, and true net operating profits."
        periodLabel={`Current Period: ${dateFilter.startDate} to ${dateFilter.endDate}${
          comparePrior ? ` | Prior Period: ${priorDateFilter.startDate} to ${priorDateFilter.endDate}` : ''
        }`}
      />

      {/* Action Controls & Compare Toggle Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-2xs print:hidden">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={comparePrior}
              onChange={(e) => setComparePrior(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
            />
            <GitCompare className="h-4 w-4 text-primary" />
            <span>Compare with Prior Period</span>
          </label>

          {comparePrior && (
            <div className="flex items-center gap-2 text-xs text-slate-600 animate-in fade-in-50">
              <span className="text-[11px] font-medium text-slate-400">Prior:</span>
              <Input
                type="date"
                value={priorDateFilter.startDate}
                onChange={(e) => setPriorDateFilter((p) => ({ ...p, startDate: e.target.value }))}
                className="h-7 text-xs w-32"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={priorDateFilter.endDate}
                onChange={(e) => setPriorDateFilter((p) => ({ ...p, endDate: e.target.value }))}
                className="h-7 text-xs w-32"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 text-xs text-slate-700 font-semibold"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Statement</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary-hover text-white font-semibold"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export Native PDF</span>
          </Button>
        </div>
      </div>

      {/* Standard Date Filter Bar */}
      <ReportDateFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        onPrint={handlePrint}
        reportTitle="Profit_and_Loss_Statement"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatCurrency(report?.totalRevenue || 0)}
            </span>
            {comparePrior && (
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold ${
                  revVariance.diff >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Δ {revVariance.label}
              </Badge>
            )}
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Gross Profit</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                {formatCurrency(report?.grossProfit || 0)}
              </span>
              <span className="text-xs font-semibold text-primary ml-1.5">
                ({formatPercentage(grossMarginPercent)} Margin)
              </span>
            </div>
            {comparePrior && (
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold ${
                  grossProfitVariance.diff >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Δ {grossProfitVariance.label}
              </Badge>
            )}
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Net Operating Profit</span>
            <PieChart className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-semibold text-emerald-700 tabular-nums">
                {formatCurrency(report?.netOperatingProfit || 0)}
              </span>
              <span className="text-xs font-semibold text-emerald-600 ml-1.5">
                ({formatPercentage(netMarginPercent)} Margin)
              </span>
            </div>
            {comparePrior && (
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold ${
                  netProfitVariance.diff >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Δ {netProfitVariance.label}
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Structured Statement Table */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Statement of Financial Performance ({dateFilter.startDate} to {dateFilter.endDate})
          </h2>
          {comparePrior && (
            <span className="text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded border border-primary-border">
              Variance Active (Prior: {priorDateFilter.startDate} to {priorDateFilter.endDate})
            </span>
          )}
        </div>

        {/* Comparative Table Header */}
        <div className="border-b border-slate-200 bg-slate-100/70 px-6 py-2.5 grid grid-cols-12 text-[11px] font-bold uppercase tracking-wider text-slate-600">
          <div className={comparePrior ? 'col-span-5' : 'col-span-8'}>Account / Category</div>
          <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right`}>Current Period (LKR)</div>
          {comparePrior && (
            <>
              <div className="col-span-2 text-right">Prior Period (LKR)</div>
              <div className="col-span-2 text-right">Variance (Δ%)</div>
            </>
          )}
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* 1. Operating Revenue */}
          <div className="p-6 space-y-3">
            <div
              onClick={() => toggleSection('revenue')}
              className="grid grid-cols-12 items-center text-sm font-semibold text-slate-900 cursor-pointer select-none hover:text-primary transition-colors"
            >
              <div className={`${comparePrior ? 'col-span-5' : 'col-span-8'} flex items-center gap-2`}>
                {expandedSections.revenue ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
                <span className="text-indigo-900 font-semibold">1. Operating Revenue</span>
              </div>
              <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono tabular-nums`}>
                {formatCurrency(report?.totalRevenue || 0)}
              </div>
              {comparePrior && (
                <>
                  <div className="col-span-2 text-right font-mono tabular-nums text-slate-600">
                    {formatCurrency(priorReport?.totalRevenue || 0)}
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold tabular-nums">
                    <span className={revVariance.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {revVariance.label}
                    </span>
                  </div>
                </>
              )}
            </div>

            {expandedSections.revenue && (
              <div className="pl-6 space-y-1.5 text-slate-600 animate-in fade-in-50">
                {report?.revenueItems.length === 0 ? (
                  <div className="text-slate-400 italic">No revenue recorded in selected date range.</div>
                ) : (
                  report?.revenueItems.map((item) => {
                    const priorAmt = priorRevenueMap.get(item.accountId) || 0;
                    const variance = calculateVariance(item.amount, priorAmt);
                    return (
                      <div key={item.accountId} className="grid grid-cols-12 items-center py-1 border-b border-slate-50">
                        <div className={comparePrior ? 'col-span-5' : 'col-span-8'}>
                          <Link
                            to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                            className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                          >
                            <span className="font-mono text-primary font-semibold">{item.code}</span>
                            <span className="font-medium text-slate-900">{item.accountName}</span>
                          </Link>
                        </div>
                        <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono font-medium text-slate-800 tabular-nums`}>
                          {formatCurrency(item.amount)}
                        </div>
                        {comparePrior && (
                          <>
                            <div className="col-span-2 text-right font-mono text-slate-500 tabular-nums">
                              {formatCurrency(priorAmt)}
                            </div>
                            <div className="col-span-2 text-right font-mono tabular-nums">
                              <span className={variance.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {variance.label}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 2. Cost of Goods Sold */}
          <div className="p-6 space-y-3 bg-slate-50/40">
            <div
              onClick={() => toggleSection('cogs')}
              className="grid grid-cols-12 items-center text-sm font-semibold text-slate-900 cursor-pointer select-none hover:text-primary transition-colors"
            >
              <div className={`${comparePrior ? 'col-span-5' : 'col-span-8'} flex items-center gap-2`}>
                {expandedSections.cogs ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
                <span className="text-slate-800 font-semibold">2. Direct Cost of Goods Sold (COGS)</span>
              </div>
              <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono text-slate-800 tabular-nums`}>
                ({formatCurrency(report?.totalCogs || 0)})
              </div>
              {comparePrior && (
                <>
                  <div className="col-span-2 text-right font-mono text-slate-600 tabular-nums">
                    ({formatCurrency(priorReport?.totalCogs || 0)})
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold tabular-nums">
                    <span className={cogsVariance.diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {cogsVariance.label}
                    </span>
                  </div>
                </>
              )}
            </div>

            {expandedSections.cogs && (
              <div className="pl-6 space-y-1.5 text-slate-600 animate-in fade-in-50">
                {report?.cogsItems.length === 0 ? (
                  <div className="text-slate-400 italic">No COGS recognized in period.</div>
                ) : (
                  report?.cogsItems.map((item) => {
                    const priorAmt = priorCogsMap.get(item.accountId) || 0;
                    const variance = calculateVariance(item.amount, priorAmt);
                    return (
                      <div key={item.accountId} className="grid grid-cols-12 items-center py-1 border-b border-slate-50">
                        <div className={comparePrior ? 'col-span-5' : 'col-span-8'}>
                          <Link
                            to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                            className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                          >
                            <span className="font-mono text-primary font-semibold">{item.code}</span>
                            <span className="font-medium text-slate-900">{item.accountName}</span>
                          </Link>
                        </div>
                        <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono font-medium text-slate-800 tabular-nums`}>
                          {formatCurrency(item.amount)}
                        </div>
                        {comparePrior && (
                          <>
                            <div className="col-span-2 text-right font-mono text-slate-500 tabular-nums">
                              {formatCurrency(priorAmt)}
                            </div>
                            <div className="col-span-2 text-right font-mono tabular-nums">
                              <span className={variance.diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {variance.label}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Gross Profit Subtotal */}
          <div className="px-6 py-4 bg-primary-light/50 grid grid-cols-12 items-center text-sm font-semibold text-indigo-950 border-y border-primary-border/40">
            <div className={comparePrior ? 'col-span-5' : 'col-span-8'}>
              Gross Operating Profit (Revenue − COGS)
            </div>
            <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono text-base tabular-nums font-semibold`}>
              {formatCurrency(report?.grossProfit || 0)}
            </div>
            {comparePrior && (
              <>
                <div className="col-span-2 text-right font-mono text-base text-slate-600 tabular-nums">
                  {formatCurrency(priorReport?.grossProfit || 0)}
                </div>
                <div className="col-span-2 text-right font-mono text-base font-bold tabular-nums">
                  <span className={grossProfitVariance.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {grossProfitVariance.label}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 3. Operating Expenses */}
          <div className="p-6 space-y-3">
            <div
              onClick={() => toggleSection('expenses')}
              className="grid grid-cols-12 items-center text-sm font-semibold text-slate-900 cursor-pointer select-none hover:text-primary transition-colors"
            >
              <div className={`${comparePrior ? 'col-span-5' : 'col-span-8'} flex items-center gap-2`}>
                {expandedSections.expenses ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
                <span className="text-rose-900 font-semibold">3. Operating Expenses &amp; Overheads</span>
              </div>
              <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono text-rose-700 tabular-nums`}>
                ({formatCurrency(report?.totalOperatingExpenses || 0)})
              </div>
              {comparePrior && (
                <>
                  <div className="col-span-2 text-right font-mono text-rose-600/80 tabular-nums">
                    ({formatCurrency(priorReport?.totalOperatingExpenses || 0)})
                  </div>
                  <div className="col-span-2 text-right font-mono font-bold tabular-nums">
                    <span className={opexVariance.diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {opexVariance.label}
                    </span>
                  </div>
                </>
              )}
            </div>

            {expandedSections.expenses && (
              <div className="pl-6 space-y-1.5 text-slate-600 animate-in fade-in-50">
                {report?.expenseItems.length === 0 ? (
                  <div className="text-slate-400 italic">No operating expenses in period.</div>
                ) : (
                  report?.expenseItems.map((item) => {
                    const priorAmt = priorExpenseMap.get(item.accountId) || 0;
                    const variance = calculateVariance(item.amount, priorAmt);
                    return (
                      <div key={item.accountId} className="grid grid-cols-12 items-center py-1 border-b border-slate-50">
                        <div className={comparePrior ? 'col-span-5' : 'col-span-8'}>
                          <Link
                            to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                            className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                          >
                            <span className="font-mono text-primary font-semibold">{item.code}</span>
                            <span className="font-medium text-slate-900">{item.accountName}</span>
                          </Link>
                        </div>
                        <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono font-medium text-slate-800 tabular-nums`}>
                          {formatCurrency(item.amount)}
                        </div>
                        {comparePrior && (
                          <>
                            <div className="col-span-2 text-right font-mono text-slate-500 tabular-nums">
                              {formatCurrency(priorAmt)}
                            </div>
                            <div className="col-span-2 text-right font-mono tabular-nums">
                              <span className={variance.diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {variance.label}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Net Operating Profit Final Total */}
          <div className="px-6 py-5 bg-emerald-50 grid grid-cols-12 items-center text-base font-semibold text-emerald-950 border-t-2 border-emerald-300">
            <div className={`${comparePrior ? 'col-span-5' : 'col-span-8'} flex items-center gap-2`}>
              <span>Net Operating Profit (Bottom Line)</span>
              <Badge className="bg-emerald-200 text-emerald-900 border-none text-xs font-medium">
                Audited Output
              </Badge>
            </div>
            <div className={`${comparePrior ? 'col-span-3' : 'col-span-4'} text-right font-mono text-xl text-emerald-800 tabular-nums font-semibold`}>
              {formatCurrency(report?.netOperatingProfit || 0)}
            </div>
            {comparePrior && (
              <>
                <div className="col-span-2 text-right font-mono text-xl text-emerald-700/80 tabular-nums">
                  {formatCurrency(priorReport?.netOperatingProfit || 0)}
                </div>
                <div className="col-span-2 text-right font-mono text-xl font-bold tabular-nums">
                  <span className={netProfitVariance.diff >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                    {netProfitVariance.label}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Corporate Sign-Off Block */}
      <CorporateSignatureBlock date={dateFilter.endDate} />
    </div>
  );
}
