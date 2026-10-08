import { IProductRepository, ProductFilters } from '../IProductRepository';
import { Product, Category, UnitOfMeasure, PriceChangeProposal } from '../../types/product';
import { PaginatedResult } from '../../types/common';
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_UOMS } from '../../mock/mockProducts';

export class MockProductRepository implements IProductRepository {
  private products: Product[] = [...MOCK_PRODUCTS];
  private categories: Category[] = [...MOCK_CATEGORIES];
  private uoms: UnitOfMeasure[] = [...MOCK_UOMS];
  private proposals: PriceChangeProposal[] = [];

  async getAll(filters?: ProductFilters): Promise<PaginatedResult<Product>> {
    // Simulate real network delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    let filtered = [...this.products];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q)
      );
    }

    if (filters?.categoryId) {
      filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
    }

    if (filters?.status) {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  }

  async getById(id: string): Promise<Product | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const prod = this.products.find((p) => p.id === id);
    return prod ? { ...prod } : null;
  }

  async getByBarcode(barcode: string): Promise<Product | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const prod = this.products.find((p) => p.barcode === barcode);
    return prod ? { ...prod } : null;
  }

  async create(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (this.products.some((p) => p.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new Error(`A product with SKU "${input.sku}" already exists in Product Master.`);
    }
    if (this.products.some((p) => p.barcode === input.barcode)) {
      throw new Error(`A product with Barcode "${input.barcode}" already exists in Product Master.`);
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      ...input,
      id: `prod-${Date.now().toString().slice(-4)}`,
      createdAt: now,
      updatedAt: now,
    };

    this.products.unshift(newProduct);
    return newProduct;
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Product with id ${id} not found.`);

    const updated: Product = {
      ...this.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.products[idx] = updated;
    return updated;
  }

  async submitPriceProposal(
    proposal: Omit<PriceChangeProposal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PriceChangeProposal> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const now = new Date().toISOString();
    const newProposal: PriceChangeProposal = {
      ...proposal,
      id: `prp-${Date.now().toString().slice(-4)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.proposals.unshift(newProposal);
    return newProposal;
  }

  async getPriceProposals(productId?: string): Promise<PriceChangeProposal[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (productId) {
      return this.proposals.filter((p) => p.productId === productId);
    }
    return [...this.proposals];
  }

  async getCategories(): Promise<Category[]> {
    return [...this.categories];
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const now = new Date().toISOString();
    const newCategory: Category = {
      ...category,
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  async getUOMs(): Promise<UnitOfMeasure[]> {
    return [...this.uoms];
  }
}
