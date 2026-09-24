import { IPaymentRepository } from '../repositories/IPaymentRepository';
import { MockPaymentRepository } from '../repositories/mock/MockPaymentRepository';
import { Payment, PaymentFilters, CreatePaymentInput } from '../types/payment';
import { User } from '../types/auth';
import { PaginatedResult } from '../types/common';
import { customerService, CustomerService } from './CustomerService';
import { invoiceService, InvoiceService } from './InvoiceService';
import { approvalService, ApprovalService } from './ApprovalService';
import { printerService } from './PrinterService';
import { whatsAppService } from './WhatsAppService';
import {
  validatePaymentAllocation,
  validateChequeDetails,
  canUserCollectPayment,
} from '../rules/paymentRules';
import { calculateInvoiceStatus, isPastDueDate } from '../rules/invoiceRules';

export class PaymentService {
  private repo: IPaymentRepository;
  private customerSvc: CustomerService;
  private invoiceSvc: InvoiceService;
  private approvalSvc: ApprovalService;

  constructor(
    repo?: IPaymentRepository,
    customerSvc?: CustomerService,
    invoiceSvc?: InvoiceService,
    approvalSvc?: ApprovalService
  ) {
    this.repo = repo || new MockPaymentRepository();
    this.customerSvc = customerSvc || customerService;
    this.invoiceSvc = invoiceSvc || invoiceService;
    this.approvalSvc = approvalSvc || approvalService;

    // Bidirectional synchronization from central Approvals Engine
    this.approvalSvc.onAction(async (request, action, actorRole, comment) => {
      if (request.documentType === 'PAYMENT_RECEIPT' && request.documentId) {
        try {
          const payment = await this.repo.getById(request.documentId);
          if (!payment || payment.status !== 'PENDING_APPROVAL') return;

          const lastHistory = request.history[request.history.length - 1];
          const actorUser: User = {
            id: lastHistory?.actorId || 'usr-104',
            name: lastHistory?.actorName || `${actorRole} Signatory`,
            role: actorRole,
            email: 'finance@dnserp.com',
            phone: '+94 11 234 5678',
            isActive: true,
          };

          if (action === 'APPROVE') {
            await this.approvePayment(payment.id, actorUser, comment, false);
          } else if (action === 'REJECT') {
            await this.rejectPayment(payment.id, comment, actorUser, false);
          }
        } catch (err) {
          console.warn('PaymentService approval synchronization error:', err);
        }
      }
    });
  }

  async getPayments(filters?: PaymentFilters): Promise<PaginatedResult<Payment>> {
    return this.repo.getAll(filters);
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return this.repo.getById(id);
  }

