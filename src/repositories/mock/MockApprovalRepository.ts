import { IApprovalRepository } from '../IApprovalRepository';
import { ApprovalRequest, ApprovalActionType } from '../../types/approval';
import { UserRole } from '../../types/auth';
import { MOCK_APPROVALS } from '../../mock/mockApprovals';

const APPROVALS_STORAGE_KEY = 'dns_erp_approval_requests_v4';

export class MockApprovalRepository implements IApprovalRepository {
  private static instance: MockApprovalRepository | null = null;
  private approvals: ApprovalRequest[] = [];

  public static getInstance(): MockApprovalRepository {
    if (!MockApprovalRepository.instance) {
      MockApprovalRepository.instance = new MockApprovalRepository();
    }
    return MockApprovalRepository.instance;
  }

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Purge legacy storage versions to prevent broken/stale references on client machines
        localStorage.removeItem('dns_erp_approval_requests');
        localStorage.removeItem('dns_erp_approval_requests_v2');
        localStorage.removeItem('dns_erp_approval_requests_v3');

        const stored = localStorage.getItem(APPROVALS_STORAGE_KEY);
        if (stored) {
          const parsed: ApprovalRequest[] = JSON.parse(stored);
          const mockMap = new Map(MOCK_APPROVALS.map((m) => [m.id, m]));

          // Ensure base approvals reflect canonical document IDs and details
          const updatedParsed = parsed.map((item) => {
            const base = mockMap.get(item.id);
            if (base && item.status === 'PENDING') {
              return {
                ...item,
                documentId: base.documentId,
                documentReferenceNumber: base.documentReferenceNumber,
                documentType: base.documentType,
                title: base.title,
                description: base.description,
                currentApproverRole: base.currentApproverRole,
                targetApproverRole: base.targetApproverRole,
              };
            }
            return item;
          });

          const existingIds = new Set(updatedParsed.map((a) => a.id));
          const missing = MOCK_APPROVALS.filter((a) => !existingIds.has(a.id));
          this.approvals = [...updatedParsed, ...JSON.parse(JSON.stringify(missing))];
          this.saveToStorage();
        } else {
          this.approvals = JSON.parse(JSON.stringify(MOCK_APPROVALS));
          this.saveToStorage();
        }
      } else {
        this.approvals = JSON.parse(JSON.stringify(MOCK_APPROVALS));
      }
    } catch (e) {
      this.approvals = JSON.parse(JSON.stringify(MOCK_APPROVALS));
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(APPROVALS_STORAGE_KEY, JSON.stringify(this.approvals));
      }
    } catch (e) {}
  }

  resetToDefaults(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(APPROVALS_STORAGE_KEY);
      }
    } catch (e) {}
    this.init();
  }

  async getAll(userRole?: UserRole): Promise<ApprovalRequest[]> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (!userRole || userRole === 'DIRECTOR') {
      return [...this.approvals];
    }
    return this.approvals.filter((a) => {
      // Direct approver
      if (a.currentApproverRole === userRole) return true;
      // Creator/initiator
      if (a.initiatorRole === userRole) return true;
      // Involved in history
      if (a.history.some((h) => h.actorRole === userRole)) return true;
      // Domain-specific visibility for Purchasing
      if (
        (userRole === 'PURCHASING_MANAGER' || userRole === 'PURCHASING_OFFICER') &&
        a.documentType === 'PURCHASE_ORDER'
      ) {
        return true;
      }
      // Domain-specific visibility for Sales
      if (
        (userRole === 'SALES_MANAGER' || userRole === 'SALES_REP' || userRole === 'AREA_MANAGER') &&
        (a.documentType === 'SALES_ORDER' ||
          a.documentType === 'SPECIAL_SALES_ORDER' ||
          a.documentType === 'QUOTATION_DISCOUNT' ||
          a.documentType === 'CUSTOMER_CREATION')
      ) {
        return true;
      }
      // Domain-specific visibility for Finance
      if (
        (userRole === 'FINANCE_MANAGER' || userRole === 'CASHIER') &&
        (a.documentType === 'PAYMENT_RECEIPT' ||
          a.documentType === 'CUSTOMER_CREATION' ||
          a.documentType === 'EXPENSE_CLAIM')
      ) {
        return true;
      }
      // General Manager sees pending and managed departmental requests
      if (userRole === 'MANAGER') {
        return true;
      }
      return false;
    });
  }

  async getById(id: string): Promise<ApprovalRequest | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const app = this.approvals.find((a) => a.id === id);
    return app ? { ...app } : null;
  }

  async create(
    request: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApprovalRequest> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const now = new Date().toISOString();
    const newRequest: ApprovalRequest = {
      ...request,
      id: `app-${Date.now().toString().slice(-4)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.approvals.unshift(newRequest);
    this.saveToStorage();
    return newRequest;
  }

  async executeAction(
    id: string,
    action: ApprovalActionType,
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    comment: string,
    targetRole?: UserRole
  ): Promise<ApprovalRequest> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = this.approvals.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Approval request ${id} not found.`);

    const app = this.approvals[idx];
    if (app.status !== 'PENDING') {
      throw new Error(`Cannot execute action on approval request ${id} with status ${app.status}.`);
    }

    const authorizedApprovers: UserRole[] = [
      'DIRECTOR',
      'MANAGER',
      'SALES_MANAGER',
      'FINANCE_MANAGER',
      'PURCHASING_MANAGER',
      'STOCK_MANAGER',
    ];
    if (actorRole && !authorizedApprovers.includes(actorRole)) {
      throw new Error(`Role '${actorRole}' is not authorized to act on approval requests.`);
    }

    const fromStatus = app.status;
    let newStatus = app.status;
    let newCurrentApprover = app.currentApproverRole;

    if (action === 'APPROVE') {
      if (actorId && app.initiatorId && actorId === app.initiatorId) {
        throw new Error('Self-approval is strictly prohibited. The creator cannot approve their own request.');
      }
      if (
        app.documentType === 'PURCHASE_ORDER' &&
        app.initiatorRole === 'PURCHASING_MANAGER' &&
        actorRole === 'PURCHASING_MANAGER'
      ) {
        throw new Error('Self-approval is strictly prohibited. Purchasing Manager cannot approve their own purchase order.');
      }

      const alreadyApproved = app.history.some(
        (h) => h.actorId === actorId && h.action === 'APPROVE'
      );
      if (alreadyApproved) {
        throw new Error(`Duplicate approval: User '${actorName}' has already approved this request.`);
      }

      if (
        actorRole &&
        actorRole !== 'DIRECTOR' &&
        actorRole !== 'MANAGER' &&
        actorRole !== app.currentApproverRole
      ) {
        throw new Error(
          `Role '${actorRole}' is not authorized to approve this request. Required role is '${app.currentApproverRole}'.`
        );
      }

      // ── Purchase Order: 2-stage (Purchasing Manager → Manager) ──────────────
      if (
        app.documentType === 'PURCHASE_ORDER' &&
        actorRole === 'PURCHASING_MANAGER' &&
        app.currentApproverRole === 'PURCHASING_MANAGER'
      ) {
        newStatus = 'PENDING';
        newCurrentApprover =
          app.targetApproverRole && app.targetApproverRole !== 'PURCHASING_MANAGER'
            ? app.targetApproverRole
            : 'MANAGER';
      }
      // ── Sales Order (standard path): Area Manager approves → forward to Sales Manager ──
      else if (
        (app.documentType === 'SALES_ORDER' || app.documentType === 'SPECIAL_SALES_ORDER') &&
        actorRole === 'AREA_MANAGER' &&
        app.currentApproverRole === 'AREA_MANAGER'
      ) {
        newStatus = 'PENDING';
        newCurrentApprover = app.targetApproverRole && app.targetApproverRole !== 'AREA_MANAGER'
          ? app.targetApproverRole
          : 'SALES_MANAGER';
      }
      // ── All other final approvals ────────────────────────────────────────────
      else {
        newStatus = 'APPROVED';
      }
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (action === 'ESCALATE') {
      newStatus = 'ESCALATED';
      if (targetRole) {
        newCurrentApprover = targetRole;
      } else if (actorRole === 'PURCHASING_MANAGER') {
        newCurrentApprover = 'MANAGER';
      } else if (actorRole === 'SALES_MANAGER') {
        newCurrentApprover = 'MANAGER';
      } else if (actorRole === 'MANAGER') {
        newCurrentApprover = 'DIRECTOR';
      }
    }

    const isIntermediate =
      newStatus === 'ESCALATED' ||
      (action === 'APPROVE' &&
        app.documentType === 'PURCHASE_ORDER' &&
        actorRole === 'PURCHASING_MANAGER' &&
        app.currentApproverRole === 'PURCHASING_MANAGER') ||
      (action === 'APPROVE' &&
        (app.documentType === 'SALES_ORDER' || app.documentType === 'SPECIAL_SALES_ORDER') &&
        actorRole === 'AREA_MANAGER' &&
        app.currentApproverRole === 'AREA_MANAGER');

    const newHistoryEntry = {
      id: `h-${Date.now().toString().slice(-4)}`,
      stepNumber: app.history.length + 1,
      actorId,
      actorName,
      actorRole,
      action,
      fromStatus,
      toStatus: isIntermediate ? 'PENDING' : newStatus,
      comment,
      timestamp: new Date().toISOString(),
    };

    const updated: ApprovalRequest = {
      ...app,
      status: isIntermediate ? 'PENDING' : newStatus,
      currentApproverRole: action === 'REJECT' ? app.currentApproverRole : newCurrentApprover,
      targetApproverRole: action === 'ESCALATE' ? newCurrentApprover : app.targetApproverRole,
      history: [...app.history, newHistoryEntry],
      updatedAt: new Date().toISOString(),
    };

    this.approvals[idx] = updated;
    this.saveToStorage();
    return updated;
  }
}
