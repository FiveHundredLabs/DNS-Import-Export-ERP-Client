import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProducts,
  useCreateProduct,
  productQueryKeys,
} from '../../api/products/products.hooks';
import { useBrands } from '../../api/brands/brands.hooks';
import { useCategories } from '../../api/categories/categories.hooks';
import { useDebounce } from '../../hooks/useDebounce';
import { productService } from '../../services/ProductService';
import { CreateProductPayload } from '../../api/products/products.types';
import { ProductTable } from './ProductTable';
import { ProductCreateModal } from './ProductCreateModal';
import { ProductPriceProposalModal } from './ProductPriceProposalModal';
import { BatchPricingHistoryModal } from './BatchPricingHistoryModal';
import { ProductEditModal } from './ProductEditModal';
import { ProductFloorPercentageModal } from './ProductFloorPercentageModal';
import { BrandListTab } from './BrandListTab';
import { CategoryListTab } from './CategoryListTab';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import {
  Plus,
  Search,
  Package,
  RefreshCw,
  Tag,
  FolderTree,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product, UnitOfMeasure } from '../../types/product';
import { useAuth } from '../../hooks/useAuth';

const DEFAULT_UOMS: UnitOfMeasure[] = [
  { id: 'PCS', name: 'Pieces', code: 'PCS', symbol: 'pcs', createdAt: '', updatedAt: '' },
  { id: 'BOX', name: 'Boxes', code: 'BOX', symbol: 'box', createdAt: '', updatedAt: '' },
  { id: 'SET', name: 'Sets', code: 'SET', symbol: 'set', createdAt: '', updatedAt: '' },
  { id: 'MTR', name: 'Meters', code: 'MTR', symbol: 'm', createdAt: '', updatedAt: '' },
  { id: 'ROLL', name: 'Rolls', code: 'ROLL', symbol: 'roll', createdAt: '', updatedAt: '' },
  { id: 'PKT', name: 'Packets', code: 'PKT', symbol: 'pkt', createdAt: '', updatedAt: '' },
  { id: 'KG', name: 'Kilograms', code: 'KG', symbol: 'kg', createdAt: '', updatedAt: '' },
  { id: 'LTR', name: 'Liters', code: 'LTR', symbol: 'l', createdAt: '', updatedAt: '' },
];

