import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useAuth } from '../../hooks/useAuth';
import { approvalService } from '../../services/ApprovalService';
import { apService } from '../finance/services/apService';
import { SupplierAdvance } from '../finance/api/types';
import { ApprovalRequest } from '../../types/approval';
import { ApprovalTimeline } from '../../components/approval/ApprovalTimeline';
import { PurchaseOrderStatusBadge } from './components/PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ShoppingCart,
  ArrowLeft,
  Printer,
  Edit,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  FileText,
  Truck,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PageHeader } from '../../components';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { purchaseOrders, loading, submitPO, markSent, refetch } = usePurchaseOrders();

  const [approvalComment, setApprovalComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const po = purchaseOrders.find((p) => p.id === id);

  const isManagerOrDirector =
    currentUser.role === 'DIRECTOR' ||
    currentUser.role === 'MANAGER' ||
    currentUser.role === 'PURCHASING_MANAGER';

  const isPurchasingManager = currentUser.role === 'PURCHASING_MANAGER';

  const canApprove =
    isManagerOrDirector && po?.status === 'PENDING_APPROVAL';

  const handleManagerApprove = async () => {
    if (!po?.approvalRequestId) {
      toast.error('No approval request reference found for this PO.');
      return;
    }
    if (approvalComment.trim().length < 3) {
      toast.error('An explanatory comment of at least 3 characters is required.');
      return;
    }

    setActionLoading(true);
    try {
      await approvalService.processAction(
        po.approvalRequestId,
        'APPROVE',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        approvalComment
      );
      toast.success(`Purchase Order ${po.poNumber} has been approved.`);
      setApprovalComment('');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManagerReject = async () => {
    if (!po?.approvalRequestId) {
      toast.error('No approval request reference found for this PO.');
      return;
    }
    if (approvalComment.trim().length < 3) {
      toast.error('A rejection reason of at least 3 characters is required.');
      return;
    }

    setActionLoading(true);
    try {
      await approvalService.processAction(
        po.approvalRequestId,
        'REJECT',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        approvalComment
      );
      toast.success(`Purchase Order ${po.poNumber} has been rejected.`);
      setApprovalComment('');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePassToManager = async () => {
    if (!po?.approvalRequestId) {
      toast.error('No approval request reference found for this PO.');
      return;
    }
    if (approvalComment.trim().length < 3) {
      toast.error('An explanatory verification comment of at least 3 characters is required.');
      return;
    }

    setActionLoading(true);
    try {
      await approvalService.processAction(
        po.approvalRequestId,
        'ESCALATE',
        currentUser.id,
        currentUser.name,
        currentUser.role,
        approvalComment,
        'MANAGER'
      );
      toast.success(
        `Purchase Order ${po.poNumber} verified and passed to General Manager for authorization.`
      );
      setApprovalComment('');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to pass purchase order to manager');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!po) return;
    setActionLoading(true);
    try {
      await submitPO(po.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkSent = async () => {
    if (!po) return;
    setActionLoading(true);
    try {
      await markSent(po.id);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !po) {
    return (
      <div className="space-y-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Purchase Order Not Found</h2>
        <p className="text-sm text-slate-500">The requested purchase order record could not be loaded.</p>
        <Button onClick={() => navigate('/purchasing/orders')}>Back to Orders</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Standardized Page Header */}
      <PageHeader
        title={<span className="font-mono">{po.poNumber}</span>}
        subtitle={`Issued on ${formatDate(po.orderDate)} • Expected by ${formatDate(po.expectedDeliveryDate)}`}
        badge={<PurchaseOrderStatusBadge status={po.status} />}
        backUrl="/purchasing/orders"
        backLabel="Orders"
        breadcrumbs={[
          { label: 'Purchasing', href: '/purchasing/orders' },
          { label: 'Orders', href: '/purchasing/orders' },
          { label: po.poNumber },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Print A4 Document */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/purchasing/orders/${po.id}/print`)}
              className="gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>View / Print A4</span>
            </Button>

            {/* Edit (Draft or Rejected) */}
            {(po.status === 'DRAFT' || po.status === 'REJECTED') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/purchasing/orders/${po.id}/edit`)}
                className="gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Order</span>
              </Button>
            )}

            {/* Submit for Approval */}
            {(po.status === 'DRAFT' || po.status === 'REJECTED') && (
              <ConfirmButton
                variant="default"
                size="sm"
                dialogVariant="warning"
                confirmTitle="Submit Purchase Order"
                confirmMessage={`Submit Purchase Order ${po.poNumber} for managerial authorization?`}
                confirmText="Submit for Approval"
                disabled={actionLoading}
                onConfirm={handleSubmitForApproval}
                className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit for Approval</span>
              </ConfirmButton>
            )}

            {/* Mark Sent to Supplier */}
            {po.status === 'APPROVED' && (
              <ConfirmButton
                variant="default"
                size="sm"
                confirmTitle="Dispatch to Supplier"
                confirmMessage={`Confirm dispatch of Purchase Order ${po.poNumber} to supplier ${po.supplierName}?`}
                confirmText="Dispatch to Supplier"
                disabled={actionLoading}
                onConfirm={handleMarkSent}
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Dispatch to Supplier</span>
              </ConfirmButton>
            )}
          </div>
        }
      />

      {/* Downstream Receiving / Warehouse Continuity Banner */}
      {(po.status === 'SENT_TO_SUPPLIER' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'COMPLETED') && (
        <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/80 text-xs text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Warehouse Inward Fulfillment:</strong> Track inbound receiving verification and damaged goods logs for this order in Goods Received Notes.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/purchasing/grn?search=${encodeURIComponent(po.poNumber)}`)}
            className="h-7 text-xs bg-white hover:bg-indigo-50 border-indigo-300 text-indigo-700 shrink-0"
          >
            <span>View Related GRNs</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Rejection Alert if rejected */}
      {po.status === 'REJECTED' && po.rejectionReason && (
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900 text-sm">Purchase Order Rejected</h4>
            <p className="mt-1 leading-relaxed">
              <strong>Reason:</strong> {po.rejectionReason}
            </p>
            <p className="mt-2 text-[11px] text-rose-700">
              You can edit the items or renegotiate pricing and resubmit for managerial authorization.
            </p>
          </div>
        </div>
      )}

      {/* Internal Approval Action Sections */}
      {isPendingApproval && isSelfApprovalBlocked && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs">
          <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950 text-sm">Self-Approval Prohibited</h4>
            <p className="mt-1 leading-relaxed">
              As the creator of this Purchase Order (Purchasing Manager), you cannot approve your own order. It has proceeded directly to higher-level General Manager / Director authorization.
            </p>
          </div>
        </div>
      )}

      {isPendingApproval && isPurchasingOfficer && (
        <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 flex items-start gap-2.5 shadow-2xs">
          <Clock className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sky-950 text-sm">Awaiting Management Authorization</h4>
            <p className="mt-1 leading-relaxed">
              This Purchase Order was submitted and is currently undergoing internal managerial approval before it can be dispatched to supplier {po.supplierName}.
            </p>
          </div>
        </div>
      )}

      {isPendingApproval && canPurchasingManagerApprove && (
        <Card className="border-indigo-300 bg-indigo-50/40 shadow-sm">
          <CardHeader className="p-4 border-b border-indigo-200">
            <CardTitle className="text-sm font-bold text-indigo-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>Purchasing Manager Verification (Stage 1 of 2)</span>
              </div>
              <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 text-[10px]">
                Officer Submission
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-indigo-900">
              Review quantities, contracted pricing, and supplier delivery schedule. Your approval will advance this PO to the General Manager for final sign-off.
            </p>
            <Textarea
              placeholder="Enter verification notes or rejection rationale (min 3 characters)..."
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              className="bg-white text-xs"
              rows={2}
            />
            <div className="flex gap-2 justify-end flex-wrap">
              <ConfirmButton
                variant="destructive"
                size="sm"
                confirmTitle="Reject Purchase Order"
                confirmMessage={`Reject Purchase Order ${po.poNumber}? Rejection rationale will be recorded.`}
                confirmText="Reject Order"
                disabled={actionLoading}
                onConfirm={handleReject}
                className="gap-1.5 text-xs"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject Order</span>
              </ConfirmButton>
              <ConfirmButton
                variant="default"
                size="sm"
                confirmVariant="success"
                confirmTitle="Approve & Forward to General Manager"
                confirmMessage={`Approve Purchase Order ${po.poNumber} and forward to General Manager for secondary authorization?`}
                confirmText="Approve & Forward"
                disabled={actionLoading}
                onConfirm={handleApprove}
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve &amp; Forward to General Manager</span>
              </ConfirmButton>
            </div>
          </CardContent>
        </Card>
      )}

      {isPendingApproval && canHigherManagerApprove && (
        <Card className="border-emerald-300 bg-emerald-50/40 shadow-sm">
          <CardHeader className="p-4 border-b border-emerald-200">
            <CardTitle className="text-sm font-bold text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>General Manager Final Authorization (Stage 2 of 2)</span>
              </div>
              <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 text-[10px]">
                Final Approval
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {po.purchasingManagerApproval && (
              <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Purchasing Manager Verified ({po.purchasingManagerApproval.approvedByName}):</span>{' '}
                  <span>"{po.purchasingManagerApproval.remarks || 'Verified physical requirements and vendor terms.'}"</span>
                </div>
              </div>
            )}
            {po.createdByRole === 'PURCHASING_MANAGER' && (
              <div className="p-2.5 bg-white rounded-lg border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Direct Purchasing Manager Submission ({po.createdByName}):</span>{' '}
                  <span>Bypassed self-approval. Awaiting your executive authorization.</span>
                </div>
              </div>
            )}
            <p className="text-xs text-emerald-900">
              Review financial commitment totaling <strong>{formatCurrency(po.grandTotal, po.currency)}</strong>. Granting approval enables supplier dispatch and warehouse receipt.
            </p>
            <Textarea
              placeholder="Enter approval comments or rejection rationale (min 3 characters)..."
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              className="bg-white text-xs"
              rows={2}
            />
            <div className="flex gap-2 justify-end flex-wrap">
              <ConfirmButton
                variant="destructive"
                size="sm"
                confirmTitle="Reject Purchase Order"
                confirmMessage={`Reject Purchase Order ${po.poNumber}? Rejection rationale will be recorded.`}
                confirmText="Reject Order"
                disabled={actionLoading}
                onConfirm={handleReject}
                className="gap-1.5 text-xs"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject Order</span>
              </ConfirmButton>
              <ConfirmButton
                variant="default"
                size="sm"
                confirmVariant="success"
                confirmTitle="Grant Final Approval"
                confirmMessage={`Grant final authorization for Purchase Order ${po.poNumber} totaling ${formatCurrency(po.grandTotal, po.currency)}?`}
                confirmText="Grant Final Approval"
                disabled={actionLoading}
                onConfirm={handleApprove}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Grant Final Approval</span>
              </ConfirmButton>
            </div>
          </CardContent>
        </Card>
      )}

      {isPendingApproval && isHigherManager && approvalRequest?.currentApproverRole === 'PURCHASING_MANAGER' && (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Stage 1 in Progress:</strong> This Purchase Order is currently awaiting initial verification by the Purchasing Manager before advancing to your desk for final authorization.
            </span>
          </div>
        </div>
      )}

      {/* Linked Supplier Prepayments & Payments (View Only) */}
      {linkedAdvances.length > 0 && (
        <Card className="border-slate-200 shadow-2xs bg-slate-50/40">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Linked Supplier Prepayments (View Only)</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/purchasing/payments')}
              className="h-7 text-xs gap-1 bg-white hover:bg-slate-50"
            >
              <span>View All Payments</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {linkedAdvances.map((adv) => (
                <div key={adv.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{adv.advanceNumber} • {adv.reference}</div>
                    <div className="text-slate-500 text-[11px]">Paid on {formatDate(adv.paymentDate)} via Bank Account ({adv.bankAccountCode})</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-700">{formatCurrency(adv.amount)}</div>
                    <Badge variant="outline" className="text-[10px] bg-slate-50">{adv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Journey & Approval History Card */}
      {approvalRequest && approvalRequest.history && approvalRequest.history.length > 0 && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-slate-600" />
              <span>Approval Journey &amp; Decision Audit Trail</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              Ref: {approvalRequest.documentReferenceNumber}
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <ApprovalTimeline history={approvalRequest.history} />
          </CardContent>
        </Card>
      )}

      {/* Meta Grid: Supplier & Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier Profile Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Vendor / Supplier</span>
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px]">
              {po.supplierCode}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 text-sm">{po.supplierName}</div>
            {po.supplierContactPerson && (
              <div className="text-slate-600">
                <span className="font-semibold text-slate-700">Contact:</span> {po.supplierContactPerson} ({po.supplierPhone})
              </div>
            )}
            {po.supplierEmail && (
              <div className="text-slate-600">
                <span className="font-semibold text-slate-700">Email:</span> {po.supplierEmail}
              </div>
            )}
            {po.supplierAddress && (
              <div className="text-slate-600">
                <span className="font-semibold text-slate-700">Address:</span> {po.supplierAddress}
              </div>
            )}
            {po.supplierVatNumber && (
              <div className="text-slate-600">
                <span className="font-semibold text-slate-700">VAT Registration:</span> {po.supplierVatNumber}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Terms Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-600" />
              <span>Commercial Terms & Logistics</span>
            </CardTitle>
            <span className="font-mono text-xs font-semibold text-slate-700">
              Currency: {po.currency}
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Terms</span>
                <span className="font-semibold text-slate-800">{po.paymentTerms}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Due Date</span>
                <span className="font-semibold text-slate-800">{formatDate(po.expectedDeliveryDate)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Prepared By</span>
                <span className="text-slate-700">{po.createdByName || 'Purchasing Officer'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Authorized Signatory</span>
                <span className="text-slate-700">{po.approvedByName || 'Pending Authorization'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Order Items ({po.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-8 text-center">#</th>
                  <th className="py-3 px-4">Product Code & Description</th>
                  <th className="py-3 px-4 text-right w-24">Ordered Qty</th>
                  <th className="py-3 px-4 text-right w-32">Unit Price ({po.currency})</th>
                  <th className="py-3 px-4 text-right w-20">Discount</th>
                  <th className="py-3 px-4 text-right w-20">Tax %</th>
                  <th className="py-3 px-4 text-right w-32">Line Total ({po.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.productName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.productCode}</div>
                      {item.notes && <div className="text-[10px] text-slate-500 italic mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(item.unitPrice, po.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(item.total, po.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary Card */}
      <div className="flex justify-end">
        <div className="w-full sm:w-96 bg-slate-50/90 p-4 rounded-xl border border-slate-200/90 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(po.subtotal, po.currency)}
            </span>
          </div>
          {po.totalDiscount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discounts Applied:</span>
              <span className="font-mono font-semibold tabular-nums">
                -{formatCurrency(po.totalDiscount, po.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Applicable Taxes:</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(po.taxTotal, po.currency)}
            </span>
          </div>
          {po.shippingCharges > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Freight / Shipping:</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatCurrency(po.shippingCharges, po.currency)}
              </span>
            </div>
          )}
          {po.otherCharges > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Other Charges:</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatCurrency(po.otherCharges, po.currency)}
              </span>
            </div>
          )}
          <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline text-slate-900">
            <span className="font-bold text-sm">Grand Total ({po.currency}):</span>
            <span className="font-mono font-black text-xl tabular-nums">
              {formatCurrency(po.grandTotal, po.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
