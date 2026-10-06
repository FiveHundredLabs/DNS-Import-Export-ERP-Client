import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { BalanceSheetReport } from '../../api/types';
import { ReportHeaderNav } from './ReportHeaderNav';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { Scale, CheckCircle2, AlertTriangle, Printer, Calendar, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

export function BalanceSheetPage() {
  const { getBalanceSheet } = useFinanceLedger();
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
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
  }, [getBalanceSheet, asOfDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <ReportHeaderNav />

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

        <div className="flex items-center gap-3 print:hidden">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1 text-xs text-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
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
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {report?.isBalanced
                    ? 'Balance Sheet Reconciled (Assets = Liabilities + Equity)'
                    : 'Balance Sheet Discrepancy Detected'}
                </span>
                <Badge
                  className={`${
                    report?.isBalanced
                      ? 'bg-emerald-200 text-emerald-900 border-none'
                      : 'bg-rose-200 text-rose-900 border-none'
                  } text-xs font-semibold`}
                >
                  {report?.isBalanced ? 'Audit Verified' : `Imbalance: ${formatCurrency(report?.discrepancy || 0)}`}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Assets ({formatCurrency(report?.totalAssets || 0)}) === Total Liabilities & Equity (
                {formatCurrency(report?.totalLiabilitiesAndEquity || 0)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
            <div>
              <span className="text-xs text-slate-500 font-sans block">Total Assets</span>
              <span className="text-slate-900">{formatCurrency(report?.totalAssets || 0)}</span>
            </div>
            <span className="text-slate-400">=</span>
            <div>
              <span className="text-xs text-slate-500 font-sans block">Liab. + Equity</span>
              <span className="text-slate-900">{formatCurrency(report?.totalLiabilitiesAndEquity || 0)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Two-Column Assets vs Liabilities & Equity Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: ASSETS */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-primary-light/60 px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-950">
                Assets (Economic Resources)
              </h2>
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
                    <span>Current Assets</span>
                  </div>
                  <span className="tabular-nums font-semibold">{formatCurrency(report?.totalCurrentAssets || 0)}</span>
                </div>
                {expandedSections.currentAssets && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.currentAssets.map((item) => (
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
                    ))}
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
                    <span>Non-Current Assets (Fixed Assets)</span>
                  </div>
                  <span className="tabular-nums font-semibold">{formatCurrency(report?.totalNonCurrentAssets || 0)}</span>
                </div>
                {expandedSections.nonCurrentAssets && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.nonCurrentAssets.length === 0 ? (
                      <div className="text-slate-400 italic">No fixed assets registered.</div>
                    ) : (
                      report?.nonCurrentAssets.map((item) => (
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
            </div>

            {/* Total Assets Footnote */}
            <div className="border-t-2 border-primary-border bg-primary-light/80 px-5 py-3 flex justify-between items-center text-sm font-semibold text-indigo-950">
              <span className="uppercase tracking-wider">Total Assets</span>
              <span className="tabular-nums text-base font-semibold">{formatCurrency(report?.totalAssets || 0)}</span>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-100/70 px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Liabilities & Owner's Equity
              </h2>
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
                    <span>Current Liabilities</span>
                  </div>
                  <span className="tabular-nums font-semibold">{formatCurrency(report?.totalCurrentLiabilities || 0)}</span>
                </div>
                {expandedSections.currentLiabilities && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.currentLiabilities.map((item) => (
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
                    ))}
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
                    <span>Long-Term Liabilities</span>
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
                    <span>Owner's Equity & Reserves</span>
                  </div>
                  <span className="tabular-nums font-semibold">{formatCurrency(report?.totalEquity || 0)}</span>
                </div>
                {expandedSections.equity && (
                  <div className="space-y-1.5 pl-5 animate-in fade-in-50">
                    {report?.equityItems.map((item) => (
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
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Total Liabilities & Equity Footnote */}
            <div className="border-t-2 border-slate-300 bg-slate-50 px-5 py-3 flex justify-between items-center text-sm font-semibold text-slate-900">
              <span className="uppercase tracking-wider">Total Liabilities & Equity</span>
              <span className="tabular-nums text-base font-semibold">
                {formatCurrency(report?.totalLiabilitiesAndEquity || 0)}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
