export interface CreditTermsConfig {
  id: string;
  defaultCreditDays: number;
  defaultCreditLimit: number;
  updatedAt: string;
  updatedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface UpdateCreditTermsConfigPayload {
  defaultCreditDays?: number;
  defaultCreditLimit?: number;
}
