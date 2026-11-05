import { BaseEntity } from './common';
import {
  CommissionScenarioType,
  RoleCommissionConfig,
  CommissionCalculationBreakdown,
} from './commissionConfig';

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

export interface QualifyingInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  totalAmount: number;
  commissionableAmount: number;
  commissionEarned: number;
  status: string;
}

export interface ClearedCollectionItem {
  id: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  collectedAt: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

export interface RepPersonalPerformanceData {
  salesRepId: string;
  salesRepName: string;
  month: string;
  targetAmount: number;
  actualSales: number;
  achievementPercentage: number;
  clearedCollections: number;
  earnedCommission: number;
  activeScenario: CommissionScenarioType;
  roleConfig: RoleCommissionConfig;
  breakdown: CommissionCalculationBreakdown;
  qualifyingInvoices: QualifyingInvoiceItem[];
  clearedCollectionsList: ClearedCollectionItem[];
}

export interface SubordinateRepPerformanceItem {
  repId: string;
  repName: string;
  target: number;
  actualSales: number;
  achievementPercentage: number;
  clearedCollections: number;
  earnedCommission: number;
  status: 'BELOW_TARGET' | 'ON_TRACK' | 'TARGET_ACHIEVED' | 'SUPER_ACHIEVER';
  scenario: string;
}

export interface AreaTerritoryPerformanceData {
  areaId: string;
  areaName: string;
  region: string;
  managerId: string;
  managerName: string;
  month: string;
  territoryTarget: number;
  territorySales: number;
  territoryAchievementPercentage: number;
  territoryCollections: number;
  surplusSales: number;
  managerCommission: number;
  activeScenario: CommissionScenarioType;
  managerRoleConfig: RoleCommissionConfig;
  managerBreakdown: CommissionCalculationBreakdown;
  subordinateReps: SubordinateRepPerformanceItem[];
}

