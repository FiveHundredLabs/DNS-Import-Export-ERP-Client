import { useState, useEffect, useCallback } from 'react';
import { ApprovalRequest, ApprovalActionType } from '../types/approval';
import { UserRole } from '../types/auth';
import { approvalService } from '../services/ApprovalService';

export function useApprovals(userRole?: UserRole) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await approvalService.getPendingApprovals(userRole);
      setApprovals(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const executeAction = async (
    id: string,
    action: ApprovalActionType,
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    comment: string,
    targetRole?: UserRole
  ) => {
    const updated = await approvalService.processAction(
      id,
      action,
      actorId,
      actorName,
      actorRole,
      comment,
      targetRole
    );
    await fetchApprovals();
    return updated;
  };

  return {
    approvals,
    loading,
    error,
    refetch: fetchApprovals,
    executeAction,
  };
}
