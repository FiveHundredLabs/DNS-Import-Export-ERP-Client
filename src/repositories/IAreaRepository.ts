import { Area } from '../mock/mockAreas';

export interface IAreaRepository {
  getAll(): Promise<Area[]>;
  create(area: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>): Promise<Area>;
  update(id: string, area: Partial<Area>): Promise<Area>;
  delete(id: string): Promise<void>;
}
