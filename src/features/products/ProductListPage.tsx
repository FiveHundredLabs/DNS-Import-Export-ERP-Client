import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { ProductTable } from './ProductTable';
import { ProductCreateModal } from './ProductCreateModal';
import { ProductPriceProposalModal } from './ProductPriceProposalModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import { Plus, Search, Package, RefreshCw } from 'lucide-react';
import { Product } from '../../types/product';
import { useAuth } from '../../hooks/useAuth';

export function ProductListPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [selectedProductForProposal, setSelectedProductForProposal] = useState<Product | null>(null);

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

  const handleSearch = (q: string) => {
    setSearchTerm(q);
    setFilters((prev) => ({ ...prev, search: q, page: 1 }));
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setFilters((prev) => ({ ...prev, categoryId: catId || undefined, page: 1 }));
  };

  const canCreate = hasPermission('products:create');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Product Master</h1>
          <p className="text-xs text-slate-500">
            Single authoritative source for SKUs, commercial pricing, barcode IDs, and inventory status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          )}
        </div>
      </div>

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
        <div className="w-full sm:w-64">
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
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <ProductTable
          products={products}
          onView={(p) => navigate(`/products/${p.id}`)}
          onProposePrice={(p) => {
            setSelectedProductForProposal(p);
            setProposalModalOpen(true);
          }}
        />
      )}

      {/* Product Creation Modal */}
      <ProductCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        categories={categories}
        uoms={uoms}
        onCreate={async (data) => {
          await createProduct(data);
        }}
      />

      {/* Price Change Proposal Modal */}
      <ProductPriceProposalModal
        product={selectedProductForProposal}
        open={proposalModalOpen}
        onOpenChange={setProposalModalOpen}
        onSubmitProposal={async (params) => {
          await proposePriceChange(params);
        }}
      />
    </div>
  );
}
