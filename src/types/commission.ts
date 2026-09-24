import { BaseEntity } from './common';

export type TargetPeriodType = 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type TargetStatus = 'ACTIVE' | 'ACHIEVED' | 'MISSED';

export interface SalesTarget extends BaseEntity {
  salesRepId: string;
  salesRepName: string;
  periodType: TargetPeriodType;
  startDate: string;
  endDate: string;
  targetAmount: number;
  achievedAmount: number;
  achievementPercentage: number;
  status: TargetStatus;
}

export interface CommissionRule {
  id: string;
  tierName: string;
  minAchievementPercentage: number;
  maxAchievementPercentage: number;
  commissionRatePercentage: number;
  bonusAmount: number;
}

export interface RepCommissionSummary {
  salesRepId: string;
  salesRepName: string;
  period: string;
  targetAmount: number;
  achievedAmount: number;
  achievementPercentage: number;
  earnedCommission: number;
  pendingCommission: number;
  paidCommission: number;
  tierName: string;
}

export interface SalesTargetFilters {
  salesRepId?: string;
  periodType?: TargetPeriodType | 'ALL';
  status?: TargetStatus | 'ALL';
  search?: string;
}
