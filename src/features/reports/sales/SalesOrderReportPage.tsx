import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_SALES_ORDERS, SALES_ORDER_STATUS_COUNTS, type SalesOrderRow } from '../shared/reportMockData';

const statusVariant = (s: string) => {
  const map: Record<string, any> = {
    DELIVERED: 'green', APPROVED: 'blue', DISPATCHED: 'purple',
    PENDING_APPROVAL: 'amber', DRAFT: 'slate', REJECTED: 'red', CANCELLED: 'red',
  };
  return map[s] ?? 'slate';
};

const COLS: TableCol<SalesOrderRow>[] = [
  { key: 'orderNumber', label: 'Order No.', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'area', label: 'Area' },
  { key: 'rep', label: 'Sales Rep' },
  { key: 'amount', label: 'Amount', align: 'right', sortable: true, render: (r) => lkr(r.amount) },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status.replace('_', ' ')} variant={statusVariant(r.status)} /> },
];

export function SalesOrderReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  const [statusFilter, setStatusFilter] = useState('ALL');

  const statuses = ['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'REJECTED', 'CANCELLED'];
  const filtered = statusFilter === 'ALL' ? MOCK_SALES_ORDERS : MOCK_SALES_ORDERS.filter(o => o.status === statusFilter);

  const c = SALES_ORDER_STATUS_COUNTS;

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Sales Order Report"
      subtitle="Complete order lifecycle — created, approved, dispatched, delivered, and cancelled orders."
      badge="Order Status"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Draft', val: c.DRAFT, color: 'slate' as const },
          { label: 'Pending', val: c.PENDING_APPROVAL, color: 'amber' as const },
          { label: 'Approved', val: c.APPROVED, color: 'blue' as const },
          { label: 'Dispatched', val: c.DISPATCHED, color: 'purple' as const },
          { label: 'Delivered', val: c.DELIVERED, color: 'green' as const },
          { label: 'Rejected', val: c.REJECTED, color: 'red' as const },
          { label: 'Cancelled', val: c.CANCELLED, color: 'red' as const },
        ].map(({ label, val, color }) => (
          <KpiCard key={label} label={label} value={val.toString()} color={color} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Orders List</span>
        <span className="text-xs text-slate-400">— {filtered.length} orders</span>
      </div>

      <SortableTable columns={COLS} data={filtered as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

