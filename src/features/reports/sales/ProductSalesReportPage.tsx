import { useState } from 'react';
import { Package } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_PRODUCT_SALES, PRODUCT_KPIS, type ProductSalesRow } from '../shared/reportMockData';

const COLS: TableCol<ProductSalesRow>[] = [
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'name', label: 'Product Name', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'qtySold', label: 'Qty Sold', align: 'right', sortable: true },
  { key: 'revenue', label: 'Revenue', align: 'right', sortable: true, render: (r) => lkr(r.revenue) },
  { key: 'avgPrice', label: 'Avg Price', align: 'right', render: (r) => lkr(r.avgPrice) },
  { key: 'returnQty', label: 'Returns', align: 'right', render: (r) => r.returnQty > 0 ? <span className="text-red-500">{r.returnQty}</span> : '—' },
];

export function ProductSalesReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Product-wise Sales Report"
      subtitle="SKU-level sold quantities, revenue, average prices, and return quantities."
      badge="SKU Analytics"
      badgeColor="bg-indigo-50 text-indigo-700 border-indigo-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total SKUs Sold" value={PRODUCT_KPIS.totalSKUs.toString()} sub="In this period" color="default" />
        <KpiCard label="Total Revenue" value={lkr(PRODUCT_KPIS.totalRevenue)} sub="All products" color="green" />
        <KpiCard label="Total Qty Sold" value={PRODUCT_KPIS.totalQtySold.toLocaleString()} sub="Units dispatched" color="blue" />
        <KpiCard label="Top Product" value={PRODUCT_KPIS.topProduct} sub="By revenue" color="purple" />
      </div>

      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Product Sales Breakdown</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_PRODUCT_SALES as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

