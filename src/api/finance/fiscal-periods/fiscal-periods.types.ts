export type FiscalPeriodStatus = 'OPEN' | 'SOFT_LOCKED' | 'HARD_LOCKED' | 'CLOSED';

export interface FiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  isYearEnd: boolean;
  lockReason?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFiscalPeriodPayload {
  name: string;
  startDate: string;
  endDate: string;
  isYearEnd?: boolean;
}

export interface LockFiscalPeriodPayload {
  status: 'SOFT_LOCKED' | 'HARD_LOCKED';
  lockReason?: string;
}

export interface ReopenFiscalPeriodPayload {
  reopenReason: string;
}

export interface FiscalPeriodQueryParams {
  status?: FiscalPeriodStatus;
  isYearEnd?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface YearEndCloseResponse {
  message: string;
  fiscalPeriodId: string;
  retainedEarningsTransfer: string;
  journalEntryId: string;
}
