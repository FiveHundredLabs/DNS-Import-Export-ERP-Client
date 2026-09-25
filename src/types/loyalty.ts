export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LoyaltyTierConfig {
  tier: LoyaltyTier;
  minAnnualSpend: number;
  discountPerkPercentage: number;
  benefits: string[];
}
