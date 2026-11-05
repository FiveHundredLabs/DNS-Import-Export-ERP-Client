import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { posService } from '../../services/POSService';
import { DayEndClosingSummary } from '../../types/pos';
import { formatCurrency } from '../../utils/formatters';
import { Printer } from 'lucide-react';

interface DayEndPOSReportContentProps {
  reportDate: string;
  onReportDateChange: (date: string) => void;
  summary: DayEndClosingSummary | null;
}

export function DayEndPOSReportContent({
  reportDate,
  onReportDateChange,
  summary,
}: DayEndPOSReportContentProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Showroom POS Executive Reports</h2>
          <p className="text-xs text-slate-500">
            Comprehensive sales, tender methods, cashier productivity, reconciliation, and day-end audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => onReportDateChange(e.target.value)}
            className="w-40 text-xs h-8"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1.5 text-xs text-slate-700 bg-white"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {summary && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Gross Sales</span>
              <div className="text-base font-bold text-slate-900">{formatCurrency(summary.grossSales)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Discounts</span>
              <div className="text-base font-bold text-amber-700">{formatCurrency(summary.totalDiscounts)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Net Sales</span>
              <div className="text-base font-bold text-indigo-700">{formatCurrency(summary.netSales)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Cash Tendered</span>
              <div className="text-base font-bold text-emerald-700">{formatCurrency(summary.cashSales)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Card Tendered</span>
              <div className="text-base font-bold text-blue-700">{formatCurrency(summary.cardSales)}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Refunds / Voids</span>
              <div className="text-base font-bold text-rose-700">
                {formatCurrency(summary.refundTotals + summary.voidTotals)}
              </div>
            </div>
          </div>

          <Card className="border-slate-200">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Terminal-Wise Daily Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Terminal Code</th>
                    <th className="px-4 py-2.5">Terminal Name</th>
                    <th className="px-4 py-2.5 text-center">Transactions</th>
                    <th className="px-4 py-2.5 text-right">Total Sales</th>
                    <th className="px-4 py-2.5 text-right">Cash Sales</th>
                    <th className="px-4 py-2.5 text-right">Expected Drawer Cash</th>
                    <th className="px-4 py-2.5 text-right">Actual Counted</th>
                    <th className="px-4 py-2.5 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.terminalSummaries.map((terminal) => (
                    <tr key={terminal.terminalId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{terminal.terminalCode}</td>
                      <td className="px-4 py-2.5">{terminal.terminalName}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{terminal.transactionCount}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(terminal.totalSales)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-700 font-medium">{formatCurrency(terminal.cashSales)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(terminal.expectedCash)}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(terminal.actualCash)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">
                        {terminal.difference === 0 ? (
                          <span className="text-emerald-600">0.00</span>
                        ) : terminal.difference > 0 ? (
                          <span className="text-blue-600">+{formatCurrency(terminal.difference)}</span>
                        ) : (
                          <span className="text-rose-600">{formatCurrency(terminal.difference)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Cashier Productivity &amp; Float Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Cashier Name</th>
                    <th className="px-4 py-2.5 text-center">Shifts Completed</th>
                    <th className="px-4 py-2.5 text-center">Sales Transactions</th>
                    <th className="px-4 py-2.5 text-right">Total Net Sales</th>
                    <th className="px-4 py-2.5 text-right">Cash Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.cashierSummaries.map((cashier) => (
                    <tr key={cashier.cashierId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{cashier.cashierName}</td>
                      <td className="px-4 py-2.5 text-center">{cashier.shiftsCount}</td>
                      <td className="px-4 py-2.5 text-center">{cashier.transactionsCount}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatCurrency(cashier.totalSales)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">
                        {cashier.cashDifference === 0 ? (
                          <span className="text-emerald-600">0.00</span>
                        ) : (
                          <span className="text-rose-600">{formatCurrency(cashier.cashDifference)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export function DayEndPOSReportPage() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<DayEndClosingSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    posService.getDayEndClosingReport(reportDate)
      .then((result) => {
        if (isMounted) setSummary(result);
      })
      .catch((error) => {
        console.error('Failed to load day-end summary:', error);
        if (isMounted) setSummary(null);
      });
    return () => {
      isMounted = false;
    };
  }, [reportDate]);

  return (
    <DayEndPOSReportContent
      reportDate={reportDate}
      onReportDateChange={setReportDate}
      summary={summary}
    />
  );
}
