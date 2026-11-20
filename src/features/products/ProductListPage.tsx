import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useBrands } from '../../api/brands/brands.hooks';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductTable } from './ProductTable';
import { ProductCreateModal } from './ProductCreateModal';
import { ProductPriceProposalModal } from './ProductPriceProposalModal';
import { BatchPricingHistoryModal } from './BatchPricingHistoryModal';
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
import { Plus, Search, Package, RefreshCw, Tag, FolderTree } from 'lucide-react';
import { Product } from '../../types/product';
import { useAuth } from '../../hooks/useAuth';

export function ProductListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [selectedProductForProposal, setSelectedProductForProposal] = useState<Product | null>(null);
  const [selectedProductForBatchPricing, setSelectedProductForBatchPricing] = useState<Product | null>(null);

  const {
    products,
    categories,
    uoms,
    loading,
    error,
    refetch,
    createProduct,
    proposePriceChange,
    setFilters,
  } = useProducts();

  const { data: brands = [] } = useBrands();

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: debouncedSearch || undefined,
      categoryId: selectedCategory || undefined,
      brandId: selectedBrand || undefined,
      page: 1,
    }));
  }, [debouncedSearch, selectedCategory, selectedBrand, setFilters]);

  const handleSearch = (q: string) => {
    setSearchTerm(q);
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
  };

  const handleBrandChange = (bId: string) => {
    setSelectedBrand(bId);
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
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
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
          {loading ? (
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
            <ProductTable
              products={products}
              onView={(p) =>
                navigate(`/products/${p.id}`, {
                  state: { from: location.pathname + location.search },
                })
              }
              onViewBatchPricing={(p) => setSelectedProductForBatchPricing(p)}
              onProposePrice={
                canEdit
                  ? (p) => {
                      setSelectedProductForProposal(p);
                      setProposalModalOpen(true);
                    }
                  : undefined
              }
            />
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
          uoms={uoms}
          onCreate={async (data) => {
            await createProduct(data);
          }}
        />
      )}

      {/* Price Change Proposal Modal */}
      {canEdit && (
        <ProductPriceProposalModal
          product={selectedProductForProposal}
          open={proposalModalOpen}
          onOpenChange={setProposalModalOpen}
          onSubmitProposal={async (params) => {
            await proposePriceChange(params);
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
              refetch();
            }
          }}
        />
      )}
    </div>
  );
}
