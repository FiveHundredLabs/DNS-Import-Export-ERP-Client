import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_PURCHASE_OUTSTANDING, PURCHASE_OUTSTANDING_KPIS, type PurchaseOutstandingRow } from '../shared/reportMockData';

const COLS: TableCol<PurchaseOutstandingRow>[] = [
  { key: 'invoiceRef', label: 'Invoice Ref', sortable: true },
  { key: 'supplier', label: 'Supplier', sortable: true },
  { key: 'invoiceDate', label: 'Invoice Date', sortable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
  { key: 'amount', label: 'Invoice Amt', align: 'right', render: (r) => lkr(r.amount) },
  { key: 'paid', label: 'Paid', align: 'right', render: (r) => lkr(r.paid) },
  { key: 'outstanding', label: 'Outstanding', align: 'right', sortable: true, render: (r) => r.outstanding > 0 ? <span className="font-semibold text-red-600">{lkr(r.outstanding)}</span> : <span className="text-emerald-600">Paid</span> },
  { key: 'daysOverdue', label: 'Days Overdue', align: 'center', sortable: true, render: (r) => r.daysOverdue > 0 ? <span className="text-red-600 font-semibold">{r.daysOverdue}</span> : <span className="text-emerald-600">Current</span> },
];

export function PurchaseOutstandingReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/purchasing" backLabel="Back to Purchasing Reports" title="Purchase Outstanding Report" subtitle="Unpaid supplier invoices, outstanding amounts, due dates, and overdue payables." badge="AP Aging" badgeColor="bg-red-50 text-red-700 border-red-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Outstanding" value={lkr(PURCHASE_OUTSTANDING_KPIS.totalOutstanding)} sub="All payables" color="red" />
        <KpiCard label="Current" value={lkr(PURCHASE_OUTSTANDING_KPIS.current)} sub="Within terms" color="blue" />
        <KpiCard label="Overdue" value={lkr(PURCHASE_OUTSTANDING_KPIS.overdue)} sub="Past due date" color="amber" />
        <KpiCard label="Total Invoices" value={PURCHASE_OUTSTANDING_KPIS.totalInvoices.toString()} sub="Open payables" color="default" />
      </div>
      <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /><span className="text-sm font-semibold text-slate-700">Outstanding Payables Detail</span></div>
      <SortableTable columns={COLS} data={MOCK_PURCHASE_OUTSTANDING as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

