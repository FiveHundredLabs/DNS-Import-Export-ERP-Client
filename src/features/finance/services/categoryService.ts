import { AccountClass, AccountSubClass } from '../api/types';

export interface FinanceCategory {
  id: string;
  code: string;
  name: string;
  accountClass: AccountClass;
  accountSubClass?: AccountSubClass;
  parentId?: string | null;
  isSystem?: boolean;
  description?: string;
  order?: number;
}

const CATEGORIES_STORAGE_KEY = 'dns_finance_categories_registry_v1';

export const INITIAL_DEFAULT_CATEGORIES: FinanceCategory[] = [
  // 1000 Assets
  {
    id: 'cat-1000',
    code: '1000',
    name: 'Assets',
    accountClass: 'ASSET',
    parentId: null,
    isSystem: true,
    description: 'Master Asset Group: Economic resources controlled by the entity',
    order: 1,
  },
  {
    id: 'cat-1001',
    code: '1001',
    name: 'Current Assets',
    accountClass: 'ASSET',
    accountSubClass: 'CURRENT_ASSET',
    parentId: 'cat-1000',
    isSystem: true,
    description: 'Cash, bank balances, accounts receivable, inventories and short-term prepayments',
    order: 2,
  },
  {
    id: 'cat-1500',
    code: '1500',
    name: 'Non-Current Assets',
    accountClass: 'ASSET',
    accountSubClass: 'NON_CURRENT_ASSET',
    parentId: 'cat-1000',
    isSystem: true,
    description: 'Property, plant, equipment, machinery, motor vehicles, and long-term investments',
    order: 3,
  },

  // 2000 Liabilities
  {
    id: 'cat-2000',
    code: '2000',
    name: 'Liabilities',
    accountClass: 'LIABILITY',
    parentId: null,
    isSystem: true,
    description: 'Master Liability Group: Present obligations from past events',
    order: 4,
  },
  {
    id: 'cat-2001',
    code: '2001',
    name: 'Current Liabilities',
    accountClass: 'LIABILITY',
    accountSubClass: 'CURRENT_LIABILITY',
    parentId: 'cat-2000',
    isSystem: true,
    description: 'Accounts payable, trade payables, statutory VAT/tax accrued, and short-term notes',
    order: 5,
  },
  {
    id: 'cat-2002',
    code: '2002',
    name: 'Fixed Liabilities',
    accountClass: 'LIABILITY',
    accountSubClass: 'NON_CURRENT_LIABILITY',
    parentId: 'cat-2000',
    isSystem: true,
    description: 'Long-term bank loans, shareholder advances, and non-current financial notes',
    order: 6,
  },

  // 3000 Equity
  {
    id: 'cat-3000',
    code: '3000',
    name: 'Equity',
    accountClass: 'EQUITY',
    parentId: null,
    isSystem: true,
    description: 'Master Equity Group: Residual interest in the assets after deducting liabilities',
    order: 7,
  },
  {
    id: 'cat-3001',
    code: '3001',
    name: 'Capital & Reserves',
    accountClass: 'EQUITY',
    accountSubClass: 'EQUITY',
    parentId: 'cat-3000',
    isSystem: true,
    description: 'Contributed share capital, retained earnings, and opening ledger reserves',
    order: 8,
  },

  // 4000 Revenue
  {
    id: 'cat-4000',
    code: '4000',
    name: 'Revenue',
    accountClass: 'INCOME',
    parentId: null,
    isSystem: true,
    description: 'Master Revenue Group: Gross inflows of economic benefits',
    order: 9,
  },
  {
    id: 'cat-4001',
    code: '4001',
    name: 'Revenue',
    accountClass: 'INCOME',
    accountSubClass: 'REVENUE',
    parentId: 'cat-4000',
    isSystem: true,
    description: 'Operating sales revenue, wholesale revenue, and commercial trade income',
    order: 10,
  },
  {
    id: 'cat-4002',
    code: '4002',
    name: 'Contra Revenue',
    accountClass: 'INCOME',
    accountSubClass: 'REVENUE',
    parentId: 'cat-4000',
    isSystem: true,
    description: 'Sales returns, settlement discounts, rebates, and revenue offsets',
    order: 11,
  },

  // 5000 Expenses
  {
    id: 'cat-5000',
    code: '5000',
    name: 'Expenses',
    accountClass: 'EXPENSE',
    parentId: null,
    isSystem: true,
    description: 'Master Expense Group: Decreases in economic benefits during the accounting period',
    order: 12,
  },
  {
    id: 'cat-5001',
    code: '5001',
    name: 'Direct Costs',
    accountClass: 'EXPENSE',
    accountSubClass: 'DIRECT_COST',
    parentId: 'cat-5000',
    isSystem: true,
    description: 'Cost of goods sold (COGS), import duties, ocean freight, and direct landed costs',
    order: 13,
  },
  {
    id: 'cat-5002',
    code: '5002',
    name: 'Operating Expenses',
    accountClass: 'EXPENSE',
    accountSubClass: 'OPERATING_EXPENSE',
    parentId: 'cat-5000',
    isSystem: true,
    description: 'Administrative salaries, rent, showroom utilities, logistics fuel, and overheads',
    order: 14,
  },
];

