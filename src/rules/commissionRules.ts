import { CommissionRule } from '../types/commission';

export const DEFAULT_COMMISSION_RULES: CommissionRule[] = [
  {
    id: 'tier-base',
    tierName: 'Below Target (<80%)',
    minAchievementPercentage: 0,
    maxAchievementPercentage: 79.999,
    commissionRatePercentage: 0,
    bonusAmount: 0,
  },
  {
    id: 'tier-standard',
    tierName: 'Standard (80-99%)',
    minAchievementPercentage: 80,
    maxAchievementPercentage: 99.999,
    commissionRatePercentage: 1.5,
    bonusAmount: 0,
  },
  {
    id: 'tier-target',
    tierName: 'Target Bonus (100-119%)',
    minAchievementPercentage: 100,
    maxAchievementPercentage: 119.999,
    commissionRatePercentage: 3.0,
    bonusAmount: 10000,
  },
  {
    id: 'tier-super',
    tierName: 'Super Achievement (>=120%)',
    minAchievementPercentage: 120,
    maxAchievementPercentage: Infinity,
    commissionRatePercentage: 5.0,
    bonusAmount: 25000,
  },
];

export interface CommissionCalculationResult {
  achievementPercentage: number;
  applicableRule: CommissionRule;
  commissionRatePercentage: number;
  baseCommission: number;
  bonusAmount: number;
  earnedCommission: number;
  tierName: string;
}

/**
 * Calculates sales rep commission based on target amount and achieved amount.
 * Applies tiered rules:
 * - <80%: 0% base
 * - 80-99%: Standard rate (1.5%)
 * - 100-119%: Target bonus rate (3.0%) + bonus
 * - >=120%: Super achievement rate (5.0%) + super bonus
 */
export function calculateCommission(
  targetAmount: number,
  achievedAmount: number,
  rules: CommissionRule[] = DEFAULT_COMMISSION_RULES
): CommissionCalculationResult {
  const safeTarget = Math.max(0, targetAmount || 0);
  const safeAchieved = Math.max(0, achievedAmount || 0);

  const rawPercentage = safeTarget > 0 ? (safeAchieved / safeTarget) * 100 : 0;
  // Truncate to 2 decimal places so that tier thresholds are not crossed by rounding up
  const pStr = rawPercentage.toFixed(4);
  const pParts = pStr.split('.');
  const truncatedPct = pParts.length > 1 ? `${pParts[0]}.${pParts[1].slice(0, 2)}` : pParts[0];
  const achievementPercentage = Number(truncatedPct);

  // Sort descending by minAchievementPercentage so that the highest achieved tier is chosen
  const sortedRules = [...rules].sort(
    (a, b) => b.minAchievementPercentage - a.minAchievementPercentage
  );

  let matchedRule = sortedRules.find(
    (r) => achievementPercentage >= r.minAchievementPercentage
  );

  if (!matchedRule) {
    matchedRule = sortedRules[sortedRules.length - 1];
  }

  const baseCommission = Math.round(safeAchieved * (matchedRule.commissionRatePercentage / 100));
  const bonusAmount = matchedRule.bonusAmount;
  const earnedCommission = baseCommission + bonusAmount;

  return {
    achievementPercentage,
    applicableRule: matchedRule,
    commissionRatePercentage: matchedRule.commissionRatePercentage,
    baseCommission,
    bonusAmount,
    earnedCommission,
    tierName: matchedRule.tierName,
  };
}
