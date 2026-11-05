import { useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, pct, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_COST_ANALYSIS, COST_KPIS, type CostAnalysisRow } from '../shared/reportMockData';

const COLS: TableCol<CostAnalysisRow>[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'avgPurchasePrice', label: 'Avg Purchase', align: 'right', sortable: true, render: (r) => lkr(r.avgPurchasePrice) },
  { key: 'landedCost', label: 'Landed Cost', align: 'right', sortable: true, render: (r) => lkr(r.landedCost) },
  { key: 'sellingPrice', label: 'Selling Price', align: 'right', render: (r) => lkr(r.sellingPrice) },
  { key: 'margin', label: 'GP Margin', align: 'center', sortable: true, render: (r) => <span className={`font-semibold ${r.margin >= 35 ? 'text-emerald-600' : r.margin >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{pct(r.margin)}</span> },
  { key: 'lastPurchase', label: 'Last Purchase', sortable: true },
];

export function PurchaseCostAnalysisPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/purchasing" backLabel="Back to Purchasing Reports" title="Purchase Cost Analysis" subtitle="Product-wise purchase costs, landed cost vs selling price, and gross margin analysis." badge="Landed Cost" badgeColor="bg-violet-50 text-violet-700 border-violet-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiCard label="Avg GP Margin" value={pct(COST_KPIS.avgMargin)} sub="Blended margin" color="green" />
        <KpiCard label="Highest Margin" value={COST_KPIS.highestMargin} color="blue" />
        <KpiCard label="Lowest Margin" value={COST_KPIS.lowestMargin} color="amber" />
      </div>
      <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Cost vs Sell Price Analysis</span></div>
      <SortableTable columns={COLS} data={MOCK_COST_ANALYSIS as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

