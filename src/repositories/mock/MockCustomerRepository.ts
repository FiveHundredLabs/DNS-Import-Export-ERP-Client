import { ICustomerRepository, CustomerFilters } from '../ICustomerRepository';
import { Customer, CommercialTerms, CustomerApprovalStage } from '../../types/customer';
import { PaginatedResult } from '../../types/common';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';

export class MockCustomerRepository implements ICustomerRepository {
  private customers: Customer[] = [...MOCK_CUSTOMERS];

  async getAll(filters?: CustomerFilters): Promise<PaginatedResult<Customer>> {
    await new Promise((resolve) => setTimeout(resolve, 150));

    let filtered = [...this.customers];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.phone.includes(q)
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
    const cust = this.customers.find((c) => c.id === id);
    return cust ? { ...cust } : null;
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
    return newCustomer;
  }

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Customer with id ${id} not found.`);

    const updated: Customer = {
      ...this.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.customers[idx] = updated;
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
}
