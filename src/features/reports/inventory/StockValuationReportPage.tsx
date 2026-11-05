import { useState } from 'react';
import { Scale } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_STOCK_VALUATION, VALUATION_KPIS, type ValuationRow } from '../shared/reportMockData';

const COLS: TableCol<ValuationRow>[] = [
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'totalQty', label: 'Total Qty', align: 'right', sortable: true },
  { key: 'landedCost', label: 'Landed Cost (ea)', align: 'right', sortable: true, render: (r) => lkr(r.landedCost) },
  { key: 'totalValue', label: 'Stock Value', align: 'right', sortable: true, render: (r) => <span className="font-semibold">{lkr(r.totalValue)}</span> },
];

export function StockValuationReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/inventory" backLabel="Back to Inventory Reports" title="Stock Valuation Report" subtitle="Current inventory value using landed cost — product-wise valuation and total inventory value." badge="Landed Cost" badgeColor="bg-violet-50 text-violet-700 border-violet-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Inventory Value" value={lkr(VALUATION_KPIS.totalInventoryValue)} sub="All locations" color="default" />
        <KpiCard label="Warehouse Value" value={lkr(VALUATION_KPIS.warehouseValue)} sub="WH-MAIN" color="blue" />
        <KpiCard label="Showroom Value" value={lkr(VALUATION_KPIS.showroomValue)} sub="SR-MAIN" color="purple" />
        <KpiCard label="Total SKUs" value={VALUATION_KPIS.totalSKUs.toString()} sub="Valued products" color="green" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">Valuation Method:</span> Landed cost per unit × current available quantity. Landed cost includes purchase price, customs duty, freight, and other import charges.
      </div>
      <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Product-wise Valuation</span></div>
      <SortableTable columns={COLS} data={MOCK_STOCK_VALUATION as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

