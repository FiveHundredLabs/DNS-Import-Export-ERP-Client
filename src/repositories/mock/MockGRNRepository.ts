import { IGRNRepository } from '../IGRNRepository';
import { GRN } from '../../types/inventory';

export class MockGRNRepository implements IGRNRepository {
  private grns: GRN[] = [];
  async getById(id: string): Promise<GRN | null> { return this.grns.find(g => g.id === id) || null; }
  async save(grn: GRN): Promise<void> {
    const idx = this.grns.findIndex(g => g.id === grn.id);
    if (idx >= 0) this.grns[idx] = grn;
    else this.grns.push(grn);
  }
  async getAll(): Promise<GRN[]> { return this.grns; }
}
