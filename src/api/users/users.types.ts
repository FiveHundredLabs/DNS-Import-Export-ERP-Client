export interface UserSummary {
  id: string;
  fullName: string;
  displayName?: string | null;
  email: string;
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
  status: string;
  profileImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  roleCode?: string;
  areaId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
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