class CategoryService {
  private categories: FinanceCategory[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.categories = parsed;
          return;
        }
      }
    } catch {
      // ignore
    }
    this.categories = [...INITIAL_DEFAULT_CATEGORIES];
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(this.categories));
    } catch {
      // ignore
    }
  }

  getCategories(): FinanceCategory[] {
    return [...this.categories];
  }

  getCategoryById(id: string): FinanceCategory | undefined {
    return this.categories.find((c) => c.id === id);
  }

  getCategoryByCode(code: string): FinanceCategory | undefined {
    return this.categories.find((c) => c.code === code);
  }

  createCategory(data: Omit<FinanceCategory, 'id'>): FinanceCategory {
    const existing = this.categories.find((c) => c.code === data.code.trim());
    if (existing) {
      throw new Error(`Category code "${data.code}" already exists.`);
    }

    const newCategory: FinanceCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code: data.code.trim(),
      name: data.name.trim(),
      accountClass: data.accountClass,
      accountSubClass: data.accountSubClass,
      parentId: data.parentId || null,
      isSystem: false,
      description: data.description?.trim(),
      order: this.categories.length + 1,
    };

    this.categories.push(newCategory);
    this.saveToStorage();
    return newCategory;
  }

  updateCategory(id: string, data: Partial<FinanceCategory>): FinanceCategory {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Category with ID "${id}" not found.`);
    }

    if (data.code && data.code.trim() !== this.categories[idx].code) {
      const conflict = this.categories.find((c) => c.code === data.code!.trim() && c.id !== id);
      if (conflict) {
        throw new Error(`Category code "${data.code}" is already in use.`);
      }
    }

    const updated = {
      ...this.categories[idx],
      ...data,
      code: data.code ? data.code.trim() : this.categories[idx].code,
      name: data.name ? data.name.trim() : this.categories[idx].name,
    };

    this.categories[idx] = updated;
    this.saveToStorage();
    return updated;
  }

  deleteCategory(id: string): boolean {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return false;
    if (cat.isSystem && !cat.parentId) {
      throw new Error('Default system master categories cannot be deleted.');
    }

    // Check if category has child categories
    const hasChildren = this.categories.some((c) => c.parentId === id);
    if (hasChildren) {
      throw new Error('Cannot delete category with nested sub-categories. Remove sub-categories first.');
    }

    this.categories = this.categories.filter((c) => c.id !== id);
    this.saveToStorage();
    return true;
  }

  resetToDefaults(): void {
    this.categories = [...INITIAL_DEFAULT_CATEGORIES];
    this.saveToStorage();
  }
}

export const categoryService = new CategoryService();
