import { areasApi } from '../api/areas/areas.api';
import { AreaItem as Area } from '../hooks/useAreas';

export class AreaService {
  async getAreas(): Promise<Area[]> {
    return this.getAll();
  }

  async getAll(): Promise<Area[]> {
    try {
      const res = await areasApi.listAreas({ pageSize: 100 });
      return res.data.map((a) => ({
        id: a.id,
        code: a.areaCode || a.areaName.slice(0, 3).toUpperCase(),
        name: a.areaName,
        areaName: a.areaName,
        region: 'Western',
        description: a.description,
        updatedAt: a.updatedAt,
      }));
    } catch (e) {
      console.error('Failed to get areas from API:', e);
      return [];
    }
  }

  async getById(id: string): Promise<Area | null> {
    try {
      const a = await areasApi.getAreaById(id);
      return {
        id: a.id,
        code: a.areaCode || a.areaName.slice(0, 3).toUpperCase(),
        name: a.areaName,
        areaName: a.areaName,
        region: 'Western',
        description: a.description,
        updatedAt: a.updatedAt,
      };
    } catch {
      return null;
    }
  }

  async createArea(data: Partial<Area>): Promise<Area> {
    const areaName = (data.name || data.areaName || data.code || '').trim();
    const created = await areasApi.createArea({
      areaName,
      description: data.description || undefined,
    });
    return {
      id: created.id,
      code: created.areaCode || areaName.slice(0, 3).toUpperCase(),
      name: created.areaName,
      areaName: created.areaName,
      description: created.description,
      updatedAt: created.updatedAt,
    };
  }

  async updateArea(id: string, data: Partial<Area>): Promise<Area> {
    const areaName = (data.name || data.areaName || '').trim();
    const updated = await areasApi.updateArea(id, {
      areaName: areaName || undefined,
      description: data.description,
      updatedAt: data.updatedAt,
    });
    return {
      id: updated.id,
      code: updated.areaCode || areaName.slice(0, 3).toUpperCase(),
      name: updated.areaName,
      areaName: updated.areaName,
      description: updated.description,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteArea(id: string): Promise<void> {
    await areasApi.deleteArea(id);
  }
}

export const areaService = new AreaService();
