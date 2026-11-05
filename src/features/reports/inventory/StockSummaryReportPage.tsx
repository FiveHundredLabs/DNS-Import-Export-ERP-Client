import { useState } from 'react';
import { Boxes } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_STOCK_SUMMARY, STOCK_KPIS, type StockSummaryRow } from '../shared/reportMockData';

const statusVariant = (s: string) => {
  const m: Record<string, any> = { OK: 'green', LOW: 'amber', CRITICAL: 'red' };
  return m[s] ?? 'slate';
};

const COLS: TableCol<StockSummaryRow>[] = [
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'warehouse', label: 'Warehouse', align: 'right', sortable: true },
  { key: 'showroom', label: 'Showroom', align: 'right' },
  { key: 'reserved', label: 'Reserved', align: 'right' },
  { key: 'damaged', label: 'Damaged', align: 'right', render: (r) => r.damaged > 0 ? <span className="text-red-500 font-medium">{r.damaged}</span> : '—' },
  { key: 'available', label: 'Available', align: 'right', sortable: true, render: (r) => <span className="font-semibold">{r.available}</span> },
  { key: 'reorderLevel', label: 'Reorder Lvl', align: 'right' },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status} variant={statusVariant(r.status)} /> },
];

export function StockSummaryReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/inventory" backLabel="Back to Inventory Reports" title="Stock Summary Report" subtitle="Current stock by product — warehouse, showroom, reserved, damaged, and available quantities." badge="Live Stock" badgeColor="bg-blue-50 text-blue-700 border-blue-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total SKUs" value={STOCK_KPIS.totalSKUs.toString()} sub="All products" color="default" />
        <KpiCard label="Warehouse Stock" value={STOCK_KPIS.totalWarehouse.toLocaleString()} sub="Units (WH-MAIN)" color="blue" />
        <KpiCard label="Showroom Stock" value={STOCK_KPIS.totalShowroom.toLocaleString()} sub="Units (SR-MAIN)" color="purple" />
        <KpiCard label="Low Stock" value={STOCK_KPIS.lowStock.toString()} sub="Below reorder" color="amber" />
        <KpiCard label="Critical" value={STOCK_KPIS.criticalStock.toString()} sub="Urgent replenishment" color="red" />
      </div>
      <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Stock by Product</span></div>
      <SortableTable columns={COLS} data={MOCK_STOCK_SUMMARY as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

