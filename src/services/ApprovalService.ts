import { IApprovalRepository } from '../repositories/IApprovalRepository';
import { MockApprovalRepository } from '../repositories/mock/MockApprovalRepository';
import { ApprovalRequest, ApprovalActionType } from '../types/approval';
import { UserRole } from '../types/auth';

export type ApprovalActionListener = (
  request: ApprovalRequest,
  action: ApprovalActionType,
  actorRole: UserRole,
  comment: string
) => Promise<void>;

export class ApprovalService {
  private repo: IApprovalRepository;
  private listeners: ApprovalActionListener[] = [];

  constructor(repo?: IApprovalRepository) {
    this.repo = repo || new MockApprovalRepository();
  }

  onAction(listener: ApprovalActionListener) {
    this.listeners.push(listener);
  }

  async createApprovalRequest(
    data: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApprovalRequest> {
    return this.repo.create(data);
  }

  async getPendingApprovals(role?: UserRole): Promise<ApprovalRequest[]> {
    return this.repo.getAll(role);
  }

  async getApproval(id: string): Promise<ApprovalRequest | null> {
    return this.repo.getById(id);
  }

  async processAction(
    id: string,
    action: ApprovalActionType,
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    comment: string,
    targetRole?: UserRole
  ): Promise<ApprovalRequest> {
    if (!comment || comment.trim().length < 3) {
      throw new Error('An explanatory comment is required for every approval action.');
    }
    const updated = await this.repo.executeAction(id, action, actorId, actorName, actorRole, comment, targetRole);

    for (const listener of this.listeners) {
      try {
        await listener(updated, action, actorRole, comment);
      } catch (err) {
        console.error('Error executing approval listener:', err);
      }
    }

    return updated;
  }
}

export const approvalService = new ApprovalService();
