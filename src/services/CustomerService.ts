import { customersApi } from '../api/customers/customers.api';
import { Customer, CommercialTerms, CustomerApprovalStage, CustomerStatus } from '../types/customer';
import { PaginatedResult } from '../types/common';
import { CustomerFilters } from '../repositories/ICustomerRepository';
import { User } from '../types/auth';

function mapBackendCustomer(c: any): Customer {
  return {
    ...c,
    id: c.id,
    code: c.customerCode || c.id.slice(0, 8).toUpperCase(),
    customerCode: c.customerCode,
    name: c.displayName,
    displayName: c.displayName,
    companyName: c.companyName || undefined,
    type: c.customerType || 'DEALER',
    customerType: c.customerType || 'DEALER',
    areaId: c.areaId || '',
    areaName: c.area?.areaName || '',
    assignedRepId: c.salesRepId || '',
    assignedRepName: c.salesRep?.fullName || '',
    salesRepId: c.salesRepId,
    areaManagerId: c.areaManagerId,
    contactPerson: c.contactPerson,
    phone: c.primaryContactNumber,
    primaryContactNumber: c.primaryContactNumber,
    whatsappNumber: c.whatsappNumber || undefined,
    secondaryPhone: c.secondaryContactNumber || undefined,
    email: c.email,
    address: c.registrationAddress,
    registrationAddress: c.registrationAddress,
    tinNumber: c.tinNumber || undefined,
    vatNumber: c.vatNumber || undefined,
    creditPeriod: c.creditPeriod || 30,
    creditLimit: c.creditLimit ? Number(c.creditLimit) : 500000,
    commercialTerms: {
      creditLimit: c.creditLimit ? Number(c.creditLimit) : 500000,
      creditDays: c.creditPeriod || 30,
      paymentTermNotes: c.paymentTermNotes || undefined,
    },
    financials: {
      totalOutstanding: 0,
      currentDue: 0,
      nearDue: 0,
      overdue: 0,
      availableCredit: c.creditLimit ? Number(c.creditLimit) : 500000,
    },
    approvalStage: c.approvalStage as CustomerApprovalStage,
    status: c.status as CustomerStatus,
    loyaltyLevel: c.loyaltyLevel,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class CustomerService {
  async listCustomers(filters?: CustomerFilters): Promise<PaginatedResult<Customer>> {
    const res = await customersApi.listCustomers({
      page: filters?.page || 1,
      pageSize: filters?.pageSize ? Math.min(filters.pageSize, 100) : 20,
      search: filters?.search,
      areaId: filters?.areaId,
      salesRepId: filters?.salesRepId || (filters as any)?.assignedRepId,
      approvalStage: filters?.approvalStage as any,
      customerType: filters?.type as any,
    });

    return {
      data: res.data.map(mapBackendCustomer),
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.pageSize,
      totalPages: res.meta.totalPages,
    };
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const c = await customersApi.getCustomerById(id);
      return mapBackendCustomer(c);
    } catch {
      return null;
    }
  }

  async createCustomer(
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>,
    _user?: User
  ): Promise<Customer> {
    const created = await customersApi.createCustomerStep1({
      displayName: data.displayName || data.name,
      companyName: data.companyName || data.displayName || data.name,
      contactPerson: data.contactPerson || data.displayName || data.name,
      email: data.email,
      primaryContactNumber: data.primaryContactNumber || data.phone,
      whatsappNumber: data.whatsappNumber || data.primaryContactNumber || data.phone,
      secondaryContactNumber: data.secondaryContactNumber || data.secondaryPhone || undefined,
      registrationAddress: data.registrationAddress || data.address,
      tinNumber: data.tinNumber || data.taxNumber || undefined,
      vatNumber: data.vatNumber || undefined,
      customerType: data.customerType || data.type || 'DEALER',
    });

    return mapBackendCustomer(created);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    if (updates.approvalStage === 'REJECT') {
      const rejected = await customersApi.rejectCustomer(id);
      return mapBackendCustomer(rejected);
    }
    if (updates.approvalStage === 'APPROVED') {
      const approved = await customersApi.approveCustomer(id);
      return mapBackendCustomer(approved);
    }
    const existing = await this.getCustomer(id);
    return existing || ({} as Customer);
  }

  async setCommercialTerms(
    customerId: string,
    terms: CommercialTerms,
    _user?: User
  ): Promise<{ customer: Customer; targetApprovalRole: string; isExceptional: boolean }> {
    const updated = await customersApi.updateCommercialTerms(customerId, {
      creditPeriod: terms.creditDays,
      creditLimit: terms.creditLimit,
      paymentTermNotes: terms.paymentTermNotes,
    });

    const isExceptional = (terms.creditDays || 0) > 30 || (terms.creditLimit || 0) > 500000;
    return {
      customer: mapBackendCustomer(updated),
      targetApprovalRole: isExceptional ? 'DIRECTOR' : 'MANAGER',
      isExceptional,
    };
  }

  async finalizeApproval(customerId: string, approved: boolean): Promise<Customer> {
    if (approved) {
      const res = await customersApi.approveCustomer(customerId);
      return mapBackendCustomer(res);
    } else {
      const res = await customersApi.rejectCustomer(customerId);
      return mapBackendCustomer(res);
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    await customersApi.deleteCustomer(id);
  }
}

export const customerService = new CustomerService();
