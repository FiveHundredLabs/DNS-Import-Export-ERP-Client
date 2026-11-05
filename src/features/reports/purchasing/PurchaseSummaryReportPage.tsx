import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_PURCHASE_SUMMARY, PURCHASE_SUMMARY_KPIS, type PurchaseSummaryRow } from '../shared/reportMockData';

const COLS: TableCol<PurchaseSummaryRow>[] = [
  { key: 'period', label: 'Period', sortable: true },
  { key: 'poCount', label: 'Total POs', align: 'right', sortable: true },
  { key: 'received', label: 'Received', align: 'right', sortable: true },
  { key: 'value', label: 'Purchase Value', align: 'right', sortable: true, render: (r) => lkr(r.value) },
  { key: 'avgPOValue', label: 'Avg PO Value', align: 'right', render: (r) => lkr(r.avgPOValue) },
];

export function PurchaseSummaryReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/purchasing" backLabel="Back to Purchasing Reports" title="Purchase Summary Report" subtitle="Monthly purchase totals, received goods, and purchase trend over time." badge="Period Trends" badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Purchase Value" value={lkr(PURCHASE_SUMMARY_KPIS.totalValue)} sub="YTD all POs" color="default" />
        <KpiCard label="Total POs" value={PURCHASE_SUMMARY_KPIS.totalPOs.toString()} sub="Created orders" color="blue" />
        <KpiCard label="POs Received" value={PURCHASE_SUMMARY_KPIS.totalReceived.toString()} sub="GRN completed" color="green" />
        <KpiCard label="Avg Monthly Spend" value={lkr(PURCHASE_SUMMARY_KPIS.avgMonthly)} sub="Per month" color="purple" />
      </div>
      <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Monthly Purchase Breakdown</span></div>
      <SortableTable columns={COLS} data={MOCK_PURCHASE_SUMMARY as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

