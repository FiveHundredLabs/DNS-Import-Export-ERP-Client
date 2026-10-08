import { useState, useEffect, useCallback } from 'react';
import { Product, Category, UnitOfMeasure } from '../types/product';
import { productService } from '../services/ProductService';
import { ProductFilters } from '../repositories/IProductRepository';

export function useProducts(initialFilters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uoms, setUOMs] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters || { page: 1, pageSize: 10 });
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await productService.listProducts(filters);
      setProducts(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, uomList] = await Promise.all([
          productService.getCategories(),
          productService.getUOMs(),
        ]);
        setCategories(cats);
        setUOMs(uomList);
      } catch (e) {
        console.error('Error loading metadata', e);
      }
    }
    loadMeta();
  }, []);

  const createProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await productService.createProduct(data);
    await fetchProducts();
    return created;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const updated = await productService.updateProduct(id, updates);
    await fetchProducts();
    return updated;
  };

  const proposePriceChange = async (params: {
    productId: string;
    productSku: string;
    productName: string;
    currentSellingPrice: number;
    proposedSellingPrice: number;
    proposedMinSellingPrice: number;
    costPrice: number;
    reason: string;
    userId: string;
    userName: string;
  }) => {
    const proposal = await productService.proposePriceChange(params);
    await fetchProducts();
    return proposal;
  };

  const createCategory = async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await productService.createCategory(data);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  return {
    products,
    categories,
    uoms,
    loading,
    error,
    filters,
    setFilters,
    total,
    totalPages,
    refetch: fetchProducts,
    createProduct,
    createCategory,
    updateProduct,
    proposePriceChange,
  };
}
