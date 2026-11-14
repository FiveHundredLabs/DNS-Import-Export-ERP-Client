import { approvalService } from './ApprovalService';
import { inventoryService } from './InventoryService';
import { ApprovalActionType, ApprovalRequest } from '../types/approval';

export interface StockAdjustmentMetadata {
  productId: string;
  productName: string;
  locationId: string;
  locationType: string;
  quantity: number;
  direction: 'ADD' | 'REMOVE';
  reason: string;
  requestedById: string;
  requestedByName: string;
}

function isStockAdjustment(request: ApprovalRequest): request is ApprovalRequest & {
  metadata: StockAdjustmentMetadata;
} {
  return request.documentType === 'STOCK_ADJUSTMENT' && Boolean(request.metadata);
}

class StockAdjustmentService {
  private initialized = false;

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    approvalService.onAction(async (request, action) => {
      if (action !== 'APPROVE' || !isStockAdjustment(request)) return;

      const metadata = request.metadata;
      const quantity = metadata.direction === 'ADD' ? metadata.quantity : -metadata.quantity;
      await inventoryService.applyApprovedAdjustment(
        metadata.productId,
        metadata.locationId,
        metadata.locationType,
        quantity,
        `Approved stock adjustment ${request.documentReferenceNumber}: ${metadata.reason}`,
        request.initiatorId,
        request.initiatorName
      );
    });
  }

  async submit(metadata: StockAdjustmentMetadata): Promise<ApprovalRequest> {
    this.initialize();
    return approvalService.createApprovalRequest({
      documentType: 'STOCK_ADJUSTMENT',
      documentId: `${metadata.productId}:${metadata.locationId}:${Date.now()}`,
      documentReferenceNumber: `ADJ-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`,
      title: `${metadata.direction === 'ADD' ? 'Increase' : 'Decrease'} ${metadata.productName} stock`,
      description: `${metadata.quantity} units at ${metadata.locationType} ${metadata.locationId}. Reason: ${metadata.reason}`,
      initiatorId: metadata.requestedById,
      initiatorName: metadata.requestedByName,
      initiatorRole: 'STOCK_MANAGER',
      currentApproverRole: 'MANAGER',
      targetApproverRole: 'MANAGER',
      isSpecialScenario: false,
      status: 'PENDING',
      history: [],
      metadata,
    });
  }
}

export const stockAdjustmentService = new StockAdjustmentService();
stockAdjustmentService.initialize();
