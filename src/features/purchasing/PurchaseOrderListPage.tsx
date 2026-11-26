import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { buildEntryNavigationState } from '../../utils/navigationContext';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useAuth } from '../../hooks/useAuth';
import { useSuppliers } from '../../api/suppliers/suppliers.hooks';
import type { ApiPurchaseOrderStatus } from '../../api/purchase-orders/purchase-orders.types';
import { PurchaseOrderStatusBadge } from './components/PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AlertCircle, Edit, Eye, FileText, Plus, Printer, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Dialog, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { toast } from 'sonner';
import type { PurchaseOrder } from '../../types/purchasing';

const PAGE_SIZE = 10;
const statusOptions: Array<{ value: ApiPurchaseOrderStatus; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_VERIFICATION', label: 'Pending verification' },
  { value: 'PENDING_APPROVAL', label: 'Pending final approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const canManageOrders = role === 'PURCHASING_OFFICER' || role === 'PURCHASING_MANAGER' || role === 'MANAGER' || role === 'DIRECTOR';
  const [searchParams] = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const initialStatus = statusOptions.some((status) => status.value === requestedStatus)
    ? requestedStatus as ApiPurchaseOrderStatus
    : 'ALL';
  const [status, setStatus] = useState<ApiPurchaseOrderStatus | 'ALL'>(initialStatus);
  const [supplierId, setSupplierId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setServerSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    ...(status === 'ALL' ? {} : { status }),
    ...(supplierId === 'ALL' ? {} : { supplierId }),
    ...(serverSearch ? { search: serverSearch } : {}),
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  }), [page, status, supplierId, serverSearch]);

  const isManagerOrDirector = role === 'MANAGER' || role === 'DIRECTOR';
  const [rejectPoTarget, setRejectPoTarget] = useState<PurchaseOrder | null>(null);
  const [listRejectionReason, setListRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { purchaseOrders, pagination, loading, error, refetch, submitPO, verifyPO, approvePO, rejectPO, deletePO } = usePurchaseOrders(params);
  const supplierQuery = useSuppliers({ page: 1, limit: 100, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' });
  const suppliers = supplierQuery.data?.data ?? [];
  const totalPages = Math.max(1, pagination.totalPages);

  const updateFilter = (update: () => void) => {
    update();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Create and track supplier orders through verification, approval, and supplier issue."
        breadcrumbs={[{ label: 'Purchasing', href: '/purchasing' }, { label: 'Purchase Orders' }]}
        actions={canManageOrders ? (
          <Button onClick={() => navigate('/purchasing/orders/new')} className="gap-2">
            <Plus className="h-4 w-4" /> New Purchase Order
          </Button>
        ) : undefined}
      />

      <Card className="border-slate-200">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => updateFilter(() => setSearch(event.target.value))}
              placeholder="Search PO number, supplier, product, or note"
              className="pl-9"
              aria-label="Search purchase orders"
            />
          </div>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => updateFilter(() => setStatus(event.target.value as ApiPurchaseOrderStatus | 'ALL'))}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="ALL">All statuses</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select
            aria-label="Filter by supplier"
            value={supplierId}
            onChange={(event) => updateFilter(() => setSupplierId(event.target.value))}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="ALL">All active suppliers</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </CardContent>
      </Card>

      {supplierQuery.isError && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Supplier filters could not be loaded. Purchase order search is still available.
        </div>
      )}

      {error ? (
        <Card className="border-rose-200">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p role="alert" className="text-sm text-rose-800">{error}</p>
            <Button variant="outline" onClick={() => void refetch()} className="gap-2"><RefreshCw className="h-4 w-4" /> Retry</Button>
          </CardContent>
        </Card>
      ) : loading && purchaseOrders.length === 0 ? (
        <TableLoadingSkeleton />
      ) : (
        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-0">
            {purchaseOrders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <FileText className="h-8 w-8 text-slate-300" />
                <p className="font-medium text-slate-700">No purchase orders found</p>
                <p className="text-sm text-slate-500">Try changing the filters or create a purchase order.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">PO number</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Order date</th>
                      <th className="px-4 py-3">Expected delivery</th>
                      <th className="px-4 py-3 text-center">Items</th>
                      <th className="px-4 py-3 text-right">Total (LKR)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseOrders.map((po) => {
                      const isPoCreator = Boolean(currentUser?.id === po.createdBy);
                      const canVerifyThis = role === 'PURCHASING_MANAGER' && po.status === 'PENDING_VERIFICATION' && !isPoCreator;
                      const canApproveThis = isManagerOrDirector && (po.status === 'PENDING_APPROVAL' || po.status === 'PENDING_VERIFICATION') && (role === 'DIRECTOR' || !isPoCreator);
                      const canRejectThis = canVerifyThis || canApproveThis;

                      return (
                        <tr key={po.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">{po.poNumber}</td>
                          <td className="px-4 py-3"><div className="font-medium text-slate-800">{po.supplierName}</div><div className="text-xs text-slate-500">{po.supplierCode}</div></td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(po.orderDate)}</td>
                          <td className="px-4 py-3 text-slate-600">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</td>
                          <td className="px-4 py-3 text-center">{po.itemCount ?? po.items.length}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(po.grandTotal, 'LKR')}</td>
                          <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><PurchaseOrderStatusBadge status={po.status} />{po.sentAt && <span className="text-xs text-slate-500">Issued to supplier</span>}</div></td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" title="View details" onClick={() => navigate(`/purchasing/orders/${po.id}`, { state: buildEntryNavigationState(location, 'Orders') })}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon-sm" title="Print purchase order" onClick={() => navigate(`/purchasing/orders/${po.id}/print`, { state: buildEntryNavigationState(location, 'Orders') })}><Printer className="h-4 w-4" /></Button>
                              {canManageOrders && (po.status === 'DRAFT' || po.status === 'REJECTED') && <Button variant="ghost" size="icon-sm" title="Edit purchase order" onClick={() => navigate(`/purchasing/orders/${po.id}/edit`, { state: buildEntryNavigationState(location, 'Orders') })}><Edit className="h-4 w-4" /></Button>}
                              {canManageOrders && po.status === 'DRAFT' && <>
                                <ConfirmButton variant="outline" size="xs" dialogVariant="warning" confirmTitle="Submit Purchase Order" confirmMessage={`Submit ${po.poNumber} for verification?`} confirmText="Submit for verification" onConfirm={async () => { await submitPO(po.id); }}>Submit</ConfirmButton>
                                <ConfirmButton variant="ghost" size="icon-sm" dialogVariant="destructive" confirmTitle="Delete Draft Purchase Order" confirmMessage={`Delete ${po.poNumber}? This action cannot be undone.`} confirmText="Delete draft" onConfirm={async () => { await deletePO(po.id); }} title="Delete draft"><Trash2 className="h-4 w-4 text-rose-600" /></ConfirmButton>
                              </>}
                              {canVerifyThis && (
                                <ConfirmButton
                                  variant="outline"
                                  size="xs"
                                  dialogVariant="info"
                                  confirmTitle="Verify Purchase Order"
                                  confirmMessage={`Verify ${po.poNumber} and forward it for final approval?`}
                                  confirmText="Verify PO"
                                  disabled={actionLoading}
                                  onConfirm={async () => {
                                    await verifyPO(po.id);
                                    toast.success(`${po.poNumber} verified and forwarded.`);
                                  }}
                                >
                                  Verify
                                </ConfirmButton>
                              )}
                              {canApproveThis && (
                                <ConfirmButton
                                  variant="outline"
                                  size="xs"
                                  dialogVariant="success"
                                  confirmTitle="Approve Purchase Order"
                                  confirmMessage={
                                    po.status === 'PENDING_VERIFICATION'
                                      ? `Directly approve ${po.poNumber}? Stage 1 verification will be bypassed.`
                                      : `Approve ${po.poNumber}?`
                                  }
                                  confirmText="Approve PO"
                                  disabled={actionLoading}
                                  onConfirm={async () => {
                                    await approvePO(po.id, undefined, role === 'DIRECTOR');
                                    toast.success(`${po.poNumber} approved.`);
                                  }}
                                >
                                  Approve
                                </ConfirmButton>
                              )}
                              {canRejectThis && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Reject purchase order"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setRejectPoTarget(po);
                                    setListRejectionReason('');
                                  }}
                                >
                                  <XCircle className="h-4 w-4 text-rose-600" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pagination.total > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-600">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} orders</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <span className="self-center px-2 text-slate-600">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
              </div>
            </div>}
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(rejectPoTarget)} onOpenChange={(open) => { if (!open) setRejectPoTarget(null); }} size="md">
        <DialogTitle className="flex items-center gap-2 text-rose-600">
          <XCircle className="h-5 w-5" /> Reject Purchase Order
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-slate-600">
          Please provide a reason for rejecting order <span className="font-mono font-semibold">{rejectPoTarget?.poNumber}</span>. Rejection reason is required.
        </DialogDescription>
        <div className="mt-4">
          <Textarea
            value={listRejectionReason}
            onChange={(e) => setListRejectionReason(e.target.value)}
            placeholder="Enter mandatory rejection reason (at least 3 characters)..."
            rows={4}
            maxLength={4000}
            className="w-full"
            autoFocus
          />
        </div>
        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRejectPoTarget(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={actionLoading || listRejectionReason.trim().length < 3}
            onClick={async () => {
              if (!rejectPoTarget) return;
              setActionLoading(true);
              try {
                await rejectPO(rejectPoTarget.id, listRejectionReason.trim(), rejectPoTarget.status);
                toast.success(`${rejectPoTarget.poNumber} rejected.`);
                setRejectPoTarget(null);
                setListRejectionReason('');
              } catch {
                // error handled by hook
              } finally {
                setActionLoading(false);
              }
            }}
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
