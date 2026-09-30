import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users2, Layers, Award, TrendingUp } from 'lucide-react';
import { SalesSummaryReport } from '../../types/reports';
import { formatCurrencyLKR } from '../../utils/exportUtils';

interface SalesAnalyticsTabProps {
  salesReport: SalesSummaryReport;
}

export function SalesAnalyticsTab({ salesReport }: SalesAnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Sales Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary-light/40 border-primary-border/40">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-primary-text uppercase tracking-wider">
              Total Gross Sales
            </span>
            <p className="text-2xl font-semibold tabular-nums text-indigo-950 mt-1">
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
            <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
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
            <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
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
            <p className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">
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
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Users2 className="w-4 h-4 text-primary" />
              <span>Sales Performance by Representative</span>
            </CardTitle>
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
                          <td className="py-2.5 px-3 text-center tabular-nums text-slate-600">{rep.orderCount}</td>
                          <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-slate-900">
                            {formatCurrencyLKR(rep.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="outline" className="text-xs font-medium tabular-nums">
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
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Sales by Product Category</span>
            </CardTitle>
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
                          <span className="font-semibold tabular-nums text-slate-900">
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
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Top Performing SKUs & Revenue Drivers</span>
          </CardTitle>
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
    </div>
  );
}
