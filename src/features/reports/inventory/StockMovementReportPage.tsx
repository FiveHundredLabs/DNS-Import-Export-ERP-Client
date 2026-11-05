import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_STOCK_MOVEMENTS, MOVEMENT_KPIS, type StockMovementRow } from '../shared/reportMockData';

const movVariant = (t: string) => {
  const m: Record<string, any> = { IN: 'green', OUT: 'blue', TRANSFER: 'purple', ADJUSTMENT: 'amber' };
  return m[t] ?? 'slate';
};

const COLS: TableCol<StockMovementRow>[] = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'movementType', label: 'Type', align: 'center', render: (r) => <StatusPill label={r.movementType} variant={movVariant(r.movementType)} /> },
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product', sortable: true },
  { key: 'qty', label: 'Qty', align: 'right', sortable: true, render: (r) => <span className={r.qty < 0 ? 'text-red-600 font-medium' : ''}>{r.qty > 0 ? `+${r.qty}` : r.qty}</span> },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'reference', label: 'Reference' },
  { key: 'handledBy', label: 'Handled By' },
];

export function StockMovementReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  const [typeFilter, setTypeFilter] = useState('ALL');
  const types = ['ALL', 'IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'];
  const filtered = typeFilter === 'ALL' ? MOCK_STOCK_MOVEMENTS : MOCK_STOCK_MOVEMENTS.filter((m) => m.movementType === typeFilter);

  return (
    <ReportPageShell backPath="/reports/inventory" backLabel="Back to Inventory Reports" title="Stock Movement Report" subtitle="Stock IN (GRN receipts), OUT (dispatch), TRANSFER between locations, and ADJUSTMENT records." badge="Movement Audit" badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
      toolbar={
        <ReportFilterBar dateRange={dr} onChange={setDr}
          extraFilters={
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 text-xs rounded-md border border-slate-200 bg-white px-2 text-slate-700">
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          }
        />
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Stock IN" value={MOVEMENT_KPIS.totalIn.toString()} sub="GRN receipts" color="green" />
        <KpiCard label="Stock OUT" value={MOVEMENT_KPIS.totalOut.toString()} sub="Dispatch movements" color="blue" />
        <KpiCard label="Transfers" value={MOVEMENT_KPIS.transfers.toString()} sub="Between locations" color="purple" />
        <KpiCard label="Adjustments" value={MOVEMENT_KPIS.adjustments.toString()} sub="Variance corrections" color="amber" />
      </div>
      <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Movement History — {filtered.length} records</span></div>
      <SortableTable columns={COLS} data={filtered as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

