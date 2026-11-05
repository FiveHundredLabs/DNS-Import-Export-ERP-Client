import { useState } from 'react';
import { Users2 } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, pct, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_REP_PERFORMANCE, REP_PERF_KPIS, type SalesRepPerfRow } from '../shared/reportMockData';

const COLS: TableCol<SalesRepPerfRow>[] = [
  { key: 'repName', label: 'Sales Rep', sortable: true },
  { key: 'area', label: 'Area' },
  { key: 'customers', label: 'Customers', align: 'right', sortable: true },
  { key: 'deliveredOrders', label: 'Delivered Orders', align: 'right', sortable: true },
  { key: 'revenue', label: 'Revenue', align: 'right', sortable: true, render: (r) => lkr(r.revenue) },
  { key: 'target', label: 'Target', align: 'right', render: (r) => lkr(r.target) },
  { key: 'achievement', label: 'Achievement', align: 'center', sortable: true,
    render: (r) => (
      <span className={`font-semibold ${r.achievement >= 100 ? 'text-emerald-600' : r.achievement >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
        {pct(r.achievement)}
      </span>
    )
  },
  { key: 'collections', label: 'Collections', align: 'right', render: (r) => lkr(r.collections) },
];

export function SalesRepPerformanceReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Sales Rep Performance Report"
      subtitle="Representative-wise delivered sales, customer coverage, revenue vs target, and collections."
      badge="Rep Analytics"
      badgeColor="bg-purple-50 text-purple-700 border-purple-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Reps" value={REP_PERF_KPIS.totalReps.toString()} sub="Field sales reps" color="default" />
        <KpiCard label="Total Revenue" value={lkr(REP_PERF_KPIS.totalRevenue)} sub="All delivered" color="green" />
        <KpiCard label="Avg Achievement" value={pct(REP_PERF_KPIS.avgAchievement)} sub="vs target" color="blue" />
        <KpiCard label="Top Performer" value={REP_PERF_KPIS.topRep} sub="Highest achievement" color="purple" />
      </div>

      <div className="flex items-center gap-2">
        <Users2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Rep Performance Breakdown</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_REP_PERFORMANCE as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

