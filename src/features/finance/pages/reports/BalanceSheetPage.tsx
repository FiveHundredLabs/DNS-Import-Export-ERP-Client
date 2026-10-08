import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { BalanceSheetReport } from '../../api/types';
import { ReportHeaderNav } from './ReportHeaderNav';
import { CorporateReportHeader } from '../../components/CorporateReportHeader';
import { CorporateSignatureBlock } from '../../components/CorporateSignatureBlock';
import { reportPdfService } from '../../services/reportPdfService';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  GitCompare,
  FileDown,
} from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

function computePriorDate(asOfDate: string): string {
  const d = new Date(asOfDate);
  // Default to end of prior month
  d.setDate(0);
  return d.toISOString().slice(0, 10);
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

export function BalanceSheetPage() {
  const { getBalanceSheet } = useFinanceLedger();
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [priorReport, setPriorReport] = useState<BalanceSheetReport | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [comparePrior, setComparePrior] = useState<boolean>(false);
  const [priorAsOfDate, setPriorAsOfDate] = useState<string>(() =>
    computePriorDate(new Date().toISOString().slice(0, 10))
  );

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    currentAssets: true,
    nonCurrentAssets: true,
    currentLiabilities: true,
    longTermLiabilities: true,
    equity: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const loadReport = useCallback(async () => {
    const data = await getBalanceSheet(asOfDate);
    setReport(data);

    if (comparePrior) {
      const priorData = await getBalanceSheet(priorAsOfDate);
      setPriorReport(priorData);
    } else {
      setPriorReport(null);
    }
  }, [getBalanceSheet, asOfDate, comparePrior, priorAsOfDate]);

  useEffect(() => {
    setPriorAsOfDate(computePriorDate(asOfDate));
  }, [asOfDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => {
    reportPdfService.triggerPrint(`DNS_Balance_Sheet_${asOfDate}`);
  };

  // Helper lookups for prior balances
  const priorItemMap = new Map<string, number>();
  if (priorReport) {
    [
      ...priorReport.currentAssets,
      ...priorReport.nonCurrentAssets,
      ...priorReport.currentLiabilities,
      ...priorReport.longTermLiabilities,
      ...priorReport.equityItems,
    ].forEach((i) => priorItemMap.set(i.accountId, i.amount));
  }

  const assetsVariance = calculateVariance(report?.totalAssets || 0, priorReport?.totalAssets || 0);
  const liabEqVariance = calculateVariance(
    report?.totalLiabilitiesAndEquity || 0,
    priorReport?.totalLiabilitiesAndEquity || 0
  );
  const curAssetsVariance = calculateVariance(
    report?.totalCurrentAssets || 0,
    priorReport?.totalCurrentAssets || 0
  );
  const nonCurAssetsVariance = calculateVariance(
    report?.totalNonCurrentAssets || 0,
    priorReport?.totalNonCurrentAssets || 0
  );
  const curLiabVariance = calculateVariance(
    report?.totalCurrentLiabilities || 0,
    priorReport?.totalCurrentLiabilities || 0
  );
  const equityVariance = calculateVariance(
    report?.totalEquity || 0,
    priorReport?.totalEquity || 0
  );

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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Balance Sheet Statement</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Statement of Financial Position
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time balance sheet proving standard accounting fundamental equation (Assets = Liabilities + Equity).
          </p>
        </div>
      </div>

      {/* Corporate Report Header (Statutory Legal Header - Active in Print / PDF view) */}
      <CorporateReportHeader
        showInWebPreview={false}
        title="Statement of Financial Position (Balance Sheet)"
        subtitle="Real-time balance sheet proving standard accounting fundamental equation (Assets = Liabilities + Equity)."
        periodLabel={`As of: ${asOfDate}${comparePrior ? ` | Prior As of: ${priorAsOfDate}` : ''}`}
      />

      {/* Controls & Compare Toggle Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-2xs print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600 font-medium">As of Date:</span>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>

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
            <div className="flex items-center gap-1.5 text-xs text-slate-600 animate-in fade-in-50">
              <span className="text-[11px] font-medium text-slate-400">Prior Date:</span>
              <Input
                type="date"
                value={priorAsOfDate}
                onChange={(e) => setPriorAsOfDate(e.target.value)}
                className="h-8 w-36 text-xs"
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

      {/* Real-Time Mathematical Integrity Status Bar */}
      <Card
        className={`p-4 border ${
          report?.isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                report?.isBalanced ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white animate-pulse'
              }`}
            >
              {report?.isBalanced ? (
                <Scale className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  {report?.isBalanced
                    ? 'Balance Sheet Reconciled (Assets = Liab + Equity)'
                    : 'Balance Sheet Discrepancy Detected'}
                </span>
                <Badge
                  variant="outline"
                  className={
                    report?.isBalanced
                      ? 'border-emerald-300 bg-white text-emerald-800 text-[10px]'
                      : 'border-rose-300 bg-white text-rose-800 text-[10px]'
                  }
                >
                  {report?.isBalanced ? 'Audit Verified' : 'Out of Balance'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {report?.isBalanced
                  ? `Assets of ${formatCurrency(report?.totalAssets || 0)} strictly match total liabilities and equity with zero variance.`
                  : `Discrepancy of ${formatCurrency(report?.discrepancy || 0)}. Total Assets (${formatCurrency(report?.totalAssets || 0)}) vs Total Liab+Equity (${formatCurrency(report?.totalLiabilitiesAndEquity || 0)}).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Total Balance Sheet Size
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {formatCurrency(report?.totalAssets || 0)}
              </span>
            </div>
            {comparePrior && (
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold ${
                  assetsVariance.diff >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Δ {assetsVariance.label}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Two Column Balance Sheet Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: ASSETS */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-2xs">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Assets (Economic Resources)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {formatCurrency(report?.totalAssets || 0)}
                </span>
                {comparePrior && (
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Δ {assetsVariance.label}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Current Assets */}
              <div className="space-y-2">
                <div
                  onClick={() => toggleSection('currentAssets')}
                  className="flex justify-between items-center font-semibold text-slate-800 border-b border-slate-100 pb-1 cursor-pointer select-none hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {expandedSections.currentAssets ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>Current Assets (Liquidity &amp; Working Capital)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold">{formatCurrency(report?.totalCurrentAssets || 0)}</span>
                    {comparePrior && (
                      <span className="text-[10px] text-slate-500">Δ {curAssetsVariance.label}</span>
                    )}
                  </div>
                </div>

                {expandedSections.currentAssets && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.currentAssets.length === 0 ? (
                      <div className="text-slate-400 italic">No current assets recorded.</div>
                    ) : (
                      report?.currentAssets.map((item) => {
                        const priorVal = priorItemMap.get(item.accountId) || 0;
                        const v = calculateVariance(item.amount, priorVal);
                        return (
                          <div key={item.accountId} className="flex justify-between items-center text-slate-600">
                            <Link
                              to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                              className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                            >
                              <span className="tabular-nums text-primary font-medium">{item.code}</span>
                              <span className="font-medium text-slate-900">{item.accountName}</span>
                            </Link>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums text-slate-800 font-medium">
                                {formatCurrency(item.amount)}
                              </span>
                              {comparePrior && (
                                <span className={`text-[10px] tabular-nums ${v.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({v.label})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Non-Current Assets */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div
                  onClick={() => toggleSection('nonCurrentAssets')}
                  className="flex justify-between items-center font-semibold text-slate-800 border-b border-slate-100 pb-1 cursor-pointer select-none hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {expandedSections.nonCurrentAssets ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>Non-Current Assets (Fixed Capital &amp; Equipment)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold">{formatCurrency(report?.totalNonCurrentAssets || 0)}</span>
                    {comparePrior && (
                      <span className="text-[10px] text-slate-500">Δ {nonCurAssetsVariance.label}</span>
                    )}
                  </div>
                </div>

                {expandedSections.nonCurrentAssets && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.nonCurrentAssets.length === 0 ? (
                      <div className="text-slate-400 italic">No non-current capital assets.</div>
                    ) : (
                      report?.nonCurrentAssets.map((item) => {
                        const priorVal = priorItemMap.get(item.accountId) || 0;
                        const v = calculateVariance(item.amount, priorVal);
                        return (
                          <div key={item.accountId} className="flex justify-between items-center text-slate-600">
                            <Link
                              to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                              className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                            >
                              <span className="tabular-nums text-primary font-medium">{item.code}</span>
                              <span className="font-medium text-slate-900">{item.accountName}</span>
                            </Link>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums text-slate-800 font-medium">
                                {formatCurrency(item.amount)}
                              </span>
                              {comparePrior && (
                                <span className={`text-[10px] tabular-nums ${v.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({v.label})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Total Assets Footnote */}
            <div className="border-t-2 border-slate-300 bg-slate-50 px-5 py-3 flex justify-between items-center text-sm font-semibold text-slate-900">
              <span className="uppercase tracking-wider">Total Assets</span>
              <span className="tabular-nums text-base font-semibold">
                {formatCurrency(report?.totalAssets || 0)}
              </span>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-2xs">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Liabilities &amp; Shareholder Equity
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {formatCurrency(report?.totalLiabilitiesAndEquity || 0)}
                </span>
                {comparePrior && (
                  <Badge variant="outline" className="text-[10px] font-bold">
                    Δ {liabEqVariance.label}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Current Liabilities */}
              <div className="space-y-2">
                <div
                  onClick={() => toggleSection('currentLiabilities')}
                  className="flex justify-between items-center font-semibold text-slate-800 border-b border-slate-100 pb-1 cursor-pointer select-none hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {expandedSections.currentLiabilities ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>Current Liabilities (Trade &amp; Statutory Payables)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold">{formatCurrency(report?.totalCurrentLiabilities || 0)}</span>
                    {comparePrior && (
                      <span className="text-[10px] text-slate-500">Δ {curLiabVariance.label}</span>
                    )}
                  </div>
                </div>

                {expandedSections.currentLiabilities && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.currentLiabilities.length === 0 ? (
                      <div className="text-slate-400 italic">No short-term liabilities.</div>
                    ) : (
                      report?.currentLiabilities.map((item) => {
                        const priorVal = priorItemMap.get(item.accountId) || 0;
                        const v = calculateVariance(item.amount, priorVal);
                        return (
                          <div key={item.accountId} className="flex justify-between items-center text-slate-600">
                            <Link
                              to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                              className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                            >
                              <span className="tabular-nums text-primary font-medium">{item.code}</span>
                              <span className="font-medium text-slate-900">{item.accountName}</span>
                            </Link>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums text-slate-800 font-medium">
                                {formatCurrency(item.amount)}
                              </span>
                              {comparePrior && (
                                <span className={`text-[10px] tabular-nums ${v.diff <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({v.label})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Long-Term Liabilities */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div
                  onClick={() => toggleSection('longTermLiabilities')}
                  className="flex justify-between items-center font-semibold text-slate-800 border-b border-slate-100 pb-1 cursor-pointer select-none hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {expandedSections.longTermLiabilities ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>Long-Term Debt &amp; Liabilities</span>
                  </div>
                  <span className="tabular-nums font-semibold">{formatCurrency(report?.totalLongTermLiabilities || 0)}</span>
                </div>

                {expandedSections.longTermLiabilities && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.longTermLiabilities.length === 0 ? (
                      <div className="text-slate-400 italic">No long-term debt liabilities.</div>
                    ) : (
                      report?.longTermLiabilities.map((item) => (
                        <div key={item.accountId} className="flex justify-between items-center text-slate-600">
                          <Link
                            to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                            className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                          >
                            <span className="tabular-nums text-primary font-medium">{item.code}</span>
                            <span className="font-medium text-slate-900">{item.accountName}</span>
                          </Link>
                          <span className="tabular-nums text-slate-800 font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Owner's Equity & Reserves */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div
                  onClick={() => toggleSection('equity')}
                  className="flex justify-between items-center font-semibold text-slate-800 border-b border-slate-100 pb-1 cursor-pointer select-none hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {expandedSections.equity ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>Owner's Equity &amp; Reserves</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-semibold">{formatCurrency(report?.totalEquity || 0)}</span>
                    {comparePrior && (
                      <span className="text-[10px] text-slate-500">Δ {equityVariance.label}</span>
                    )}
                  </div>
                </div>

                {expandedSections.equity && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.equityItems.map((item) => {
                      const priorVal = priorItemMap.get(item.accountId) || 0;
                      const v = calculateVariance(item.amount, priorVal);
                      return (
                        <div key={item.accountId} className="flex justify-between items-center text-slate-600">
                          <Link
                            to={`/finance/reports/general-ledger?accountId=${item.accountId}`}
                            className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                          >
                            <span className="tabular-nums text-primary font-medium">{item.code}</span>
                            <span className="font-medium text-slate-900">{item.accountName}</span>
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-slate-800 font-medium">{formatCurrency(item.amount)}</span>
                            {comparePrior && (
                              <span className={`text-[10px] tabular-nums ${v.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ({v.label})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Total Liabilities & Equity Footnote */}
            <div className="border-t-2 border-slate-300 bg-slate-50 px-5 py-3 flex justify-between items-center text-sm font-semibold text-slate-900">
              <span className="uppercase tracking-wider">Total Liabilities &amp; Equity</span>
              <span className="tabular-nums text-base font-semibold">
                {formatCurrency(report?.totalLiabilitiesAndEquity || 0)}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Corporate Sign-Off Block */}
      <CorporateSignatureBlock date={asOfDate} />
    </div>
  );
}
