import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_SUPPLIER_PAYMENTS, SUPPLIER_PAYMENT_KPIS, type SupplierPaymentRow } from '../shared/reportMockData';

const COLS: TableCol<SupplierPaymentRow>[] = [
  { key: 'paymentRef', label: 'Payment Ref', sortable: true },
  { key: 'supplier', label: 'Supplier', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'method', label: 'Method', render: (r) => r.method.replace('_', ' ') },
  { key: 'poRef', label: 'PO Ref' },
  { key: 'amount', label: 'Amount', align: 'right', sortable: true, render: (r) => lkr(r.amount) },
  { key: 'status', label: 'Status', align: 'center', render: (r) => <StatusPill label={r.status} variant={r.status === 'PAID' ? 'green' : 'amber'} /> },
];

export function SupplierPaymentReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/purchasing" backLabel="Back to Purchasing Reports" title="Supplier Payment Report" subtitle="Supplier-wise AP payment history, payment method breakdown, and outstanding balances." badge="Supplier AP" badgeColor="bg-green-50 text-green-700 border-green-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Paid" value={lkr(SUPPLIER_PAYMENT_KPIS.totalPaid)} sub="Settled payments" color="green" />
        <KpiCard label="Total Pending" value={lkr(SUPPLIER_PAYMENT_KPIS.totalPending)} sub="Awaiting payment" color="amber" />
        <KpiCard label="Total Payments" value={SUPPLIER_PAYMENT_KPIS.totalPayments.toString()} sub="All transactions" color="default" />
        <KpiCard label="Avg Payment" value={lkr(SUPPLIER_PAYMENT_KPIS.avgPayment)} sub="Per payment" color="blue" />
      </div>
      <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Supplier Payment History</span></div>
      <SortableTable columns={COLS} data={MOCK_SUPPLIER_PAYMENTS as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

