export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface FinanceCategory {
  id: string;
  code: string;
  name: string;
  rootClass: AccountClass;
  parentId: string | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  children?: FinanceCategory[];
  accounts?: FinanceAccount[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceAccount {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category?: {
    id: string;
    code: string;
    name: string;
    rootClass: AccountClass;
  };
  normalBalance: NormalBalance;
  currency: string;
  isSystem: boolean;
  isActive: boolean;
  description: string | null;
  currentBalance?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  code: string;
  name: string;
  parentId: string;
  sortOrder?: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateAccountPayload {
  code: string;
  name: string;
  categoryId: string;
  description?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  categoryId?: string;
  description?: string;
  isActive?: boolean;
}

export interface AccountQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  rootClass?: AccountClass;
  normalBalance?: NormalBalance;
  search?: string;
  isActive?: boolean;
}

export interface CategoryQueryParams {
  rootClass?: AccountClass;
  parentId?: string;
  search?: string;
  isActive?: boolean;
}
