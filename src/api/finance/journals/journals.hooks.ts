import { useMutation, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { journalsApi } from './journals.api';
import { coaKeys } from '../coa/coa.hooks';
import type {
  JournalEntry,
  CreateJournalPayload,
  UpdateJournalPayload,
  ReverseJournalPayload,
  JournalQueryParams,
} from './journals.types';

export const journalKeys = {
  all: ['finance', 'journals'] as const,
  lists: () => [...journalKeys.all, 'list'] as const,
  list: (params?: JournalQueryParams) => [...journalKeys.lists(), params] as const,
  details: () => [...journalKeys.all, 'detail'] as const,
  detail: (id: string) => [...journalKeys.details(), id] as const,
  activities: () => [...journalKeys.all, 'activity'] as const,
  activity: (id: string) => [...journalKeys.activities(), id] as const,
};

export function useJournals(params?: JournalQueryParams): UseQueryResult<JournalEntry[], Error> {
  return useQuery({
    queryKey: journalKeys.list(params),
    queryFn: ({ signal }) => journalsApi.list(params, signal),
    staleTime: 0, // Real-time financial transaction data
  });
}

export function useJournal(id: string): UseQueryResult<JournalEntry, Error> {
  return useQuery({
    queryKey: journalKeys.detail(id),
    queryFn: ({ signal }) => journalsApi.getById(id, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useCreateDraftJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJournalPayload) => journalsApi.createDraft(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() });
    },
  });
}

export function usePostDirectJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJournalPayload) => journalsApi.postDirect(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
    },
  });
}

export function usePostDraftJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalsApi.postDraft(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
      queryClient.setQueryData(journalKeys.detail(updated.id), updated);
    },
  });
}

export function useReverseJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReverseJournalPayload }) =>
      journalsApi.reverse(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
      queryClient.invalidateQueries({ queryKey: coaKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ['finance', 'reports'] });
      queryClient.setQueryData(journalKeys.detail(updated.id), updated);
    },
  });
}

export function useUpdateDraftJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateJournalPayload }) =>
      journalsApi.updateDraft(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() });
      queryClient.setQueryData(journalKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteDraftJournal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalsApi.deleteDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.lists() });
    },
  });
}
