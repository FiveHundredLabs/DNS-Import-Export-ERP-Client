import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_CUSTOMER_SALES, CUSTOMER_KPIS, type CustomerSalesRow } from '../shared/reportMockData';

const COLS: TableCol<CustomerSalesRow>[] = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Customer', sortable: true },
  { key: 'type', label: 'Type', align: 'center', render: (r) => <StatusPill label={r.type} variant={r.type === 'DEALER' ? 'blue' : 'purple'} /> },
  { key: 'area', label: 'Area' },
  { key: 'rep', label: 'Sales Rep' },
  { key: 'orders', label: 'Orders', align: 'right', sortable: true },
  { key: 'delivered', label: 'Delivered', align: 'right', sortable: true },
  { key: 'revenue', label: 'Revenue', align: 'right', sortable: true, render: (r) => lkr(r.revenue) },
  { key: 'outstanding', label: 'Outstanding', align: 'right', sortable: true, render: (r) => <span className={r.outstanding > 0 ? 'text-amber-600 font-medium' : ''}>{lkr(r.outstanding)}</span> },
  { key: 'lastOrder', label: 'Last Order', sortable: true },
];

export function CustomerSalesReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());
  const [search, setSearch] = useState('');

  const filtered = MOCK_CUSTOMER_SALES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Customer-wise Sales Report"
      subtitle="Customer purchase history, revenue totals, outstanding balances, and order frequency."
      badge="Customer Insights"
      badgeColor="bg-teal-50 text-teal-700 border-teal-200"
      toolbar={
        <ReportFilterBar
          dateRange={dr}
          onChange={setDr}
          extraFilters={
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer..."
              className="h-8 text-xs rounded-md border border-slate-200 bg-white px-2 text-slate-700 w-40"
            />
          }
        />
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Customers" value={CUSTOMER_KPIS.totalCustomers.toString()} sub="Active in period" color="default" />
        <KpiCard label="Total Revenue" value={lkr(CUSTOMER_KPIS.totalRevenue)} sub="All customers" color="green" />
        <KpiCard label="Avg Order Value" value={lkr(CUSTOMER_KPIS.avgOrderValue)} sub="Per delivered order" color="blue" />
        <KpiCard label="Active Customers" value={CUSTOMER_KPIS.activeCustomers.toString()} sub="Placed orders" color="purple" />
      </div>

      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Customer Purchase Detail</span>
        <span className="text-xs text-slate-400">— {filtered.length} customers</span>
      </div>

      <SortableTable columns={COLS} data={filtered as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

