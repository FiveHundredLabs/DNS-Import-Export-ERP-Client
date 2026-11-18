export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserSummary {
  id: string;
  fullName: string;
  displayName?: string | null;
  email: string;
  roleId?: string;
  roleCode?: string;
  role?: {
    id: string;
    code: string;
    name: string;
  } | string;
  phone?: string | null;
  areaId?: string | null;
  area?: {
    id: string;
    areaName: string;
  } | null;
  status: UserStatus | string;
  profileImage?: string | null;
  joinedDate?: string;
  birthday?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  roleCode?: string;
  areaId?: string;
  status?: UserStatus;
  sortBy?: 'fullName' | 'email' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsersResponse {
  data: UserSummary[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages?: number;
  };
}

export interface CreateUserPayload {
  fullName: string;
  displayName: string;
  email: string;
  tempPassword: string;
  roleId: string;
  areaId?: string | null;
  profileImage?: string;
  status?: UserStatus;
  joinedDate: string;
  birthday?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  displayName?: string;
  profileImage?: string;
  joinedDate?: string;
  birthday?: string;
  updatedAt: string;
  areaId?: string | null;
}

export interface ChangeUserRolePayload {
  roleId: string;
  updatedAt: string;
}

export interface ChangeUserStatusPayload {
  status: UserStatus;
  updatedAt: string;
}
