import { IProductRepository, ProductFilters } from '../repositories/IProductRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { Product, PriceChangeProposal } from '../types/product';
import { PaginatedResult } from '../types/common';
import { validateProductData } from '../rules/productRules';
import { determinePriceApprovalRoute } from '../rules/approvalRules';
import { approvalService } from './ApprovalService';

export class ProductService {
  private repo: IProductRepository;

  constructor(repo?: IProductRepository) {
    this.repo = repo || new MockProductRepository();
  }

  async listProducts(filters?: ProductFilters): Promise<PaginatedResult<Product>> {
    return this.repo.getAll(filters);
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.repo.getById(id);
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.repo.getByBarcode(barcode);
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const validation = validateProductData(data);
    if (!validation.isValid) {
      const msg = Object.values(validation.errors).join(', ');
      throw new Error(`Product validation failed: ${msg}`);
    }
    return this.repo.create(data);
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return this.repo.update(id, updates);
  }

  async proposePriceChange(params: {
    productId: string;
    productSku: string;
    productName: string;
    currentSellingPrice: number;
    proposedSellingPrice: number;
    proposedMinSellingPrice: number;
    costPrice: number;
    reason: string;
    userId: string;
    userName: string;
  }): Promise<PriceChangeProposal> {
    const check = determinePriceApprovalRoute(
      params.costPrice,
      params.currentSellingPrice,
      params.proposedSellingPrice
    );

    const proposal = await this.repo.submitPriceProposal({
      productId: params.productId,
      productSku: params.productSku,
      productName: params.productName,
      currentSellingPrice: params.currentSellingPrice,
      proposedSellingPrice: params.proposedSellingPrice,
      proposedMinSellingPrice: params.proposedMinSellingPrice,
      reason: params.reason,
      proposedById: params.userId,
      proposedByName: params.userName,
      approvalStatus: 'PENDING_APPROVAL',
      directorApprovalRequired: check.requiresDirectorApproval,
    });

    // Register price change in central approval engine
    try {
      await approvalService.createApprovalRequest({
        documentType: 'PRODUCT_PRICE_CHANGE',
        documentId: params.productId,
        documentReferenceNumber: params.productSku,
        title: `Selling Price Change: ${params.productName}`,
        description: `Proposed: LKR ${params.proposedSellingPrice.toLocaleString()} (was LKR ${params.currentSellingPrice.toLocaleString()}). Reason: ${params.reason}`,
        initiatorId: params.userId,
        initiatorName: params.userName,
        initiatorRole: 'MANAGER',
        currentApproverRole: check.requiresDirectorApproval ? 'DIRECTOR' : 'MANAGER',
        targetApproverRole: check.requiresDirectorApproval ? 'DIRECTOR' : 'MANAGER',
        isSpecialScenario: check.requiresDirectorApproval,
        specialReason: check.requiresDirectorApproval ? check.reason : undefined,
        status: 'PENDING',
        history: [
          {
            id: `h-${Date.now().toString().slice(-4)}`,
            stepNumber: 1,
            actorId: params.userId,
            actorName: params.userName,
            actorRole: 'MANAGER',
            action: 'APPROVE',
            fromStatus: 'DRAFT',
            toStatus: 'PENDING_APPROVAL',
            comment: params.reason,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (e) {
      console.warn('Could not register approval request:', e);
    }

    return proposal;
  }

  async getPriceProposals(productId?: string): Promise<PriceChangeProposal[]> {
    return this.repo.getPriceProposals(productId);
  }

  async getCategories() {
    return this.repo.getCategories();
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.repo.createCategory(category);
  }

  async getUOMs() {
    return this.repo.getUOMs();
  }
}

export const productService = new ProductService();

// Register listener to update product prices upon approved price changes
approvalService.onAction(async (request, action, actorRole, comment) => {
  if (request.documentType === 'PRODUCT_PRICE_CHANGE') {
    if (request.status === 'APPROVED') {
      const proposals = await productService.getPriceProposals(request.documentId);
      const pending = proposals.find((p) => p.approvalStatus === 'PENDING_APPROVAL');
      if (pending) {
        const prod = await productService.getProduct(request.documentId);
        if (prod) {
          await productService.updateProduct(request.documentId, {
            pricing: {
              ...prod.pricing,
              currentSellingPrice: pending.proposedSellingPrice,
              minimumSellingPrice: pending.proposedMinSellingPrice,
            },
          });
        }
        pending.approvalStatus = 'APPROVED';
      }
    } else if (request.status === 'REJECTED') {
      const proposals = await productService.getPriceProposals(request.documentId);
      const pending = proposals.find((p) => p.approvalStatus === 'PENDING_APPROVAL');
      if (pending) {
        pending.approvalStatus = 'REJECTED';
        pending.rejectionReason = comment;
      }
    }
  }
});
