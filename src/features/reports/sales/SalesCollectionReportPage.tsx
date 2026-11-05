import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_COLLECTIONS, COLLECTION_KPIS, type CollectionRow } from '../shared/reportMockData';

const statusVariant = (s: string) => {
  const m: Record<string, any> = { CLEARED: 'green', PENDING: 'amber', BOUNCED: 'red' };
  return m[s] ?? 'slate';
};

const COLS: TableCol<CollectionRow>[] = [
  { key: 'receiptNo', label: 'Receipt No.', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'rep', label: 'Sales Rep' },
  { key: 'area', label: 'Area' },
  { key: 'method', label: 'Method', render: (r) => r.method.replace('_', ' ') },
  { key: 'amount', label: 'Amount', align: 'right', sortable: true, render: (r) => lkr(r.amount) },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status} variant={statusVariant(r.status)} /> },
];

export function SalesCollectionReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Sales Collection Report"
      subtitle="Customer and rep-wise collections with payment method breakdown and clearing status."
      badge="Collections"
      badgeColor="bg-green-50 text-green-700 border-green-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Collected" value={lkr(COLLECTION_KPIS.totalCollected)} sub="All approved receipts" color="green" />
        <KpiCard label="Cheque" value={lkr(COLLECTION_KPIS.cheque)} sub="Cheque payments" color="blue" />
        <KpiCard label="Bank Transfer" value={lkr(COLLECTION_KPIS.bankTransfer)} sub="Online transfers" color="default" />
        <KpiCard label="Cash" value={lkr(COLLECTION_KPIS.cash)} sub="Cash collections" color="amber" />
        <KpiCard label="Bounced" value={lkr(COLLECTION_KPIS.bounced)} sub="Returned cheques" color="red" />
      </div>

      <div className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Collection History</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_COLLECTIONS as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

