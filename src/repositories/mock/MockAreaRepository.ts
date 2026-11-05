import { IAreaRepository } from '../IAreaRepository';
import { Area, MOCK_AREAS } from '../../mock/mockAreas';

const AREAS_STORAGE_KEY = 'dns_erp_areas_v1';

export class MockAreaRepository implements IAreaRepository {
  private areas: Area[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(AREAS_STORAGE_KEY);
        if (stored) {
          const parsed: Area[] = JSON.parse(stored);
          const existingIds = new Set(parsed.map((a) => a.id));
          const missing = MOCK_AREAS.filter((a) => !existingIds.has(a.id));
          this.areas = [...parsed, ...JSON.parse(JSON.stringify(missing))];
          if (missing.length > 0) {
            this.persist();
          }
        } else {
          this.areas = JSON.parse(JSON.stringify(MOCK_AREAS));
          this.persist();
        }
      } else {
        this.areas = JSON.parse(JSON.stringify(MOCK_AREAS));
      }
    } catch {
      this.areas = JSON.parse(JSON.stringify(MOCK_AREAS));
    }
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify(this.areas));
      }
    } catch {}
  }

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
    this.persist();
    return newArea;
  }

  async update(id: string, data: Partial<Area>): Promise<Area> {
    await new Promise(r => setTimeout(r, 100));
    const index = this.areas.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Area with id ${id} not found.`);
    this.areas[index] = { ...this.areas[index], ...data };
    this.persist();
    return this.areas[index];
  }

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
    this.areas = this.areas.filter(a => a.id !== id);
    this.persist();
  }
}
