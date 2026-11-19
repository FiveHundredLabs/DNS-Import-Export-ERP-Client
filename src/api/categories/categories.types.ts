export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface Category {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface ListCategoriesParams {
  status?: CategoryStatus;
  search?: string;
}

export interface CreateCategoryPayload {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  code?: string;
  description?: string;
}

export interface UpdateCategoryStatusPayload {
  status: CategoryStatus;
}
