import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import type { ApiPurchaseOrderStatus } from '../../api/purchase-orders/purchase-orders.types';
import { PurchaseOrderStatusBadge } from './components/PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AlertCircle, ClipboardCheck, Eye, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { PageHeader } from '../../components/common/PageHeader';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';

const PAGE_SIZE = 10;

export function PurchaseOrderApprovalQueue() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const stageStatus: ApiPurchaseOrderStatus | undefined = role === 'PURCHASING_MANAGER'
    ? 'PENDING_VERIFICATION'
    : role === 'MANAGER' || role === 'DIRECTOR'
      ? 'PENDING_APPROVAL'
      : undefined;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { purchaseOrders, pagination, loading, error, refetch } = usePurchaseOrders({
    page,
    limit: PAGE_SIZE,
    status: stageStatus,
    ...(search.trim() ? { search: search.trim() } : {}),
  });
  const canApprove = Boolean(stageStatus);

  return <div className="space-y-6">
    <PageHeader title="Purchase Order Approvals" subtitle="Review orders assigned to your approval stage." breadcrumbs={[{ label: 'Purchasing', href: '/purchasing' }, { label: 'Approvals' }]} />
    {!canApprove && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Your role has no Purchase Order approval stage. You can view orders from the Purchase Orders list.</div>}
    {canApprove && <Card><CardContent className="p-4">
      <div className="relative max-w-lg"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input aria-label="Search pending purchase orders" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search PO number, supplier, or product" className="pl-9" /></div>
    </CardContent></Card>}
    {error ? <Card className="border-rose-200"><CardContent className="flex flex-col items-center gap-3 p-10 text-center"><AlertCircle className="h-8 w-8 text-rose-500" /><p role="alert" className="text-sm text-rose-800">{error}</p><Button variant="outline" onClick={() => void refetch()}>Retry</Button></CardContent></Card>
      : loading ? <TableLoadingSkeleton />
        : !canApprove ? null
          : purchaseOrders.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-2 p-12 text-center"><ClipboardCheck className="h-9 w-9 text-slate-300" /><p className="font-semibold text-slate-800">No orders are waiting for your review</p><p className="text-sm text-slate-500">New orders assigned to this stage will appear here.</p></CardContent></Card>
            : <Card className="overflow-hidden"><CardContent className="p-0">
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Purchase order</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Created by</th><th className="px-4 py-3">Order date</th><th className="px-4 py-3 text-right">Total (LKR)</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Review</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{purchaseOrders.map((po) => <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold">{po.poNumber}</td><td className="px-4 py-3">{po.supplierName}</td><td className="px-4 py-3">{po.createdByName || '—'}</td><td className="px-4 py-3">{formatDate(po.orderDate)}</td><td className="px-4 py-3 text-right font-mono">{formatCurrency(po.grandTotal, 'LKR')}</td><td className="px-4 py-3"><PurchaseOrderStatusBadge status={po.status} /></td><td className="px-4 py-3 text-right"><Button size="sm" onClick={() => navigate(`/purchasing/orders/${po.id}`)}><Eye className="mr-2 h-4 w-4" />Review</Button></td>
                </tr>)}</tbody>
              </table></div>
              {pagination.total > 0 && <div className="flex items-center justify-between border-t p-4 text-sm"><span className="text-slate-600">{pagination.total} pending order{pagination.total === 1 ? '' : 's'}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-slate-600">Page {page} of {pagination.totalPages}</span><Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
            </CardContent></Card>}
  </div>;
}
