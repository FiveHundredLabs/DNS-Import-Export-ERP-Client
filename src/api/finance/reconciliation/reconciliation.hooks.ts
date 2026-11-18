import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { reconciliationApi } from './reconciliation.api';
import { coaKeys } from '../coa/coa.hooks';
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

export const reconciliationKeys = {
  all: ['finance', 'reconciliation'] as const,
  workspaces: () => [...reconciliationKeys.all, 'workspace'] as const,
  workspace: (sessionId: string) => [...reconciliationKeys.workspaces(), sessionId] as const,
  sessions: () => [...reconciliationKeys.all, 'session'] as const,
  session: (id: string) => [...reconciliationKeys.sessions(), id] as const,
  reports: () => [...reconciliationKeys.all, 'report'] as const,
  report: (sessionId: string) => [...reconciliationKeys.reports(), sessionId] as const,
  history: () => [...reconciliationKeys.all, 'history'] as const,
};

export function useReconciliationWorkspace(sessionId: string): UseQueryResult<ReconciliationWorkspaceResponse, Error> {
  return useQuery({
    queryKey: reconciliationKeys.workspace(sessionId),
    queryFn: ({ signal }) => reconciliationApi.getWorkspace(sessionId, signal),
    enabled: Boolean(sessionId),
    staleTime: 0,
  });
}

export function useReconciliationSession(sessionId: string): UseQueryResult<ReconciliationSession, Error> {
  return useQuery({
    queryKey: reconciliationKeys.session(sessionId),
    queryFn: ({ signal }) => reconciliationApi.getSessionById(sessionId, signal),
    enabled: Boolean(sessionId),
    staleTime: 0,
  });
}

export function useBrsReport(sessionId: string): UseQueryResult<BrsReportResponse, Error> {
  return useQuery({
    queryKey: reconciliationKeys.report(sessionId),
    queryFn: ({ signal }) => reconciliationApi.getReport(sessionId, signal),
    enabled: Boolean(sessionId),
    staleTime: 0,
  });
}

export function useReconciliationHistory(params?: Record<string, unknown>): UseQueryResult<ReconciliationHistoryItem[], Error> {
  return useQuery({
    queryKey: reconciliationKeys.history(),
    queryFn: ({ signal }) => reconciliationApi.getHistory(params, signal),
    staleTime: 60_000,
  });
}

export function useStartReconciliationSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartReconciliationPayload) => reconciliationApi.startOrResumeSession(payload),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
      queryClient.setQueryData(reconciliationKeys.session(session.id), session);
    },
  });
}

export function useToggleClearance(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ToggleClearancePayload) => reconciliationApi.toggleClearance(sessionId, payload),
    onSuccess: (updatedWorkspace) => {
      queryClient.setQueryData(reconciliationKeys.workspace(sessionId), updatedWorkspace);
    },
  });
}

export function useAddBankAdjustment(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdjustmentPayload) => reconciliationApi.addAdjustment(sessionId, payload),
    onSuccess: (updatedWorkspace) => {
      queryClient.setQueryData(reconciliationKeys.workspace(sessionId), updatedWorkspace);
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'journals'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
    },
  });
}

export function useCompleteReconciliation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: CompleteReconciliationPayload) => reconciliationApi.completeReconciliation(sessionId, payload),
    onSuccess: (completedSession) => {
      queryClient.invalidateQueries({ queryKey: reconciliationKeys.all });
      queryClient.setQueryData(reconciliationKeys.session(sessionId), completedSession);
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
    },
  });
}
