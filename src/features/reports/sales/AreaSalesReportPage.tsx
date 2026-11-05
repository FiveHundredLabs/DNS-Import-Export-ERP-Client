import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, pct, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_AREA_SALES, AREA_KPIS, type AreaSalesRow } from '../shared/reportMockData';

const COLS: TableCol<AreaSalesRow>[] = [
  { key: 'area', label: 'Area', sortable: true },
  { key: 'region', label: 'Region' },
  { key: 'manager', label: 'Area Manager' },
  { key: 'orders', label: 'Total Orders', align: 'right', sortable: true },
  { key: 'delivered', label: 'Delivered', align: 'right', sortable: true },
  { key: 'revenue', label: 'Revenue', align: 'right', sortable: true, render: (r) => lkr(r.revenue) },
  { key: 'target', label: 'Target', align: 'right', render: (r) => lkr(r.target) },
  { key: 'achievement', label: 'Achievement', align: 'center', sortable: true,
    render: (r) => (
      <span className={`font-semibold ${r.achievement >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
        {pct(r.achievement)}
      </span>
    )
  },
];

export function AreaSalesReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Area-wise Sales Report"
      subtitle="Area-level sales performance — revenue, delivered orders, and target achievement by area."
      badge="Area Breakdown"
      badgeColor="bg-sky-50 text-sky-700 border-sky-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Areas" value={AREA_KPIS.totalAreas.toString()} sub="Active distribution areas" color="default" />
        <KpiCard label="Total Revenue" value={lkr(AREA_KPIS.totalRevenue)} sub="All areas combined" color="green" />
        <KpiCard label="Avg Achievement" value={pct(AREA_KPIS.avgAchievement)} sub="vs area targets" color="blue" />
        <KpiCard label="Top Area" value={AREA_KPIS.topArea} sub="Highest revenue area" color="purple" />
      </div>

      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Area Performance Table</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_AREA_SALES as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

