import { useState, useEffect, useCallback } from 'react';
import { areasApi } from '../api/areas/areas.api';
import { usersApi } from '../api/users/users.api';
import { AreaCustomer, AreaStatus, AreaUser } from '../api/areas/areas.types';
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

export function useAreas() {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await areasApi.listAreas({ pageSize: 100 });
      const mapped: AreaItem[] = response.data.map((a) => {
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
      });
      setAreas(mapped);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch areas from server';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = useCallback(
    async (data: Partial<AreaItem>): Promise<AreaItem> => {
      const areaName = (data.name || data.areaName || data.code || '').trim();
      const region = data.region ? `Region: ${data.region}` : '';
      const desc = data.description ? `${region ? `${region} | ` : ''}${data.description}` : region || undefined;

      const created = await areasApi.createArea({
        areaName,
        description: desc,
        areaManagerId: data.areaManagerId || undefined,
        salesRepIds: data.salesRepIds && data.salesRepIds.length > 0 ? data.salesRepIds : undefined,
      });

      // If an Area Manager was selected, assign the user to this area
      if (data.areaManagerId) {
        try {
          const user = await usersApi.getUserById(data.areaManagerId);
          if (user?.updatedAt) {
            await usersApi.updateUser(data.areaManagerId, {
              areaId: created.id,
              updatedAt: user.updatedAt,
            });
          }
        } catch (assignErr) {
          console.warn('Failed to assign manager to area:', assignErr);
        }
      }

      await fetchAreas();
      toast.success(`Area "${areaName}" created successfully.`);

      const newArea: AreaItem = {
        id: created.id,
        code: created.areaCode || areaName.slice(0, 3).toUpperCase(),
        name: created.areaName,
        areaName: created.areaName,
        region: data.region || 'Western',
        description: created.description,
        status: created.status || 'ACTIVE',
        areaManagerId: data.areaManagerId,
        areaManagerName: data.areaManagerName,
        areaManagers: [],
        salesReps: [],
        customers: [],
        customerCount: 0,
        userCount: data.areaManagerId ? 1 : 0,
      };
      return newArea;
    },
    [fetchAreas],
  );

  const updateArea = useCallback(
    async (id: string, data: Partial<AreaItem>): Promise<AreaItem> => {
      const areaName = (data.name || data.areaName || '').trim();
      const region = data.region ? `Region: ${data.region}` : '';
      const desc = data.description ? `${region ? `${region} | ` : ''}${data.description}` : region || undefined;

      const existingArea = areas.find((a) => a.id === id);
      const updatedAt = data.updatedAt || existingArea?.updatedAt || new Date().toISOString();

      const updated = await areasApi.updateArea(id, {
        areaName: areaName || undefined,
        description: desc,
        areaManagerId: data.areaManagerId !== undefined ? (data.areaManagerId || null) : undefined,
        salesRepIds: data.salesRepIds !== undefined ? data.salesRepIds : undefined,
        updatedAt,
      });

      // Handle Area Manager re-assignment if changed
      if (data.areaManagerId !== undefined && data.areaManagerId !== existingArea?.areaManagerId) {
        if (existingArea?.areaManagerId) {
          try {
            const prevUser = await usersApi.getUserById(existingArea.areaManagerId);
            if (prevUser?.updatedAt) {
              await usersApi.updateUser(existingArea.areaManagerId, {
                areaId: null,
                updatedAt: prevUser.updatedAt,
              });
            }
          } catch (unassignErr) {
            console.warn('Failed to unassign previous manager:', unassignErr);
          }
        }
        if (data.areaManagerId) {
          try {
            const newUser = await usersApi.getUserById(data.areaManagerId);
            if (newUser?.updatedAt) {
              await usersApi.updateUser(data.areaManagerId, {
                areaId: id,
                updatedAt: newUser.updatedAt,
              });
            }
          } catch (assignErr) {
            console.warn('Failed to assign new manager:', assignErr);
          }
        }
      }

      await fetchAreas();
      toast.success(`Area "${areaName || updated.areaName}" updated successfully.`);

      const updatedArea: AreaItem = {
        id: updated.id,
        code: updated.areaCode || (data.code || areaName.slice(0, 3).toUpperCase()),
        name: updated.areaName,
        areaName: updated.areaName,
        region: data.region || 'Western',
        description: updated.description,
        status: updated.status || existingArea?.status || 'ACTIVE',
        areaManagerId: data.areaManagerId,
        areaManagerName: data.areaManagerName,
        areaManagers: existingArea?.areaManagers || [],
        salesReps: existingArea?.salesReps || [],
        customers: existingArea?.customers || [],
        salesManagerId: data.salesManagerId,
        salesManagerName: data.salesManagerName,
        updatedAt: updated.updatedAt,
        customerCount: existingArea?.customerCount ?? 0,
        userCount: existingArea?.userCount ?? 0,
      };
      return updatedArea;
    },
    [areas, fetchAreas],
  );

  const updateAreaStatus = useCallback(
    async (id: string, status: AreaStatus): Promise<void> => {
      await areasApi.updateAreaStatus(id, { status });
      setAreas((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
      toast.success(`Area status changed to ${status}.`);
    },
    [],
  );

  const deleteArea = useCallback(
    async (id: string): Promise<void> => {
      await areasApi.deleteArea(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
      toast.success('Area soft-deleted successfully.');
    },
    [],
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
