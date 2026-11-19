import { useState, useEffect, useCallback } from 'react';
import { areasApi } from '../api/areas/areas.api';
import { usersApi } from '../api/users/users.api';
import { toast } from 'sonner';
import { MOCK_AREAS } from '../mock/mockAreas';

export interface AreaItem {
  id: string;
  code?: string;
  name: string;
  areaName?: string;
  region?: string;
  description?: string | null;
  areaManagerId?: string;
  areaManagerName?: string;
  salesManagerId?: string;
  salesManagerName?: string;
  updatedAt?: string;
  customerCount?: number;
  userCount?: number;
}

const DEFAULT_AREAS: AreaItem[] = MOCK_AREAS.map((a) => ({
  id: a.id,
  code: a.code || a.name.slice(0, 3).toUpperCase(),
  name: a.name,
  areaName: a.name,
  region: a.region || 'Western',
  description: null,
  areaManagerId: a.areaManagerId,
  areaManagerName: a.areaManagerName,
  salesManagerId: a.salesManagerId,
  salesManagerName: a.salesManagerName,
}));

export function useAreas() {
  const [areas, setAreas] = useState<AreaItem[]>(DEFAULT_AREAS);
  const [loading, setLoading] = useState(false);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
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

        const areaManager = a.users?.find((u) => u.role?.code === 'AREA_MANAGER');
        const salesManager = a.users?.find((u) => u.role?.code === 'SALES_MANAGER');

        return {
          id: a.id,
          code: a.areaCode || a.areaName.slice(0, 3).toUpperCase(),
          name: a.areaName,
          areaName: a.areaName,
          region,
          description: desc,
          areaManagerId: areaManager?.id,
          areaManagerName: areaManager?.fullName || areaManager?.displayName || undefined,
          salesManagerId: salesManager?.id,
          salesManagerName: salesManager?.fullName || salesManager?.displayName || undefined,
          updatedAt: a.updatedAt,
          customerCount: a._count?.customers ?? 0,
          userCount: a._count?.users ?? (a.users?.length ?? 0),
        };
      });
      setAreas(mapped);
    } catch (e) {
      console.warn('Backend areas API unavailable, falling back to offline fixtures:', e);
      setAreas(DEFAULT_AREAS);
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

      let created: any;
      try {
        created = await areasApi.createArea({
          areaName,
          description: desc,
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
      } catch (err: unknown) {
        console.warn('Backend createArea error, generating local fallback:', err);
        created = {
          id: `area-${Date.now()}`,
          areaCode: areaName.slice(0, 3).toUpperCase(),
          areaName,
          description: desc,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const newArea: AreaItem = {
        id: created.id,
        code: created.areaCode || areaName.slice(0, 3).toUpperCase(),
        name: created.areaName,
        areaName: created.areaName,
        region: data.region || 'Western',
        description: created.description,
        areaManagerId: data.areaManagerId,
        areaManagerName: data.areaManagerName,
        salesManagerId: data.salesManagerId,
        salesManagerName: data.salesManagerName,
        updatedAt: created.updatedAt,
      };

      setAreas((prev) => [newArea, ...prev]);
      toast.success(`Area "${areaName}" created successfully.`);
      return newArea;
    },
    [],
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
        updatedAt,
      });

      // Handle Area Manager re-assignment if changed
      if (data.areaManagerId !== undefined && data.areaManagerId !== existingArea?.areaManagerId) {
        // 1. Unassign previous manager if existed
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
        // 2. Assign new manager if selected
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

      const updatedArea: AreaItem = {
        id: updated.id,
        code: updated.areaCode || (data.code || areaName.slice(0, 3).toUpperCase()),
        name: updated.areaName,
        areaName: updated.areaName,
        region: data.region || 'Western',
        description: updated.description,
        areaManagerId: data.areaManagerId,
        areaManagerName: data.areaManagerName,
        salesManagerId: data.salesManagerId,
        salesManagerName: data.salesManagerName,
        updatedAt: updated.updatedAt,
      };

      setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...updatedArea } : a)));
      toast.success(`Area "${areaName || updated.areaName}" updated successfully.`);
      return updatedArea;
    },
    [areas],
  );

  const deleteArea = useCallback(async (id: string): Promise<void> => {
    await areasApi.deleteArea(id);
    setAreas((prev) => prev.filter((a) => a.id !== id));
    toast.success('Area deleted successfully.');
  }, []);

  return {
    areas,
    loading,
    refetch: fetchAreas,
    createArea,
    updateArea,
    deleteArea,
  };
}
