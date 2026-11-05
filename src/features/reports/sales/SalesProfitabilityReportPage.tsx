import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, pct, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_PROFITABILITY, PROFIT_KPIS, type ProfitRow } from '../shared/reportMockData';

const COLS: TableCol<ProfitRow>[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'qtySold', label: 'Qty', align: 'right', sortable: true },
  { key: 'revenue', label: 'Revenue', align: 'right', sortable: true, render: (r) => lkr(r.revenue) },
  { key: 'cogs', label: 'COGS', align: 'right', render: (r) => lkr(r.cogs) },
  { key: 'grossProfit', label: 'Gross Profit', align: 'right', sortable: true, render: (r) => <span className="font-semibold text-emerald-600">{lkr(r.grossProfit)}</span> },
  { key: 'margin', label: 'GP Margin', align: 'center', sortable: true,
    render: (r) => (
      <div className="flex items-center gap-1.5 justify-center">
        <div className="w-14 bg-slate-100 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(r.margin, 100)}%` }} />
        </div>
        <span className="font-semibold text-emerald-700">{pct(r.margin)}</span>
      </div>
    )
  },
];

export function SalesProfitabilityReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Sales Profitability Report"
      subtitle="Product-wise revenue vs COGS (landed cost), gross profit, and GP margin analysis."
      badge="Gross Margin"
      badgeColor="bg-violet-50 text-violet-700 border-violet-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={lkr(PROFIT_KPIS.totalRevenue)} sub="All products" color="default" />
        <KpiCard label="Total COGS" value={lkr(PROFIT_KPIS.totalCOGS)} sub="Landed cost based" color="amber" />
        <KpiCard label="Gross Profit" value={lkr(PROFIT_KPIS.grossProfit)} sub="Revenue minus COGS" color="green" />
        <KpiCard label="Avg GP Margin" value={pct(PROFIT_KPIS.avgMargin)} sub="Blended margin" color="purple" />
      </div>

      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Product-wise Profitability</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_PROFITABILITY as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

