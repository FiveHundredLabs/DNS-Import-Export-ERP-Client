import {
  CashHandover,
  CashHandoverItem,
  CreateHandoverInput,
  HandoverFilters,
  DailyHandoverMetrics,
} from '../types/handover';
import { Payment } from '../types/payment';
import { User } from '../types/auth';
import { PaginatedResult } from '../types/common';
import { paymentService } from './PaymentService';
import { approvalService } from './ApprovalService';
import { MOCK_USERS } from '../mock/mockUsers';

class HandoverService {
  private handovers: CashHandover[] = [
    {
      id: 'hnd-2026-0001',
      handoverNumber: 'HND-2026-0001',
      salesRepId: 'usr-106',
      salesRepName: 'Kasun Wickramasinghe',
      salesRepEmail: 'rep.colombo@dnserp.com',
      recipientUserId: 'usr-109',
      recipientUserName: 'Nimal Perera',
      recipientUserRole: 'Finance Officer',
      totalAmount: 75000,
      customerCount: 5,
      invoiceCount: 8,
      status: 'PENDING_APPROVAL',
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      notes: 'Daily field route collection handover for Western Province Central route.',
      items: [
        {
          paymentId: 'pay-001',
          receiptNumber: 'REC-2026-1001',
          customerId: 'cust-001',
          customerName: 'Lanka Electrical Superstore',
          customerCode: 'DLR-COL-001',
          amount: 25000,
          paymentMethod: 'CASH',
          collectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          invoiceAllocations: [
            { invoiceId: 'inv-001', invoiceNumber: 'INV-2026-101', allocatedAmount: 15000 },
            { invoiceId: 'inv-002', invoiceNumber: 'INV-2026-102', allocatedAmount: 10000 },
          ],
        },
        {
          paymentId: 'pay-002',
          receiptNumber: 'REC-2026-1002',
          customerId: 'cust-002',
          customerName: 'Muthurajawela Engineering',
          customerCode: 'DLR-NEG-002',
          amount: 15000,
          paymentMethod: 'CASH',
          collectedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
          invoiceAllocations: [
            { invoiceId: 'inv-003', invoiceNumber: 'INV-2026-103', allocatedAmount: 15000 },
          ],
        },
        {
          paymentId: 'pay-003',
          receiptNumber: 'REC-2026-1003',
          customerId: 'cust-003',
          customerName: 'Kelani Valley Lighting Mart',
          customerCode: 'DLR-KEL-003',
          amount: 12000,
          paymentMethod: 'CASH',
          collectedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          invoiceAllocations: [
            { invoiceId: 'inv-004', invoiceNumber: 'INV-2026-104', allocatedAmount: 6000 },
            { invoiceId: 'inv-005', invoiceNumber: 'INV-2026-105', allocatedAmount: 6000 },
          ],
        },
        {
          paymentId: 'pay-004',
          receiptNumber: 'REC-2026-1004',
          customerId: 'cust-004',
          customerName: 'Negombo Power & Cables',
          customerCode: 'DLR-NEG-004',
          amount: 13000,
          paymentMethod: 'CASH',
          collectedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
          invoiceAllocations: [
            { invoiceId: 'inv-006', invoiceNumber: 'INV-2026-106', allocatedAmount: 8000 },
            { invoiceId: 'inv-007', invoiceNumber: 'INV-2026-107', allocatedAmount: 5000 },
          ],
        },
        {
          paymentId: 'pay-005',
          receiptNumber: 'REC-2026-1005',
          customerId: 'cust-005',
          customerName: 'City Hardware & Electricals',
          customerCode: 'DLR-COL-005',
          amount: 10000,
          paymentMethod: 'CASH',
          collectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          invoiceAllocations: [
            { invoiceId: 'inv-008', invoiceNumber: 'INV-2026-108', allocatedAmount: 10000 },
          ],
        },
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  async getHandovers(filters?: HandoverFilters): Promise<PaginatedResult<CashHandover>> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    let filtered = [...this.handovers];

    if (filters?.salesRepId) {
      filtered = filtered.filter((h) => h.salesRepId === filters.salesRepId);
    }

    if (filters?.recipientUserId) {
      filtered = filtered.filter((h) => h.recipientUserId === filters.recipientUserId);
    }

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((h) => h.status === filters.status);
    }

    if (filters?.startDate) {
      filtered = filtered.filter((h) => h.submittedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      filtered = filtered.filter((h) => h.submittedAt <= filters.endDate!);
    }

    // Sort descending by submission
    filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

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

  async getHandoverById(id: string): Promise<CashHandover | null> {
    await new Promise((resolve) => setTimeout(resolve, 20));
    const h = this.handovers.find((item) => item.id === id);
    return h ? { ...h } : null;
  }

  /**
   * Retrieves all payments collected by the rep that are pending cash handover to Finance.
   */
  async getEligibleCollectionsForHandover(salesRepId?: string): Promise<Payment[]> {
    const all = await paymentService.getPayments({
      salesRepId,
      pageSize: 200,
    });

    return all.data.filter((p) => {
      // Must not be already approved/rejected, and must not be currently in another active handover
      if (p.status === 'APPROVED' || p.status === 'REJECTED') return false;
      if (p.handoverStatus === 'HANDED_OVER' || p.handoverStatus === 'APPROVED') return false;
      return true;
    });
  }

  /**
   * Creates a cash handover submission from a Sales Rep to a designated Finance user.
   */
  async createHandover(data: CreateHandoverInput, salesRepUser: User): Promise<CashHandover> {
    if (!data.recipientUserId) {
      throw new Error('Please select a Finance Department recipient for the cash handover.');
    }

    const recipient = MOCK_USERS.find((u) => u.id === data.recipientUserId);
    if (!recipient) {
      throw new Error(`Designated recipient user with ID ${data.recipientUserId} was not found.`);
    }

    if (!data.paymentIds || data.paymentIds.length === 0) {
      throw new Error('Please select at least one customer payment collection to include in the handover.');
    }

    // Fetch and validate each payment
    const payments: Payment[] = [];
    for (const pid of data.paymentIds) {
      const p = await paymentService.getPaymentById(pid);
      if (!p) {
        throw new Error(`Payment with ID ${pid} not found.`);
      }
      if (p.handoverStatus === 'HANDED_OVER') {
        throw new Error(
          `Payment ${p.receiptNumber} is already included in an active handover (${p.handoverNumber || 'pending'}).`
        );
      }
      if (p.status === 'APPROVED') {
        throw new Error(`Payment ${p.receiptNumber} has already been approved and settled by Finance.`);
      }
      payments.push(p);
    }

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const uniqueCustomerIds = new Set(payments.map((p) => p.customerId));
    const totalInvoices = payments.reduce(
      (sum, p) => sum + (p.invoiceAllocations?.length || 1),
      0
    );

    const year = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const handoverNumber = `HND-${year}-${seq}`;
    const nowStr = new Date().toISOString();

    const handoverItems: CashHandoverItem[] = payments.map((p) => ({
      paymentId: p.id,
      receiptNumber: p.receiptNumber,
      customerId: p.customerId,
      customerName: p.customerName,
      customerCode: p.customerCode,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      collectedAt: p.collectedAt,
      invoiceAllocations: p.invoiceAllocations || [],
    }));

    const newHandover: CashHandover = {
      id: `hnd-${Date.now().toString().slice(-6)}`,
      handoverNumber,
      salesRepId: salesRepUser.id,
      salesRepName: salesRepUser.name,
      salesRepEmail: salesRepUser.email,
      recipientUserId: recipient.id,
      recipientUserName: recipient.name,
      recipientUserRole: recipient.title || (recipient.role === 'FINANCE_MANAGER' ? 'Finance Officer' : recipient.role),
      totalAmount,
      customerCount: uniqueCustomerIds.size,
      invoiceCount: totalInvoices,
      status: 'PENDING_APPROVAL',
      submittedAt: nowStr,
      notes: data.notes,
      items: handoverItems,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    // Save handover
    this.handovers.unshift(newHandover);

    // Update each payment to lock it in HANDED_OVER status
    for (const p of payments) {
      await paymentService.updatePayment(p.id, {
        handoverId: newHandover.id,
        handoverNumber: newHandover.handoverNumber,
        handoverStatus: 'HANDED_OVER',
        handedOverToUserId: recipient.id,
        handedOverToUserName: recipient.name,
        handedOverAt: nowStr,
      });
    }

    // Register central approval request for Finance Manager
    try {
      await approvalService.createApprovalRequest({
        documentType: 'PAYMENT_RECEIPT',
        documentId: newHandover.id,
        documentReferenceNumber: newHandover.handoverNumber,
        title: `Cash Handover: ${newHandover.handoverNumber} (${salesRepUser.name} -> ${recipient.name})`,
        description: `Daily cash handover of LKR ${totalAmount.toLocaleString()} across ${uniqueCustomerIds.size} customers and ${totalInvoices} invoices.`,
        initiatorId: salesRepUser.id,
        initiatorName: salesRepUser.name,
        initiatorRole: salesRepUser.role,
        currentApproverRole: 'FINANCE_MANAGER',
        targetApproverRole: 'FINANCE_MANAGER',
        isSpecialScenario: false,
        status: 'PENDING',
        history: [],
      });
    } catch (err) {
      console.warn('Failed to register approval request for cash handover:', err);
    }

    return { ...newHandover };
  }

  /**
   * Finance Department verifies physical cash receipt and approves the handover.
   * Settles all included payments into APPROVED and updates all invoices to PAID/PARTIALLY_PAID.
   */
  async approveHandover(
    handoverId: string,
    financeUser: User,
    comment: string = 'Physical cash received and verified with field receipts.'
  ): Promise<CashHandover> {
    const idx = this.handovers.findIndex((h) => h.id === handoverId);
    if (idx === -1) {
      throw new Error(`Handover with ID ${handoverId} not found.`);
    }

    const handover = this.handovers[idx];
    if (handover.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve handover in status '${handover.status}'.`);
    }

    const canApprove = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER', 'CASHIER'].includes(financeUser.role);
    if (!canApprove) {
      throw new Error(`User role ${financeUser.role} is not authorized to approve cash handovers.`);
    }

    const nowStr = new Date().toISOString();

    // Settle every payment included in this handover
    for (const item of handover.items) {
      try {
        await paymentService.approvePayment(
          item.paymentId,
          financeUser,
          `Settled via Handover ${handover.handoverNumber}. ${comment}`,
          false
        );
        await paymentService.updatePayment(item.paymentId, {
          handoverStatus: 'APPROVED',
        });
      } catch (err) {
        console.warn(`Error settling payment ${item.paymentId} in handover:`, err);
      }
    }

    const updatedHandover: CashHandover = {
      ...handover,
      status: 'APPROVED',
      approvedAt: nowStr,
      approvedById: financeUser.id,
      approvedByName: financeUser.name,
      approvalComment: comment,
      updatedAt: nowStr,
    };

    this.handovers[idx] = updatedHandover;
    return { ...updatedHandover };
  }

  /**
   * Finance Department rejects the handover with a mandatory discrepancy reason.
   * Reverts payments to PENDING_HANDOVER so the Sales Rep can correct the discrepancy.
   */
  async rejectHandover(
    handoverId: string,
    financeUser: User,
    reason: string
  ): Promise<CashHandover> {
    if (!reason || !reason.trim()) {
      throw new Error('A mandatory reason is required to reject a cash handover.');
    }

    const idx = this.handovers.findIndex((h) => h.id === handoverId);
    if (idx === -1) {
      throw new Error(`Handover with ID ${handoverId} not found.`);
    }

    const handover = this.handovers[idx];
    if (handover.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot reject handover in status '${handover.status}'.`);
    }

    const canReject = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER', 'CASHIER'].includes(financeUser.role);
    if (!canReject) {
      throw new Error(`User role ${financeUser.role} is not authorized to reject cash handovers.`);
    }

    const nowStr = new Date().toISOString();

    // Release all payments back to PENDING_HANDOVER so rep can re-submit
    for (const item of handover.items) {
      try {
        await paymentService.updatePayment(item.paymentId, {
          handoverId: undefined,
          handoverNumber: undefined,
          handoverStatus: 'REJECTED',
          rejectionReason: `Handover ${handover.handoverNumber} rejected: ${reason.trim()}`,
        });
      } catch (err) {
        console.warn(`Error updating payment ${item.paymentId} during handover rejection:`, err);
      }
    }

    const updatedHandover: CashHandover = {
      ...handover,
      status: 'REJECTED',
      rejectedAt: nowStr,
      rejectedById: financeUser.id,
      rejectedByName: financeUser.name,
      rejectionReason: reason.trim(),
      updatedAt: nowStr,
    };

    this.handovers[idx] = updatedHandover;
    return { ...updatedHandover };
  }

  /**
   * Computes the 4 key dashboard metrics for today's collections & handovers:
   * 1. Today's Total Collections
   * 2. Pending Handover
   * 3. Handed Over
   * 4. Approved by Finance
   */
  async getDailyMetrics(salesRepId?: string): Promise<DailyHandoverMetrics> {
    const res = await paymentService.getPayments({
      salesRepId,
      pageSize: 200,
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let todayTotalCollected = 0;
    let pendingHandover = 0;
    let handedOver = 0;
    let approvedByFinance = 0;

    for (const p of res.data) {
      const isToday = p.collectedAt?.startsWith(todayStr);

      if (isToday) {
        todayTotalCollected += p.amount;
      }

      if (p.status === 'APPROVED') {
        approvedByFinance += p.amount;
      } else if (p.handoverStatus === 'HANDED_OVER') {
        handedOver += p.amount;
      } else if (p.status === 'PENDING_APPROVAL') {
        pendingHandover += p.amount;
      }
    }

    return {
      todayTotalCollected,
      pendingHandover,
      handedOver,
      approvedByFinance,
    };
  }
}

export const handoverService = new HandoverService();
