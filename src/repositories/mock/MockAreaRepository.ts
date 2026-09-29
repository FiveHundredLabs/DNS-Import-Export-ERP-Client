import { IAreaRepository } from '../IAreaRepository';
import { Area, MOCK_AREAS } from '../../mock/mockAreas';

export class MockAreaRepository implements IAreaRepository {
  private areas: Area[] = [...MOCK_AREAS];

  async getAll(): Promise<Area[]> {
    await new Promise(r => setTimeout(r, 100));
    return [...this.areas];
  }

  async create(data: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>): Promise<Area> {
    await new Promise(r => setTimeout(r, 100));
    const newArea: Area = {
      ...data,
      id: `area-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.areas.push(newArea);
    return newArea;
  }

  async update(id: string, data: Partial<Area>): Promise<Area> {
    await new Promise(r => setTimeout(r, 100));
    const index = this.areas.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Area with id ${id} not found.`);
    this.areas[index] = { ...this.areas[index], ...data };
    return this.areas[index];
  }

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
    this.areas = this.areas.filter(a => a.id !== id);
  }
}
