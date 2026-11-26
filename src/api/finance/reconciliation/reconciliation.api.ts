import { apiGet, apiPost } from '../../client';
import type {
  StartReconciliationPayload,
  ToggleClearancePayload,
  CreateAdjustmentPayload,
  CompleteReconciliationPayload,
  ReconciliationWorkspaceResponse,
  ReconciliationSession,
  BrsReportResponse,
  ReconciliationHistoryItem,
} from './reconciliation.types';

export const reconciliationApi = {
  startOrResumeSession: async (payload: StartReconciliationPayload, signal?: AbortSignal): Promise<ReconciliationSession> => {
    return apiPost<ReconciliationSession>('/finance/reconciliation/session', payload, {
      signal,
      successMessage: 'Reconciliation session initialized',
    });
  },

  getWorkspace: async (sessionId: string, signal?: AbortSignal): Promise<ReconciliationWorkspaceResponse> => {
    return apiGet<ReconciliationWorkspaceResponse>(`/finance/reconciliation/session/${sessionId}/workspace`, { signal });
  },

  getSessionById: async (sessionId: string, signal?: AbortSignal): Promise<ReconciliationSession> => {
    return apiGet<ReconciliationSession>(`/finance/reconciliation/session/${sessionId}`, { signal });
  },

  toggleClearance: async (
    sessionId: string,
    payload: ToggleClearancePayload,
    signal?: AbortSignal,
  ): Promise<ReconciliationWorkspaceResponse> => {
    return apiPost<ReconciliationWorkspaceResponse>(`/finance/reconciliation/session/${sessionId}/clear`, payload, {
      signal,
    });
  },

  addAdjustment: async (
    sessionId: string,
    payload: CreateAdjustmentPayload,
    signal?: AbortSignal,
  ): Promise<ReconciliationWorkspaceResponse> => {
    return apiPost<ReconciliationWorkspaceResponse>(`/finance/reconciliation/session/${sessionId}/adjustments`, payload, {
      signal,
      successMessage: 'Bank adjustment posted and cleared',
    });
  },

  completeReconciliation: async (
    sessionId: string,
    payload?: CompleteReconciliationPayload,
    signal?: AbortSignal,
  ): Promise<ReconciliationSession> => {
    return apiPost<ReconciliationSession>(`/finance/reconciliation/session/${sessionId}/complete`, payload || {}, {
      signal,
      successMessage: 'Bank reconciliation completed and locked successfully',
    });
  },

  getReport: async (sessionId: string, signal?: AbortSignal): Promise<BrsReportResponse> => {
    return apiGet<BrsReportResponse>(`/finance/reconciliation/session/${sessionId}/report`, { signal });
  },

  getHistory: async (params?: Record<string, unknown>, signal?: AbortSignal): Promise<ReconciliationHistoryItem[]> => {
    return apiGet<ReconciliationHistoryItem[]>('/finance/reconciliation/history', { params, signal });
  },
};
