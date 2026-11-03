export interface CustomerCreditTermsConfig {
  defaultCreditDays: number;
  defaultCreditLimit: number;
  gracePeriodDays: number;
  defaultDiscountPercentage: number;
  maxDiscountPercentage: number;
  allowRepOverride: boolean;
  requireDirectorApprovalAboveDays: number;
  requireDirectorApprovalAboveLimit: number;
  updatedAt: string;
  updatedBy: string;
  updatedByRole: string;
}

export const DEFAULT_CREDIT_TERMS_CONFIG: CustomerCreditTermsConfig = {
  defaultCreditDays: 30,
  defaultCreditLimit: 500000,
  gracePeriodDays: 3,
  defaultDiscountPercentage: 5,
  maxDiscountPercentage: 10,
  allowRepOverride: false,
  requireDirectorApprovalAboveDays: 30,
  requireDirectorApprovalAboveLimit: 1000000,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Administrator',
  updatedByRole: 'DIRECTOR',
};

