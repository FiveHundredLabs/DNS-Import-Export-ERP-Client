import { IApprovalRepository } from '../IApprovalRepository';
import { ApprovalRequest, ApprovalActionType } from '../../types/approval';
import { UserRole } from '../../types/auth';
import { MOCK_APPROVALS } from '../../mock/mockApprovals';

export class MockApprovalRepository implements IApprovalRepository {
  private approvals: ApprovalRequest[] = [...MOCK_APPROVALS];

  async getAll(userRole?: UserRole): Promise<ApprovalRequest[]> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (!userRole || userRole === 'DIRECTOR') {
      return [...this.approvals];
    }
    return this.approvals.filter(
      (a) => a.currentApproverRole === userRole || a.status !== 'PENDING'
    );
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

    const fromStatus = app.status;
    let newStatus = app.status;
    let newCurrentApprover = app.currentApproverRole;

    if (action === 'APPROVE') {
      newStatus = 'APPROVED';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (action === 'ESCALATE') {
      newStatus = 'ESCALATED';
      if (targetRole) {
        newCurrentApprover = targetRole;
      } else if (actorRole === 'SALES_MANAGER') {
        newCurrentApprover = 'MANAGER';
      } else if (actorRole === 'MANAGER') {
        newCurrentApprover = 'DIRECTOR';
      }
    }

    const newHistoryEntry = {
      id: `h-${Date.now().toString().slice(-4)}`,
      stepNumber: app.history.length + 1,
      actorId,
      actorName,
      actorRole,
      action,
      fromStatus,
      toStatus: newStatus,
      comment,
      timestamp: new Date().toISOString(),
    };

    const updated: ApprovalRequest = {
      ...app,
      status: newStatus === 'ESCALATED' ? 'PENDING' : newStatus,
      currentApproverRole: newCurrentApprover,
      history: [...app.history, newHistoryEntry],
      updatedAt: new Date().toISOString(),
    };

    this.approvals[idx] = updated;
    return updated;
  }
}
