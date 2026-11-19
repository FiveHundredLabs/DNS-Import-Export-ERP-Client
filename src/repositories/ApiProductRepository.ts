import { IProductRepository, ProductFilters } from './IProductRepository';
import { Product, Category, UnitOfMeasure, PriceChangeProposal } from '../types/product';
import { PaginatedResult } from '../types/common';
import { productsApi } from '../api/products/products.api';
import { MockProductRepository } from './mock/MockProductRepository';
import { CreateProductPayload, UpdateProductPayload } from '../api/products/products.types';

export class ApiProductRepository implements IProductRepository {
  private fallbackRepo: MockProductRepository = new MockProductRepository();

  async getAll(filters?: ProductFilters): Promise<PaginatedResult<Product>> {
    try {
      const res = await productsApi.listProducts({
        page: filters?.page,
        pageSize: filters?.pageSize,
        search: filters?.search,
        categoryId: filters?.categoryId,
        status: filters?.status as any,
      });

      return {
        data: res.data as unknown as Product[],
        total: res.meta.total,
        page: res.meta.page,
        pageSize: res.meta.pageSize,
        totalPages: res.meta.totalPages,
      };
    } catch (err) {
      console.warn('Backend products API unavailable, using offline fallback:', err);
      return this.fallbackRepo.getAll(filters);
    }
  }

  async getById(id: string): Promise<Product | null> {
    try {
      const res = await productsApi.getProductById(id);
      return res as unknown as Product;
    } catch (err) {
      console.warn(`Backend product getById(${id}) unavailable, using fallback:`, err);
      return this.fallbackRepo.getById(id);
    }
  }

  async getByBarcode(barcode: string): Promise<Product | null> {
    try {
      const res = await productsApi.getProductByBarcode(barcode);
      return res as unknown as Product;
    } catch (err) {
      console.warn(`Backend product getByBarcode(${barcode}) unavailable, using fallback:`, err);
      return this.fallbackRepo.getByBarcode(barcode);
    }
  }

  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const payload: CreateProductPayload = {
        name: product.name,
        sku: product.sku || undefined,
        barcode: product.barcode || undefined,
        description: product.description || undefined,
        categoryId: product.categoryId,
        unitOfMeasure: (product.uomCode || 'PCS') as any,
        warrantyPeriod: product.warrantyPeriodMonths || 0,
        costPrice: product.pricing.costPrice,
        sellingPrice: product.pricing.currentSellingPrice,
        minimumSellingPrice: product.pricing.minimumSellingPrice,
        hasSerialNumber: product.requiresSerialNumber ?? false,
        discountLevels: product.discountLevels || product.pricing.discountLevels,
        showroomDiscount: product.pricing.showroomDiscountPercentage || 5,
      };

      const res = await productsApi.createProduct(payload);
      return res as unknown as Product;
    } catch (err) {
      console.warn('Backend createProduct unavailable or failed, applying fallback:', err);
      return this.fallbackRepo.create(product);
    }
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    try {
      const payload: UpdateProductPayload = {
        name: updates.name,
        description: updates.description,
        categoryId: updates.categoryId,
        unitOfMeasure: updates.uomCode as any,
        warrantyPeriod: updates.warrantyPeriodMonths,
        costPrice: updates.pricing?.costPrice,
        sellingPrice: updates.pricing?.currentSellingPrice,
        minimumSellingPrice: updates.pricing?.minimumSellingPrice,
        hasSerialNumber: updates.requiresSerialNumber,
        discountLevels: updates.discountLevels || updates.pricing?.discountLevels,
        showroomDiscount: updates.pricing?.showroomDiscountPercentage,
        status: updates.status,
      };

      const res = await productsApi.updateProduct(id, payload);
      return res as unknown as Product;
    } catch (err) {
      console.warn(`Backend updateProduct(${id}) unavailable, applying fallback:`, err);
      return this.fallbackRepo.update(id, updates);
    }
  }

  async submitPriceProposal(
    proposal: Omit<PriceChangeProposal, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PriceChangeProposal> {
    return this.fallbackRepo.submitPriceProposal(proposal);
  }

  async getPriceProposals(productId?: string): Promise<PriceChangeProposal[]> {
    return this.fallbackRepo.getPriceProposals(productId);
  }

  async getCategories(): Promise<Category[]> {
    return this.fallbackRepo.getCategories();
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    return this.fallbackRepo.createCategory(category);
  }

  async getUOMs(): Promise<UnitOfMeasure[]> {
    return this.fallbackRepo.getUOMs();
  }
}
