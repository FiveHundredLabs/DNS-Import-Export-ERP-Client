import { GRN } from '../types/inventory';

export interface IGRNRepository {
  getById(id: string): Promise<GRN | null>;
  save(grn: GRN): Promise<void>;
  getAll(): Promise<GRN[]>;
}
