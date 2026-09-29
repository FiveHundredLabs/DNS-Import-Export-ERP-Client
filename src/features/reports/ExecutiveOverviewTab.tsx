import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/ui/badge';
import {
  Download,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Package,
  ShoppingCart,
  Receipt,
  Store,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { ExecutiveKpiSummary, SalesSummaryReport } from '../../types/reports';
import { formatCurrencyLKR, exportToCSV } from '../../utils/exportUtils';
import { Button } from '../../components/ui/button';

interface ExecutiveOverviewTabProps {
  kpis: ExecutiveKpiSummary;
  salesReport: SalesSummaryReport;
}

export function ExecutiveOverviewTab({ kpis, salesReport }: ExecutiveOverviewTabProps) {
  const collectionRate =
    kpis.grossRevenue > 0
      ? Math.min(100, Math.round((kpis.totalCollected / kpis.grossRevenue) * 10000) / 100)
      : 0;

  const invoiceShare =
    salesReport.totalSales > 0
      ? Math.round((salesReport.invoiceSales / salesReport.totalSales) * 100)
      : 0;

  const posShare =
    salesReport.totalSales > 0
      ? Math.round((salesReport.posSales / salesReport.totalSales) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 6 Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Gross Revenue"
          value={formatCurrencyLKR(kpis.grossRevenue)}
          subtitle="Tax Invoices + Showroom POS"
          icon={TrendingUp}
          variant="default"
        />
        <StatCard
          title="Total Collections"
          value={formatCurrencyLKR(kpis.totalCollected)}
          subtitle={`${collectionRate}% realized rate`}
          icon={CreditCard}
          variant="success"
        />
        <StatCard
          title="Receivables"
          value={formatCurrencyLKR(kpis.totalOutstanding)}
          subtitle="Customer trade balance"
          icon={AlertCircle}
          variant="warning"
        />
        <StatCard
          title="Overdue Debt"
          value={formatCurrencyLKR(kpis.totalOverdue)}
          subtitle="Requires credit recovery"
          icon={ShieldAlert}
          variant="danger"
        />
        <StatCard
          title="Inventory Valuation"
          value={formatCurrencyLKR(kpis.totalInventoryValue)}
          subtitle="Cost basis in warehouse/showroom"
          icon={Package}
          variant="default"
        />
        <StatCard
          title="Active Orders"
          value={kpis.totalOrdersCount}
          subtitle={`${kpis.activeCustomersCount} Active accounts`}
          icon={ShoppingCart}
          variant="default"
        />
      </div>

      {/* Revenue vs Collection & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Breakdown: Invoices vs POS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-4">
              <span>Sales Channels: B2B Invoices vs Showroom POS</span>
              <Badge variant="outline" className="text-xs">
                Total: {formatCurrencyLKR(salesReport.totalSales)}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToCSV(
                  `Executive_Overview_KPIs_${timestamp}`,
                  ['Metric', 'Value (LKR / Count)'],
                  [
                    ['Gross Revenue', kpis.grossRevenue],
                    ['Total Collections', kpis.totalCollected],
                    ['Outstanding Receivables', kpis.totalOutstanding],
                    ['Overdue Receivables', kpis.totalOverdue],
                    ['Inventory Valuation', kpis.totalInventoryValue],
                    ['Active Orders', kpis.totalOrdersCount],
                    ['Active Customers', kpis.activeCustomersCount],
                  ]
                );
              }}
              className="h-8 gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export KPIs</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* B2B Invoices */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span>Commercial B2B Tax Invoices</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      {formatCurrencyLKR(salesReport.invoiceSales)}
                    </span>
                    <span className="text-slate-400 ml-2">({invoiceShare}%)</span>
                  </div>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${invoiceShare}%` }}
                  />
                </div>
              </div>

              {/* Showroom POS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Showroom Retail / Walk-in POS</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      {formatCurrencyLKR(salesReport.posSales)}
                    </span>
                    <span className="text-slate-400 ml-2">({posShare}%)</span>
                  </div>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${posShare}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500">Total Sales Transactions</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{salesReport.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Average Transaction Value</p>
                <p className="text-xl font-bold text-primary mt-1">
                  {formatCurrencyLKR(salesReport.averageOrderValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue vs Collection Realization */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-4">
              <span>Financial Realization & Liquidity</span>
              <Badge
                variant={collectionRate >= 80 ? 'default' : 'secondary'}
                className="text-xs"
              >
                Realized: {collectionRate}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Gross Billed Sales:</span>
                <span className="font-bold text-slate-900">{formatCurrencyLKR(kpis.grossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-700 font-medium">Approved Collections Received:</span>
                <span className="font-bold text-emerald-700">{formatCurrencyLKR(kpis.totalCollected)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-700 font-medium">Uncollected Receivables:</span>
                <span className="font-bold text-amber-700">{formatCurrencyLKR(kpis.totalOutstanding)}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-rose-700 font-medium">Critical Overdue Balance:</span>
                <span className="font-bold text-rose-700">{formatCurrencyLKR(kpis.totalOverdue)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary-light/50 border border-primary-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary text-white">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Working Capital Position
                  </h4>
                  <p className="text-xs text-primary-text">
                    Net cash collected vs customer credit exposure
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-indigo-900">
                  {formatCurrencyLKR(kpis.totalCollected - kpis.totalOverdue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend by Date */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold text-slate-900">
            Daily Sales Activity Ledger
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const timestamp = new Date().toISOString().split('T')[0];
              exportToCSV(
                `Daily_Sales_Ledger_${timestamp}`,
                ['Date', 'Daily Sales Amount (LKR)', 'Share of Total Revenue'],
                salesReport.salesByDate.map((item) => {
                  const pct = salesReport.totalSales > 0 ? Math.round((item.amount / salesReport.totalSales) * 1000) / 10 : 0;
                  return [item.date, item.amount, `${pct}%`];
                })
              );
            }}
            className="h-8 gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download CSV</span>
          </Button>
        </CardHeader>
        <CardContent>
          {salesReport.salesByDate.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              No sales recorded for the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Daily Sales Amount (LKR)</th>
                    <th className="py-2.5 px-4 text-right">Share of Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport.salesByDate.map((item) => {
                    const pct =
                      salesReport.totalSales > 0
                        ? Math.round((item.amount / salesReport.totalSales) * 1000) / 10
                        : 0;
                    return (
                      <tr key={item.date} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-medium text-slate-800">{item.date}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {formatCurrencyLKR(item.amount)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
