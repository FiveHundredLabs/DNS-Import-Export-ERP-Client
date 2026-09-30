import { useState, useEffect, useCallback } from 'react';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { GeneralLedgerAccountReport } from '../../api/types';
import { CoaTreeSelect } from '../../components/CoaTreeSelect';
import { ReportDateFilterBar, DateFilterState } from './ReportDateFilterBar';
import { ReportHeaderNav } from './ReportHeaderNav';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { BookOpen, DollarSign, ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';

export function GeneralLedgerPage() {
  const { accounts, getGeneralLedger } = useFinanceLedger();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-1010'); // Default Bank Account
  const [report, setReport] = useState<GeneralLedgerAccountReport | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_YEAR',
    startDate: '2026-01-01',
    endDate: new Date().toISOString().slice(0, 10),
  });

  const loadReport = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const data = await getGeneralLedger(selectedAccountId, {
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
      });
      setReport(data);
    } catch {
      // Handled
    }
  }, [getGeneralLedger, selectedAccountId, dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <ReportHeaderNav />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">General Ledger Explorer</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Account Transaction Statement
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit individual account statements with opening balances, chronological journal postings, and running balances.
          </p>
        </div>
      </div>

      {/* Account Selector & Date Filter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-4">
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Select General Ledger Account</label>
          <CoaTreeSelect
            accounts={accounts}
            value={selectedAccountId}
            onChange={(acc) => setSelectedAccountId(acc.id)}
            placeholder="Select Account..."
          />
        </div>

        <div className="lg:col-span-8">
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Statement Date Range</label>
          <ReportDateFilterBar
            filter={dateFilter}
            onChange={setDateFilter}
            reportTitle={`General_Ledger_${selectedAccount?.code || ''}`}
          />
        </div>
      </div>

      {/* Account Balance Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card className="p-4 border-slate-200">
            <span className="text-xs font-medium text-slate-500">Opening Balance</span>
            <div className="mt-2 text-xl font-semibold text-slate-800 font-mono tabular-nums">
              {formatCurrency(report.openingBalance)}
            </div>
            <span className="text-xs text-slate-400">Prior to {dateFilter.startDate}</span>
          </Card>

          <Card className="p-4 border-slate-200">
            <span className="text-xs font-medium text-slate-500">Total Period Debits</span>
            <div className="mt-2 text-xl font-semibold text-primary font-mono tabular-nums">
              {formatCurrency(report.totalDebits)}
            </div>
            <span className="text-xs text-primary font-medium">Inward / Additions</span>
          </Card>

          <Card className="p-4 border-slate-200">
            <span className="text-xs font-medium text-slate-500">Total Period Credits</span>
            <div className="mt-2 text-xl font-semibold text-slate-700 font-mono tabular-nums">
              {formatCurrency(report.totalCredits)}
            </div>
            <span className="text-xs text-slate-400">Outward / Deductions</span>
          </Card>

          <Card className="p-4 border-slate-200 bg-primary-light/40 border-primary-border/40">
            <span className="text-xs font-medium text-indigo-900">Closing Balance</span>
            <div className="mt-2 text-xl font-semibold text-indigo-950 font-mono tabular-nums">
              {formatCurrency(report.closingBalance)}
            </div>
            <span className="text-xs text-primary font-medium">As of {dateFilter.endDate}</span>
          </Card>
        </div>
      )}

      {/* Chronological Transactions Table */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-slate-800">
              {selectedAccount?.code} — {selectedAccount?.name}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {report?.transactions.length || 0} Transactions in Period
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] tabular-nums">
            <thead className="border-b border-slate-200 bg-slate-50 text-[12.5px] font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Voucher #</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Description & Reference</th>
                <th className="px-4 py-3 text-right">Debit (LKR)</th>
                <th className="px-4 py-3 text-right">Credit (LKR)</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {/* Opening Balance Row */}
              <tr className="bg-slate-50/50 font-medium text-slate-500 italic">
                <td className="px-4 py-2.5">{dateFilter.startDate}</td>
                <td className="px-4 py-2.5">—</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-xs font-medium">
                    OPENING
                  </Badge>
                </td>
                <td className="px-4 py-2.5">Opening balance brought forward</td>
                <td className="px-4 py-2.5 text-right">—</td>
                <td className="px-4 py-2.5 text-right">—</td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800 tabular-nums">
                  {formatCurrency(report?.openingBalance || 0)}
                </td>
              </tr>

              {/* Transactions */}
              {report?.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No transactions recorded for this account during the selected date range.
                  </td>
                </tr>
              ) : (
                report?.transactions.map((t, idx) => (
                  <tr key={`${t.journalId}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-primary tabular-nums">{t.entryNumber}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs bg-slate-50 font-medium">
                        {t.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.description}</div>
                      {t.reference && (
                        <div className="font-mono text-xs text-slate-400">Ref: {t.reference}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-primary tabular-nums">
                      {t.debit > 0 ? formatCurrency(t.debit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-700 tabular-nums">
                      {t.credit > 0 ? formatCurrency(t.credit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(t.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-[13px] font-semibold text-slate-900">
              <tr>
                <td colSpan={4} className="px-4 py-3.5">
                  Closing Balance as of {dateFilter.endDate}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-primary tabular-nums">
                  {formatCurrency(report?.totalDebits || 0)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-slate-800 tabular-nums">
                  {formatCurrency(report?.totalCredits || 0)}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-sm text-indigo-950 font-semibold tabular-nums">
                  {formatCurrency(report?.closingBalance || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
