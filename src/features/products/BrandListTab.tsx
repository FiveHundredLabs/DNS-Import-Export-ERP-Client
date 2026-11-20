import { useState, useMemo } from 'react';
import { useBrands, useCreateBrand, useUpdateBrand, useUpdateBrandStatus, useDeleteBrand } from '../../api/brands/brands.hooks';
import { Brand, BrandStatus } from '../../api/brands/brands.types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Search, Plus, Edit2, Power, RefreshCw, Tag, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { extractErrorMessage } from '../../api/client';

export function BrandListTab() {
  const { role, hasPermission } = useAuth();
  const canManage = (role === 'DIRECTOR' || role === 'MANAGER') && (hasPermission('products:create') || hasPermission('products:edit'));

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BrandStatus>('ALL');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [brandNameInput, setBrandNameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Status toggle confirmation modal
  const [statusTargetBrand, setStatusTargetBrand] = useState<Brand | null>(null);

  // Delete confirmation modal
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

  const { data: brands = [], isLoading, error, refetch } = useBrands();
  const createBrandMutation = useCreateBrand();
  const updateBrandMutation = useUpdateBrand();
  const updateStatusMutation = useUpdateBrandStatus();
  const deleteBrandMutation = useDeleteBrand();

  // Filtered brands
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const matchesSearch = brand.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || brand.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [brands, searchTerm, statusFilter]);

  const handleOpenAdd = () => {
    setBrandNameInput('');
    setFormError(null);
    setAddModalOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditBrand(brand);
    setBrandNameInput(brand.name);
    setFormError(null);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = brandNameInput.trim();
    if (trimmed.length < 2) {
      setFormError('Brand name must be at least 2 characters.');
      return;
    }
    // Check local duplicate
    if (brands.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError(`A brand named "${trimmed}" already exists.`);
      return;
    }

    try {
      setFormError(null);
      await createBrandMutation.mutateAsync({ name: trimmed });
      setAddModalOpen(false);
      setBrandNameInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create brand';
      setFormError(msg);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBrand) return;
    const trimmed = brandNameInput.trim();
    if (trimmed.length < 2) {
      setFormError('Brand name must be at least 2 characters.');
      return;
    }
    if (
      brands.some(
        (b) => b.id !== editBrand.id && b.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setFormError(`A brand named "${trimmed}" already exists.`);
      return;
    }

    try {
      setFormError(null);
      await updateBrandMutation.mutateAsync({ id: editBrand.id, payload: { name: trimmed } });
      setEditBrand(null);
      setBrandNameInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update brand';
      setFormError(msg);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusTargetBrand) return;
    const nextStatus: BrandStatus = statusTargetBrand.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateStatusMutation.mutateAsync({
        id: statusTargetBrand.id,
        payload: { status: nextStatus },
      });
      setStatusTargetBrand(null);
    } catch (err: unknown) {
      console.error('Failed to change brand status', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search brands by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <div className="w-36">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as 'ALL' | BrandStatus)}
            >
              <SelectTrigger className="text-xs h-9 bg-white">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active Only</SelectItem>
                <SelectItem value="INACTIVE">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={handleOpenAdd} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Brand
            </Button>
          )}
        </div>
      </div>

      {/* Main Table / State */}
      {isLoading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error.message || 'Failed to load brands'} onRetry={() => refetch()} />
      ) : filteredBrands.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No brands found"
          description={
            searchTerm || statusFilter !== 'ALL'
              ? 'Try clearing the search query or status filter.'
              : 'Add your first product brand to organize product lines.'
          }
          actionLabel={canManage && !searchTerm ? 'Add First Brand' : undefined}
          onAction={canManage && !searchTerm ? handleOpenAdd : undefined}
        />
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="min-w-[200px]">Brand Name</TableHead>
                <TableHead className="text-center w-36">Products</TableHead>
                <TableHead className="text-center w-32">Status</TableHead>
                <TableHead className="text-right w-36">Created Date</TableHead>
                {canManage && <TableHead className="text-right w-28">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.map((brand) => {
                const productCount = brand._count?.products ?? 0;
                return (
                  <TableRow key={brand.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-slate-400" />
                        <span>{brand.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {productCount} {productCount === 1 ? 'Product' : 'Products'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={brand.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {brand.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 font-mono">
                      {new Date(brand.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(brand)}
                            title="Edit Brand Name"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStatusTargetBrand(brand)}
                            title={brand.status === 'ACTIVE' ? 'Deactivate Brand' : 'Activate Brand'}
                            className={
                              brand.status === 'ACTIVE'
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }
                          >
                            <Power className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setBrandToDelete(brand)}
                            title="Delete Brand"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Brand Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogHeader>
          <DialogTitle>Add New Brand</DialogTitle>
          <DialogDescription>
            Register an authoritative product brand. Brands are used for product categorization and SKU generation prefix.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveAdd} className="space-y-4 py-2">
          {formError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brand Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={brandNameInput}
              onChange={(e) => setBrandNameInput(e.target.value)}
              placeholder="e.g. Schneider, Legrand, General"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBrandMutation.isPending}>
              {createBrandMutation.isPending ? 'Saving...' : 'Create Brand'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Brand Modal */}
      <Dialog open={Boolean(editBrand)} onOpenChange={(open) => !open && setEditBrand(null)}>
        <DialogHeader>
          <DialogTitle>Edit Brand Name</DialogTitle>
          <DialogDescription>
            Update the brand display name. Associated products will automatically reflect the updated brand name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
          {formError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brand Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={brandNameInput}
              onChange={(e) => setBrandNameInput(e.target.value)}
              placeholder="e.g. Schneider, Legrand, General"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditBrand(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateBrandMutation.isPending}>
              {updateBrandMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Status Toggle Confirmation Modal */}
      <Dialog
        open={Boolean(statusTargetBrand)}
        onOpenChange={(open) => !open && setStatusTargetBrand(null)}
      >
        <DialogHeader>
          <DialogTitle>
            {statusTargetBrand?.status === 'ACTIVE' ? 'Deactivate Brand' : 'Activate Brand'}
          </DialogTitle>
          <DialogDescription>
            {statusTargetBrand?.status === 'ACTIVE'
              ? `Are you sure you want to deactivate "${statusTargetBrand?.name}"? Inactive brands cannot be assigned to new products, but existing products will retain their association.`
              : `Are you sure you want to activate "${statusTargetBrand?.name}"? This brand will become available for new product creation.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStatusTargetBrand(null)}
            disabled={updateStatusMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={statusTargetBrand?.status === 'ACTIVE' ? 'destructive' : 'default'}
            onClick={handleConfirmStatusToggle}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending
              ? 'Updating...'
              : statusTargetBrand?.status === 'ACTIVE'
              ? 'Deactivate'
              : 'Activate'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Brand Confirmation Modal */}
      <Dialog open={Boolean(brandToDelete)} onOpenChange={(open) => !open && setBrandToDelete(null)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <Trash2 className="h-5 w-5 text-rose-600" />
            Delete Brand
          </DialogTitle>
          <DialogDescription>
            {brandToDelete && (brandToDelete._count?.products ?? (brandToDelete as any).productCount ?? 0) > 0 ? (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg">
                  <strong>Cannot Delete Brand:</strong> Brand <strong>"{brandToDelete.name}"</strong> is currently referenced by <strong>{brandToDelete._count?.products ?? (brandToDelete as any).productCount}</strong> product(s).
                </div>
                <p className="text-slate-600">
                  To prevent breaking product references, please reassign or delete the associated products before attempting to delete this brand.
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-2 text-xs text-slate-600">
                <p>
                  Are you sure you want to delete brand <strong>"{brandToDelete?.name}"</strong>?
                </p>
                <p className="text-slate-500">
                  This brand has no associated products and will be removed from the system.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setBrandToDelete(null)}>
            {(brandToDelete && (brandToDelete._count?.products ?? (brandToDelete as any).productCount ?? 0) > 0) ? 'Close' : 'Cancel'}
          </Button>
          {Boolean(brandToDelete && (brandToDelete._count?.products ?? (brandToDelete as any).productCount ?? 0) === 0) && (
            <Button
              variant="destructive"
              disabled={deleteBrandMutation.isPending}
              onClick={async () => {
                if (!brandToDelete) return;
                try {
                  await deleteBrandMutation.mutateAsync(brandToDelete.id);
                  toast.success(`Brand "${brandToDelete.name}" deleted successfully.`);
                  setBrandToDelete(null);
                } catch (err: unknown) {
                  toast.error(extractErrorMessage(err, 'Failed to delete brand'));
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteBrandMutation.isPending ? 'Deleting...' : 'Delete Brand'}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
