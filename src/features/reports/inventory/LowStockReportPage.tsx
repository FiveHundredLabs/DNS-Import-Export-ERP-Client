import { AlertTriangle } from 'lucide-react';
import { ReportPageShell, KpiCard, SortableTable, StatusPill, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_LOW_STOCK, LOW_STOCK_KPIS, type LowStockRow } from '../shared/reportMockData';

const statusVariant = (s: string) => {
  const m: Record<string, any> = { CRITICAL: 'red', LOW: 'amber' };
  return m[s] ?? 'slate';
};

const COLS: TableCol<LowStockRow>[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'currentQty', label: 'Current Qty', align: 'right', sortable: true, render: (r) => <span className={r.status === 'CRITICAL' ? 'text-red-600 font-bold' : 'text-amber-600 font-semibold'}>{r.currentQty}</span> },
  { key: 'reorderLevel', label: 'Reorder Level', align: 'right' },
  { key: 'reorderQty', label: 'Reorder Qty', align: 'right' },
  { key: 'supplier', label: 'Preferred Supplier' },
  { key: 'avgLeadDays', label: 'Lead Days', align: 'center' },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status} variant={statusVariant(r.status)} /> },
];

export function LowStockReportPage() {
  return (
    <ReportPageShell backPath="/reports/inventory" backLabel="Back to Inventory Reports" title="Low Stock & Reorder Report" subtitle="Products below minimum stock levels, configured reorder levels, and required reorder quantities." badge="Reorder Alert" badgeColor="bg-red-50 text-red-700 border-red-200">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
        <span className="font-semibold">⚠ Action Required:</span> {LOW_STOCK_KPIS.requireImmediate} product(s) are critically low and require immediate purchase orders.
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Critical Stock" value={LOW_STOCK_KPIS.critical.toString()} sub="Immediate action needed" color="red" />
        <KpiCard label="Low Stock" value={LOW_STOCK_KPIS.low.toString()} sub="Below reorder level" color="amber" />
        <KpiCard label="Total Items" value={LOW_STOCK_KPIS.totalItems.toString()} sub="Requiring replenishment" color="default" />
        <KpiCard label="Immediate PO" value={LOW_STOCK_KPIS.requireImmediate.toString()} sub="CRITICAL items" color="red" />
      </div>
      <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold text-slate-700">Low Stock Products — Action Required</span></div>
      <SortableTable columns={COLS} data={MOCK_LOW_STOCK as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

