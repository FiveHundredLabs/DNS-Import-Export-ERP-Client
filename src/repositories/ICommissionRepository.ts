import {
  SalesTarget,
  CommissionRule,
  RepCommissionSummary,
  SalesTargetFilters,
} from '../types/commission';

export interface ICommissionRepository {
  // Sales Targets
  getAllTargets(filters?: SalesTargetFilters): Promise<SalesTarget[]>;
  getTargetById(id: string): Promise<SalesTarget | null>;
  getTargetByRep(salesRepId: string): Promise<SalesTarget | null>;
  createTarget(target: Omit<SalesTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesTarget>;
  updateTarget(id: string, updates: Partial<SalesTarget>): Promise<SalesTarget>;

  // Commission Rules
  getRules(): Promise<CommissionRule[]>;
  updateRule(id: string, updates: Partial<CommissionRule>): Promise<CommissionRule>;

  // Rep Summaries
  getSummaries(period?: string): Promise<RepCommissionSummary[]>;
  getSummaryByRep(salesRepId: string, period?: string): Promise<RepCommissionSummary | null>;
  saveSummary(summary: RepCommissionSummary): Promise<RepCommissionSummary>;
}
