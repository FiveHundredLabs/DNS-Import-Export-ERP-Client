import { useState, useMemo } from 'react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useUpdateCategoryStatus,
} from '../../api/categories/categories.hooks';
import { Category, CategoryStatus } from '../../api/categories/categories.types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Search, Plus, Edit2, Power, RefreshCw, FolderTree, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function CategoryListTab() {
  const { role, hasPermission } = useAuth();
  const canManage =
    (role === 'DIRECTOR' || role === 'MANAGER') &&
    (hasPermission('products:create') || hasPermission('products:edit'));

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CategoryStatus>('ALL');

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Status toggle confirmation modal
  const [statusTargetCategory, setStatusTargetCategory] = useState<Category | null>(null);

  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const updateStatusMutation = useUpdateCategoryStatus();

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        cat.name.toLowerCase().includes(q) ||
        (cat.code && cat.code.toLowerCase().includes(q)) ||
        (cat.description && cat.description.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'ALL' || cat.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm, statusFilter]);

  const handleOpenAdd = () => {
    setNameInput('');
    setCodeInput('');
    setDescInput('');
    setFormError(null);
    setAddModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditCategory(cat);
    setNameInput(cat.name);
    setCodeInput(cat.code || '');
    setDescInput(cat.description || '');
    setFormError(null);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      setFormError('Category name must be at least 2 characters.');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError(`A category named "${trimmed}" already exists.`);
      return;
    }

    try {
      setFormError(null);
      await createCategoryMutation.mutateAsync({
        name: trimmed,
        code: codeInput.trim() ? codeInput.trim().toUpperCase() : undefined,
        description: descInput.trim() || undefined,
      });
      setAddModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      setFormError('Category name must be at least 2 characters.');
      return;
    }
    if (
      categories.some(
        (c) => c.id !== editCategory.id && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setFormError(`A category named "${trimmed}" already exists.`);
      return;
    }

    try {
      setFormError(null);
      await updateCategoryMutation.mutateAsync({
        id: editCategory.id,
        payload: {
          name: trimmed,
          code: codeInput.trim() ? codeInput.trim().toUpperCase() : undefined,
          description: descInput.trim() || undefined,
        },
      });
      setEditCategory(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusTargetCategory) return;
    const nextStatus: CategoryStatus =
      statusTargetCategory.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateStatusMutation.mutateAsync({
        id: statusTargetCategory.id,
        payload: { status: nextStatus },
      });
      setStatusTargetCategory(null);
    } catch (err: unknown) {
      console.error('Failed to change category status', err);
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
              placeholder="Search categories by name, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <div className="w-36">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as 'ALL' | CategoryStatus)}
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
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Main Table / State */}
      {isLoading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState
          message={error.message || 'Failed to load categories'}
          onRetry={() => refetch()}
        />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories found"
          description={
            searchTerm || statusFilter !== 'ALL'
              ? 'Try clearing the search query or status filter.'
              : 'Add your first product category to organize your inventory.'
          }
          actionLabel={canManage && !searchTerm ? 'Add First Category' : undefined}
          onAction={canManage && !searchTerm ? handleOpenAdd : undefined}
        />
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="min-w-[180px]">Category Name</TableHead>
                <TableHead className="w-28 font-mono">Code</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="text-center w-32">Products</TableHead>
                <TableHead className="text-center w-28">Status</TableHead>
                {canManage && <TableHead className="text-right w-28">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((cat) => {
                const productCount = cat._count?.products ?? 0;
                return (
                  <TableRow key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-indigo-500" />
                        <span>{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {cat.code || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 line-clamp-1">
                      {cat.description || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {productCount} {productCount === 1 ? 'Product' : 'Products'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cat.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {cat.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(cat)}
                            title="Edit Category"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStatusTargetCategory(cat)}
                            title={cat.status === 'ACTIVE' ? 'Deactivate Category' : 'Activate Category'}
                            className={
                              cat.status === 'ACTIVE'
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }
                          >
                            <Power className="h-3.5 w-3.5" />
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

      {/* Add Category Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Register a product category. Categories are used to group products and assign standard accounting classifications.
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
              Category Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Switchgear & Protection, Lighting, Cables"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Code (Optional)
            </label>
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. SWG, LGH, CBL"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <Input
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Brief description of products in this category"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? 'Saving...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={Boolean(editCategory)} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update category details. Existing product associations will remain intact.
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
              Category Name <span className="text-rose-500">*</span>
            </label>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Switchgear & Protection"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Code (Optional)
            </label>
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. SWG"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <Input
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCategoryMutation.isPending}>
              {updateCategoryMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Status Toggle Confirmation Modal */}
      <Dialog
        open={Boolean(statusTargetCategory)}
        onOpenChange={(open) => !open && setStatusTargetCategory(null)}
      >
        <DialogHeader>
          <DialogTitle>
            {statusTargetCategory?.status === 'ACTIVE'
              ? 'Deactivate Category'
              : 'Activate Category'}
          </DialogTitle>
          <DialogDescription>
            {statusTargetCategory?.status === 'ACTIVE'
              ? `Are you sure you want to deactivate "${statusTargetCategory?.name}"? Inactive categories cannot be selected for new products, but existing products will retain their association.`
              : `Are you sure you want to activate "${statusTargetCategory?.name}"? This category will become available for new product creation.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStatusTargetCategory(null)}
            disabled={updateStatusMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={statusTargetCategory?.status === 'ACTIVE' ? 'destructive' : 'default'}
            onClick={handleConfirmStatusToggle}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending
              ? 'Updating...'
              : statusTargetCategory?.status === 'ACTIVE'
              ? 'Deactivate'
              : 'Activate'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
