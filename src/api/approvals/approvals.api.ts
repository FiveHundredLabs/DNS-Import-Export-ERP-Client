import { apiGet, apiPost } from '../client';
import type {
  ApprovalItem,
  ApprovalEngineOverview,
  ApprovalCounts,
  ApprovalQueryParams,
  ApprovalActionPayload,
  ApprovalPipeline,
} from './approvals.types';

interface BackendPaginatedApprovals {
  items: ApprovalItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function normalizePaginatedApprovals(
  res: BackendPaginatedApprovals | ApprovalItem[],
): { data: ApprovalItem[]; meta: { total: number; page: number; pageSize: number } } {
  if (Array.isArray(res)) {
    return {
      data: res,
      meta: { total: res.length, page: 1, pageSize: res.length || 15 },
    };
  }
  const items = Array.isArray(res?.items) ? res.items : [];
  return {
    data: items,
    meta: {
      total: res?.total ?? items.length,
      page: res?.page ?? 1,
      pageSize: res?.limit ?? 15,
    },
  };
}

export const approvalsApi = {
  // ── Approval Engine (Administrative - Directors & Managers) ─────────────
  getEngineOverview: async (): Promise<ApprovalEngineOverview> => {
    return apiGet<ApprovalEngineOverview>('/approvals/engine/overview');
  },

  getEngineRequests: async (params?: ApprovalQueryParams) => {
    const res = await apiGet<BackendPaginatedApprovals | ApprovalItem[]>(
      '/approvals/engine/requests',
      { params },
    );
    return normalizePaginatedApprovals(res);
  },

  getEnginePipeline: async (
    entityType: string,
    entityId: string,
  ): Promise<ApprovalPipeline> => {
    return apiGet<ApprovalPipeline>(
      `/approvals/engine/${entityType}/${entityId}/pipeline`,
    );
  },

  executeAdminAction: async (
    entityType: string,
    entityId: string,
    payload: ApprovalActionPayload,
  ) => {
    return apiPost<{ success: boolean; message: string }>(
      `/approvals/engine/${entityType}/${entityId}/action`,
      payload,
    );
  },

  // ── My Approvals (Role-Specific Workspace) ───────────────────────────────
  getMyPendingApprovals: async (params?: ApprovalQueryParams) => {
    const res = await apiGet<BackendPaginatedApprovals | ApprovalItem[]>(
      '/approvals/my-approvals/pending',
      { params },
    );
    return normalizePaginatedApprovals(res);
  },

  getMyApprovalCounts: async (): Promise<ApprovalCounts> => {
    return apiGet<ApprovalCounts>('/approvals/my-approvals/counts');
  },

  executeRoleAction: async (
    entityType: string,
    entityId: string,
    payload: ApprovalActionPayload,
  ) => {
    return apiPost<{ success: boolean; message: string }>(
      `/approvals/my-approvals/${entityType}/${entityId}/action`,
      payload,
    );
  },
};
