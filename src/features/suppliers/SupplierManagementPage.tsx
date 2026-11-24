import { useEffect, useState } from 'react';
import {
  ArrowUpDown,
  Building2,
  Eye,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { hasPermission } from '../../rules/permissions';
import {
  useDeleteSupplier,
  useCreateSupplier,
  useSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '../../api/suppliers/suppliers.hooks';
import type {
  CreateSupplierPayload,
  Supplier,
  SupplierListParams,
  SupplierStatus,
} from '../../api/suppliers/suppliers.types';
import { extractErrorMessage } from '../../api/client';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { EmptyState } from '../../components/common/EmptyState';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { PaginationControls } from '../../components/common/PaginationControls';
import { Input } from '../../components/ui/input';
import { SupplierFormDialog } from './SupplierFormDialog';

type StatusFilter = 'ALL' | SupplierStatus;
type SupplierSortField = NonNullable<SupplierListParams['sortBy']>;

const EMPTY_MESSAGE = 'No suppliers match these filters.';

function statusVariant(status: SupplierStatus) {
  return status === 'ACTIVE' ? 'success' : 'secondary';
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || '—';
}

interface SupplierInfoProps {
  label: string;
  value: string | null | undefined;
}

function SupplierInfo({ label, value }: SupplierInfoProps) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">{displayValue(value)}</dd>
    </div>
  );
}

