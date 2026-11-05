import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_SALES_SUMMARY, SALES_SUMMARY_KPIS, type SalesSummaryRow } from '../shared/reportMockData';

const COLS: TableCol<SalesSummaryRow>[] = [
  { key: 'period', label: 'Period', sortable: true },
  { key: 'orders', label: 'Total Orders', align: 'right', sortable: true },
  { key: 'delivered', label: 'Delivered', align: 'right', sortable: true },
  { key: 'revenue', label: 'Gross Revenue', align: 'right', sortable: true, render: (r) => lkr(r.revenue) },
  { key: 'returns', label: 'Returns', align: 'right', render: (r) => lkr(r.returns) },
  { key: 'netRevenue', label: 'Net Revenue', align: 'right', sortable: true, render: (r) => <span className="font-semibold">{lkr(r.netRevenue)}</span> },
];

export function SalesSummaryReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Sales Summary Report"
      subtitle="Daily, monthly, quarterly, and yearly sales totals with revenue trends."
      badge="Period Trends"
      badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue (YTD)" value={lkr(SALES_SUMMARY_KPIS.totalRevenue)} sub="All delivered orders" color="default" />
        <KpiCard label="Delivered Orders" value={SALES_SUMMARY_KPIS.totalDelivered.toString()} sub="Completed deliveries" color="green" />
        <KpiCard label="Avg Order Value" value={lkr(SALES_SUMMARY_KPIS.avgOrderValue)} sub="Per delivered order" color="blue" />
        <KpiCard label="Total Returns" value={lkr(SALES_SUMMARY_KPIS.totalReturns)} sub="Goods returned" color="amber" />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Monthly Breakdown</span>
        <span className="text-xs text-slate-400">— Showing last 6 months</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_SALES_SUMMARY} />
    </ReportPageShell>
  );
}

