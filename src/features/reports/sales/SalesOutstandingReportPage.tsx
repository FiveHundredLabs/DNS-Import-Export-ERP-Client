import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_OUTSTANDING, OUTSTANDING_KPIS, type OutstandingRow } from '../shared/reportMockData';

const agingVariant = (aging: string) => {
  const m: Record<string, any> = { '01–30 days': 'amber', '31–60 days': 'red', '61–90 days': 'red', '90+ days': 'red' };
  return m[aging] ?? 'slate';
};

const COLS: TableCol<OutstandingRow>[] = [
  { key: 'invoiceNo', label: 'Invoice No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'area', label: 'Area' },
  { key: 'invoiceDate', label: 'Invoice Date', sortable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
  { key: 'invoiceAmount', label: 'Invoice Amt', align: 'right', render: (r) => lkr(r.invoiceAmount) },
  { key: 'paidAmount', label: 'Paid', align: 'right', render: (r) => lkr(r.paidAmount) },
  { key: 'outstanding', label: 'Outstanding', align: 'right', sortable: true, render: (r) => <span className="font-semibold text-red-600">{lkr(r.outstanding)}</span> },
  { key: 'daysOverdue', label: 'Days Overdue', align: 'center', sortable: true, render: (r) => r.daysOverdue > 0 ? <span className="text-red-600 font-semibold">{r.daysOverdue}</span> : <span className="text-emerald-600">Current</span> },
  { key: 'aging', label: 'Aging Bucket', align: 'center', render: (r) => <StatusPill label={r.aging} variant={agingVariant(r.aging)} /> },
];

export function SalesOutstandingReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Sales Outstanding Report"
      subtitle="Customer-wise unpaid invoices with aging buckets, overdue tracking, and outstanding balances."
      badge="Aging Analysis"
      badgeColor="bg-red-50 text-red-700 border-red-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Outstanding" value={lkr(OUTSTANDING_KPIS.totalOutstanding)} sub="All unpaid invoices" color="red" />
        <KpiCard label="Current (≤30d)" value={lkr(OUTSTANDING_KPIS.current)} sub="Within credit period" color="green" />
        <KpiCard label="Overdue 1–30d" value={lkr(OUTSTANDING_KPIS.overdue30)} sub="Slightly overdue" color="amber" />
        <KpiCard label="Overdue 31–60d" value={lkr(OUTSTANDING_KPIS.overdue60)} sub="Needs follow-up" color="red" />
        <KpiCard label="90+ Days" value={lkr(OUTSTANDING_KPIS.overduePlus90)} sub="Critical overdue" color="red" />
      </div>

      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm font-semibold text-slate-700">Outstanding Invoice Detail</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_OUTSTANDING as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