  /**
   * Records payment collection from customer.
   * Section 21 & 56: Payment is placed in PENDING_APPROVAL.
   * Customer outstanding and invoice balances MUST NOT be reduced until Finance Manager approves!
   */
  async recordPayment(data: CreatePaymentInput, currentUser: User): Promise<Payment> {
    if (data.amount <= 0) {
      throw new Error('Payment collection amount must be greater than zero.');
    }

    const customer = await this.customerSvc.getCustomer(data.customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${data.customerId}`);
    }

    // Territory scoping validation
    const territoryAuth = canUserCollectPayment(currentUser, customer);
    if (!territoryAuth.allowed) {
      throw new Error(`Permission Denied: ${territoryAuth.reason}`);
    }

    // Fetch existing balances of allocated invoices to validate allocations
    const invoiceBalances: Record<string, number> = {};
    if (data.invoiceAllocations && data.invoiceAllocations.length > 0) {
      for (const alloc of data.invoiceAllocations) {
        const inv = await this.invoiceSvc.getInvoiceById(alloc.invoiceId);
        if (!inv) {
          throw new Error(`Allocated invoice with ID ${alloc.invoiceId} does not exist.`);
        }
        if (inv.customerId !== customer.id) {
          throw new Error(
            `Invoice ${inv.invoiceNumber} belongs to another customer and cannot be allocated to ${customer.name}.`
          );
        }
        if (inv.status === 'CANCELLED' || inv.status === 'DRAFT') {
          throw new Error(
            `Cannot allocate payment to invoice ${inv.invoiceNumber} in status '${inv.status}'.`
          );
        }
        if (inv.balanceAmount <= 0) {
          throw new Error(`Invoice ${inv.invoiceNumber} is already fully paid.`);
        }
        invoiceBalances[alloc.invoiceId] = inv.balanceAmount;
      }
    }

    // Validate allocations against payment amount and individual balances
    const allocValidation = validatePaymentAllocation(
      data.amount,
      data.invoiceAllocations || [],
      invoiceBalances
    );
    if (!allocValidation.valid) {
      throw new Error(allocValidation.error);
    }

    // Validate cheque details if Cheque method selected
    if (data.paymentMethod === 'CHEQUE') {
      const chequeValidation = validateChequeDetails({
        chequeNumber: data.chequeNumber,
        chequeDate: data.chequeDate,
        bankName: data.bankName,
      });
      if (!chequeValidation.valid) {
        throw new Error(chequeValidation.error);
      }
    }

    const now = new Date();
    const year = now.getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${year}-${seq}`;

    const effectiveRepId =
      currentUser.role === 'SALES_REP'
        ? currentUser.id
        : customer.assignedRepId || currentUser.id;
    const effectiveRepName =
      currentUser.role === 'SALES_REP'
        ? currentUser.name
        : customer.assignedRepName || currentUser.name;

    // Create Payment in PENDING_APPROVAL status (balances remain UNTOUCHED)
    const payment = await this.repo.create({
      receiptNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerCode: customer.code,
      salesRepId: effectiveRepId,
      salesRepName: effectiveRepName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: 'PENDING_APPROVAL',
      chequeNumber: data.chequeNumber,
      chequeDate: data.chequeDate,
      bankName: data.bankName,
      chequeDetails:
        data.paymentMethod === 'CHEQUE'
          ? {
              chequeNumber: data.chequeNumber || '',
              chequeDate: data.chequeDate || '',
              bankName: data.bankName || '',
              isCleared: false,
            }
          : undefined,
      invoiceAllocations: data.invoiceAllocations || [],
      notes: data.notes,
      collectedAt: now.toISOString(),
    });

    // Create central approval request for Finance Manager sign-off
    try {
      await this.approvalSvc.createApprovalRequest({
        documentType: 'PAYMENT_RECEIPT',
        documentId: payment.id,
        documentReferenceNumber: payment.receiptNumber,
        title: `Payment Receipt Verification: ${payment.receiptNumber}`,
        description: `Collection of LKR ${payment.amount.toLocaleString()} via ${payment.paymentMethod} from ${customer.name}. Awaiting realization confirmation.`,
        initiatorId: currentUser.id,
        initiatorName: currentUser.name,
        initiatorRole: currentUser.role,
        currentApproverRole: 'FINANCE_MANAGER',
        targetApproverRole: 'FINANCE_MANAGER',
        isSpecialScenario: false,
        status: 'PENDING',
        history: [],
      });
    } catch (e) {
      console.warn('Could not register payment approval request:', e);
    }

    return payment;
  }

  /**
   * Finance Manager approves payment.
   * Upon approval:
   * 1. Updates payment status to APPROVED
   * 2. Reduces allocated invoice balance amounts and marks PAID/PARTIALLY_PAID
   * 3. Reduces Customer Master financials (totalOutstanding, availableCredit, nearDue, overdue)
   */
  async approvePayment(
    paymentId: string,
    currentUser: User,
    comment: string = 'Payment verified and approved by Finance.',
    syncApprovalRequest: boolean = true
  ): Promise<Payment> {
    const payment = await this.repo.getById(paymentId);
    if (!payment) {
      throw new Error(`Payment record not found: ${paymentId}`);
    }

    if (payment.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve payment in status '${payment.status}'.`);
    }

    const canApprove = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER'].includes(currentUser.role);
    if (!canApprove) {
      throw new Error(
        `Role ${currentUser.role} is not authorized to approve payments. Requires Finance Manager or Director authorization.`
      );
    }

    // 1. Update Payment status
    const approvedPayment = await this.repo.update(payment.id, {
      status: 'APPROVED',
      approvedById: currentUser.id,
      approvedByName: currentUser.name,
      approvedAt: new Date().toISOString(),
    });

    // 2. Apply allocations to invoices
    if (payment.invoiceAllocations && payment.invoiceAllocations.length > 0) {
      for (const alloc of payment.invoiceAllocations) {
        const inv = await this.invoiceSvc.getInvoiceById(alloc.invoiceId);
        if (inv) {
          if (alloc.allocatedAmount > inv.balanceAmount + 0.001) {
            throw new Error(
              `Cannot approve payment: Allocated amount (LKR ${alloc.allocatedAmount.toLocaleString()}) exceeds invoice ${inv.invoiceNumber} current balance (LKR ${inv.balanceAmount.toLocaleString()}).`
            );
          }
          const newPaidAmount = inv.paidAmount + alloc.allocatedAmount;
          const newBalanceAmount = Math.max(0, inv.totalAmount - newPaidAmount);
          const newStatus = calculateInvoiceStatus(inv.totalAmount, newPaidAmount, inv.dueDate);

          await this.invoiceSvc.updateInvoice(inv.id, {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newStatus,
          });
        }
      }
    }

    // 3. Update Customer Master financials (Single Source of Truth)
    try {
      const customer = await this.customerSvc.getCustomer(payment.customerId);
      if (customer) {
        const newTotalOutstanding = Math.max(0, customer.financials.totalOutstanding - payment.amount);
        const newAvailableCredit = Math.max(0, customer.commercialTerms.creditLimit - newTotalOutstanding);

        // Recalculate customer aging based on all customer invoices
        const customerInvoices = await this.invoiceSvc.getInvoicesByCustomer(customer.id);
        let totalOverdue = 0;
        let totalNearDue = 0;
        let totalCurrent = 0;

        const now = new Date();
        const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        for (const inv of customerInvoices) {
          if (inv.balanceAmount > 0) {
            const isOverdue = isPastDueDate(inv.dueDate, now);
            if (isOverdue) {
              totalOverdue += inv.balanceAmount;
            } else {
              const [y, m, d] = inv.dueDate.split('-').map(Number);
              const due = new Date(y, m - 1, d, 23, 59, 59, 999);
              if (due <= sevenDaysAhead) {
                totalNearDue += inv.balanceAmount;
              } else {
                totalCurrent += inv.balanceAmount;
              }
            }
          }
        }

        await this.customerSvc.updateCustomer(customer.id, {
          financials: {
            ...customer.financials,
            totalOutstanding: newTotalOutstanding,
            availableCredit: newAvailableCredit,
            overdue: totalOverdue,
            nearDue: totalNearDue,
            currentDue: totalCurrent,
            lastPaymentDate: payment.collectedAt,
            lastPaymentAmount: payment.amount,
          },
        });
      }
    } catch (err) {
      console.warn(`Customer financials update error for customer ${payment.customerId}:`, err);
    }

    // 4. Synchronize central approval engine
    if (syncApprovalRequest) {
      try {
        const pending = await this.approvalSvc.getPendingApprovals();
        const req = pending.find(
          (r) => r.documentType === 'PAYMENT_RECEIPT' && r.documentId === payment.id
        );
        if (req) {
          await this.approvalSvc.processAction(
            req.id,
            'APPROVE',
            currentUser.id,
            currentUser.name,
            currentUser.role,
            comment
          );
        }
      } catch (err) {
        console.warn('Central approval request sync error:', err);
      }
    }

    return approvedPayment;
  }

  /**
   * Rejects payment collection.
   */
  async rejectPayment(
    paymentId: string,
    reason: string,
    currentUser: User,
    syncApprovalRequest: boolean = true
  ): Promise<Payment> {
    const payment = await this.repo.getById(paymentId);
    if (!payment) {
      throw new Error(`Payment record not found: ${paymentId}`);
    }

    if (payment.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot reject payment in status '${payment.status}'.`);
    }

    const canReject = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER'].includes(currentUser.role);
    if (!canReject) {
      throw new Error(`Role ${currentUser.role} is not authorized to reject payments.`);
    }

    if (!reason || reason.trim().length < 3) {
      throw new Error('A rejection reason is required.');
    }

    const rejected = await this.repo.update(payment.id, {
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedById: currentUser.id,
      rejectedByName: currentUser.name,
      rejectedAt: new Date().toISOString(),
    });

    if (syncApprovalRequest) {
      try {
        const pending = await this.approvalSvc.getPendingApprovals();
        const req = pending.find(
          (r) => r.documentType === 'PAYMENT_RECEIPT' && r.documentId === payment.id
        );
        if (req) {
          await this.approvalSvc.processAction(
            req.id,
            'REJECT',
            currentUser.id,
            currentUser.name,
            currentUser.role,
            reason
          );
        }
      } catch (err) {
        console.warn('Central approval request sync error:', err);
      }
    }

    return rejected;
  }

  async printReceipt(payment: Payment, remainingCustomerBalance?: number): Promise<boolean> {
    return printerService.printPaymentReceipt(payment, remainingCustomerBalance);
  }

  shareReceiptViaWhatsApp(payment: Payment, customPhone?: string): void {
    whatsAppService.sharePaymentReceipt(payment, customPhone);
  }
}

export const paymentService = new PaymentService();
