import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_PO_LIST, PO_STATUS_COUNTS, PO_KPIS, type PORow } from '../shared/reportMockData';

const statusVariant = (s: string) => {
  const m: Record<string, any> = { RECEIVED: 'green', APPROVED: 'blue', PENDING_APPROVAL: 'amber', DRAFT: 'slate', CANCELLED: 'red', REJECTED: 'red' };
  return m[s] ?? 'slate';
};

const COLS: TableCol<PORow>[] = [
  { key: 'poNumber', label: 'PO Number', sortable: true },
  { key: 'supplier', label: 'Supplier', sortable: true },
  { key: 'date', label: 'PO Date', sortable: true },
  { key: 'expectedDelivery', label: 'Expected Delivery' },
  { key: 'amount', label: 'Amount', align: 'right', sortable: true, render: (r) => lkr(r.amount) },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status.replace('_', ' ')} variant={statusVariant(r.status)} /> },
];

export function POReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  const [statusFilter, setStatusFilter] = useState('ALL');

  const statuses = ['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RECEIVED', 'CANCELLED', 'REJECTED'];
  const filtered = statusFilter === 'ALL' ? MOCK_PO_LIST : MOCK_PO_LIST.filter((o) => o.status === statusFilter);
  const c = PO_STATUS_COUNTS;

  return (
    <ReportPageShell
      backPath="/reports/purchasing"
      backLabel="Back to Purchasing Reports"
      title="Purchase Order Report"
      subtitle="Complete PO list with status breakdown — draft, pending, approved, received, cancelled and rejected."
      badge="PO Status"
      badgeColor="bg-blue-50 text-blue-700 border-blue-200"
      toolbar={
        <ReportFilterBar
          dateRange={dr}
          onChange={setDr}
          extraFilters={
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs rounded-md border border-slate-200 bg-white px-2 text-slate-700"
            >
              {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          }
        />
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Draft', val: c.DRAFT, color: 'slate' as const },
          { label: 'Pending', val: c.PENDING_APPROVAL, color: 'amber' as const },
          { label: 'Approved', val: c.APPROVED, color: 'blue' as const },
          { label: 'Received', val: c.RECEIVED, color: 'green' as const },
          { label: 'Cancelled', val: c.CANCELLED, color: 'red' as const },
          { label: 'Rejected', val: c.REJECTED, color: 'red' as const },
        ].map(({ label, val, color }) => <KpiCard key={label} label={label} value={val.toString()} color={color} />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total PO Value" value={lkr(PO_KPIS.totalValue)} sub="All POs" color="default" />
        <KpiCard label="Pending Value" value={lkr(PO_KPIS.pendingValue)} sub="Draft + Pending" color="amber" />
        <KpiCard label="Received Value" value={lkr(PO_KPIS.receivedValue)} sub="Goods received" color="green" />
      </div>
      <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Purchase Orders — {filtered.length}</span></div>
      <SortableTable columns={COLS} data={filtered as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

