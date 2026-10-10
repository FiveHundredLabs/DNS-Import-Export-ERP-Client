import { Product, Category, UnitOfMeasure, PriceChangeProposal } from '../types/product';
import { PaginatedResult, PaginationParams } from '../types/common';

export interface ProductFilters extends PaginationParams {
  categoryId?: string;
  status?: string;
  isPromotional?: boolean;
}

export interface IProductRepository {
  getAll(filters?: ProductFilters): Promise<PaginatedResult<Product>>;
  getById(id: string): Promise<Product | null>;
  getByBarcode(barcode: string): Promise<Product | null>;
  create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  update(id: string, updates: Partial<Product>): Promise<Product>;
  submitPriceProposal(proposal: Omit<PriceChangeProposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<PriceChangeProposal>;
  getPriceProposals(productId?: string): Promise<PriceChangeProposal[]>;
  getCategories(): Promise<Category[]>;
  createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  getUOMs(): Promise<UnitOfMeasure[]>;
}
