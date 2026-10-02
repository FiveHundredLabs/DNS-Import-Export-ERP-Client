import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useReports } from '../../hooks/useReports';
import { ReportsFilterToolbar } from './ReportsFilterToolbar';
import { ExecutiveOverviewTab } from './ExecutiveOverviewTab';
import { SalesAnalyticsTab } from './SalesAnalyticsTab';
import { InventoryAnalyticsTab } from './InventoryAnalyticsTab';
import { FinanceCollectionsTab } from './FinanceCollectionsTab';
import { AreaPerformanceTab } from './AreaPerformanceTab';
import { CommissionAnalyticsTab } from './CommissionAnalyticsTab';
import { PosAnalyticsTab } from './PosAnalyticsTab';
import { TableLoadingSkeleton, CardGridSkeleton } from '../../components/common/LoadingSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { triggerPrintReport } from '../../utils/exportUtils';
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  MapPin,
} from 'lucide-react';

export type ReportTabType = 'overview' | 'sales' | 'inventory' | 'finance' | 'area' | 'commission' | 'pos';

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
    advancedReports,
  } = useReports();

  const isAreaPerformanceAllowed =
    user?.role === 'DIRECTOR' || user?.role === 'MANAGER' || user?.role === 'AREA_MANAGER';

  const tabTitles: Record<ReportTabType, string> = {
    commission: 'Commission Analytics',
    pos: 'POS Analytics',
    overview: 'Executive Overview',
    sales: 'Sales Analytics',
    inventory: 'Inventory Analytics',
    finance: 'Finance & Collections',
    area: 'Area Performance',
  };


  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
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
                ? 'border-primary text-primary'
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
                ? 'border-primary text-primary'
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
                ? 'border-primary text-primary'
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
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Finance & Collections</span>
          </button>

          <button
            onClick={() => setActiveTab('commission')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'commission'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Commission Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
              activeTab === 'pos'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>POS Analytics</span>
          </button>

          {isAreaPerformanceAllowed && (
            <button
              onClick={() => setActiveTab('area')}
              className={`py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                activeTab === 'area'
                  ? 'border-primary text-primary'
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
            <SalesAnalyticsTab salesReport={salesReport} advancedReports={advancedReports} />
          )}

          {activeTab === 'inventory' && inventoryReport && (
            <InventoryAnalyticsTab 
              inventoryReport={inventoryReport}
              advancedReports={advancedReports} 
            />
          )}

          {activeTab === 'finance' && financeReport && (
            <FinanceCollectionsTab financeReport={financeReport} advancedReports={advancedReports} />
          )}

          {activeTab === 'commission' && (
            <CommissionAnalyticsTab 
              advancedReports={advancedReports} 
            />
          )}

          {activeTab === 'pos' && (
            <PosAnalyticsTab 
              advancedReports={advancedReports} 
            />
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
