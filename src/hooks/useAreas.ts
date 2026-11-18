import { useState, useEffect, useCallback } from 'react';
import { areasApi } from '../api/areas/areas.api';
import { toast } from 'sonner';

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
}

export function useAreas() {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(true);

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

        return {
          id: a.id,
          code: a.areaCode || a.areaName.slice(0, 3).toUpperCase(),
          name: a.areaName,
          areaName: a.areaName,
          region,
          description: desc,
          updatedAt: a.updatedAt,
        };
      });
      setAreas(mapped);
    } catch (e) {
      console.error('Failed to fetch areas from backend:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = useCallback(async (data: Partial<AreaItem>): Promise<AreaItem> => {
    const areaName = (data.name || data.areaName || data.code || '').trim();
    const region = data.region ? `Region: ${data.region}` : '';
    const desc = data.description ? `${region ? `${region} | ` : ''}${data.description}` : region || undefined;

    const created = await areasApi.createArea({
      areaName,
      description: desc,
    });

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
  }, []);

  const updateArea = useCallback(async (id: string, data: Partial<AreaItem>): Promise<AreaItem> => {
    const areaName = (data.name || data.areaName || '').trim();
    const region = data.region ? `Region: ${data.region}` : '';
    const desc = data.description ? `${region ? `${region} | ` : ''}${data.description}` : region || undefined;

    const updated = await areasApi.updateArea(id, {
      areaName: areaName || undefined,
      description: desc,
      updatedAt: data.updatedAt,
    });

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
  }, []);

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
