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

export interface PaginatedAreasResponse {
  data: Area[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages?: number;
  };
}
