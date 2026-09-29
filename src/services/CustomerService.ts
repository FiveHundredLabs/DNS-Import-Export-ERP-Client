import { ICustomerRepository, CustomerFilters } from '../repositories/ICustomerRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { Customer, CommercialTerms, CustomerApprovalStage } from '../types/customer';
import { PaginatedResult } from '../types/common';
import { determineCustomerApprovalRoute } from '../rules/approvalRules';
import { hasPermission } from '../rules/permissions';
import { User } from '../types/auth';
import { approvalService } from './ApprovalService';

export class CustomerService {
  private repo: ICustomerRepository;

  constructor(repo?: ICustomerRepository) {
    this.repo = repo || new MockCustomerRepository();
  }

  async listCustomers(filters?: CustomerFilters): Promise<PaginatedResult<Customer>> {
    return this.repo.getAll(filters);
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return this.repo.getById(id);
  }

  async createCustomer(
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>
  ): Promise<Customer> {
    if (!data.name || data.name.trim().length < 3) {
      throw new Error('Customer name must be at least 3 characters.');
    }
    if (!data.phone || data.phone.trim().length < 8) {
      throw new Error('Valid phone number is required.');
    }
    const created = await this.repo.create(data);

    // Register customer creation in central approval engine for Sales Manager review
    try {
      await approvalService.createApprovalRequest({
        documentType: 'CUSTOMER_CREATION',
        documentId: created.id,
        documentReferenceNumber: created.code,
        title: `Commercial Terms Setup: ${created.name}`,
        description: `New customer registered by Area Manager in ${created.areaName}. Requires commercial terms definition.`,
        initiatorId: 'usr-105',
        initiatorName: 'Nimal Bandara (Area Manager)',
        initiatorRole: 'AREA_MANAGER',
        currentApproverRole: 'SALES_MANAGER',
        isSpecialScenario: false,
        status: 'PENDING',
        history: [
          {
            id: `h-${Date.now().toString().slice(-4)}`,
            stepNumber: 1,
            actorId: 'usr-105',
            actorName: 'Nimal Bandara',
            actorRole: 'AREA_MANAGER',
            action: 'APPROVE',
            fromStatus: 'DRAFT',
            toStatus: 'PENDING_SALES_REVIEW',
            comment: 'Dealer registered following initial site visit.',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (e) {
      console.warn('Could not register approval request:', e);
    }

    return created;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return this.repo.update(id, updates);
  }

  async setCommercialTerms(
    customerId: string,
    terms: CommercialTerms,
    user?: User
  ): Promise<{ customer: Customer; targetApprovalRole: 'MANAGER' | 'DIRECTOR'; isExceptional: boolean }> {
    if (user && !hasPermission(user.role, 'customers:commercial_approval')) {
      throw new Error(`Role ${user.role} is not authorized to configure commercial terms.`);
    }

    const route = determineCustomerApprovalRoute(terms.creditDays, terms.creditLimit);
    const nextStage: CustomerApprovalStage =
      route.targetRole === 'DIRECTOR'
        ? 'PENDING_DIRECTOR_APPROVAL'
        : 'PENDING_MANAGER_APPROVAL';

    let customer = await this.repo.updateCommercialTerms(customerId, terms);
    customer = await this.repo.updateApprovalStage(customerId, nextStage);

    // Register or route approval to Manager or Director
    try {
      await approvalService.createApprovalRequest({
        documentType: 'CUSTOMER_CREATION',
        documentId: customer.id,
        documentReferenceNumber: customer.code,
        title: `Customer Commercial Terms Sign-Off: ${customer.name}`,
        description: `Commercial setup: ${terms.creditDays} days credit, LKR ${terms.creditLimit.toLocaleString()} limit, ${terms.defaultDiscountPercentage}% standard discount.`,
        initiatorId: 'usr-103',
        initiatorName: 'Kamal Perera (Sales Manager)',
        initiatorRole: 'SALES_MANAGER',
        currentApproverRole: route.targetRole,
        targetApproverRole: route.targetRole,
        isSpecialScenario: route.isExceptional,
        specialReason: route.isExceptional ? route.reason : undefined,
        status: 'PENDING',
        history: [
          {
            id: `h-${Date.now().toString().slice(-4)}`,
            stepNumber: 1,
            actorId: 'usr-103',
            actorName: 'Kamal Perera',
            actorRole: 'SALES_MANAGER',
            action: 'APPROVE',
            fromStatus: 'PENDING_SALES_REVIEW',
            toStatus: nextStage,
            comment: `Commercial terms verified. Routed to ${route.targetRole}.`,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (e) {
      console.warn('Could not register approval request:', e);
    }

    return {
      customer,
      targetApprovalRole: route.targetRole,
      isExceptional: route.isExceptional,
    };
  }

  async finalizeApproval(customerId: string, approved: boolean): Promise<Customer> {
    const nextStage: CustomerApprovalStage = approved ? 'APPROVED' : 'REJECTED';
    return this.repo.updateApprovalStage(customerId, nextStage);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

export const customerService = new CustomerService();

// Register listener to update customer master when approvals conclude
approvalService.onAction(async (request, action) => {
  if (request.documentType === 'CUSTOMER_CREATION') {
    if (request.status === 'APPROVED') {
      await customerService.finalizeApproval(request.documentId, true);
    } else if (request.status === 'REJECTED') {
      await customerService.finalizeApproval(request.documentId, false);
    }
  }
});

