import { areasApi } from '../api/areas/areas.api';
import { AreaItem as Area } from '../hooks/useAreas';

export class AreaService {
  async getAreas(): Promise<Area[]> {
    try {
      const res = await areasApi.listAreas({ pageSize: 100 });
      return res.data.map((a) => ({
        id: a.id,
        code: a.areaCode,
        name: a.areaName,
        areaName: a.areaName,
        description: a.description,
      }));
    } catch (e) {
      console.error('Failed to get areas from API:', e);
      return [];
    }
  }

  async createArea(data: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>): Promise<Area> {
    const area = {
      id: `area-${Date.now()}`,
      code: data.code || 'AREA-NEW',
      name: data.name,
      areaName: data.name,
      description: data.description,
    };
    return area;
  }

  async updateArea(id: string, data: Partial<Area>): Promise<Area> {
    return {
      id,
      code: data.code || '',
      name: data.name || '',
      areaName: data.name || '',
      description: data.description,
    };
  }

  async deleteArea(_id: string): Promise<void> {}
}

export const areaService = new AreaService();
