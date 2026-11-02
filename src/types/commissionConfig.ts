import { UserRole } from './auth';

export type CommissionRole =
  | 'SALES_REP'
  | 'AREA_MANAGER'
  | 'SALES_MANAGER'
  | 'SHOWROOM_MANAGER'
  | 'CASHIER';

export const COMMISSION_ROLES: CommissionRole[] = [
  'SALES_REP',
  'AREA_MANAGER',
  'SALES_MANAGER',
  'SHOWROOM_MANAGER',
  'CASHIER',
];

export const COMMISSION_ROLE_LABELS: Record<CommissionRole, string> = {
  SALES_REP: 'Sales Representative',
  AREA_MANAGER: 'Area Manager',
  SALES_MANAGER: 'Sales Manager',
  SHOWROOM_MANAGER: 'Showroom Manager',
  CASHIER: 'Cashier',
};

export const COMMISSION_ROLE_DESCRIPTIONS: Record<CommissionRole, string> = {
  SALES_REP: 'Field sales representatives visiting assigned dealer accounts and generating orders.',
  AREA_MANAGER: 'Territory managers overseeing regional dealer routes and sales performance.',
  SALES_MANAGER: 'Executive managing sales pipelines, wholesale quotas, and enterprise deals.',
  SHOWROOM_MANAGER: 'Retail showroom outlet manager overseeing store POS volume and customer walk-ins.',
  CASHIER: 'Front-desk point-of-sale cashier collecting physical cash, cards, and settling bills.',
};

export type CommissionScenarioType =
  | 'COLLECTION_BASED'
  | 'TIER_BASED'
  | 'TARGET_BASED';

export const COMMISSION_SCENARIO_INFO: Record<
  CommissionScenarioType,
  { label: string; badge: string; description: string; formulaPreview: string }
> = {
  COLLECTION_BASED: {
    label: 'Scenario 1: Collection-Based Commission',
    badge: 'Collection %',
    description: 'Calculated as a direct percentage of all cash and payment receipts collected by the user during the month.',
    formulaPreview: 'Commission = Total Monthly Collections × Commission %',
  },
  TIER_BASED: {
    label: 'Scenario 2: Tier-Based Commission',
    badge: 'Sales Tiers',
    description: 'Calculated based on sales amounts using predefined threshold tiers with fixed reward payouts.',
    formulaPreview: 'Commission = Reward Amount corresponding to highest Sales Tier reached',
  },
  TARGET_BASED: {
    label: 'Scenario 3: Target-Based Commission',
    badge: 'Target Incentive',
    description: 'Calculated based on exceeding a predefined sales target threshold with a bonus percentage on surplus sales.',
    formulaPreview: 'Commission = (Total Monthly Sales - Target Amount) × Commission % (if Sales > Target)',
  },
};

/**
 * Scenario 1: Collection-Based Configuration
 */
export interface CollectionCommissionConfig {
  commissionPercentage: number; // e.g. 2.5
}

/**
 * Scenario 2: Tier-Based Configuration Tier
 */
export interface CommissionTier {
  id: string;
  minSalesAmount: number; // e.g. 10000, 20000
  commissionReward: number; // e.g. 2000, 4000
  tierLabel?: string;
}

export interface TierCommissionConfig {
  tiers: CommissionTier[];
}

/**
 * Scenario 3: Target-Based Configuration
 */
export interface TargetCommissionConfig {
  targetSalesAmount: number; // e.g. 50000
  commissionPercentage: number; // e.g. 5.0
  applyOnSurplusOnly: boolean; // default: true (on sales exceeding target)
}

/**
 * Master configuration object per Role
 */
export interface RoleCommissionConfig {
  role: CommissionRole;
  activeScenario: CommissionScenarioType;
  collectionConfig: CollectionCommissionConfig;
  tierConfig: TierCommissionConfig;
  targetConfig: TargetCommissionConfig;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Step-by-step breakdown item for transparent audits
 */
export interface CommissionCalculationBreakdown {
  scenarioUsed: CommissionScenarioType;
  scenarioLabel: string;
  totalSales: number;
  totalCollections: number;
  qualifyingBaseAmount: number;
  rateOrTierApplied: string;
  commissionEarned: number;
  explanation: string;
  thresholdProgress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

/**
 * Item in the Monthly Commission Report
 */
export interface UserCommissionReportItem {
  userId: string;
  userName: string;
  userRole: UserRole;
  commissionRole: CommissionRole;
  month: string; // YYYY-MM
  totalSales: number;
  totalCollections: number;
  calculationMethod: string;
  applicableRateOrTier: string;
  commissionEarned: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSED';
  breakdown: CommissionCalculationBreakdown;
}

/**
 * Monthly Report Summary Aggregate
 */
export interface MonthlyCommissionReport {
  month: string; // YYYY-MM
  monthLabel: string;
  totalSalesVolume: number;
  totalCollectionsVolume: number;
  totalCommissionPayable: number;
  beneficiariesCount: number;
  topEarner?: {
    userName: string;
    role: string;
    amount: number;
  };
  items: UserCommissionReportItem[];
}
