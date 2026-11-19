export type AreaStatus = 'ACTIVE' | 'INACTIVE';

export interface AreaUser {
  id: string;
  fullName: string;
  displayName?: string | null;
  email: string;
  role: {
    code: string;
    name: string;
  };
}

export interface AreaCustomer {
  id: string;
  customerCode?: string | null;
  displayName: string;
  companyName: string;
  contactPerson: string;
  primaryContactNumber?: string | null;
  email?: string | null;
  status: string;
  loyaltyLevel?: string;
  creditPeriod?: number | null;
  creditLimit?: number | string | null;
}

export interface Area {
  id: string;
  areaCode?: string;
  areaName: string;
  description?: string | null;
  status: AreaStatus;
  createdAt?: string;
  updatedAt?: string;
  users?: AreaUser[];
  customers?: AreaCustomer[];
  _count?: {
    users: number;
    customers: number;
  };
}

export interface ListAreasParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AreaStatus | 'ALL';
  sortBy?: 'areaName' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAreaPayload {
  areaName: string;
  description?: string | null;
}

export interface UpdateAreaPayload {
  areaName?: string;
  description?: string | null;
  updatedAt: string;
}

export interface UpdateAreaStatusPayload {
  status: AreaStatus;
}

export interface PaginatedAreasResponse {
  data: Area[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages?: number;
  };
}
