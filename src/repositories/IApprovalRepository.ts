import { ApprovalRequest, ApprovalActionType } from '../types/approval';
import { UserRole } from '../types/auth';

export interface IApprovalRepository {
  getAll(userRole?: UserRole): Promise<ApprovalRequest[]>;
  getById(id: string): Promise<ApprovalRequest | null>;
  create(
    request: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApprovalRequest>;
  executeAction(
    id: string,
    action: ApprovalActionType,
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    comment: string,
    targetRole?: UserRole
  ): Promise<ApprovalRequest>;
}
