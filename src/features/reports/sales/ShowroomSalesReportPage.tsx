import { useState } from 'react';
import { Store } from 'lucide-react';
import { useSmartBack } from '../../../hooks/useSmartBack';
import { useAuth } from '../../../hooks/useAuth';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_SHOWROOM_SALES, SHOWROOM_KPIS, type ShowroomRow } from '../shared/reportMockData';

const COLS: TableCol<ShowroomRow>[] = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'txnRef', label: 'Transaction Ref' },
  { key: 'cashier', label: 'Cashier' },
  { key: 'items', label: 'Items', align: 'center' },
  { key: 'cash', label: 'Cash', align: 'right', render: (r) => r.cash > 0 ? lkr(r.cash) : '—' },
  { key: 'card', label: 'Card', align: 'right', render: (r) => r.card > 0 ? lkr(r.card) : '—' },
  { key: 'cheque', label: 'Cheque', align: 'right', render: (r) => r.cheque > 0 ? lkr(r.cheque) : '—' },
  { key: 'total', label: 'Total', align: 'right', sortable: true, render: (r) => <span className="font-semibold">{lkr(r.total)}</span> },
];

export function ShowroomSalesReportPage() {
  const { role } = useAuth();
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  const goBack = useSmartBack('/reports');
  const isShowroomManager = role === 'SHOWROOM_MANAGER';

  return (
    <ReportPageShell
      backPath="/reports"
      backLabel="Back to Reports"
      onBack={goBack}
      hideBack={isShowroomManager}
      title="Showroom Sales Report"
      subtitle="POS counter sales — daily revenue, payment method split (cash, card, cheque), and transaction history."
      badge="POS Showroom"
      badgeColor="bg-orange-50 text-orange-700 border-orange-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard label="Total POS Sales" value={lkr(SHOWROOM_KPIS.totalSales)} sub="All counter sales" color="default" />
        <KpiCard label="Transactions" value={SHOWROOM_KPIS.totalTxns.toString()} sub="POS receipts" color="blue" />
        <KpiCard label="Cash Sales" value={lkr(SHOWROOM_KPIS.cash)} sub="Cash counter" color="green" />
        <KpiCard label="Card Sales" value={lkr(SHOWROOM_KPIS.card)} sub="Card terminal" color="purple" />
        <KpiCard label="Cheque" value={lkr(SHOWROOM_KPIS.cheque)} sub="PDC payments" color="amber" />
        <KpiCard label="Avg Transaction" value={lkr(SHOWROOM_KPIS.avgTxn)} sub="Per POS receipt" color="default" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex gap-6 text-xs">
          <div>
            <span className="text-slate-500">Cash Share: </span>
            <span className="font-bold text-emerald-600">{((SHOWROOM_KPIS.cash / SHOWROOM_KPIS.totalSales) * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Card Share: </span>
            <span className="font-bold text-blue-600">{((SHOWROOM_KPIS.card / SHOWROOM_KPIS.totalSales) * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-slate-500">Cheque Share: </span>
            <span className="font-bold text-amber-600">{((SHOWROOM_KPIS.cheque / SHOWROOM_KPIS.totalSales) * 100).toFixed(1)}%</span>
          </div>
          <div className="ml-auto text-slate-400">Source: Showroom POS Terminal — TERM-SR-01</div>
        </div>
        <div className="flex gap-1 mt-3 h-3 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full" style={{ width: `${(SHOWROOM_KPIS.cash / SHOWROOM_KPIS.totalSales) * 100}%` }} />
          <div className="bg-blue-500 h-full" style={{ width: `${(SHOWROOM_KPIS.card / SHOWROOM_KPIS.totalSales) * 100}%` }} />
          <div className="bg-amber-400 h-full" style={{ width: `${(SHOWROOM_KPIS.cheque / SHOWROOM_KPIS.totalSales) * 100}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">POS Transaction History</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_SHOWROOM_SALES as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

