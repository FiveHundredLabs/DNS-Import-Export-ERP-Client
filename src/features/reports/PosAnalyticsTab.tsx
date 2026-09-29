import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';

interface PosAnalyticsTabProps {
  advancedReports: any;
}

export function PosAnalyticsTab({ advancedReports }: PosAnalyticsTabProps) {
  const tillRec = advancedReports?.tillReconciliation || [];
  const dailyShowroom = advancedReports?.dailyShowroomSummary || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Daily Showroom Sales Summary</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Daily_Showroom_Sales_${timestamp}`,
                ['Date', 'Total Sales', 'Cash Sales', 'Card Sales', 'Walk-in', 'Customer', 'Tx Count'],
                dailyShowroom.map((item: any) => [item.date, item.totalSales, item.cashSales, item.cardSales, item.walkInSales, item.customerSales, item.transactionCount])
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
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total Sales</th>
                  <th className="px-4 py-3">Cash Sales</th>
                  <th className="px-4 py-3">Card Sales</th>
                  <th className="px-4 py-3">Walk-in</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Tx Count</th>
                </tr>
              </thead>
              <tbody>
                {dailyShowroom.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-3 text-center">No data available</td>
                  </tr>
                ) : (
                  dailyShowroom.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{item.totalSales.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.cashSales.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.cardSales.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.walkInSales.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.customerSales.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.transactionCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Cashier Till Reconciliation</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Till_Reconciliation_${timestamp}`,
                ['Date', 'Cashier', 'Expected Cash', 'Expected Card', 'Status'],
                tillRec.map((item: any) => [item.date, item.cashierName, item.expectedCash, item.expectedCard, item.status])
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
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3">Expected Cash</th>
                  <th className="px-4 py-3">Expected Card</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tillRec.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center">No data available</td>
                  </tr>
                ) : (
                  tillRec.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.cashierName}</td>
                      <td className="px-4 py-3">{item.expectedCash.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.expectedCard.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>POS Cheque Register</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              const data = advancedReports?.posChequeRegister || [];
              exportToCSV(
                `POS_Cheque_Register_${timestamp}`,
                ['Due Date', 'Cheque Number', 'Amount', 'Status'],
                data.map((item: any) => [item.dueDate, item.chequeNumber, item.amount, item.status])
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
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Cheque Number</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {advancedReports?.posChequeRegister?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-center">No data available</td>
                  </tr>
                ) : (
                  advancedReports?.posChequeRegister?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">{item.dueDate}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.chequeNumber}</td>
                      <td className="px-4 py-3">{item.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === 'REALIZED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>POS Audit Log</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              const data = advancedReports?.posAuditLog || [];
              exportToCSV(
                `POS_Audit_Log_${timestamp}`,
                ['Date', 'Cashier', 'Action', 'Reason', 'Amount Impact'],
                data.map((item: any) => [item.date, item.cashierName, item.action, item.reason, item.amountImpact])
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
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Amount Impact</th>
                </tr>
              </thead>
              <tbody>
                {advancedReports?.posAuditLog?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center">No data available</td>
                  </tr>
                ) : (
                  advancedReports?.posAuditLog?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.cashierName}</td>
                      <td className="px-4 py-3">{item.action}</td>
                      <td className="px-4 py-3">{item.reason}</td>
                      <td className="px-4 py-3 font-bold text-red-600">{item.amountImpact?.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
