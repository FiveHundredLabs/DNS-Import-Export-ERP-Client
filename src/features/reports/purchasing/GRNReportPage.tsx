import { useState } from 'react';
import { Package } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_GRN, GRN_KPIS, type GRNRow } from '../shared/reportMockData';

const COLS: TableCol<GRNRow>[] = [
  { key: 'grnNumber', label: 'GRN No.', sortable: true },
  { key: 'poNumber', label: 'PO Ref' },
  { key: 'supplier', label: 'Supplier', sortable: true },
  { key: 'receivedDate', label: 'Received Date', sortable: true },
  { key: 'items', label: 'Items', align: 'center' },
  { key: 'value', label: 'GRN Value', align: 'right', sortable: true, render: (r) => lkr(r.value) },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status} variant={r.status === 'APPROVED' ? 'green' : 'amber'} /> },
  { key: 'receivedBy', label: 'Received By' },
];

export function GRNReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/purchasing" backLabel="Back to Purchasing Reports" title="GRN Report" subtitle="Goods received note history — quantities, dates, statuses, and supplier-wise receipts." badge="Goods Receipt" badgeColor="bg-sky-50 text-sky-700 border-sky-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total GRNs" value={GRN_KPIS.totalGRNs.toString()} sub="All receipts" color="default" />
        <KpiCard label="Approved" value={GRN_KPIS.approved.toString()} sub="Signed off" color="green" />
        <KpiCard label="Submitted" value={GRN_KPIS.submitted.toString()} sub="Awaiting approval" color="amber" />
        <KpiCard label="Total GRN Value" value={lkr(GRN_KPIS.totalValue)} sub="Goods received" color="blue" />
      </div>
      <div className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">GRN History</span></div>
      <SortableTable columns={COLS} data={MOCK_GRN as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

