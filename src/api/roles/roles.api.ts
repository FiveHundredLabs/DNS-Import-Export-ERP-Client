import { apiGet } from '../client';
import { Role, RoleWithAssignableRoles } from './roles.types';

export const rolesApi = {
  listRoles: async (signal?: AbortSignal): Promise<Role[]> => {
    return apiGet<Role[]>('/roles', { signal });
  },

  getAssignableRoles: async (signal?: AbortSignal): Promise<Role[]> => {
    return apiGet<Role[]>('/roles/assignable', { signal });
  },

  getRoleById: async (id: string, signal?: AbortSignal): Promise<RoleWithAssignableRoles> => {
    return apiGet<RoleWithAssignableRoles>(`/roles/${id}`, { signal });
  },
};
