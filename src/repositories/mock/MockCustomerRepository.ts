import { ICustomerRepository, CustomerFilters } from '../ICustomerRepository';
import { Customer, CommercialTerms, CustomerApprovalStage } from '../../types/customer';
import { PaginatedResult } from '../../types/common';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';
import { MOCK_APPROVALS } from '../../mock/mockApprovals';

const CUSTOMERS_STORAGE_KEY = 'dns_erp_customers_v2';

export class MockCustomerRepository implements ICustomerRepository {
  private customers: Customer[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
        if (stored) {
          const parsed: Customer[] = JSON.parse(stored);
          const existingIds = new Set(parsed.map((c) => c.id));
          const missing = MOCK_CUSTOMERS.filter((c) => !existingIds.has(c.id));
          this.customers = [...parsed, ...JSON.parse(JSON.stringify(missing))];
          if (missing.length > 0) {
            this.persist();
          }
        } else {
          this.customers = JSON.parse(JSON.stringify(MOCK_CUSTOMERS));
          this.persist();
        }
      } else {
        this.customers = JSON.parse(JSON.stringify(MOCK_CUSTOMERS));
      }
    } catch {
      this.customers = JSON.parse(JSON.stringify(MOCK_CUSTOMERS));
    }
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(this.customers));
      }
    } catch {}
  }

  async getAll(filters?: CustomerFilters): Promise<PaginatedResult<Customer>> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    let filtered = [...this.customers];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.companyName && c.companyName.toLowerCase().includes(q)) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.whatsappNumber && c.whatsappNumber.includes(q)) ||
          (c.secondaryPhone && c.secondaryPhone.includes(q)) ||
          (c.taxNumber && c.taxNumber.toLowerCase().includes(q)) ||
          (c.vatNumber && c.vatNumber.toLowerCase().includes(q))
      );
    }

    if (filters?.type) {
      filtered = filtered.filter((c) => c.type === filters.type);
    }

    if (filters?.areaId) {
      filtered = filtered.filter((c) => c.areaId === filters.areaId);
    }

    if (filters?.assignedRepId) {
      filtered = filtered.filter((c) => c.assignedRepId === filters.assignedRepId);
    }

    if (filters?.approvalStage) {
      filtered = filtered.filter((c) => c.approvalStage === filters.approvalStage);
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }

  async getById(id: string): Promise<Customer | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    let cust = this.customers.find((c) => c.id === id || c.code === id);
    if (cust) return { ...cust };

    // Fallback 1: check MOCK_CUSTOMERS directly
    const mockCust = MOCK_CUSTOMERS.find((c) => c.id === id || c.code === id);
    if (mockCust) {
      this.customers.push({ ...mockCust });
      this.persist();
      return { ...mockCust };
    }

    // Fallback 2: check if an approval request exists for customer onboarding
    const approval = MOCK_APPROVALS.find(
      (a) =>
        a.documentType === 'CUSTOMER_CREATION' &&
        (a.documentId === id || a.documentReferenceNumber === id)
    );
    if (approval) {
      const fallbackCust: Customer = {
        id: approval.documentId,
        code: approval.documentReferenceNumber,
        name: 'Kelani Valley Lighting Mart',
        type: 'DEALER',
        areaId: 'area-04',
        areaName: 'Kottawa',
        assignedRepId: approval.initiatorId || 'usr-106',
        assignedRepName: approval.initiatorName || 'Kasun Wickramasinghe',
        contactPerson: 'Mr. Rohan Gunasekara',
        phone: '+94 11 278 1122',
        email: 'rohan@kelanivalley.lk',
        address: '12 High Level Road, Kottawa',
        commercialTerms: {
          creditLimit: 800000,
          creditDays: 21,
          defaultDiscountPercentage: 5,
          maxDiscountPercentage: 8,
        },
        financials: {
          totalOutstanding: 620000,
          currentDue: 400000,
          nearDue: 220000,
          overdue: 0,
          availableCredit: 180000,
        },
        approvalStage: 'PENDING_SALES_REVIEW',
        status: 'ACTIVE',
        loyaltyTier: 'BRONZE',
        loyaltyLevel: 'NEW',
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      };
      this.customers.push(fallbackCust);
      this.persist();
      return { ...fallbackCust };
    }

    return null;
  }

  async create(
    customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>
  ): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (this.customers.some((c) => c.code.toLowerCase() === customer.code.toLowerCase())) {
      throw new Error(`A customer with code "${customer.code}" already exists in Customer Master.`);
    }

    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customer,
      id: `cust-${Date.now().toString().slice(-4)}`,
      financials: {
        totalOutstanding: 0,
        currentDue: 0,
        nearDue: 0,
        overdue: 0,
        availableCredit: customer.commercialTerms.creditLimit,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.customers.unshift(newCustomer);
    this.persist();
    return newCustomer;
  }

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Customer with id ${id} not found.`);

    const current = this.customers[idx];
    const newCommercialTerms = updates.commercialTerms || current.commercialTerms;
    const baseFinancials = updates.financials || current.financials;

    const updated: Customer = {
      ...current,
      ...updates,
      commercialTerms: newCommercialTerms,
      financials: {
        ...baseFinancials,
        availableCredit:
          updates.financials?.availableCredit ??
          Math.max(0, newCommercialTerms.creditLimit - baseFinancials.totalOutstanding),
      },
      updatedAt: new Date().toISOString(),
    };

    this.customers[idx] = updated;
    this.persist();
    return updated;
  }

  async updateCommercialTerms(id: string, terms: CommercialTerms): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Customer with id ${id} not found.`);

    const customer = this.customers[idx];
    const updated: Customer = {
      ...customer,
      commercialTerms: terms,
      financials: {
        ...customer.financials,
        availableCredit: Math.max(0, terms.creditLimit - customer.financials.totalOutstanding),
      },
      updatedAt: new Date().toISOString(),
    };

    this.customers[idx] = updated;
    return updated;
  }

  async updateApprovalStage(id: string, stage: CustomerApprovalStage): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Customer with id ${id} not found.`);

    const updated: Customer = {
      ...this.customers[idx],
      approvalStage: stage,
      status: stage === 'APPROVED' ? 'ACTIVE' : this.customers[idx].status,
      updatedAt: new Date().toISOString(),
    };

    this.customers[idx] = updated;
    return updated;
  }

  async delete(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Customer with id ${id} not found.`);
    this.customers.splice(idx, 1);
  }
}