export function SupplierManagementPage() {
  const { currentUser } = useAuth();
  const canManage = Boolean(
    currentUser && hasPermission(currentUser.role, 'purchasing:suppliers_manage'),
  );

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SupplierSortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [formOpen, setFormOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [supplierToEditId, setSupplierToEditId] = useState<string | undefined>();
  const [supplierToInspectId, setSupplierToInspectId] = useState<string | undefined>();
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const debouncedSearch = useDebounce(searchInput, 350);
  const params: SupplierListParams = {
    page,
    limit: pageSize,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    sortBy,
    sortOrder,
  };
  const supplierQuery = useSuppliers(params);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();
  const detailQuery = useSupplier(supplierToInspectId ?? supplierToEditId);

  const suppliers = supplierQuery.data?.data ?? [];
  const total = supplierQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const inspectedSupplier =
    detailQuery.data ?? suppliers.find((supplier) => supplier.id === supplierToInspectId) ?? null;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!supplierToEditId || detailQuery.data?.id !== supplierToEditId) return;
    setSupplierToEdit(detailQuery.data);
    setSupplierToEditId(undefined);
    setFormOpen(true);
  }, [detailQuery.data, supplierToEditId]);

  useEffect(() => {
    if (!supplierToEditId || !detailQuery.isError) return;
    toast.error(extractErrorMessage(detailQuery.error, 'Could not load supplier details.'));
    setSupplierToEditId(undefined);
  }, [detailQuery.error, detailQuery.isError, supplierToEditId]);

  const handleSort = (field: SupplierSortField) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const openCreate = () => {
    setSupplierToEdit(null);
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setSupplierToInspectId(undefined);
    if (detailQuery.data?.id === supplier.id) {
      setSupplierToEdit(detailQuery.data);
      setSupplierToEditId(undefined);
      setFormOpen(true);
    } else {
      setSupplierToEdit(null);
      setSupplierToEditId(supplier.id);
    }
  };

  const saveSupplier = async (payload: CreateSupplierPayload) => {
    try {
      if (supplierToEdit) {
        await updateMutation.mutateAsync({ id: supplierToEdit.id, payload });
        toast.success('Supplier updated.');
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success('Supplier ' + created.name + ' created.');
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not save supplier.'));
      throw error;
    }
  };

  const changeStatus = async (supplier: Supplier) => {
    const nextStatus: SupplierStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateMutation.mutateAsync({
        id: supplier.id,
        payload: { status: nextStatus },
      });
      toast.success(supplier.name + ' is now ' + nextStatus.toLowerCase() + '.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not update supplier status.'));
    }
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      const result = await deleteMutation.mutateAsync(supplierToDelete.id);
      toast.success(result.message || 'Supplier deleted.');
      if (supplierToInspectId === supplierToDelete.id) setSupplierToInspectId(undefined);
      setSupplierToDelete(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Could not delete supplier.'));
    }
  };

  const queryError = supplierQuery.error
    ? extractErrorMessage(supplierQuery.error, 'Could not load suppliers.')
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Supplier Management"
        subtitle="Maintain supplier contacts, tax registrations, payment terms, and bank details."
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Suppliers' }]}
        badge={<Badge variant="outline">Shared supplier master</Badge>}
        actions={
          canManage ? (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              New supplier
            </Button>
          ) : null
        }
      />

      <section
        aria-label="Supplier filters"
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, code, contact, email, TIN, or VAT"
            className="pl-9"
            aria-label="Search suppliers"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by supplier status">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={statusFilter === status ? 'default' : 'outline'}
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'ALL' ? 'All statuses' : status.toLowerCase()}
            </Button>
          ))}
        </div>
      </section>

      {queryError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-rose-800">{queryError}</p>
          <Button type="button" variant="outline" onClick={() => void supplierQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {supplierQuery.isLoading ? (
        <TableLoadingSkeleton rows={8} cols={6} />
      ) : !queryError && suppliers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={total === 0 ? 'No suppliers yet' : EMPTY_MESSAGE}
          description={
            total === 0
              ? 'Add a supplier to make it available to purchasing workflows.'
              : 'Change the search or status filter and try again.'
          }
          actionLabel={canManage && total === 0 ? 'Create supplier' : undefined}
          onAction={canManage && total === 0 ? openCreate : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Suppliers</h2>
              <p className="mt-0.5 text-xs text-slate-500">{total} supplier records</p>
            </div>
            {supplierQuery.isFetching && !supplierQuery.isLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" role="status">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Updating
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:text-slate-950"
                      aria-label="Sort by supplier code"
                      aria-sort={sortBy === 'supplierCode' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                      onClick={() => handleSort('supplierCode')}
                    >
                      Code <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:text-slate-950"
                      aria-label="Sort by supplier name"
                      aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                      onClick={() => handleSort('name')}
                    >
                      Supplier <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">Contact</th>
                  <th scope="col" className="px-4 py-3">Payment terms</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {displayValue(supplier.supplierCode)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{supplier.name}</div>
                      {supplier.email && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="break-all">{supplier.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{displayValue(supplier.contactPerson)}</div>
                      {supplier.phone && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{displayValue(supplier.paymentTerms)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(supplier.status)}>{supplier.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={'View ' + supplier.name}
                          title="View supplier details"
                          onClick={() => setSupplierToInspectId(supplier.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={'Edit ' + supplier.name}
                              title="Edit supplier"
                              disabled={supplierToEditId === supplier.id}
                              onClick={() => openEdit(supplier)}
                            >
                              {supplierToEditId === supplier.id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Pencil className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={(supplier.status === 'ACTIVE' ? 'Deactivate ' : 'Activate ') + supplier.name}
                              title={supplier.status === 'ACTIVE' ? 'Deactivate supplier' : 'Activate supplier'}
                              disabled={updateMutation.isPending}
                              onClick={() => void changeStatus(supplier)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={'Delete ' + supplier.name}
                              title="Delete supplier"
                              onClick={() => setSupplierToDelete(supplier)}
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-3 py-2 sm:px-4">
            <PaginationControls
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[12, 24, 48, 96]}
              label="suppliers"
              compact
            />
          </div>
        </div>
      )}

      <SupplierFormDialog
        open={formOpen}
        supplier={supplierToEdit}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setSupplierToEdit(null);
            setSupplierToEditId(undefined);
          }
        }}
        onSave={saveSupplier}
      />

      <Dialog open={Boolean(supplierToDelete)} onOpenChange={(open) => !deleteMutation.isPending && !open && setSupplierToDelete(null)} size="sm">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete supplier?</DialogTitle>
            <DialogDescription>
              {supplierToDelete
                ? 'Delete ' + supplierToDelete.name + '? The supplier will be archived and cannot be used for new purchase orders. Existing references are preserved.'
                : 'This supplier will be archived.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleteMutation.isPending} onClick={() => setSupplierToDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => void confirmDelete()}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(supplierToInspectId)} onOpenChange={(open) => !open && setSupplierToInspectId(undefined)} size="2xl">
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{inspectedSupplier?.name ?? 'Supplier details'}</DialogTitle>
              {inspectedSupplier && (
                <Badge variant={statusVariant(inspectedSupplier.status)}>{inspectedSupplier.status}</Badge>
              )}
            </div>
            <DialogDescription>
              Supplier identity, commercial details, bank information, and linked record counts.
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="h-40 w-full animate-pulse rounded-md bg-slate-100" role="status" aria-label="Loading supplier details" />
          ) : detailQuery.isError ? (
            <div role="alert" className="space-y-3 rounded-md border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm text-rose-800">
                {extractErrorMessage(detailQuery.error, 'Could not load supplier details.')}
              </p>
              <Button type="button" variant="outline" onClick={() => void detailQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : inspectedSupplier ? (
            <div className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business details</h3>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <SupplierInfo label="Supplier code" value={inspectedSupplier.supplierCode} />
                  <SupplierInfo label="Contact person" value={inspectedSupplier.contactPerson} />
                  <SupplierInfo label="Email" value={inspectedSupplier.email} />
                  <SupplierInfo label="Phone" value={inspectedSupplier.phone} />
                  <SupplierInfo label="Payment terms" value={inspectedSupplier.paymentTerms} />
                  <SupplierInfo label="TIN" value={inspectedSupplier.taxNumber} />
                  <SupplierInfo label="VAT number" value={inspectedSupplier.vatNumber} />
                  <SupplierInfo label="Registration address" value={inspectedSupplier.address} />
                </dl>
              </section>
              <section className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank details</h3>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <SupplierInfo label="Bank" value={inspectedSupplier.bankName} />
                  <SupplierInfo label="Branch" value={inspectedSupplier.bankBranch} />
                  <SupplierInfo label="Account number" value={inspectedSupplier.bankAccountNo} />
                  <SupplierInfo label="SWIFT / BIC" value={inspectedSupplier.bankSwiftCode} />
                </dl>
              </section>
              <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm text-slate-700">
                <span>{inspectedSupplier._count?.purchaseOrders ?? 0} purchase orders</span>
                <span>{inspectedSupplier._count?.grns ?? 0} goods received notes</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Updated {new Date(inspectedSupplier.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Supplier unavailable"
              description="This supplier may have been deleted. Close the dialog and refresh the list."
            />
          )}

          <DialogFooter>
            {canManage && inspectedSupplier && (
              <Button
                type="button"
                variant="outline"
                onClick={() => openEdit(inspectedSupplier)}
              >
                Edit supplier
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setSupplierToInspectId(undefined)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
