export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

export interface Supplier {
  id: string;
  supplierCode: string | null;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
  vatNumber: string | null;
  paymentTerms: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNo: string | null;
  bankSwiftCode: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: {
    purchaseOrders: number;
    grns: number;
  };
}

export interface SupplierListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SupplierStatus;
  sortBy?: 'name' | 'supplierCode' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedSuppliersResponse {
  data: Supplier[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateSupplierPayload {
  supplierCode?: string | null;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  vatNumber?: string | null;
  paymentTerms?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankAccountNo?: string | null;
  bankSwiftCode?: string | null;
  status?: SupplierStatus;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export interface DeleteSupplierResponse {
  success: boolean;
  message: string;
}
