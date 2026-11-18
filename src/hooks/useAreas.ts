import { useState, useEffect, useCallback } from 'react';
import { areasApi } from '../api/areas/areas.api';

export interface AreaItem {
  id: string;
  code?: string;
  name: string;
  areaName?: string;
  description?: string | null;
  areaManagerName?: string;
}

export function useAreas() {
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await areasApi.listAreas({ pageSize: 100 });
      const mapped: AreaItem[] = response.data.map((a) => ({
        id: a.id,
        code: a.areaCode,
        name: a.areaName,
        areaName: a.areaName,
        description: a.description,
      }));
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

  return {
    areas,
    loading,
    refetch: fetchAreas,
  };
}
