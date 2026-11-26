import { apiGet, apiPost, apiPatch, apiDelete } from '../../client';
import type {
  JournalEntry,
  CreateJournalPayload,
  UpdateJournalPayload,
  ReverseJournalPayload,
  JournalQueryParams,
} from './journals.types';

export const journalsApi = {
  list: async (params?: JournalQueryParams, signal?: AbortSignal): Promise<JournalEntry[]> => {
    return apiGet<JournalEntry[]>('/finance/journals', { params, signal });
  },

  getById: async (id: string, signal?: AbortSignal): Promise<JournalEntry> => {
    return apiGet<JournalEntry>(`/finance/journals/${id}`, { signal });
  },

  createDraft: async (payload: CreateJournalPayload, signal?: AbortSignal): Promise<JournalEntry> => {
    return apiPost<JournalEntry>('/finance/journals', payload, {
      signal,
      successMessage: 'Draft journal entry saved',
    });
  },

  postDirect: async (payload: CreateJournalPayload, signal?: AbortSignal): Promise<JournalEntry> => {
    return apiPost<JournalEntry>('/finance/journals/post', payload, {
      signal,
      successMessage: 'Journal entry posted to General Ledger',
    });
  },

  postDraft: async (id: string, signal?: AbortSignal): Promise<JournalEntry> => {
    return apiPost<JournalEntry>(`/finance/journals/${id}/post`, {}, {
      signal,
      successMessage: 'Draft journal entry posted to General Ledger',
    });
  },

  reverse: async (id: string, payload: ReverseJournalPayload, signal?: AbortSignal): Promise<JournalEntry> => {
    return apiPost<JournalEntry>(`/finance/journals/${id}/reverse`, payload, {
      signal,
      successMessage: 'Journal entry reversed successfully',
    });
  },

  updateDraft: async (id: string, payload: UpdateJournalPayload, signal?: AbortSignal): Promise<JournalEntry> => {
    return apiPatch<JournalEntry>(`/finance/journals/${id}`, payload, {
      signal,
      successMessage: 'Draft journal entry updated',
    });
  },

  deleteDraft: async (id: string, signal?: AbortSignal): Promise<void> => {
    return apiDelete<void>(`/finance/journals/${id}`, {
      signal,
      successMessage: 'Draft journal entry deleted',
    });
  },

  getActivity: async (id: string, signal?: AbortSignal): Promise<unknown[]> => {
    return apiGet<unknown[]>(`/finance/journals/${id}/activity`, { signal });
  },
};
