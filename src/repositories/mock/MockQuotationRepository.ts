import { IQuotationRepository, QuotationUserContext } from '../IQuotationRepository';
import { Quotation, QuotationFilters, QuotationSummary } from '../../types/quotation';
import { PaginatedResult } from '../../types/common';
import { MOCK_QUOTATIONS } from '../../mock/mockQuotations';
import { MOCK_APPROVALS } from '../../mock/mockApprovals';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';
import { Customer } from '../../types/customer';

const QUOTATIONS_STORAGE_KEY = 'dns_erp_quotations_v2';
const CUSTOMERS_STORAGE_KEY = 'dns_erp_customers_v2';

export class MockQuotationRepository implements IQuotationRepository {
  private quotations: Quotation[] = [];

  constructor() {
    this.init();
  }

  private getCustomerAreaMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const c of MOCK_CUSTOMERS) {
      if (c.areaId) map.set(c.id, c.areaId);
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
        if (stored) {
          const parsed: Customer[] = JSON.parse(stored);
          for (const c of parsed) {
            if (c.areaId) map.set(c.id, c.areaId);
          }
        }
      }
    } catch {}
    return map;
  }

  private applyScopeAndFilters(
    filters?: QuotationFilters,
    userContext?: QuotationUserContext,
    includeStatusFilter: boolean = true
  ): Quotation[] {
    let filtered = [...this.quotations];
    const customerAreaMap = this.getCustomerAreaMap();

    // 1. Role-based scoping
    if (userContext) {
      if (userContext.role === 'SALES_REP') {
        filtered = filtered.filter((q) => q.salesRepId === userContext.userId);
      } else if (userContext.role === 'AREA_MANAGER' && userContext.areaId) {
        filtered = filtered.filter((q) => {
          const qAreaId = q.areaId || customerAreaMap.get(q.customerId);
          return qAreaId === userContext.areaId;
        });
      }
    }

    // 2. Area filtering
    if (filters?.areaId) {
      filtered = filtered.filter((q) => {
        const qAreaId = q.areaId || customerAreaMap.get(q.customerId);
        return qAreaId === filters.areaId;
      });
    }

    // 3. Status filtering
    if (includeStatusFilter && filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((q) => q.status === filters.status);
    }

    // 4. Customer filtering
    if (filters?.customerId) {
      filtered = filtered.filter((q) => q.customerId === filters.customerId);
    }

    // 5. Sales rep filtering
    if (filters?.salesRepId) {
      filtered = filtered.filter((q) => q.salesRepId === filters.salesRepId);
    }

    // 6. Search text filtering
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.quotationNumber.toLowerCase().includes(q) ||
          item.customerNameSnapshot.toLowerCase().includes(q) ||
          item.customerCodeSnapshot.toLowerCase().includes(q) ||
          item.salesRepNameSnapshot.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q))
      );
    }

    return filtered;
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
        if (stored) {
          const parsed: Quotation[] = JSON.parse(stored);
          const existingIds = new Set(parsed.map((q) => q.id));
          const missing = MOCK_QUOTATIONS.filter((q) => !existingIds.has(q.id));
          this.quotations = [...parsed, ...JSON.parse(JSON.stringify(missing))];
          if (missing.length > 0) {
            this.persist();
          }
        } else {
          this.quotations = JSON.parse(JSON.stringify(MOCK_QUOTATIONS));
          this.persist();
        }
      } else {
        this.quotations = JSON.parse(JSON.stringify(MOCK_QUOTATIONS));
      }
    } catch {
      this.quotations = JSON.parse(JSON.stringify(MOCK_QUOTATIONS));
    }
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(this.quotations));
      }
    } catch {}
  }

  async getAll(
    filters?: QuotationFilters,
    userContext?: QuotationUserContext
  ): Promise<PaginatedResult<Quotation>> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const filtered = this.applyScopeAndFilters(filters, userContext, true);

    // Date sorting
    const sortAsc = filters?.sortByDate === 'asc';
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

    // Pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated.map((item) => JSON.parse(JSON.stringify(item))),
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
    };
  }

  async getSummary(
    filters?: QuotationFilters,
    userContext?: QuotationUserContext
  ): Promise<QuotationSummary> {
    await new Promise((resolve) => setTimeout(resolve, 40));

    const scoped = this.applyScopeAndFilters(filters, userContext, false);

    return {
      totalCount: scoped.length,
      draftCount: scoped.filter((q) => q.status === 'DRAFT').length,
      pendingApprovalCount: scoped.filter((q) => q.status === 'PENDING_APPROVAL').length,
      approvedCount: scoped.filter((q) => q.status === 'APPROVED').length,
      convertedCount: scoped.filter((q) => q.status === 'CONVERTED').length,
      rejectedCount: scoped.filter((q) => q.status === 'REJECTED').length,
      expiredCount: scoped.filter((q) => q.status === 'EXPIRED').length,
      totalPipelineValue: Number(
        scoped.reduce((acc, q) => acc + (q.totalAmount || 0), 0).toFixed(2)
      ),
    };
  }

  async getById(id: string): Promise<Quotation | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    let found = this.quotations.find((q) => q.id === id || q.quotationNumber === id);
    if (found) return JSON.parse(JSON.stringify(found));

    // Fallback 1: check MOCK_QUOTATIONS directly
    const mockQt = MOCK_QUOTATIONS.find((q) => q.id === id || q.quotationNumber === id);
    if (mockQt) {
      this.quotations.push(JSON.parse(JSON.stringify(mockQt)));
      this.persist();
      return JSON.parse(JSON.stringify(mockQt));
    }

    // Fallback 2: check if an approval request exists for this quotation
    const approval = MOCK_APPROVALS.find(
      (a) =>
        a.documentType === 'QUOTATION_DISCOUNT' &&
        (a.documentId === id || a.documentReferenceNumber === id)
    );
    if (approval) {
      const fallbackQt: Quotation = {
        id: approval.documentId,
        quotationNumber: approval.documentReferenceNumber,
        customerId: 'cust-003',
        customerCodeSnapshot: 'DLR-KDY-003',
        customerNameSnapshot: 'Kandy Power & Automation Solutions',
        customerPhoneSnapshot: '+94 81 222 3344',
        customerAddressSnapshot: '24 William Gopallawa Mawatha, Kandy',
        salesRepId: approval.initiatorId || 'usr-106',
        salesRepNameSnapshot: approval.initiatorName || 'Kasun Wickramasinghe',
        items: [
          {
            id: `qti-${approval.documentId}-1`,
            productId: 'prod-002',
            skuSnapshot: 'DNS-MCB-63A-3P',
            productNameSnapshot: 'Schneider Acti9 63A Triple Pole MCB',
            uomSnapshot: 'PCS',
            unitPriceSnapshot: 8400,
            quantity: 50,
            discountPercentage: 14,
            discountAmount: 58800,
            taxPercentage: 18,
            taxAmount: 64998,
            lineTotal: 426198,
            requiresApproval: true,
            approvalReason: approval.specialReason || 'Discount tier override approval',
          },
        ],
        subtotal: 420000,
        discountAmount: 58800,
        taxAmount: 64998,
        totalAmount: 426198,
        status: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
        targetApproverRole: approval.targetApproverRole || 'SALES_MANAGER',
        validUntil: '2026-12-31',
        notes: approval.description,
        requiresApproval: true,
        approvalReason: approval.specialReason || 'Special pricing override',
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      };
      this.quotations.push(fallbackQt);
      this.persist();
      return JSON.parse(JSON.stringify(fallbackQt));
    }

    return null;
  }

  async create(
    data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Quotation> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const nextId = `qt-${Date.now().toString().slice(-6)}`;
    const quotationNumber =
      data.quotationNumber ||
      `QT-${new Date().getFullYear()}-${String(this.quotations.length + 1).padStart(3, '0')}`;

    const newQuotation: Quotation = {
      ...data,
      id: nextId,
      quotationNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.quotations.unshift(newQuotation);
    this.persist();
    return JSON.parse(JSON.stringify(newQuotation));
  }

  async update(id: string, updates: Partial<Quotation>): Promise<Quotation> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const index = this.quotations.findIndex((q) => q.id === id);
    if (index === -1) {
      throw new Error(`Quotation not found: ${id}`);
    }

    const updated: Quotation = {
      ...this.quotations[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.quotations[index] = updated;
    this.persist();
    return JSON.parse(JSON.stringify(updated));
  }

  async delete(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const index = this.quotations.findIndex((q) => q.id === id);
    if (index === -1) return false;
    this.quotations.splice(index, 1);
    this.persist();
    return true;
  }
}
