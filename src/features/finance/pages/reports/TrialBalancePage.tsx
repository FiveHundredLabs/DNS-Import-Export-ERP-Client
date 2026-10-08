import { useState, useEffect, useCallback } from 'react';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { TrialBalanceReport } from '../../api/types';
import { ReportHeaderNav } from './ReportHeaderNav';
import { ReportDateFilterBar, DateFilterState } from './ReportDateFilterBar';
import { formatCurrency } from '../../../../utils/formatters';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';

export function TrialBalancePage() {
  const { getTrialBalance } = useFinanceLedger();
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_MONTH',
    startDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
    endDate: new Date().toISOString().slice(0, 10),
  });

  const loadReport = useCallback(async () => {
    const data = await getTrialBalance(dateFilter.endDate);
    setReport(data);
  }, [getTrialBalance, dateFilter.endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = () => {
    if (!report || !report.items) return;
    const headers = ['Account Code', 'Account Name', 'Classification', 'Debit (LKR)', 'Credit (LKR)'];
    const rows = report.items.map((i) => [
      `"${i.code}"`,
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.accountSubClass}"`,
      i.debit.toFixed(2),
      i.credit.toFixed(2),
    ]);
    const summaryRow = [
      '"TOTAL"',
      '""',
      '""',
      report.totalDebit.toFixed(2),
      report.totalCredit.toFixed(2),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Trial_Balance_${dateFilter.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <ReportHeaderNav />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Trial Balance Statement</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              General Ledger Verification
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete account summary testing mathematical accuracy of the double-entry bookkeeping ledger.
          </p>
        </div>
      </div>

      {/* Date Filter & Export Bar */}
      <ReportDateFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        onExportCsv={handleExportCsv}
        reportTitle="Trial_Balance_Statement"
      />

      {/* Balancing Status Badge */}
      <Card
        className={`p-4 border ${
          report?.isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                report?.isBalanced ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white animate-pulse'
              }`}
            >
              {report?.isBalanced ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {report?.isBalanced
                    ? 'Trial Balance Reconciled (Zero Net Difference)'
                    : 'Trial Balance Imbalance Detected'}
                </span>
                <Badge
                  className={`${
                    report?.isBalanced
                      ? 'bg-emerald-200 text-emerald-900 border-none'
                      : 'bg-rose-200 text-rose-900 border-none'
                  } text-xs font-semibold`}
                >
                  {report?.isBalanced ? 'Balanced' : `Imbalance: ${formatCurrency(report?.discrepancy || 0)}`}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Debits ({formatCurrency(report?.totalDebit || 0)}) === Total Credits (
                {formatCurrency(report?.totalCredit || 0)})
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Trial Balance Table */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Account Code</th>
                <th className="px-4 py-3">Account Title</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3 text-right">Debit Balance (LKR)</th>
                <th className="px-4 py-3 text-right">Credit Balance (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {report?.items.map((item) => (
                <tr key={item.accountId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 tabular-nums font-semibold text-primary-text">{item.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                      {item.accountSubClass.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                    {item.debit > 0 ? formatCurrency(item.debit) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                    {item.credit > 0 ? formatCurrency(item.credit) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900">
              <tr>
                <td colSpan={3} className="px-4 py-3.5 uppercase tracking-wider">
                  Total Trial Balance
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-sm font-semibold text-indigo-950">
                  {formatCurrency(report?.totalDebit || 0)}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-sm font-semibold text-indigo-950">
                  {formatCurrency(report?.totalCredit || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
