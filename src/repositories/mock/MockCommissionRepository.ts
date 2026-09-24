import { ICommissionRepository } from '../ICommissionRepository';
import {
  SalesTarget,
  CommissionRule,
  RepCommissionSummary,
  SalesTargetFilters,
} from '../../types/commission';
import { DEFAULT_COMMISSION_RULES } from '../../rules/commissionRules';
import { MOCK_SALES_TARGETS, MOCK_REP_SUMMARIES } from '../../mock/mockCommissions';

export class MockCommissionRepository implements ICommissionRepository {
  private targets: SalesTarget[] = [...MOCK_SALES_TARGETS];
  private rules: CommissionRule[] = [...DEFAULT_COMMISSION_RULES];
  private summaries: RepCommissionSummary[] = [...MOCK_REP_SUMMARIES];

  async getAllTargets(filters?: SalesTargetFilters): Promise<SalesTarget[]> {
    let filtered = [...this.targets];

    if (filters?.salesRepId) {
      filtered = filtered.filter((t) => t.salesRepId === filters.salesRepId);
    }

    if (filters?.periodType && filters.periodType !== 'ALL') {
      filtered = filtered.filter((t) => t.periodType === filters.periodType);
    }

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((t) => t.salesRepName.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return filtered;
  }

  async getTargetById(id: string): Promise<SalesTarget | null> {
    return this.targets.find((t) => t.id === id) || null;
  }

  async getTargetByRep(salesRepId: string): Promise<SalesTarget | null> {
    return this.targets.find((t) => t.salesRepId === salesRepId && t.status === 'ACTIVE') ||
      this.targets.find((t) => t.salesRepId === salesRepId) ||
      null;
  }

  async createTarget(target: Omit<SalesTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesTarget> {
    const now = new Date().toISOString();
    const newTarget: SalesTarget = {
      ...target,
      id: `tgt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.targets.unshift(newTarget);
    return newTarget;
  }

  async updateTarget(id: string, updates: Partial<SalesTarget>): Promise<SalesTarget> {
    const idx = this.targets.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new Error(`Sales target with ID ${id} not found`);
    }
    const updated: SalesTarget = {
      ...this.targets[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.targets[idx] = updated;
    return updated;
  }

  async getRules(): Promise<CommissionRule[]> {
    return [...this.rules];
  }

  async updateRule(id: string, updates: Partial<CommissionRule>): Promise<CommissionRule> {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Commission rule with ID ${id} not found`);
    }
    this.rules[idx] = { ...this.rules[idx], ...updates };
    return this.rules[idx];
  }

  async getSummaries(period?: string): Promise<RepCommissionSummary[]> {
    if (period) {
      return this.summaries.filter((s) => s.period === period);
    }
    return [...this.summaries];
  }

  async getSummaryByRep(salesRepId: string, period?: string): Promise<RepCommissionSummary | null> {
    if (period) {
      return (
        this.summaries.find((s) => s.salesRepId === salesRepId && s.period === period) || null
      );
    }
    return this.summaries.find((s) => s.salesRepId === salesRepId) || null;
  }

  async saveSummary(summary: RepCommissionSummary): Promise<RepCommissionSummary> {
    const idx = this.summaries.findIndex(
      (s) => s.salesRepId === summary.salesRepId && s.period === summary.period
    );
    if (idx >= 0) {
      this.summaries[idx] = { ...this.summaries[idx], ...summary };
      return this.summaries[idx];
    } else {
      this.summaries.push(summary);
      return summary;
    }
  }
}
