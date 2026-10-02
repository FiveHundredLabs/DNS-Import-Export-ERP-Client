import { useState, useEffect, useCallback } from 'react';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { VatReport } from '../../api/types';
import { ReportDateFilterBar, DateFilterState } from './ReportDateFilterBar';
import { ReportHeaderNav } from './ReportHeaderNav';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { Receipt, Percent, FileCheck, Building } from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';

export function VatSummaryPage() {
  const { getVatSummary } = useFinanceLedger();
  const [report, setReport] = useState<VatReport | null>(null);

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_MONTH',
    startDate: '2026-09-01',
    endDate: new Date().toISOString().slice(0, 10),
  });

  const loadReport = useCallback(async () => {
    const data = await getVatSummary({
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    });
    setReport(data);
  }, [getVatSummary, dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <ReportHeaderNav />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">VAT Summary & Tax Filing Report</h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              18% Value Added Tax (RAMIS Ready)
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit statutory taxable sales, 18% VAT collected on supplies, and net liability payable to Inland Revenue Department (IRD).
          </p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <ReportDateFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        reportTitle="VAT_Summary_Report"
      />

      {/* Tax Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Taxable Supplies Base
            </span>
            <Building className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(report?.taxableSales || 0)}
          </div>
          <span className="text-xs text-slate-400">18% Standard Rated Sales</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Output VAT Collected (18%)
            </span>
            <Percent className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-700 tabular-nums">
            {formatCurrency(report?.vatCollected || 0)}
          </div>
          <span className="text-xs text-amber-600 font-medium">Under GL 2020</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-emerald-50/50 border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
              Net Statutory VAT Payable
            </span>
            <FileCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-900 tabular-nums">
            {formatCurrency(report?.netVatPayable || 0)}
          </div>
          <span className="text-xs text-emerald-700 font-medium">Payable to Inland Revenue Dept</span>
        </Card>
      </div>

      {/* Tax Transactions Breakdown */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Taxable Invoices & Journal Records
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {report?.transactions.length || 0} Registered Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice / Voucher #</th>
                <th className="px-4 py-3">Customer / Description</th>
                <th className="px-4 py-3 text-right">Taxable Amount (LKR)</th>
                <th className="px-4 py-3 text-right">18% VAT Amount (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {report?.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No taxable sales recorded in the selected period.
                  </td>
                </tr>
              ) : (
                report?.transactions.map((tx, idx) => (
                  <tr key={`${tx.invoiceNumber}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-primary-text">{tx.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{tx.customerName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                      {formatCurrency(tx.taxableAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-700">
                      {formatCurrency(tx.vatAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900">
              <tr>
                <td colSpan={3} className="px-4 py-3.5 uppercase tracking-wider">
                  Total Taxable Base & VAT Liability
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-900">
                  {formatCurrency(report?.taxableSales || 0)}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-sm font-semibold text-amber-800">
                  {formatCurrency(report?.vatCollected || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
