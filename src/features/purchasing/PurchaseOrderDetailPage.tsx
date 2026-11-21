import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSmartBack } from '../../hooks/useSmartBack';
import { useAuth } from '../../hooks/useAuth';
import { usePurchaseOrder, usePurchaseOrderActions, usePurchaseOrderActivity } from '../../hooks/usePurchaseOrders';
import type { PurchaseOrderRecord } from '../../api/purchase-orders/purchase-orders.types';
import type { TimelineEntry } from '../../components/approval/ApprovalTimeline';
import { ApprovalTimeline } from '../../components/approval/ApprovalTimeline';
import { PurchaseOrderStatusBadge } from './components/PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AlertCircle, ArrowLeft, CheckCircle2, Edit, Package, Printer, Send, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components/common/PageHeader';
import { toast } from 'sonner';

function statusFrom(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'status' in value && typeof value.status === 'string') return value.status;
  return undefined;
}

function toTimelineEntry(record: PurchaseOrderRecord): TimelineEntry {
  const action = record.actionType.replace(/^PO_/, '').replace(/_/g, ' ');
  const normalizedAction = record.actionType.includes('REJECT')
    ? 'REJECT'
    : record.actionType.includes('APPROV') || record.actionType.includes('VERIFIED')
      ? 'APPROVE'
      : record.actionType.includes('SUBMIT')
        ? 'SUBMIT'
        : record.actionType.includes('ISSUED')
          ? 'ISSUE'
          : record.actionType.includes('CREATED')
            ? 'CREATE'
            : action;
  const nextValue = record.newValue as Record<string, unknown> | null | undefined;
  const reason = typeof nextValue?.rejectionReason === 'string' ? nextValue.rejectionReason : undefined;
  const approvalRemark = typeof nextValue?.approvalRemarks === 'string' ? nextValue.approvalRemarks : undefined;
  const verifyRemark = typeof nextValue?.verifyRemarks === 'string' ? nextValue.verifyRemarks : undefined;
  return {
    id: record.id,
    actorId: record.actorId ?? undefined,
    actorName: record.actorName || 'System user',
    actorRole: record.actorRole || '—',
    action: normalizedAction,
    fromStatus: statusFrom(record.oldValue),
    toStatus: statusFrom(record.newValue),
    comment: record.remark || reason || approvalRemark || verifyRemark,
    timestamp: record.createdAt,
  };
}

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack('/purchasing/orders');
  const { currentUser } = useAuth();
  const { purchaseOrder: po, loading, error, refetch } = usePurchaseOrder(id);
  const activityQuery = usePurchaseOrderActivity(id);
  const { submitPO, verifyPO, approvePO, rejectPO, issuePO } = usePurchaseOrderActions();
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const timeline = useMemo(() => (activityQuery.data ?? []).map(toTimelineEntry).reverse(), [activityQuery.data]);
  const role = currentUser?.role;
  const canManageOrders = role === 'PURCHASING_OFFICER' || role === 'PURCHASING_MANAGER' || role === 'MANAGER' || role === 'DIRECTOR';
  const canIssueOrders = role === 'PURCHASING_MANAGER' || role === 'MANAGER' || role === 'DIRECTOR';
  const isCreator = Boolean(po && currentUser?.id === po.createdBy);
  const canVerify = role === 'PURCHASING_MANAGER' && po?.status === 'PENDING_VERIFICATION' && !isCreator;
  const canFinalApprove = (role === 'MANAGER' || role === 'DIRECTOR') && po?.status === 'PENDING_APPROVAL' && (role === 'DIRECTOR' || !isCreator);
  const canStageReject = role === 'PURCHASING_MANAGER' && po?.status === 'PENDING_VERIFICATION' && !isCreator;
  const canFinalReject = (role === 'MANAGER' || role === 'DIRECTOR') && po?.status === 'PENDING_APPROVAL' && !isCreator;
  const canReview = canVerify || canFinalApprove || canStageReject || canFinalReject;

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setActionLoading(true);
    try {
      await action();
      setComment('');
      toast.success(successMessage);
      await refetch();
      await activityQuery.refetch();
    } catch {
      // The action hook reports the server's validation or permission error.
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !po) return <TableLoadingSkeleton />;
  if (!po) {
    return <div className="mx-auto max-w-3xl space-y-4 p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
      <h2 className="text-xl font-bold">{error ? 'Unable to load purchase order' : 'Purchase order not found'}</h2>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <Button variant="outline" onClick={goBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to orders</Button>
    </div>;
  }

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <PageHeader
      title={<span className="font-mono">{po.poNumber}</span>}
      subtitle={`Order date ${formatDate(po.orderDate)}${po.expectedDeliveryDate ? ` · Expected delivery ${formatDate(po.expectedDeliveryDate)}` : ''}`}
      badge={<PurchaseOrderStatusBadge status={po.status} />}
      backUrl="/purchasing/orders"
      backLabel="Orders"
      breadcrumbs={[{ label: 'Purchasing', href: '/purchasing' }, { label: 'Purchase Orders', href: '/purchasing/orders' }, { label: po.poNumber }]}
      actions={<div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(`/purchasing/orders/${po.id}/print`)}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
        {canManageOrders && (po.status === 'DRAFT' || po.status === 'REJECTED') && <Button variant="outline" onClick={() => navigate(`/purchasing/orders/${po.id}/edit`)}><Edit className="mr-2 h-4 w-4" />{po.status === 'REJECTED' ? 'Create revision' : 'Edit draft'}</Button>}
        {canManageOrders && po.status === 'DRAFT' && <ConfirmButton variant="default" dialogVariant="warning" confirmTitle="Submit for verification" confirmMessage={`Submit ${po.poNumber} to the Purchasing Manager?`} confirmText="Submit PO" disabled={actionLoading} onConfirm={() => runAction(() => submitPO(po.id, comment), `${po.poNumber} submitted for verification.`)}><Send className="mr-2 h-4 w-4" />Submit</ConfirmButton>}
        {canIssueOrders && po.status === 'APPROVED' && <ConfirmButton variant="default" dialogVariant="warning" confirmTitle="Issue to supplier" confirmMessage={`Record ${po.poNumber} as issued to ${po.supplierName}? This does not update inventory.`} confirmText="Issue to supplier" disabled={actionLoading || Boolean(po.sentAt)} onConfirm={() => runAction(() => issuePO(po.id, comment), `${po.poNumber} issued to supplier.`)}><Truck className="mr-2 h-4 w-4" />{po.sentAt ? 'Issued to supplier' : 'Issue to supplier'}</ConfirmButton>}
      </div>}
    />

    {po.rejectionReason && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><strong>Rejection reason:</strong> {po.rejectionReason}</div>}
    {po.sentAt && <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Issued to supplier on {formatDate(po.sentAt)}. Inventory is updated only through goods receipt.</div>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" />Order items</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-y bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit cost</th><th className="px-4 py-3 text-right">Discount</th><th className="px-4 py-3 text-right">Line total</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{po.items.map((item) => <tr key={item.id}>
                  <td className="px-4 py-3"><div className="font-medium text-slate-900">{item.productName}</div><div className="text-xs text-slate-500">{item.productCode}</div>{item.notes && <div className="mt-1 text-xs text-slate-500">{item.notes}</div>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}{item.receivedQuantity ? <div className="text-xs text-slate-500">Received {item.receivedQuantity} · Outstanding {item.quantity - item.receivedQuantity}</div> : null}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.unitPrice, 'LKR')}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.discountAmount, 'LKR')}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(item.total, 'LKR')}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="ml-auto max-w-sm space-y-2 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-mono">{formatCurrency(po.subtotal, 'LKR')}</span></div>
              {po.totalDiscount > 0 && <div className="flex justify-between"><span className="text-slate-600">PO discount</span><span className="font-mono">−{formatCurrency(po.totalDiscount, 'LKR')}</span></div>}
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Grand total</span><span className="font-mono">{formatCurrency(po.grandTotal, 'LKR')}</span></div>
            </div>
          </CardContent>
        </Card>

        {canReview && <Card className="border-indigo-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-indigo-600" />Approval action</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">{canVerify ? 'Verify this order and forward it for final approval.' : canStageReject ? 'Reject this order during Purchasing Manager verification.' : 'Complete the final approval decision.'}</p>
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={canStageReject || canFinalReject ? 'Rejection reason is required' : 'Optional approval comment'} rows={3} maxLength={4000} />
            <div className="flex flex-wrap gap-2">
              {canVerify && <Button disabled={actionLoading} onClick={() => runAction(() => verifyPO(po.id, comment), `${po.poNumber} verified and forwarded for final approval.`)}><CheckCircle2 className="mr-2 h-4 w-4" />Verify and forward</Button>}
              {canFinalApprove && <Button disabled={actionLoading} onClick={() => runAction(() => approvePO(po.id, comment, role === 'DIRECTOR'), `${po.poNumber} approved.`)}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button>}
              {(canStageReject || canFinalReject) && <Button variant="destructive" disabled={actionLoading || comment.trim().length < 3} onClick={() => runAction(() => rejectPO(po.id, comment.trim(), po.status), `${po.poNumber} rejected.`)}><XCircle className="mr-2 h-4 w-4" />Reject</Button>}
            </div>
          </CardContent>
        </Card>}

        <Card>
          <CardHeader><CardTitle className="text-base">Approval history</CardTitle></CardHeader>
          <CardContent>
            {activityQuery.isError ? <div role="alert" className="text-sm text-rose-700">Approval history could not be loaded.</div> : activityQuery.isLoading ? <p className="text-sm text-slate-500">Loading history…</p> : <ApprovalTimeline history={timeline} />}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card><CardHeader><CardTitle className="text-base">Supplier</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
          <p className="font-semibold text-slate-900">{po.supplierName}</p>
          {po.supplierCode && <p className="text-slate-500">Code: {po.supplierCode}</p>}
          {po.supplierContactPerson && <p className="text-slate-600">Contact: {po.supplierContactPerson}</p>}
          {po.supplierPhone && <p className="text-slate-600">Phone: {po.supplierPhone}</p>}
          {po.supplierEmail && <p className="break-all text-slate-600">{po.supplierEmail}</p>}
          {po.supplierAddress && <p className="whitespace-pre-line text-slate-600">{po.supplierAddress}</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Order details</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <div><p className="text-xs uppercase text-slate-500">Payment terms</p><p className="text-slate-800">{po.paymentTerms || 'Not specified'}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Created by</p><p className="text-slate-800">{po.createdByName || '—'}</p></div>
          {po.purchasingManagerApproval && <div><p className="text-xs uppercase text-slate-500">Verified by Purchasing Manager</p><p className="text-slate-800">{po.purchasingManagerApproval.approvedByName}</p>{po.purchasingManagerApproval.remarks && <p className="mt-1 text-xs text-slate-500">{po.purchasingManagerApproval.remarks}</p>}</div>}
          {po.approvedByName && <div><p className="text-xs uppercase text-slate-500">Final approver</p><p className="text-slate-800">{po.approvedByName}</p></div>}
          {po.deliveryInstructions && <div><p className="text-xs uppercase text-slate-500">Delivery instructions</p><p className="whitespace-pre-line text-slate-700">{po.deliveryInstructions}</p></div>}
          {po.notes && <div><p className="text-xs uppercase text-slate-500">Notes</p><p className="whitespace-pre-line text-slate-700">{po.notes}</p></div>}
        </CardContent></Card>
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Purchase orders record supplier commitments. Receiving and inventory changes occur through the Goods Received Note workflow.</p>
      </aside>
    </div>
  </div>;
}
