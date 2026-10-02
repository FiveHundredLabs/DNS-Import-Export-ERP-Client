import { useState, useEffect, useCallback } from 'react';
import { salesManagerDashboardService, SalesManagerDashboardData } from '../services/SalesManagerDashboardService';
import { useAuth } from './useAuth';

export function useSalesManagerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<SalesManagerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await salesManagerDashboardService.getDashboardData(user);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch sales manager dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refresh: fetchDashboardData };
}
