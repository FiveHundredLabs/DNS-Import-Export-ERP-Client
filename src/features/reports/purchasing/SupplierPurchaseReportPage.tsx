import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_SUPPLIER_PURCHASE, SUPPLIER_KPIS, type SupplierPurchaseRow } from '../shared/reportMockData';

const COLS: TableCol<SupplierPurchaseRow>[] = [
  { key: 'supplierCode', label: 'Code' },
  { key: 'supplierName', label: 'Supplier', sortable: true },
  { key: 'country', label: 'Country' },
  { key: 'poCount', label: 'Total POs', align: 'right', sortable: true },
  { key: 'received', label: 'Received', align: 'right' },
  { key: 'totalValue', label: 'Total Spend', align: 'right', sortable: true, render: (r) => lkr(r.totalValue) },
  { key: 'avgLead', label: 'Avg Lead (Days)', align: 'center', sortable: true },
  { key: 'lastOrder', label: 'Last Order', sortable: true },
];

export function SupplierPurchaseReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  return (
    <ReportPageShell backPath="/reports/purchasing" backLabel="Back to Purchasing Reports" title="Supplier Purchase Report" subtitle="Supplier-wise purchasing history, total spend, PO counts, and lead time averages." badge="Supplier View" badgeColor="bg-purple-50 text-purple-700 border-purple-200" toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Suppliers" value={SUPPLIER_KPIS.totalSuppliers.toString()} sub="Active in period" color="default" />
        <KpiCard label="Total Spend" value={lkr(SUPPLIER_KPIS.totalSpend)} sub="All suppliers" color="green" />
        <KpiCard label="Top Supplier" value={SUPPLIER_KPIS.topSupplier} sub="Highest spend" color="purple" />
        <KpiCard label="Avg Lead Time" value={`${SUPPLIER_KPIS.avgLead} days`} sub="Supplier average" color="blue" />
      </div>
      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-slate-700">Supplier Performance</span></div>
      <SortableTable columns={COLS} data={MOCK_SUPPLIER_PURCHASE as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

