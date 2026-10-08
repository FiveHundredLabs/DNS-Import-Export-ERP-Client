import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { orderService } from '../../services/OrderService';
import { invoiceService } from '../../services/InvoiceService';
import { SalesOrder, OrderStatus } from '../../types/order';
import { Invoice } from '../../types/invoice';
import { OrderStatusBadge } from './OrderStatusBadge';
import { ApprovalTimeline } from '../../components/approval/ApprovalTimeline';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  canApproveOrder,
  canEscalateOrder,
  getAllowedEscalationTargets,
  canCancelOrder,
} from '../../rules/orderRules';
import {
  ShoppingCart,
  ArrowLeft,
  Printer,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Ban,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  Truck,
  PackageCheck,
  FileText,
  Boxes,
  ShieldAlert,
} from 'lucide-react';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderInvoice, setOrderInvoice] = useState<Invoice | null>(null);

  // Dialog state
  const [actionType, setActionType] = useState<
    'APPROVE' | 'REJECT' | 'ESCALATE_MANAGER' | 'ESCALATE_DIRECTOR' | 'CANCEL' | null
  >(null);
  const [actionComment, setActionComment] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getOrderById(id, {
        userId: currentUser.id,
        role: currentUser.role,
        areaId: currentUser.areaId,
      });
      if (!data) {
        setError('Sales Order not found.');
      } else {
        setOrder(data);
        // Check if an invoice exists for this order
        try {
          const invs = await invoiceService.getInvoices({ search: data.orderNumber });
          const matching = invs.data.find((i) => i.orderId === data.id);
          if (matching) setOrderInvoice(matching);
        } catch {
          // ignore
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id, currentUser]);

  const handleGenerateInvoice = async () => {
    if (!order) return;
    try {
      setLoading(true);
      const invoice = await invoiceService.createInvoiceFromOrder(order.id, currentUser);
      navigate(`/invoices/${invoice.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Invoice generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitForApproval = async () => {
    if (!order) return;
    try {
      setLoading(true);
      await orderService.submitOrder(order.id, currentUser);
      await fetchOrder();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!order || !actionType) return;
    try {
      setIsActionSubmitting(true);
      if (actionType === 'APPROVE') {
        await orderService.approveOrder(
          order.id,
          currentUser,
          actionComment || 'Approved as requested.'
        );
      } else if (actionType === 'REJECT') {
        await orderService.rejectOrder(order.id, currentUser, actionComment);
      } else if (actionType === 'ESCALATE_MANAGER') {
        await orderService.escalateOrder(order.id, currentUser, 'MANAGER', actionComment);
      } else if (actionType === 'ESCALATE_DIRECTOR') {
        await orderService.escalateOrder(order.id, currentUser, 'DIRECTOR', actionComment);
      } else if (actionType === 'CANCEL') {
        await orderService.cancelOrder(order.id, currentUser, actionComment);
      }
      setActionType(null);
      setActionComment('');
      await fetchOrder();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleFulfillmentAdvance = async (nextStatus: OrderStatus) => {
    if (!order) return;
    try {
      setLoading(true);
      await orderService.updateFulfillmentStatus(order.id, nextStatus, currentUser);
      await fetchOrder();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Fulfillment status update failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading order document...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-sm">Order Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'The requested order could not be loaded.'}</p>
        <Button onClick={() => navigate('/orders')} variant="outline" size="sm" className="mt-2">
          Back to Orders List
        </Button>
      </div>
    );
  }

  const isPendingOrSpecial =
    order.status === 'PENDING_APPROVAL' || order.status === 'SPECIAL_APPROVAL';

  const userCanApprove =
    isPendingOrSpecial &&
    canApproveOrder(
      currentUser.role,
      order.currentApproverRole || order.targetApproverRole,
      order.isSpecialApproval
    );

  const userCanEscalate = isPendingOrSpecial && canEscalateOrder(currentUser.role);
  const allowedEscalations = userCanEscalate ? getAllowedEscalationTargets(currentUser.role) : [];
  const userCanCancel =
    canCancelOrder(order.status) &&
    (currentUser.role !== 'SALES_REP' || order.salesRepId === currentUser.id);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Navigation & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sales Orders
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print / PDF
          </Button>

          {/* Edit (if DRAFT) */}
          {order.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/orders/${order.id}/edit`)}
              className="text-xs gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Draft
            </Button>
          )}

          {/* Submit for Approval (if DRAFT) */}
          {order.status === 'DRAFT' && (
            <Button
              size="sm"
              onClick={handleSubmitForApproval}
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5 shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Submit for Approval
            </Button>
          )}

          {/* Approve / Reject Actions */}
          {userCanApprove && (
            <Button
              size="sm"
              onClick={() => setActionType('APPROVE')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-xs"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve Order
            </Button>
          )}

          {isPendingOrSpecial && ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType('REJECT')}
              className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
              Reject
            </Button>
          )}

          {/* Escalation Options */}
          {allowedEscalations.includes('MANAGER') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType('ESCALATE_MANAGER')}
              className="text-sky-700 border-sky-300 hover:bg-primary-light text-xs gap-1.5"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
              Escalate to Manager
            </Button>
          )}

          {allowedEscalations.includes('DIRECTOR') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType('ESCALATE_DIRECTOR')}
              className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs gap-1.5"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-purple-600" />
              Escalate to Director
            </Button>
          )}

          {/* Cancellation Option */}
          {userCanCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionType('CANCEL')}
              className="text-slate-500 hover:text-rose-600 text-xs gap-1"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancel Order
            </Button>
          )}

          {/* Operational Pipeline Advance Buttons */}
          {order.status === 'APPROVED' && (
            <Button
              size="sm"
              onClick={() => handleFulfillmentAdvance('PICKING')}
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5"
            >
              <Boxes className="h-3.5 w-3.5" />
              Start Picking
            </Button>
          )}

          {order.status === 'PICKING' && (
            <Button
              size="sm"
              onClick={() => handleFulfillmentAdvance('ISSUED')}
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5"
            >
              <PackageCheck className="h-3.5 w-3.5" />
              Issue Goods
            </Button>
          )}

          {order.status === 'PARTIALLY_ISSUED' && (
            <>
              <Button
                size="sm"
                onClick={() => handleFulfillmentAdvance('ISSUED')}
                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5"
              >
                <PackageCheck className="h-3.5 w-3.5" />
                Complete Issue
              </Button>
              <Button
                size="sm"
                onClick={handleGenerateInvoice}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Invoice Partial
              </Button>
            </>
          )}

          {order.status === 'ISSUED' && (
            <Button
              size="sm"
              onClick={handleGenerateInvoice}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              Generate Tax Invoice
            </Button>
          )}

          {order.status === 'INVOICED' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (orderInvoice) {
                    navigate(`/invoices/${orderInvoice.id}`);
                  } else {
                    navigate(`/invoices?search=${encodeURIComponent(order.orderNumber)}`);
                  }
                }}
                className="border-primary-border text-primary-text hover:bg-primary-light text-xs gap-1.5 font-semibold"
              >
                <FileText className="h-3.5 w-3.5" />
                View Tax Invoice
              </Button>
              <Button
                size="sm"
                onClick={() => handleFulfillmentAdvance('DISPATCHED')}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                Dispatch Order
              </Button>
            </>
          )}

          {order.status === 'DISPATCHED' && (
            <Button
              size="sm"
              onClick={() => handleFulfillmentAdvance('DELIVERED')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      {/* Contextual Status Alerts */}
      {order.status === 'SPECIAL_APPROVAL' && (
        <div className="rounded-lg bg-amber-500 text-white p-4 shadow-sm flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 text-white shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm tracking-wide">
              Special Approval Required
            </h4>
            <p className="text-xs text-amber-50">
              This order requires authorization from the <strong>{order.currentApproverRole || order.targetApproverRole}</strong> due to commercial limit breaches:
            </p>
            <ul className="list-disc pl-5 text-xs text-amber-100 space-y-0.5 pt-1">
              {order.specialApprovalReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {order.status === 'PENDING_APPROVAL' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-900">Pending Sales Manager Approval</h4>
            <p className="text-amber-800">
              Standard commercial terms order pending authorization by the Sales Manager.
            </p>
          </div>
        </div>
      )}

      {order.status === 'REJECTED' && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Sales Order Rejected</h4>
            <p className="mt-0.5">
              Rejected by {order.rejectedByName} on {formatDate(order.rejectedAt || '')}. Reason: "{order.rejectionReason}"
            </p>
          </div>
        </div>
      )}

      {order.status === 'CANCELLED' && (
        <div className="rounded-lg bg-slate-100 border border-slate-300 p-4 text-xs text-slate-700 flex items-start gap-3">
          <Ban className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">Sales Order Cancelled</h4>
            <p className="mt-0.5">
              Cancelled on {formatDate(order.cancelledAt || '')}. Reason: "{order.cancellationReason}"
            </p>
          </div>
        </div>
      )}

      {/* Enterprise Order Document Card */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
        {/* Document Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold font-mono text-slate-900 tabular-nums">{order.orderNumber}</span>
              <OrderStatusBadge status={order.status} isSpecialApproval={order.isSpecialApproval} />
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-4">
              <span>Date: {formatDate(order.createdAt)}</span>
              <span>Rep: {order.salesRepNameSnapshot}</span>
              {order.customerPoNumber && <span>PO Ref: {order.customerPoNumber}</span>}
              {order.quotationNumber && (
                <span className="text-primary font-medium">
                  Converted from: {order.quotationNumber}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-slate-500 block">Total Order Value</span>
            <span className="text-2xl font-semibold font-mono text-primary tabular-nums">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Customer & Credit Snapshot at Time of Order */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-200">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2">
              Customer Snapshot
            </h4>
            <div className="space-y-1 text-xs">
              <div className="font-semibold text-slate-900">{order.customerNameSnapshot}</div>
              <div className="text-slate-500 font-mono">Code: {order.customerCodeSnapshot}</div>
              <div className="text-slate-600">{order.customerPhoneSnapshot}</div>
              {order.customerAddressSnapshot && (
                <div className="text-slate-500 text-xs mt-1">{order.customerAddressSnapshot}</div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2">
              Credit Terms at Order
            </h4>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Credit Limit:</span>
                <span className="font-mono font-semibold tabular-nums">{formatCurrency(order.customerCreditLimitSnapshot)}</span>
              </div>
              <div className="flex justify-between">
                <span>Prior Outstanding:</span>
                <span className="font-mono tabular-nums">{formatCurrency(order.customerOutstandingSnapshot)}</span>
              </div>
              <div className="flex justify-between">
                <span>Requested Terms:</span>
                <span className="font-semibold text-slate-800">{order.requestedCreditDays} Days Credit</span>
              </div>
              <div className="flex justify-between">
                <span>Standard Limit:</span>
                <span>{order.customerCreditDaysSnapshot} Days</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 mb-2">
              Delivery Information
            </h4>
            <div className="space-y-1 text-xs text-slate-600">
              <div>
                <span className="font-medium text-slate-700">Destination:</span>
                <p className="mt-0.5 text-slate-800">{order.deliveryAddress}</p>
              </div>
              {order.requestedDeliveryDate && (
                <div className="pt-1">
                  <span className="font-medium text-slate-700">Requested Date:</span>{' '}
                  {formatDate(order.requestedDeliveryDate)}
                </div>
              )}
              {order.paymentTerms && (
                <div>
                  <span className="font-medium text-slate-700">Terms:</span> {order.paymentTerms}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="p-6">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">
            Itemized Order Lines
          </h4>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-[13px] tabular-nums">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[12.5px]">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold">Product Snapshot</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Unit Price</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Ordered</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Approved</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Issued</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Disc %</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Disc Amount</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{it.productNameSnapshot}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {it.skuSnapshot} {it.uomSnapshot && `• ${it.uomSnapshot}`}
                      </div>
                      {it.requiresSpecialApproval && (
                        <span className="inline-block mt-1 text-xs text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                          {it.specialApprovalReason || 'Excess discount'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {formatCurrency(it.unitPriceSnapshot)}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-900 tabular-nums">
                      {it.orderedQuantity}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 tabular-nums">
                      {it.approvedQuantity}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 tabular-nums">
                      {it.issuedQuantity}
                    </td>
                    <td className="py-3 px-3 text-center font-medium tabular-nums">
                      {it.discountPercentage}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                      - {formatCurrency(it.discountAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(it.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="mt-4 flex flex-col items-end text-xs space-y-1.5">
            <div className="flex justify-between w-64 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium tabular-nums">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between w-64 text-emerald-600">
              <span>Applied Discount:</span>
              <span className="font-mono font-medium tabular-nums">- {formatCurrency(order.discountAmount)}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-600">
              <span>
                {order.taxEnabled !== false && order.taxAmount > 0
                  ? `VAT (${order.taxRatePercentage ?? 18}%):`
                  : 'Tax:'}
              </span>
              <span className="font-mono font-medium tabular-nums">{formatCurrency(order.taxAmount)}</span>
            </div>
            <div className="flex justify-between w-64 border-t-2 border-slate-900 pt-2 font-semibold text-sm text-slate-900">
              <span>Grand Total:</span>
              <span className="font-mono font-semibold text-primary tabular-nums">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Approval Box & Audit Timeline */}
        <div className="border-t border-slate-200 bg-slate-50/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              Approval Timeline & State History
            </h4>
            {order.targetApproverRole && isPendingOrSpecial && (
              <span className="text-xs text-slate-500">
                Pending Approval: <strong className="text-slate-800">{order.currentApproverRole || order.targetApproverRole}</strong>
              </span>
            )}
          </div>

          <ApprovalTimeline history={order.approvalHistory} />
        </div>
      </Card>

      {/* Action Dialog Modal */}
      {actionType && (
        <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                {actionType === 'APPROVE' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                {actionType === 'REJECT' && <XCircle className="h-5 w-5 text-rose-600" />}
                {(actionType === 'ESCALATE_MANAGER' || actionType === 'ESCALATE_DIRECTOR') && (
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                )}
                {actionType === 'CANCEL' && <Ban className="h-5 w-5 text-slate-600" />}
                {actionType === 'APPROVE' && 'Approve Sales Order'}
                {actionType === 'REJECT' && 'Reject Sales Order'}
                {actionType === 'ESCALATE_MANAGER' && 'Escalate Order to Manager'}
                {actionType === 'ESCALATE_DIRECTOR' && 'Escalate Order to Director'}
                {actionType === 'CANCEL' && 'Cancel Sales Order'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'APPROVE' && `Confirm commercial approval for ${order.orderNumber}.`}
                {actionType === 'REJECT' && `Enter rejection reason for order ${order.orderNumber}.`}
                {actionType === 'ESCALATE_MANAGER' && `Escalate ${order.orderNumber} to Manager for commercial review.`}
                {actionType === 'ESCALATE_DIRECTOR' && `Escalate ${order.orderNumber} to Director for executive decision.`}
                {actionType === 'CANCEL' && `Confirm cancellation of order ${order.orderNumber}.`}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                {actionType === 'APPROVE' ? 'Approval Notes (Optional)' : 'Explanatory Reason (Required)'}
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  actionType === 'APPROVE'
                    ? 'e.g. Terms reviewed and accepted.'
                    : actionType === 'REJECT'
                    ? 'e.g. Credit limit breach cannot be accommodated.'
                    : actionType === 'CANCEL'
                    ? 'e.g. Customer cancelled purchase order.'
                    : 'e.g. Exceeds standard discount parameters; requesting senior management override.'
                }
                rows={3}
                className="w-full rounded-md border border-slate-200 p-2 text-sm focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionType(null)}
                disabled={isActionSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleActionConfirm}
                disabled={
                  isActionSubmitting ||
                  ((actionType === 'REJECT' || actionType === 'CANCEL' || actionType === 'ESCALATE_MANAGER' || actionType === 'ESCALATE_DIRECTOR') &&
                    actionComment.trim().length < 3)
                }
                className={
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : actionType === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : actionType === 'CANCEL'
                    ? 'bg-slate-700 hover:bg-slate-800 text-white'
                    : 'bg-primary hover:bg-primary-hover text-primary-foreground'
                }
              >
                {isActionSubmitting ? 'Processing...' : 'Confirm Action'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