export function ProductListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { role, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [selectedProductForProposal, setSelectedProductForProposal] = useState<Product | null>(null);
  const [selectedProductForBatchPricing, setSelectedProductForBatchPricing] = useState<Product | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [selectedProductForFloorPct, setSelectedProductForFloorPct] = useState<Product | null>(null);

  // Reset to page 1 when debounced search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch || undefined,
      categoryId: selectedCategory || undefined,
      brandId: selectedBrand || undefined,
    }),
    [page, pageSize, debouncedSearch, selectedCategory, selectedBrand],
  );

  const {
    data: productsRes,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useProducts(queryParams);

  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const createProductMutation = useCreateProduct();

  const products = (productsRes?.data || []) as unknown as Product[];
  const total = productsRes?.meta?.total ?? 0;
  const totalPages = Math.max(1, productsRes?.meta?.totalPages ?? 1);
  const error = queryError instanceof Error ? queryError.message : null;

  const handleSearch = (q: string) => {
    setSearchTerm(q);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setPage(1);
  };

  const handleBrandChange = (bId: string) => {
    setSelectedBrand(bId);
    setPage(1);
  };

  // Strictly enforce that ONLY DIRECTOR and MANAGER can create and edit products
  const canCreate = (role === 'DIRECTOR' || role === 'MANAGER') && hasPermission('products:create');
  const canEdit = (role === 'DIRECTOR' || role === 'MANAGER') && hasPermission('products:edit');

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Product Master</h1>
          <p className="text-xs text-slate-500">
            Single authoritative source for SKUs, commercial pricing, barcode IDs, and inventory status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              {canCreate && (
                <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Product
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3-Tab Architecture: Products | Brands | Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
          <TabsTrigger value="products" className="gap-2 px-4 py-1.5 text-xs">
            <Package className="h-4 w-4 text-indigo-600" />
            <span>Products</span>
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2 px-4 py-1.5 text-xs">
            <Tag className="h-4 w-4 text-emerald-600" />
            <span>Brands</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 px-4 py-1.5 text-xs">
            <FolderTree className="h-4 w-4 text-amber-600" />
            <span>Categories</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Products */}
        <TabsContent value="products" className="space-y-4 mt-4">
          {/* Filter toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by SKU, product name, or barcode..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Brand Filter */}
            <div className="w-full sm:w-48">
              <Select
                value={selectedBrand || '__all__'}
                onValueChange={(val) => handleBrandChange(val === '__all__' ? '' : val)}
              >
                <SelectTrigger className="text-xs h-9 rounded-md bg-white">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-56">
              <Select
                value={selectedCategory || '__all__'}
                onValueChange={(val) => handleCategoryChange(val === '__all__' ? '' : val)}
              >
                <SelectTrigger className="text-xs h-9 rounded-md bg-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* State views */}
          {isLoading ? (
            <TableLoadingSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description="Try adjusting your search query or create a new Product Master record."
              actionLabel={canCreate ? 'Create First Product' : undefined}
              onAction={canCreate ? () => setCreateModalOpen(true) : undefined}
            />
          ) : (
            <>
              <ProductTable
                products={products}
                onView={(p) =>
                  navigate(`/products/${p.id}`, {
                    state: { from: location.pathname + location.search },
                  })
                }
                onViewBatchPricing={(p) => setSelectedProductForBatchPricing(p)}
                onEdit={canEdit ? (p) => setSelectedProductForEdit(p) : undefined}
                onUpdateFloorPercentage={canEdit ? (p) => setSelectedProductForFloorPct(p) : undefined}
                onProposePrice={
                  canEdit
                    ? (p) => {
                        setSelectedProductForProposal(p);
                        setProposalModalOpen(true);
                      }
                    : undefined
                }
              />

              {/* Server-Side Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} products)
                  </span>
                  <select
                    aria-label="Items per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-7 px-2 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 text-xs"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Tab 2: Brands */}
        <TabsContent value="brands" className="mt-4">
          <BrandListTab />
        </TabsContent>

        {/* Tab 3: Categories */}
        <TabsContent value="categories" className="mt-4">
          <CategoryListTab />
        </TabsContent>
      </Tabs>

      {/* Product Creation Modal */}
      {canCreate && (
        <ProductCreateModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          uoms={DEFAULT_UOMS}
          onCreate={async (product: any) => {
            const payload: CreateProductPayload = {
              name: product.name,
              sku: product.sku || undefined,
              barcode: product.barcode || undefined,
              description: product.description || undefined,
              categoryId: product.categoryId,
              brandId: product.brandId || undefined,
              unitOfMeasure: (product.uomCode || 'PCS') as any,
              warrantyPeriod: product.warrantyPeriodMonths || 0,
              costPrice: product.pricing?.costPrice ?? 0,
              sellingPrice: product.pricing?.currentSellingPrice ?? 0,
              minimumSellingPrice: product.pricing?.minimumSellingPrice ?? 0,
              minFloorPricePercentage:
                product.pricing?.minFloorPricePercentage ?? product.minFloorPricePercentage ?? 0,
              hasSerialNumber: product.requiresSerialNumber ?? false,
              discountLevels: product.discountLevels || product.pricing?.discountLevels,
              showroomDiscount: product.pricing?.showroomDiscountPercentage || 5,
            };
            await createProductMutation.mutateAsync(payload);
          }}
        />
      )}

      {/* Price Change Proposal Modal (Existing Mock Implementation Preserved) */}
      {canEdit && (
        <ProductPriceProposalModal
          product={selectedProductForProposal}
          open={proposalModalOpen}
          onOpenChange={setProposalModalOpen}
          onSubmitProposal={async (params) => {
            await productService.proposePriceChange(params);
          }}
        />
      )}

      {/* Batch Pricing History & Bulk Repricing Modal */}
      {selectedProductForBatchPricing && (
        <BatchPricingHistoryModal
          productId={selectedProductForBatchPricing.id}
          productName={selectedProductForBatchPricing.name}
          sku={selectedProductForBatchPricing.sku}
          open={Boolean(selectedProductForBatchPricing)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProductForBatchPricing(null);
            }
          }}
        />
      )}

      {/* Product Edit Modal (Decision 5: Immutable system fields locked) */}
      {selectedProductForEdit && (
        <ProductEditModal
          product={selectedProductForEdit}
          open={Boolean(selectedProductForEdit)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProductForEdit(null);
            }
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
          }}
        />
      )}

      {/* Product Floor Percentage Modal (Decision 4: Two-step confirmation) */}
      {selectedProductForFloorPct && (
        <ProductFloorPercentageModal
          productId={selectedProductForFloorPct.id}
          productName={selectedProductForFloorPct.name}
          sku={selectedProductForFloorPct.sku}
          currentFloorPercentage={
            selectedProductForFloorPct.minFloorPricePercentage ??
            selectedProductForFloorPct.pricing?.minFloorPricePercentage ??
            0
          }
          open={Boolean(selectedProductForFloorPct)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProductForFloorPct(null);
            }
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
          }}
        />
      )}
    </div>
  );
}
