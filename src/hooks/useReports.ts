import { useState, useEffect, useCallback } from 'react';
import { reportService } from '../services/ReportService';
import { useAuth } from './useAuth';
import {
  ReportFilter,
  ExecutiveKpiSummary,
  SalesSummaryReport,
  InventoryReport,
  FinanceReport,
  AreaPerformanceReport,
} from '../types/reports';

export function useReports(initialFilter: ReportFilter = {}) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<ReportFilter>(() => {
    const f: ReportFilter = { ...initialFilter };
    if (user?.role === 'SALES_REP') {
      f.salesRepId = user.id;
      if (user.areaId) f.areaId = user.areaId;
    } else if (user?.role === 'AREA_MANAGER') {
      if (user.areaId) f.areaId = user.areaId;
    }
    return f;
  });

  const [kpis, setKpis] = useState<ExecutiveKpiSummary | null>(null);
  const [salesReport, setSalesReport] = useState<SalesSummaryReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [financeReport, setFinanceReport] = useState<FinanceReport | null>(null);
  const [areaPerformance, setAreaPerformance] = useState<AreaPerformanceReport | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(user?.areaId || 'area-01');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [kpiRes, salesRes, invRes, finRes] = await Promise.all([
        reportService.getExecutiveKpis(user, filter),
        reportService.getSalesReport(user, filter),
        reportService.getInventoryReport(user, filter),
        reportService.getFinanceReport(user, filter),
      ]);

      setKpis(kpiRes);
      setSalesReport(salesRes);
      setInventoryReport(invRes);
      setFinanceReport(finRes);

      // Area performance (visible for DIRECTOR, MANAGER, AREA_MANAGER)
      const allowedAreaRoles = ['DIRECTOR', 'MANAGER', 'AREA_MANAGER'];
      if (allowedAreaRoles.includes(user.role)) {
        const areaToFetch =
          user.role === 'AREA_MANAGER'
            ? user.areaId || 'area-01'
            : selectedAreaId || filter.areaId || 'area-01';
        try {
          const areaRes = await reportService.getAreaPerformanceReport(areaToFetch, user, filter);
          setAreaPerformance(areaRes);
        } catch (err: any) {
          console.warn('Could not fetch area performance report:', err);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load enterprise reports');
    } finally {
      setLoading(false);
    }
  }, [user, filter, selectedAreaId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateFilter = useCallback((updates: Partial<ReportFilter>) => {
    setFilter((prev) => {
      const next = { ...prev, ...updates };
      // Prevent role violations
      if (user?.role === 'SALES_REP') {
        next.salesRepId = user.id;
      } else if (user?.role === 'AREA_MANAGER') {
        next.areaId = user.areaId;
      }
      return next;
    });
    if (updates.areaId && user?.role !== 'AREA_MANAGER') {
      setSelectedAreaId(updates.areaId);
    }
  }, [user]);

  const resetFilter = useCallback(() => {
    const defaultF: ReportFilter = {};
    if (user?.role === 'SALES_REP') {
      defaultF.salesRepId = user.id;
      if (user.areaId) defaultF.areaId = user.areaId;
    } else if (user?.role === 'AREA_MANAGER') {
      if (user.areaId) defaultF.areaId = user.areaId;
    } else {
      setSelectedAreaId('area-01');
    }
    setFilter(defaultF);
  }, [user]);

  return {
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
    refresh: fetchReports,
  };
}
