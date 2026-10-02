import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../utils/exportUtils';

interface CommissionAnalyticsTabProps {
  advancedReports: any;
}

export function CommissionAnalyticsTab({ advancedReports }: CommissionAnalyticsTabProps) {
  const perfComm = advancedReports?.performanceCommission || [];
  const linkedSales = advancedReports?.commissionLinkedSales || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Performance Based Commission</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Performance_Commission_${timestamp}`,
                ['Sales Rep', 'Target (LKR)', 'Achieved (LKR)', 'Achievement %', 'Tier', 'Base Commission', 'Bonus', 'Total Payout'],
                perfComm.map((item: any) => [item.salesRepName, item.targetAmount, item.achievedAmount, item.achievementPercentage, item.tier, item.baseCommission, item.bonus, item.totalPayout])
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
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3">Target (LKR)</th>
                  <th className="px-4 py-3">Achieved (LKR)</th>
                  <th className="px-4 py-3">Achievement %</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Base Commission</th>
                  <th className="px-4 py-3">Bonus</th>
                  <th className="px-4 py-3">Total Payout</th>
                </tr>
              </thead>
              <tbody>
                {perfComm.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-center">No data available</td>
                  </tr>
                ) : (
                  perfComm.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.salesRepName}</td>
                      <td className="px-4 py-3">{item.targetAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.achievedAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.achievementPercentage.toFixed(2)}%</td>
                      <td className="px-4 py-3">{item.tier}</td>
                      <td className="px-4 py-3">{item.baseCommission.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.bonus.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{item.totalPayout.toLocaleString()}</td>
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
          <CardTitle>Commission-Linked Sales</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Commission_Linked_Sales_${timestamp}`,
                ['Date', 'Sales Rep', 'Invoice ID', 'Gross Amount', 'Commissionable', 'Earned'],
                linkedSales.map((item: any) => [item.date, item.salesRepName, item.invoiceId, item.grossAmount, item.commissionableAmount, item.commissionEarned])
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
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Gross Amount</th>
                  <th className="px-4 py-3">Commissionable</th>
                  <th className="px-4 py-3">Earned</th>
                </tr>
              </thead>
              <tbody>
                {linkedSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center">No data available</td>
                  </tr>
                ) : (
                  linkedSales.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3">{item.salesRepName}</td>
                      <td className="px-4 py-3">{item.invoiceId}</td>
                      <td className="px-4 py-3">{item.grossAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.commissionableAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold">{item.commissionEarned.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {advancedReports?.commissionAdjustments && advancedReports.commissionAdjustments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Commission Adjustments</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Commission_Adjustments_${timestamp}`,
                  ['Date', 'Sales Rep', 'Reason', 'Original Amount', 'Adjusted Amount', 'Adjusted By'],
                  advancedReports.commissionAdjustments.map((item: any) => [item.date, item.salesRepName, item.reason, item.originalAmount, item.adjustedAmount, item.adjustedBy])
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
                    <th className="px-4 py-3">Sales Rep</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Original Amount</th>
                    <th className="px-4 py-3">Adjusted Amount</th>
                    <th className="px-4 py-3">Adjusted By</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.commissionAdjustments.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.salesRepName}</td>
                      <td className="px-4 py-3">{item.reason}</td>
                      <td className="px-4 py-3">{item.originalAmount?.toLocaleString()}</td>
                      <td className={`px-4 py-3 font-bold ${item.adjustedAmount < item.originalAmount ? 'text-red-600' : 'text-green-600'}`}>
                        {item.adjustedAmount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{item.adjustedBy}</td>
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
