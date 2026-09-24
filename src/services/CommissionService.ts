import { ICommissionRepository } from '../repositories/ICommissionRepository';
import { MockCommissionRepository } from '../repositories/mock/MockCommissionRepository';
import {
  SalesTarget,
  CommissionRule,
  RepCommissionSummary,
  SalesTargetFilters,
  TargetPeriodType,
} from '../types/commission';
import { User } from '../types/auth';
import { calculateCommission } from '../rules/commissionRules';

export interface CreateSalesTargetDTO {
  salesRepId: string;
  salesRepName: string;
  periodType: TargetPeriodType;
  startDate: string;
  endDate: string;
  targetAmount: number;
}

export class CommissionService {
  private repo: ICommissionRepository;

  constructor(repo?: ICommissionRepository) {
    this.repo = repo || new MockCommissionRepository();
  }

  async getAllTargets(filters?: SalesTargetFilters): Promise<SalesTarget[]> {
    return this.repo.getAllTargets(filters);
  }

  async getTargetById(id: string): Promise<SalesTarget | null> {
    return this.repo.getTargetById(id);
  }

  async getRules(): Promise<CommissionRule[]> {
    return this.repo.getRules();
  }

  /**
   * Sets or updates a sales rep target.
   * Restricted to executive roles: DIRECTOR, MANAGER, SALES_MANAGER.
   */
  async setSalesTarget(data: CreateSalesTargetDTO, user: User): Promise<SalesTarget> {
    const allowedRoles = ['DIRECTOR', 'MANAGER', 'SALES_MANAGER'];
    if (!allowedRoles.includes(user.role)) {
      throw new Error('Only Sales Managers, Managers, and Directors can configure sales targets.');
    }

    if (!data.salesRepId || !data.salesRepName) {
      throw new Error('Sales representative is required.');
    }

    if (!data.targetAmount || data.targetAmount <= 0) {
      throw new Error('Target amount must be greater than zero.');
    }

    const rules = await this.repo.getRules();
    // Default initial achieved amount is 0 if new
    const achievedAmount = 0;
    const calc = calculateCommission(data.targetAmount, achievedAmount, rules);

    const target = await this.repo.createTarget({
      salesRepId: data.salesRepId,
      salesRepName: data.salesRepName,
      periodType: data.periodType,
      startDate: data.startDate,
      endDate: data.endDate,
      targetAmount: data.targetAmount,
      achievedAmount,
      achievementPercentage: calc.achievementPercentage,
      status: 'ACTIVE',
    });

    return target;
  }

  /**
   * Computes real-time rep commission progress and summary against assigned targets.
   */
  async getRepCommissionSummary(
    salesRepId: string,
    period?: string
  ): Promise<RepCommissionSummary> {
    const existingSummary = await this.repo.getSummaryByRep(salesRepId, period);
    const target = await this.repo.getTargetByRep(salesRepId);
    const rules = await this.repo.getRules();

    if (!target) {
      // If no target is set, return empty/base summary
      return (
        existingSummary || {
          salesRepId,
          salesRepName: 'Sales Representative',
          period: period || new Date().toISOString().slice(0, 7),
          targetAmount: 0,
          achievedAmount: 0,
          achievementPercentage: 0,
          earnedCommission: 0,
          pendingCommission: 0,
          paidCommission: 0,
          tierName: 'Below Target (<80%)',
        }
      );
    }

    const calc = calculateCommission(target.targetAmount, target.achievedAmount, rules);
    const paidCommission = existingSummary?.paidCommission || 0;
    const earnedCommission = calc.earnedCommission;
    const pendingCommission = Math.max(0, earnedCommission - paidCommission);

    const summary: RepCommissionSummary = {
      salesRepId: target.salesRepId,
      salesRepName: target.salesRepName,
      period: period || target.startDate.slice(0, 7),
      targetAmount: target.targetAmount,
      achievedAmount: target.achievedAmount,
      achievementPercentage: calc.achievementPercentage,
      earnedCommission,
      pendingCommission,
      paidCommission,
      tierName: calc.tierName,
    };

    await this.repo.saveSummary(summary);
    return summary;
  }

  /**
   * Retrieves sales representative performance leaderboard ranked by achievement %.
   * Deduplicates by sales representative to ensure each rep appears once with their current target.
   */
  async getLeaderboard(period?: string): Promise<RepCommissionSummary[]> {
    const targets = await this.repo.getAllTargets();
    const rules = await this.repo.getRules();

    // Group by salesRepId to avoid duplicates when multiple historical targets exist
    const repTargetMap = new Map<string, SalesTarget>();
    for (const target of targets) {
      if (period && !target.startDate.startsWith(period)) continue;
      const existing = repTargetMap.get(target.salesRepId);
      if (!existing) {
        repTargetMap.set(target.salesRepId, target);
      } else if (target.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
        repTargetMap.set(target.salesRepId, target);
      }
    }

    const summaries: RepCommissionSummary[] = [];

    for (const target of repTargetMap.values()) {
      const calc = calculateCommission(target.targetAmount, target.achievedAmount, rules);
      const existingSummary = await this.repo.getSummaryByRep(target.salesRepId, period);
      const paid = existingSummary?.paidCommission || 0;
      const earned = calc.earnedCommission;

      summaries.push({
        salesRepId: target.salesRepId,
        salesRepName: target.salesRepName,
        period: period || target.startDate.slice(0, 7),
        targetAmount: target.targetAmount,
        achievedAmount: target.achievedAmount,
        achievementPercentage: calc.achievementPercentage,
        earnedCommission: earned,
        pendingCommission: Math.max(0, earned - paid),
        paidCommission: paid,
        tierName: calc.tierName,
      });
    }

    return summaries.sort((a, b) => b.achievementPercentage - a.achievementPercentage);
  }

  async recordAchievement(salesRepId: string, amount: number): Promise<SalesTarget | null> {
    const target = await this.repo.getTargetByRep(salesRepId);
    if (!target) return null;
    const newAchieved = target.achievedAmount + amount;
    const rules = await this.repo.getRules();
    const calc = calculateCommission(target.targetAmount, newAchieved, rules);
    return this.repo.updateTarget(target.id, {
      achievedAmount: newAchieved,
      achievementPercentage: calc.achievementPercentage,
    });
  }
}

export const commissionService = new CommissionService();
