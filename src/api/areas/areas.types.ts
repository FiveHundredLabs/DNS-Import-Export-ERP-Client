export interface Area {
  id: string;
  areaCode: string;
  areaName: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListAreasParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'areaName' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
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
