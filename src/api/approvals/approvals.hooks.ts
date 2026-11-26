import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from './approvals.api';
import type { ApprovalActionPayload, ApprovalQueryParams } from './approvals.types';

export const approvalQueryKeys = {
  all: ['approvals'] as const,
  engine: () => [...approvalQueryKeys.all, 'engine'] as const,
  engineOverview: () => [...approvalQueryKeys.engine(), 'overview'] as const,
  engineRequests: (params?: ApprovalQueryParams) =>
    [...approvalQueryKeys.engine(), 'requests', params] as const,
  enginePipeline: (entityType: string, entityId: string) =>
    [...approvalQueryKeys.engine(), 'pipeline', entityType, entityId] as const,
  myApprovals: () => [...approvalQueryKeys.all, 'my-approvals'] as const,
  myCounts: () => [...approvalQueryKeys.myApprovals(), 'counts'] as const,
  myPending: (params?: ApprovalQueryParams) =>
    [...approvalQueryKeys.myApprovals(), 'pending', params] as const,
};

export function useApprovalEngineOverview(enabled = true) {
  return useQuery({
    queryKey: approvalQueryKeys.engineOverview(),
    queryFn: ({ signal }) => approvalsApi.getEngineOverview(signal),
    enabled,
    staleTime: 30_000,
  });
}

export function useApprovalEngineRequests(params?: ApprovalQueryParams, enabled = true) {
  return useQuery({
    queryKey: approvalQueryKeys.engineRequests(params),
    queryFn: ({ signal }) => approvalsApi.getEngineRequests(params, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useExecuteAdminApprovalAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      payload,
    }: {
      entityType: string;
      entityId: string;
      payload: ApprovalActionPayload;
    }) => approvalsApi.executeAdminAction(entityType, entityId, payload),
    onSuccess: (_data, { entityType, entityId }) => {
      queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all });
      queryClient.removeQueries({
        queryKey: approvalQueryKeys.enginePipeline(entityType, entityId),
      });
    },
  });
}

export function useMyApprovalCounts(enabled = true) {
  return useQuery({
    queryKey: approvalQueryKeys.myCounts(),
    queryFn: ({ signal }) => approvalsApi.getMyApprovalCounts(signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useMyPendingApprovals(params?: ApprovalQueryParams, enabled = true) {
  return useQuery({
    queryKey: approvalQueryKeys.myPending(params),
    queryFn: ({ signal }) => approvalsApi.getMyPendingApprovals(params, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
