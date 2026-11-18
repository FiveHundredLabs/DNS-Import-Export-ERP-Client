import { apiGet, apiPut } from '../client';
import { CreditTermsConfig, UpdateCreditTermsConfigPayload } from './credit-terms.types';

export const creditTermsApi = {
  getConfig: async (signal?: AbortSignal): Promise<CreditTermsConfig> => {
    return apiGet<CreditTermsConfig>('/settings/credit-terms', { signal });
  },

  updateConfig: async (
    payload: UpdateCreditTermsConfigPayload,
    signal?: AbortSignal,
  ): Promise<CreditTermsConfig> => {
    return apiPut<CreditTermsConfig>('/settings/credit-terms', payload, {
      signal,
      successMessage: 'Default credit terms configuration updated successfully',
    });
  },
};
