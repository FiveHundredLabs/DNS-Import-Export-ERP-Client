import { IAreaRepository } from '../repositories/IAreaRepository';
import { MockAreaRepository } from '../repositories/mock/MockAreaRepository';
import { Area } from '../mock/mockAreas';

export class AreaService {
  private repo: IAreaRepository;
  
  constructor() {
    this.repo = new MockAreaRepository();
  }

  async getAreas(): Promise<Area[]> {
    return this.repo.getAll();
  }

  async createArea(data: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>): Promise<Area> {
    return this.repo.create(data);
  }

  async updateArea(id: string, data: Partial<Area>): Promise<Area> {
    return this.repo.update(id, data);
  }

  async deleteArea(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

export const areaService = new AreaService();
