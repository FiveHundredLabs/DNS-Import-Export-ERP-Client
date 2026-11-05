import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_PURCHASE_RETURNS, RETURNS_KPIS, type PurchaseReturnRow } from '../shared/reportMockData';

const COLS: TableCol<PurchaseReturnRow>[] = [
  { key: 'returnRef', label: 'Return Ref', sortable: true },
  { key: 'grnRef', label: 'GRN Ref' },
  { key: 'supplier', label: 'Supplier', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'reason', label: 'Reason' },
  { key: 'qty', label: 'Return Qty', align: 'right' },
  { key: 'value', label: 'Return Value', align: 'right', sortable: true, render: (r) => lkr(r.value) },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status} variant={r.status === 'APPROVED' ? 'green' : 'amber'} /> },
];

export function PurchaseReturnReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/purchasing" backLabel="Back to Purchasing Reports" title="Purchase Return Report" subtitle="Goods returned to suppliers — quantities, reasons, values, and return status." badge="Returns" badgeColor="bg-amber-50 text-amber-700 border-amber-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Returns" value={RETURNS_KPIS.totalReturns.toString()} sub="All return notes" color="default" />
        <KpiCard label="Total Value" value={lkr(RETURNS_KPIS.totalValue)} sub="Goods returned" color="amber" />
        <KpiCard label="Approved" value={RETURNS_KPIS.approved.toString()} sub="Processed returns" color="green" />
        <KpiCard label="Pending" value={RETURNS_KPIS.pending.toString()} sub="Awaiting approval" color="amber" />
      </div>
      <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Purchase Return History</span></div>
      <SortableTable columns={COLS} data={MOCK_PURCHASE_RETURNS as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

