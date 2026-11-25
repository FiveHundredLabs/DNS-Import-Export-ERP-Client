import { IProductRepository, ProductFilters } from './IProductRepository';
import { Product, Category, UnitOfMeasure, PriceChangeProposal } from '../types/product';
import { PaginatedResult } from '../types/common';
import { productsApi } from '../api/products/products.api';
import { categoriesApi } from '../api/categories/categories.api';
import { CreateProductPayload, UpdateProductPayload } from '../api/products/products.types';

export class ApiProductRepository implements IProductRepository {
  async getAll(filters?: ProductFilters): Promise<PaginatedResult<Product>> {
    const res = await productsApi.listProducts({
      page: filters?.page,
      pageSize: filters?.pageSize,
      search: filters?.search,
      categoryId: filters?.categoryId,
      brandId: filters?.brandId,
      status: filters?.status as any,
    });

    return {
      data: res.data as unknown as Product[],
      total: res.meta.total,
      page: res.meta.page,
      pageSize: res.meta.pageSize,
      totalPages: res.meta.totalPages,
    };
  }

  async getById(id: string): Promise<Product | null> {
    const res = await productsApi.getProductById(id);
    return (res as unknown as Product) || null;
  }

  async getByBarcode(barcode: string): Promise<Product | null> {
    const res = await productsApi.getProductByBarcode(barcode);
    return (res as unknown as Product) || null;
  }

  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const payload: CreateProductPayload = {
      name: product.name,
      sku: product.sku || undefined,
      barcode: product.barcode || undefined,
      description: product.description || undefined,
      categoryId: product.categoryId,
      brandId: (product as any).brandId || undefined,
      unitOfMeasure: (product.uomCode || 'PCS') as any,
      warrantyPeriod: product.warrantyPeriodMonths || 0,
      costPrice: product.pricing?.costPrice ?? 0,
      sellingPrice: product.pricing?.currentSellingPrice ?? 0,
      minimumSellingPrice: product.pricing?.minimumSellingPrice ?? 0,
      minFloorPricePercentage: (product.pricing as any).minFloorPricePercentage ?? (product as any).minFloorPricePercentage ?? 0,
      hasSerialNumber: product.requiresSerialNumber ?? false,
      discountLevels: product.discountLevels || product.pricing.discountLevels,
      showroomDiscount: product.pricing.showroomDiscountPercentage || 5,
    };

    const res = await productsApi.createProduct(payload);
    return res as unknown as Product;
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const payload: UpdateProductPayload = {
      name: updates.name,
      description: updates.description,
      brandId: (updates as any).brandId,
      categoryId: updates.categoryId,
      unitOfMeasure: updates.uomCode as any,
      warrantyPeriod: updates.warrantyPeriodMonths,
      costPrice: updates.pricing?.costPrice,
      sellingPrice: updates.pricing?.currentSellingPrice,
      minimumSellingPrice: updates.pricing?.minimumSellingPrice,
      minFloorPricePercentage: (updates.pricing as any)?.minFloorPricePercentage ?? (updates as any).minFloorPricePercentage,
      hasSerialNumber: updates.requiresSerialNumber,
      discountLevels: updates.discountLevels || updates.pricing?.discountLevels,
      showroomDiscount: updates.pricing?.showroomDiscountPercentage,
      status: updates.status,
    };

    const res = await productsApi.updateProduct(id, payload);
    return res as unknown as Product;
  }

  async submitPriceProposal(
    proposal: Omit<PriceChangeProposal, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PriceChangeProposal> {
    return {
      id: `prop-${Date.now()}`,
      ...proposal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getPriceProposals(_productId?: string): Promise<PriceChangeProposal[]> {
    return [];
  }

  async getCategories(): Promise<Category[]> {
    const cats = await categoriesApi.listCategories();
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code || '',
      description: c.description || undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const c = await categoriesApi.createCategory({
      name: category.name,
      code: category.code,
      description: category.description,
    });
    return {
      id: c.id,
      name: c.name,
      code: c.code || '',
      description: c.description || undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async getUOMs(): Promise<UnitOfMeasure[]> {
    return [
      { id: 'PCS', name: 'Pieces', code: 'PCS', symbol: 'pcs', createdAt: '', updatedAt: '' },
      { id: 'BOX', name: 'Boxes', code: 'BOX', symbol: 'box', createdAt: '', updatedAt: '' },
      { id: 'SET', name: 'Sets', code: 'SET', symbol: 'set', createdAt: '', updatedAt: '' },
      { id: 'MTR', name: 'Meters', code: 'MTR', symbol: 'm', createdAt: '', updatedAt: '' },
      { id: 'ROLL', name: 'Rolls', code: 'ROLL', symbol: 'roll', createdAt: '', updatedAt: '' },
      { id: 'PKT', name: 'Packets', code: 'PKT', symbol: 'pkt', createdAt: '', updatedAt: '' },
      { id: 'KG', name: 'Kilograms', code: 'KG', symbol: 'kg', createdAt: '', updatedAt: '' },
      { id: 'LTR', name: 'Liters', code: 'LTR', symbol: 'l', createdAt: '', updatedAt: '' },
    ];
  }
}
