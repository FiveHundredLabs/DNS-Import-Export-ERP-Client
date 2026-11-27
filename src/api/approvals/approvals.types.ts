export type ApprovalEntityType = 'CUSTOMER' | 'PURCHASE_ORDER' | 'GRN' | string;
export type ApprovalUrgency = 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface ApprovalItem {
  id: string;
  entityType: ApprovalEntityType;
  referenceNumber: string;
  title: string;
  summary: string;
  department: string;
  currentStage: string;
  stageNumber: number;
  totalStages: number;
  assignedRole: string;
  isFinanceRestricted: boolean;
  urgency: ApprovalUrgency;
  requestedBy: {
    id: string;
    name: string;
    role: string;
  };
  requestedAt: string;
  amount?: number;
  currency?: string;
  allowedActions: ('APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'VIEW_DETAILS')[];
  metadata: Record<string, any>;
}

export interface ApprovalEngineOverview {
  totalActivePipeline: number;
  customerCreditQueue: number;
  purchaseOrderQueue: number;
  stockIntakeQueue: number;
  financeSignOffQueue: number;
  overdueCount: number;
}

export interface ApprovalCounts {
  total: number;
  byModule: Record<string, number>;
}

export interface ApprovalQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  department?: string;
  urgency?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApprovalActionPayload {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  comment: string;
  rejectionReason?: string;
}

export interface ApprovalPipelineStage {
  sequence: number;
  stageName: string;
  status: 'COMPLETED' | 'CURRENT' | 'PENDING' | 'REJECTED';
  decision?: string;
  actorName?: string;
  actorRole?: string;
  assignedRole?: string;
  timestamp?: string;
  comment?: string;
  isFinanceRestricted?: boolean;
}

export interface ApprovalPipeline {
  entityType: ApprovalEntityType;
  entityId: string;
  referenceNumber: string;
  currentStageNumber: number;
  totalStages: number;
  isFinanceRestricted: boolean;
  stages: ApprovalPipelineStage[];
}
