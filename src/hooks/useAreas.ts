import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { areasApi } from '../api/areas/areas.api';
import { areaQueryKeys } from '../api/areas/areas.hooks';
import { userQueryKeys } from '../api/users/users.hooks';
import { extractErrorMessage } from '../api/client';
import { AreaCustomer, AreaStatus, AreaUser, Area as ApiArea } from '../api/areas/areas.types';
import { toast } from 'sonner';

export interface AreaItem {
  id: string;
  code?: string;
  name: string;
  areaName?: string;
  region?: string;
  description?: string | null;
  status: AreaStatus;
  areaManagerId?: string;
  areaManagerName?: string;
  areaManagers?: AreaUser[];
  salesReps?: AreaUser[];
  salesRepIds?: string[];
  customers?: AreaCustomer[];
  salesManagerId?: string;
  salesManagerName?: string;
  updatedAt?: string;
  customerCount?: number;
  userCount?: number;
}

function mapApiAreaToItem(a: ApiArea): AreaItem {
  let region = 'Western';
  let desc = a.description;
  if (desc && desc.startsWith('Region: ')) {
    const parts = desc.split('|');
    region = parts[0].replace('Region: ', '').trim();
    desc = parts.slice(1).join('|').trim() || null;
  }

  const isAreaManager = (u: any) =>
    u.role?.code === 'AREA_MANAGER' || u.role === 'AREA_MANAGER' || u.roleCode === 'AREA_MANAGER';
  const isSalesRep = (u: any) =>
    u.role?.code === 'SALES_REP' || u.role === 'SALES_REP' || u.roleCode === 'SALES_REP';
  const isSalesManager = (u: any) =>
    u.role?.code === 'SALES_MANAGER' || u.role === 'SALES_MANAGER' || u.roleCode === 'SALES_MANAGER';

  const areaManagers = a.users?.filter(isAreaManager) || [];
  const salesReps = a.users?.filter(isSalesRep) || [];
  const primaryAreaManager = areaManagers[0];
  const salesManager = a.users?.find(isSalesManager);

  return {
    id: a.id,
    code: a.areaCode || a.areaName.slice(0, 3).toUpperCase(),
    name: a.areaName,
    areaName: a.areaName,
    region,
    description: desc,
    status: a.status || 'ACTIVE',
    areaManagerId: primaryAreaManager?.id,
    areaManagerName: primaryAreaManager?.displayName || primaryAreaManager?.fullName || undefined,
    areaManagers,
    salesReps,
    customers: a.customers || [],
    salesManagerId: salesManager?.id,
    salesManagerName: salesManager?.displayName || salesManager?.fullName || undefined,
    updatedAt: a.updatedAt,
    customerCount: (a.customers && a.customers.length > 0) ? a.customers.length : (a._count?.customers ?? 0),
    userCount: (a.users && a.users.length > 0) ? a.users.length : (a._count?.users ?? 0),
  };
}

export function useAreas() {
  const queryClient = useQueryClient();

  const {
    data: response,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: areaQueryKeys.list({ pageSize: 100 }),
    queryFn: ({ signal }) => areasApi.listAreas({ pageSize: 100 }, signal),
    staleTime: 60_000,
  });

  const areas = useMemo<AreaItem[]>(
    () => (response?.data ? response.data.map(mapApiAreaToItem) : []),
    [response],
  );

  const error = queryError ? extractErrorMessage(queryError, 'Failed to fetch areas from server') : null;

  const fetchAreas = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const invalidateAreaAndUserCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: areaQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() }),
    ]);
  }, [queryClient]);

  const createArea = useCallback(
    async (data: Partial<AreaItem>): Promise<AreaItem> => {
      const areaName = (data.name || data.areaName || data.code || '').trim();
      const region = data.region ? `Region: ${data.region}` : '';
      const desc = data.description ? `${region ? `${region} | ` : ''}${data.description}` : region || undefined;

      // Backend AreasService atomically assigns areaManagerId and salesRepIds in a transaction
      const created = await areasApi.createArea({
        areaName,
        description: desc,
        areaManagerId: data.areaManagerId || undefined,
        salesRepIds: data.salesRepIds && data.salesRepIds.length > 0 ? data.salesRepIds : undefined,
      });

      await invalidateAreaAndUserCaches();
      toast.success(`Area "${areaName}" created successfully.`);

      return mapApiAreaToItem(created);
    },
    [invalidateAreaAndUserCaches],
  );

  const updateArea = useCallback(
    async (id: string, data: Partial<AreaItem>): Promise<AreaItem> => {
      const areaName = (data.name || data.areaName || '').trim();
      const region = data.region ? `Region: ${data.region}` : '';
      const desc = data.description ? `${region ? `${region} | ` : ''}${data.description}` : region || undefined;

      const existingArea = areas.find((a) => a.id === id);
      const updatedAt = data.updatedAt || existingArea?.updatedAt || new Date().toISOString();

      // Backend AreasService atomically reassigns areaManagerId and salesRepIds in a transaction
      const updated = await areasApi.updateArea(id, {
        areaName: areaName || undefined,
        description: desc,
        areaManagerId: data.areaManagerId !== undefined ? (data.areaManagerId || null) : undefined,
        salesRepIds: data.salesRepIds !== undefined ? data.salesRepIds : undefined,
        updatedAt,
      });

      await invalidateAreaAndUserCaches();
      toast.success(`Area "${areaName || updated.areaName}" updated successfully.`);

      return mapApiAreaToItem(updated);
    },
    [areas, invalidateAreaAndUserCaches],
  );

  const updateAreaStatus = useCallback(
    async (id: string, status: AreaStatus): Promise<void> => {
      await areasApi.updateAreaStatus(id, { status });
      await queryClient.invalidateQueries({ queryKey: areaQueryKeys.lists() });
      toast.success(`Area status changed to ${status}.`);
    },
    [queryClient],
  );

  const deleteArea = useCallback(
    async (id: string): Promise<void> => {
      await areasApi.deleteArea(id);
      await invalidateAreaAndUserCaches();
      toast.success('Area soft-deleted successfully.');
    },
    [invalidateAreaAndUserCaches],
  );

  return {
    areas,
    loading,
    error,
    refetch: fetchAreas,
    createArea,
    updateArea,
    updateAreaStatus,
    deleteArea,
  };
}
