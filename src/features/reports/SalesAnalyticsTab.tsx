import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users2, Layers, Award, Download } from 'lucide-react';
import { SalesSummaryReport } from '../../types/reports';
import { formatCurrencyLKR, exportToCSV } from '../../utils/exportUtils';
import { Button } from '../../components/ui/button';

interface SalesAnalyticsTabProps {
  salesReport: SalesSummaryReport;
  advancedReports?: any;
}

export function SalesAnalyticsTab({ salesReport, advancedReports }: SalesAnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Sales Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary-light/40 border-primary-border/40">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-primary-text uppercase tracking-wider">
              Total Gross Sales
            </span>
            <p className="text-2xl font-extrabold text-indigo-950 mt-1">
              {formatCurrencyLKR(salesReport.totalSales)}
            </p>
            <span className="text-xs text-primary mt-1 block">Invoices + Showroom POS</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              B2B Commercial Invoices
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {formatCurrencyLKR(salesReport.invoiceSales)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">Credit & cash trade orders</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Showroom POS Volume
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {formatCurrencyLKR(salesReport.posSales)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">Retail & counter sales</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Order Value (AOV)
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {formatCurrencyLKR(salesReport.averageOrderValue)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Across {salesReport.totalOrders} total sales
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Representative */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users2 className="w-4 h-4 text-primary" />
              <span>Sales Performance by Representative</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Sales_By_Rep_${timestamp}`,
                  ['Sales Rep ID', 'Representative Name', 'Orders Count', 'Total Sales (LKR)'],
                  salesReport.salesByRep.map((r) => [r.repId, r.repName, r.orderCount, r.amount])
                );
              }}
              className="h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            {salesReport.salesByRep.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No sales representative data available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Sales Representative</th>
                      <th className="py-2.5 px-3 text-center">Orders</th>
                      <th className="py-2.5 px-3 text-right">Revenue (LKR)</th>
                      <th className="py-2.5 px-3 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesReport.salesByRep.map((rep) => {
                      const share =
                        salesReport.totalSales > 0
                          ? Math.round((rep.amount / salesReport.totalSales) * 1000) / 10
                          : 0;
                      return (
                        <tr key={rep.repId} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {rep.repName}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">{rep.orderCount}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrencyLKR(rep.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {share}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Sales by Product Category</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Sales_By_Category_${timestamp}`,
                  ['Category', 'Quantity', 'Amount (LKR)'],
                  salesReport.salesByCategory.map((c) => [c.category, c.quantity, c.amount])
                );
              }}
              className="h-8 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download CSV</span>
            </Button>
          </CardHeader>
          <CardContent>
            {salesReport.salesByCategory.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No category breakdown available.
              </div>
            ) : (
              <div className="space-y-4">
                {salesReport.salesByCategory.map((cat) => {
                  const pct =
                    salesReport.totalSales > 0
                      ? Math.round((cat.amount / salesReport.totalSales) * 100)
                      : 0;
                  return (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{cat.category}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">
                            {formatCurrencyLKR(cat.amount)}
                          </span>
                          <span className="text-slate-400 ml-2">({cat.quantity} units, {pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Top Performing SKUs & Revenue Drivers</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Top_Products_${timestamp}`,
                ['Product ID', 'Product Name', 'SKU', 'Units Sold', 'Revenue (LKR)'],
                salesReport.salesByProduct.map((p) => [p.productId, p.productName, p.sku, p.quantity, p.totalAmount])
              );
            }}
            className="h-8 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download CSV</span>
          </Button>
        </CardHeader>
        <CardContent>
          {salesReport.salesByProduct.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No product sales data recorded for the chosen filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4 text-center">Units Sold</th>
                    <th className="py-2.5 px-4 text-right">Revenue Generated (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport.salesByProduct.slice(0, 10).map((prod, idx) => (
                    <tr key={prod.productId} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {prod.productName}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{prod.sku}</td>
                      <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                        {prod.quantity}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrencyLKR(prod.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {advancedReports?.weeklySalesPerformance && advancedReports.weeklySalesPerformance.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Weekly Sales Performance</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Weekly_Sales_${timestamp}`,
                  ['Week Starting', 'Sales Rep', 'Total Sales', 'Total Collections', 'Calculated Payout'],
                  advancedReports.weeklySalesPerformance.map((item: any) => [
                    item.weekStarting,
                    item.salesRepName,
                    item.totalSales,
                    item.totalCollections,
                    item.calculatedPayout,
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Week Starting</th>
                    <th className="px-4 py-3">Sales Rep</th>
                    <th className="px-4 py-3">Total Sales</th>
                    <th className="px-4 py-3">Total Collections</th>
                    <th className="px-4 py-3">Calculated Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.weeklySalesPerformance.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.weekStarting}</td>
                      <td className="px-4 py-3">{item.salesRepName}</td>
                      <td className="px-4 py-3 font-bold">{item.totalSales?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-700">{item.totalCollections?.toLocaleString()}</td>
                      <td className="px-4 py-3">{item.calculatedPayout?.toLocaleString()}</td>
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
