import { LoyaltyTierConfig } from '../types/loyalty';

export const DEFAULT_LOYALTY_TIERS: LoyaltyTierConfig[] = [
  {
    tier: 'PLATINUM',
    minAnnualSpend: 10000000,
    discountPerkPercentage: 5,
    benefits: [
      'Priority warehouse picking and dispatch within 12h',
      '5% additional discount on standard orders',
      'Dedicated key account manager and direct line',
      'Free extended warranty handling & rapid replacement',
    ],
  },
  {
    tier: 'GOLD',
    minAnnualSpend: 5000000,
    discountPerkPercentage: 3,
    benefits: [
      'Priority dispatch within 24h',
      '3% additional discount on standard orders',
      'Extended credit terms up to 45 days upon review',
      'Accelerated warranty claims processing',
    ],
  },
  {
    tier: 'SILVER',
    minAnnualSpend: 2000000,
    discountPerkPercentage: 1.5,
    benefits: [
      'Standard dispatch within 48h',
      '1.5% additional discount on standard orders',
      'Extended credit terms up to 35 days',
    ],
  },
  {
    tier: 'BRONZE',
    minAnnualSpend: 0,
    discountPerkPercentage: 0,
    benefits: [
      'Standard catalog pricing',
      'Standard delivery schedule',
      'Standard manufacturer warranty support',
    ],
  },
];

/**
 * Determines customer loyalty tier based on total annual spend / invoice turnover.
 * Evaluates in descending order of spend threshold.
 */
export function determineLoyaltyTier(
  annualSalesAmount: number,
  tiers: LoyaltyTierConfig[] = DEFAULT_LOYALTY_TIERS
): LoyaltyTierConfig {
  const safeSpend = Math.max(0, annualSalesAmount || 0);

  // Sort descending by minAnnualSpend to check highest tier first
  const sorted = [...tiers].sort((a, b) => b.minAnnualSpend - a.minAnnualSpend);

  for (const tier of sorted) {
    if (safeSpend >= tier.minAnnualSpend) {
      return tier;
    }
  }

  // Fallback to lowest tier
  return sorted[sorted.length - 1];
}
