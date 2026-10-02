import { useState, useEffect, useCallback } from 'react';
import { Area } from '../mock/mockAreas';
import { areaService } from '../services/AreaService';

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await areaService.getAreas();
      setAreas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  return {
    areas,
    loading,
    refetch: fetchAreas,
    createArea: async (data: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>) => {
      await areaService.createArea(data);
      await fetchAreas();
    },
    updateArea: async (id: string, data: Partial<Area>) => {
      await areaService.updateArea(id, data);
      await fetchAreas();
    },
    deleteArea: async (id: string) => {
      await areaService.deleteArea(id);
      await fetchAreas();
    }
  };
}
