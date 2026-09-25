import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useReports } from '../../hooks/useReports';
import { ReportsFilterToolbar } from './ReportsFilterToolbar';
import { ExecutiveOverviewTab } from './ExecutiveOverviewTab';
import { SalesAnalyticsTab } from './SalesAnalyticsTab';
import { InventoryAnalyticsTab } from './InventoryAnalyticsTab';
import { FinanceCollectionsTab } from './FinanceCollectionsTab';
import { AreaPerformanceTab } from './AreaPerformanceTab';
import { TableLoadingSkeleton, CardGridSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { exportToCSV, triggerPrintReport } from '../../utils/exportUtils';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  MapPin,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';

export type ReportTabType = 'overview' | 'sales' | 'inventory' | 'finance' | 'area';

export function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTabType>('overview');

  const {
    filter,
    updateFilter,
    resetFilter,
    kpis,
    salesReport,
    inventoryReport,
    financeReport,
    areaPerformance,
    selectedAreaId,
    setSelectedAreaId,
    loading,
    error,
    refresh,
  } = useReports();

  const isAreaPerformanceAllowed =
    user?.role === 'DIRECTOR' || user?.role === 'MANAGER' || user?.role === 'AREA_MANAGER';

  const tabTitles: Record<ReportTabType, string> = {
    overview: 'Executive Overview',
    sales: 'Sales Analytics',
    inventory: 'Inventory Analytics',
    finance: 'Finance & Collections',
    area: 'Area Performance',
  };

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (activeTab === 'overview' && kpis) {
      exportToCSV(
        `Executive_Overview_${timestamp}`,
        ['Metric', 'Value (LKR / Count)'],
        [
          ['Gross Revenue', kpis.grossRevenue],
          ['Total Collections', kpis.totalCollected],
          ['Outstanding Receivables', kpis.totalOutstanding],
          ['Overdue Receivables', kpis.totalOverdue],
          ['Inventory Valuation', kpis.totalInventoryValue],
          ['Active Orders', kpis.totalOrdersCount],
          ['Active Customers', kpis.activeCustomersCount],
        ]
      );
    } else if (activeTab === 'sales' && salesReport) {
      exportToCSV(
        `Sales_By_Rep_${timestamp}`,
        ['Sales Rep ID', 'Representative Name', 'Orders Count', 'Total Sales (LKR)'],
        salesReport.salesByRep.map((r) => [r.repId, r.repName, r.orderCount, r.amount])
      );
    } else if (activeTab === 'inventory' && inventoryReport) {
      exportToCSV(
        `Inventory_Valuation_${timestamp}`,
        ['Location', 'Units', 'Cost Valuation (LKR)'],
        inventoryReport.stockByLocation.map((l) => [l.location, l.units, l.value])
      );
    } else if (activeTab === 'finance' && financeReport) {
      exportToCSV(
        `Receivables_Aging_${timestamp}`,
        ['Aging Bucket', 'Accounts Count', 'Outstanding Amount (LKR)'],
        financeReport.agingBuckets.map((b) => [b.bucket, b.customerCount, b.amount])
      );
    } else if (activeTab === 'area' && areaPerformance) {
      exportToCSV(
        `Area_Performance_${areaPerformance.areaName.replace(/\s+/g, '_')}_${timestamp}`,
        ['Sales Rep', 'Monthly Target (LKR)', 'Achieved Sales (LKR)', 'Achievement %', 'Collections (LKR)'],
        areaPerformance.repPerformance.map((r) => [
          r.repName,
          r.target,
          r.sales,
          `${r.achievementPercentage}%`,
          r.collections,
        ])
      );
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Enterprise Analytics & Reporting
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Single Source of Truth cross-functional business intelligence across sales, stock, and collections.
          </p>
        </div>
      </div>

      {/* Global Filter Toolbar */}
      <ReportsFilterToolbar
        user={user}
        filter={filter}
        onFilterChange={updateFilter}
        onReset={resetFilter}
        onExportCSV={handleExportCSV}
        onPrint={triggerPrintReport}
        activeTabTitle={tabTitles[activeTab]}
      />

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Reports Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'sales'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Sales Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'inventory'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'finance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Finance & Collections</span>
          </button>

          {isAreaPerformanceAllowed && (
            <button
              onClick={() => setActiveTab('area')}
              className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                activeTab === 'area'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Area Performance</span>
            </button>
          )}
        </nav>
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="space-y-6">
          <CardGridSkeleton count={6} />
          <TableLoadingSkeleton rows={5} cols={4} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          {activeTab === 'overview' && kpis && salesReport && (
            <ExecutiveOverviewTab kpis={kpis} salesReport={salesReport} />
          )}

          {activeTab === 'sales' && salesReport && (
            <SalesAnalyticsTab salesReport={salesReport} />
          )}

          {activeTab === 'inventory' && inventoryReport && (
            <InventoryAnalyticsTab inventoryReport={inventoryReport} />
          )}

          {activeTab === 'finance' && financeReport && (
            <FinanceCollectionsTab financeReport={financeReport} />
          )}

          {activeTab === 'area' && isAreaPerformanceAllowed && (
            <AreaPerformanceTab
              areaPerformance={areaPerformance}
              selectedAreaId={selectedAreaId}
              onAreaSelect={(id) => {
                setSelectedAreaId(id);
                updateFilter({ areaId: id });
              }}
              user={user}
            />
          )}
        </>
      )}
    </div>
  );
}
