export type BrandStatus = 'ACTIVE' | 'INACTIVE';

export interface Brand {
  id: string;
  name: string;
  status: BrandStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface ListBrandsParams {
  status?: BrandStatus;
  search?: string;
}

export interface CreateBrandPayload {
  name: string;
}

export interface UpdateBrandPayload {
  name: string;
}

export interface UpdateBrandStatusPayload {
  status: BrandStatus;
}
