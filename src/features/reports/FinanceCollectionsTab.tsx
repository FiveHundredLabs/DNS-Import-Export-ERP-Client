import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Clock, Building, Wallet, Download } from 'lucide-react';
import { FinanceReport } from '../../types/reports';
import { formatCurrencyLKR, exportToCSV } from '../../utils/exportUtils';
import { Button } from '../../components/ui/button';

interface FinanceCollectionsTabProps {
  financeReport: FinanceReport;
  advancedReports?: any;
}

export function FinanceCollectionsTab({ financeReport, advancedReports }: FinanceCollectionsTabProps) {
  const overduePercentage =
    financeReport.totalReceivables > 0
      ? Math.round((financeReport.overdue / financeReport.totalReceivables) * 1000) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Finance Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-amber-50/40 border-amber-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Total Trade Receivables
            </span>
            <p className="text-2xl font-extrabold text-amber-950 mt-1">
              {formatCurrencyLKR(financeReport.totalReceivables)}
            </p>
            <span className="text-xs text-amber-700 mt-1 block">Sum of active customer debt</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Current Due (Within Terms)
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {formatCurrencyLKR(financeReport.currentDue)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">Within credit period</span>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/40 border-rose-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Total Overdue Exposure
            </span>
            <p className="text-2xl font-extrabold text-rose-950 mt-1">
              {formatCurrencyLKR(financeReport.overdue)}
            </p>
            <span className="text-xs text-rose-700 mt-1 block">
              {overduePercentage}% of total receivables
            </span>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/40 border-emerald-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Approved Collections
            </span>
            <p className="text-2xl font-extrabold text-emerald-950 mt-1">
              {formatCurrencyLKR(financeReport.totalCollections)}
            </p>
            <span className="text-xs text-emerald-700 mt-1 block">
              Realized & approved funds
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Receivables Aging Buckets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Receivables Aging Schedule (Strict Match with Customer Ledger)</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Total Debt: {formatCurrencyLKR(financeReport.totalReceivables)}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Receivables_Aging_${timestamp}`,
                ['Aging Bucket', 'Accounts Count', 'Outstanding Amount (LKR)'],
                financeReport.agingBuckets.map((b) => [b.bucket, b.customerCount, b.amount])
              );
            }}
            className="h-8 gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download CSV</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {financeReport.agingBuckets.map((bucket, index) => {
              const isOverdueBucket = index > 0;
              const share =
                financeReport.totalReceivables > 0
                  ? Math.round((bucket.amount / financeReport.totalReceivables) * 100)
                  : 0;
              return (
                <div
                  key={bucket.bucket}
                  className={`p-4 rounded-xl border ${
                    index === 0
                      ? 'bg-slate-50 border-slate-200'
                      : index < 3
                      ? 'bg-amber-50/30 border-amber-200'
                      : 'bg-rose-50/30 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{bucket.bucket}</span>
                    <Badge variant={isOverdueBucket ? 'secondary' : 'outline'} className="text-[10px]">
                      {bucket.customerCount} Accounts
                    </Badge>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900 mt-2">
                    {formatCurrencyLKR(bucket.amount)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{share}% of total debt</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collections by Payment Method */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Collections by Settlement Instrument</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Collections_By_Method_${timestamp}`,
                  ['Payment Method', 'Receipts Count', 'Amount (LKR)'],
                  financeReport.collectionsByMethod.map((item) => [
                    item.method.replace(/_/g, ' '),
                    item.count,
                    item.amount,
                  ])
                );
              }}
              className="h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            {financeReport.collectionsByMethod.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No collections recorded for the given filters.
              </div>
            ) : (
              <div className="space-y-4">
                {financeReport.collectionsByMethod.map((item) => {
                  const share =
                    financeReport.totalCollections > 0
                      ? Math.round((item.amount / financeReport.totalCollections) * 100)
                      : 0;
                  return (
                    <div key={item.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {item.method.replace(/_/g, ' ')}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">
                            {formatCurrencyLKR(item.amount)}
                          </span>
                          <span className="text-slate-400 ml-2">
                            ({item.count} receipts, {share}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Debtors Leaderboard */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-rose-600" />
                <span>Top Outstanding Debtors</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {financeReport.topDebtors.length} Debtors
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Top_Debtors_${timestamp}`,
                  ['Customer Name', 'Dealer Code', 'Total Balance (LKR)', 'Overdue (LKR)'],
                  financeReport.topDebtors.map((debtor) => [
                    debtor.customerName,
                    debtor.code,
                    debtor.balance,
                    debtor.overdue,
                  ])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            {financeReport.topDebtors.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No customers with outstanding balances found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Dealer Code</th>
                      <th className="py-2.5 px-3 text-right">Total Balance (LKR)</th>
                      <th className="py-2.5 px-3 text-right">Overdue (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financeReport.topDebtors.slice(0, 10).map((debtor) => (
                      <tr key={debtor.customerId} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {debtor.customerName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{debtor.code}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                          {formatCurrencyLKR(debtor.balance)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          {debtor.overdue > 0 ? formatCurrencyLKR(debtor.overdue) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {advancedReports?.creditExceptions && advancedReports.creditExceptions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Credit Exceptions</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Credit_Exceptions_${timestamp}`,
                  ['Customer', 'Order Amount', 'Credit Limit', 'Exceeded Amount', 'Approved By'],
                  advancedReports.creditExceptions.map((item: any) => [
                    item.customerName,
                    item.orderAmount,
                    item.creditLimit,
                    item.exceededAmount,
                    item.approvedBy,
                  ])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Order Amount</th>
                    <th className="px-4 py-3">Credit Limit</th>
                    <th className="px-4 py-3">Exceeded Amount</th>
                    <th className="px-4 py-3">Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.creditExceptions.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.customerName}</td>
                      <td className="px-4 py-3">{item.orderAmount?.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.creditLimit?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-red-600 font-bold">{item.exceededAmount?.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.approvedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {advancedReports?.chequeRealizationAndAging && advancedReports.chequeRealizationAndAging.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Cheque Realization & Collection Aging Report</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Cheque_Realization_${timestamp}`,
                  ['Cheque Number', 'Customer', 'Amount', 'Due Date', 'Status'],
                  advancedReports.chequeRealizationAndAging.map((item: any) => [
                    item.chequeNumber,
                    item.customerName,
                    item.amount,
                    item.dueDate,
                    item.status,
                  ])
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Cheque Number</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.chequeRealizationAndAging.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.chequeNumber}</td>
                      <td className="px-4 py-3">{item.customerName}</td>
                      <td className="px-4 py-3 font-bold">{item.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.dueDate}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'CLEARED' ? 'bg-green-100 text-green-800' : item.status === 'BOUNCED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
