import { IGRNRepository } from '../IGRNRepository';
import { GRN } from '../../types/inventory';
import { MOCK_GRNS } from '../../mock/mockInventory';

export class MockGRNRepository implements IGRNRepository {
  private static instance: MockGRNRepository;
  private grns: GRN[] = JSON.parse(JSON.stringify(MOCK_GRNS));

  constructor() {
    if (MockGRNRepository.instance) {
      return MockGRNRepository.instance;
    }
    MockGRNRepository.instance = this;
  }

  static getInstance(): MockGRNRepository {
    if (!MockGRNRepository.instance) {
      MockGRNRepository.instance = new MockGRNRepository();
    }
    return MockGRNRepository.instance;
  }

  reset(): void {
    this.grns = JSON.parse(JSON.stringify(MOCK_GRNS));
  }

  getAllSync(): GRN[] {
    return JSON.parse(JSON.stringify(this.grns));
  }

  async getById(id: string): Promise<GRN | null> {
    return this.grns.find((g) => g.id === id || g.grnNumber === id) || null;
  }

  async save(grn: GRN): Promise<void> {
    const idx = this.grns.findIndex((g) => g.id === grn.id || g.grnNumber === grn.grnNumber);
    if (idx >= 0) this.grns[idx] = grn;
    else this.grns.push(grn);
  }

  async getAll(): Promise<GRN[]> {
    return JSON.parse(JSON.stringify(this.grns));
  }
}
