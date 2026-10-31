import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SalesOrder,
  OrderActivityEvent,
  OrderActivityType,
} from '../../types/order';
import { useAuth } from '../../hooks/useAuth';
import { orderActivityService } from '../../services/OrderActivityService';
import { orderService } from '../../services/OrderService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { OrderStatusBadge } from './OrderStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import {
  Package,
  Send,
  UserCheck,
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  Boxes,
  FileText,
  Truck,
  RotateCcw,
  RefreshCw,
  CheckCheck,
  Receipt,
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  User,
  AlertTriangle,
  FileCheck,
  PlusCircle,
  MinusCircle,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface OrderActivityTimelineProps {
  order: SalesOrder;
  onOrderUpdated?: (updatedOrder: SalesOrder) => void;
  compactHeader?: boolean;
}

export function OrderActivityTimeline({
  order,
  onOrderUpdated,
  compactHeader = false,
}: OrderActivityTimelineProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isSalesRep = currentUser.role === 'SALES_REP';

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'APPROVALS' | 'DISPATCH' | 'RETURNS' | 'INVOICES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);

  // Workflow Simulation / Action Modals
  const [actionModal, setActionModal] = useState<
    'MODIFY_PRODUCTS' | 'APPROVE' | 'DISPATCH' | 'RETURN' | 'REPLACEMENT' | 'DELIVERY' | 'INVOICE' | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for simulation modals
  const [modCustomerNote, setModCustomerNote] = useState(
    'Contacted customer procurement manager over phone. Customer requested +2 units and agreed on delivery timeline.'
  );
  const [modQtyChange, setModQtyChange] = useState<number>(2);
  const [approvalNote, setApprovalNote] = useState('Reviewed and approved. Quantities and commercial terms verified.');
  const [dispatchDeliveryNote, setDispatchDeliveryNote] = useState(`DN-2025-${Math.floor(1000 + Math.random() * 9000)}`);
  const [dispatchVehicle, setDispatchVehicle] = useState('WP-GA-4581 (Isuzu ELF)');
  const [dispatchDriver, setDispatchDriver] = useState('Sunil Shantha');
  const [dispatchDriverPhone, setDispatchDriverPhone] = useState('+94 71 884 9201');
  const [returnReason, setReturnReason] = useState('Outer carton dented during offloading; customer requested replacement.');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [replacementDN, setReplacementDN] = useState(`DN-2025-${Math.floor(1000 + Math.random() * 9000)}-R`);
  const [deliveryRecipient, setDeliveryRecipient] = useState(order.customerNameSnapshot.split(' ')[0] + ' Store Manager');

  // Compute full chronological timeline (newest / latest at top, oldest at bottom)
  const fullTimeline = useMemo(() => {
    return orderActivityService.getOrderActivityTimeline(order, 'desc');
  }, [order]);

  // Toggle card expansion
  const toggleExpand = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopiedOrderNo(true);
    toast.success('Order number copied to clipboard');
    setTimeout(() => setCopiedOrderNo(false), 2000);
  };

  // Filter & Search
  const filteredEvents = useMemo(() => {
    return fullTimeline.filter((evt) => {
      // Category filter
      if (activeFilter === 'APPROVALS') {
        const approvalTypes: OrderActivityType[] = [
          'SUBMITTED_FOR_APPROVAL',
          'APPROVAL_ASSIGNED',
          'APPROVAL_ESCALATED',
          'PRODUCT_MODIFIED',
          'ORDER_APPROVED',
          'ORDER_REJECTED',
        ];
        if (!approvalTypes.includes(evt.type)) return false;
      } else if (activeFilter === 'DISPATCH') {
        const dispatchTypes: OrderActivityType[] = [
          'STOCK_RESERVED',
          'DELIVERY_NOTE_CREATED',
          'DISPATCH_INITIATED',
          'DISPATCH_UPDATED',
          'DELIVERED',
        ];
        if (!dispatchTypes.includes(evt.type)) return false;
      } else if (activeFilter === 'RETURNS') {
        const returnTypes: OrderActivityType[] = ['PRODUCT_RETURNED', 'REPLACEMENT_DISPATCHED'];
        if (!returnTypes.includes(evt.type)) return false;
      } else if (activeFilter === 'INVOICES') {
        if (evt.type !== 'INVOICE_ISSUED') return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(q);
        const matchesDesc = (evt.description || '').toLowerCase().includes(q);
        const matchesActor = evt.actorName.toLowerCase().includes(q);
        const matchesComment = (evt.comment || '').toLowerCase().includes(q);
        const matchesDoc = (evt.documentReference || '').toLowerCase().includes(q);
        const matchesProd = evt.productChanges?.added?.some((p) => p.productName.toLowerCase().includes(q)) ||
          evt.productChanges?.modified?.some((p) => p.productName.toLowerCase().includes(q)) ||
          evt.stockReservations?.some((s) => s.productName.toLowerCase().includes(q)) ||
          evt.returnDetails?.productName.toLowerCase().includes(q);

        return matchesTitle || matchesDesc || matchesActor || matchesComment || matchesDoc || matchesProd;
      }

      return true;
    });
  }, [fullTimeline, activeFilter, searchQuery]);

  // Current Approval Owner calculation
  const isPendingApproval = order.status === 'PENDING_APPROVAL' || order.status === 'SPECIAL_APPROVAL';
  const approvalOwnerName =
    order.currentApprovalOwnerName ||
    (order.currentApproverRole === 'AREA_MANAGER'
      ? 'Nimal Bandara (Area Manager)'
      : order.currentApproverRole === 'SALES_MANAGER'
      ? 'Kamal Perera (Sales Manager)'
      : order.currentApproverRole === 'MANAGER'
      ? 'Ruwan Wijesinghe (Manager)'
      : order.currentApproverRole === 'DIRECTOR'
      ? 'Saman Jayasuriya (Director)'
      : 'Area Manager');

  // Handlers for workflow actions
  const handleProductModifySubmit = async () => {
    try {
      setIsSubmitting(true);
      const firstItem = order.items[0];
      if (!firstItem) return;

      const updatedItems = order.items.map((it, idx) => {
        if (idx === 0) {
          return {
            productId: it.productId,
            orderedQuantity: Math.max(1, it.orderedQuantity + modQtyChange),
            requestedDiscountPercentage: it.discountPercentage,
          };
        }
        return {
          productId: it.productId,
          orderedQuantity: it.orderedQuantity,
          requestedDiscountPercentage: it.discountPercentage,
        };
      });

      const updated = await orderActivityService.recordProductModification(
        order.id,
        {
          items: updatedItems,
          customerContactNotes: modCustomerNote,
        },
        currentUser
      );

      toast.success('Product modification recorded with before/after diff in timeline');
      setActionModal(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to modify products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveSubmit = async () => {
    try {
      setIsSubmitting(true);
      const updated = await orderActivityService.approveOrderAndReserveStock(
        order.id,
        currentUser,
        approvalNote
      );
      toast.success('Order approved! Stock automatically reserved in inventory.');
      setActionModal(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sales Rep / Operations: Send for approval
  const handleSendForApproval = async () => {
    try {
      setIsSubmitting(true);
      const updated = await orderService.submitOrder(
        order.id,
        currentUser,
        'Submitted for manager approval from activity tracker.'
      );
      toast.success(`Order ${order.orderNumber} sent for approval!`);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit order for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchSubmit = async () => {
    if (isSalesRep) {
      toast.error('Permission Denied: Sales Representatives cannot dispatch orders.');
      return;
    }
    try {
      setIsSubmitting(true);
      const updated = await orderActivityService.recordDeliveryNoteAndDispatch(
        order.id,
        {
          deliveryNoteNumber: dispatchDeliveryNote,
          vehicleNumber: dispatchVehicle,
          driverName: dispatchDriver,
          driverPhone: dispatchDriverPhone,
          notes: 'Packed and verified by Stock Keeper. Out for delivery.',
        },
        currentUser
      );
      toast.success(`Delivery Note ${dispatchDeliveryNote} generated & order dispatched!`);
      setActionModal(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Dispatch failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnSubmit = async () => {
    try {
      setIsSubmitting(true);
      const firstItem = order.items[0];
      const updated = await orderActivityService.recordProductReturn(
        order.id,
        {
          productId: firstItem.productId,
          productName: firstItem.productNameSnapshot,
          sku: firstItem.skuSnapshot,
          returnedQuantity: returnQty,
          reason: returnReason,
        },
        currentUser
      );
      toast.success('Customer product return / refusal recorded in timeline');
      setActionModal(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Return recording failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplacementSubmit = async () => {
    try {
      setIsSubmitting(true);
      const firstItem = order.items[0];
      const updated = await orderActivityService.recordReplacementDispatch(
        order.id,
        {
          replacementDeliveryNoteNumber: replacementDN,
          productId: firstItem.productId,
          productName: firstItem.productNameSnapshot,
          sku: firstItem.skuSnapshot,
          quantity: returnQty || 1,
          notes: 'Factory-fresh replacement item dispatched to replace damaged box.',
        },
        currentUser
      );
      toast.success(`Replacement dispatched under ${replacementDN}`);
      setActionModal(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Replacement failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeliverySubmit = async () => {
    try {
      setIsSubmitting(true);
      const updated = await orderActivityService.recordDeliveryCompleted(
        order.id,
        {
          recipientName: deliveryRecipient,
          notes: 'Customer signed delivery note without further reservation.',
        },
        currentUser
      );
      toast.success('Order marked as delivered!');
      setActionModal(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Delivery completion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoiceSubmit = async () => {
    try {
      setIsSubmitting(true);
      const invNum = `INV-${order.orderNumber.replace('SO-', '')}`;
      const updated = await orderActivityService.recordInvoiceIssuance(
        order.id,
        {
          invoiceId: 'inv-' + order.id,
          invoiceNumber: invNum,
          totalAmount: order.totalAmount,
        },
        currentUser
      );
      toast.success(`Invoice ${invNum} issued successfully!`);
      setActionModal(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Invoice issuance failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper icon and color mapper
  const getEventVisuals = (type: OrderActivityType) => {
    switch (type) {
      case 'ORDER_CREATED':
        return {
          icon: Package,
          bg: 'bg-blue-500',
          text: 'text-blue-600',
          border: 'border-blue-200',
          pillBg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'SUBMITTED_FOR_APPROVAL':
        return {
          icon: Send,
          bg: 'bg-sky-500',
          text: 'text-sky-600',
          border: 'border-sky-200',
          pillBg: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'APPROVAL_ASSIGNED':
        return {
          icon: UserCheck,
          bg: 'bg-amber-500',
          text: 'text-amber-600',
          border: 'border-amber-200',
          pillBg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'APPROVAL_ESCALATED':
        return {
          icon: ArrowUpRight,
          bg: 'bg-purple-600',
          text: 'text-purple-600',
          border: 'border-purple-200',
          pillBg: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'PRODUCT_MODIFIED':
        return {
          icon: Sliders,
          bg: 'bg-orange-500',
          text: 'text-orange-600',
          border: 'border-orange-200',
          pillBg: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      case 'ORDER_APPROVED':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-600',
          text: 'text-emerald-600',
          border: 'border-emerald-200',
          pillBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'STOCK_RESERVED':
        return {
          icon: Boxes,
          bg: 'bg-teal-600',
          text: 'text-teal-600',
          border: 'border-teal-200',
          pillBg: 'bg-teal-50 text-teal-700 border-teal-200',
        };
      case 'DELIVERY_NOTE_CREATED':
        return {
          icon: FileText,
          bg: 'bg-indigo-600',
          text: 'text-indigo-600',
          border: 'border-indigo-200',
          pillBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'DISPATCH_INITIATED':
      case 'DISPATCH_UPDATED':
        return {
          icon: Truck,
          bg: 'bg-cyan-600',
          text: 'text-cyan-600',
          border: 'border-cyan-200',
          pillBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
      case 'PRODUCT_RETURNED':
        return {
          icon: RotateCcw,
          bg: 'bg-rose-600',
          text: 'text-rose-600',
          border: 'border-rose-200',
          pillBg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'REPLACEMENT_DISPATCHED':
        return {
          icon: RefreshCw,
          bg: 'bg-emerald-500',
          text: 'text-emerald-600',
          border: 'border-emerald-200',
          pillBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'DELIVERED':
        return {
          icon: CheckCheck,
          bg: 'bg-green-600',
          text: 'text-green-600',
          border: 'border-green-200',
          pillBg: 'bg-green-50 text-green-700 border-green-200',
        };
      case 'INVOICE_ISSUED':
        return {
          icon: Receipt,
          bg: 'bg-violet-600',
          text: 'text-violet-600',
          border: 'border-violet-200',
          pillBg: 'bg-violet-50 text-violet-700 border-violet-200',
        };
      case 'ORDER_CLOSED':
        return {
          icon: Lock,
          bg: 'bg-slate-700',
          text: 'text-slate-800',
          border: 'border-slate-300',
          pillBg: 'bg-slate-100 text-slate-800 border-slate-300',
        };
      case 'ORDER_REJECTED':
      case 'ORDER_CANCELLED':
        return {
          icon: XCircle,
          bg: 'bg-rose-600',
          text: 'text-rose-600',
          border: 'border-rose-200',
          pillBg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          icon: Clock,
          bg: 'bg-slate-500',
          text: 'text-slate-600',
          border: 'border-slate-200',
          pillBg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* 1. Top Order Summary Card (Mobile-First) */}
      {!compactHeader && (
        <Card className="border border-slate-200/90 shadow-sm overflow-hidden bg-gradient-to-b from-white to-slate-50/50">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-base text-slate-900 tracking-tight">
                    {order.orderNumber}
                  </span>
                  <button
                    onClick={handleCopyOrderNumber}
                    title="Copy Order Number"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    {copiedOrderNo ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <OrderStatusBadge status={order.status} isSpecialApproval={order.isSpecialApproval} />
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">
                  Customer: <strong className="text-slate-900">{order.customerNameSnapshot}</strong> ({order.customerCodeSnapshot})
                </div>
              </div>

              <div className="flex items-center gap-4 self-start sm:self-auto">
                <div className="text-left sm:text-right">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">
                    Order Value
                  </span>
                  <span className="font-mono font-bold text-base text-primary">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
                <div className="text-left sm:text-right pl-3 sm:pl-0 border-l sm:border-l-0 border-slate-200">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">
                    Order Date
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Approval Owner Highlight Bar */}
            {isPendingApproval ? (
              <div className="mt-3.5 flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Currently Awaiting Approval Action
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      Approval Owner:{' '}
                      <span className="text-amber-800 underline decoration-amber-300 font-extrabold">
                        {approvalOwnerName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-full border border-amber-200/80">
                  Pending Supervisor Decision
                </div>
              </div>
            ) : (
              <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">
                    Approval Completed by {order.approvedByName || 'Authorized Manager'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-medium">
                  {order.approvedAt ? formatDateTime(order.approvedAt) : ''}
                </span>
              </div>
            )}

            {/* Document References Bar (Delivery Note & Invoice Quick Pills) */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {order.deliveryNoteNumber && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-[11px]">
                    <FileText className="h-3.5 w-3.5" />
                    Delivery Note: <strong className="font-mono">{order.deliveryNoteNumber}</strong>
                  </span>
                )}
                {order.invoiceNumber && (
                  <button
                    onClick={() => {
                      if (order.invoiceId) {
                        navigate(`/invoices/${order.invoiceId}`);
                      } else {
                        navigate('/invoices');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-semibold text-[11px] transition-colors"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Invoice: <strong className="font-mono">{order.invoiceNumber}</strong>
                    <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                  </button>
                )}
                {!order.deliveryNoteNumber && !order.invoiceNumber && (
                  <span className="text-[11px] text-slate-400 italic">
                    Fulfillment documents will appear here once generated.
                  </span>
                )}
              </div>

              {/* Workflow Actions */}
              <div className="flex items-center gap-1.5 ml-auto">
                {isSalesRep ? (
                  /* Sales Rep: Can ONLY send for approval when order is in DRAFT */
                  order.status === 'DRAFT' ? (
                    <Button
                      size="sm"
                      onClick={handleSendForApproval}
                      disabled={isSubmitting}
                      className="h-8 text-[11px] gap-1.5 bg-primary hover:bg-primary-hover text-white font-medium shadow-xs"
                      title="Submit this draft order for manager approval"
                    >
                      <Send className="h-3 w-3" />
                      {isSubmitting ? 'Sending...' : 'Send for Approval'}
                    </Button>
                  ) : null
                ) : (
                  /* Operations / Management / Warehouse: Full Workflow Simulator */
                  <>
                    {order.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        onClick={handleSendForApproval}
                        disabled={isSubmitting}
                        className="h-8 text-[11px] gap-1.5 bg-primary hover:bg-primary-hover text-white font-medium shadow-xs"
                      >
                        <Send className="h-3 w-3" />
                        {isSubmitting ? 'Sending...' : 'Send for Approval'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionModal('MODIFY_PRODUCTS')}
                      className="h-8 text-[11px] gap-1 border-amber-300 text-amber-800 hover:bg-amber-50"
                      title="Simulate Area Manager product/quantity modification"
                    >
                      <Sliders className="h-3 w-3 text-amber-600" />
                      Modify Qty
                    </Button>
                    {isPendingApproval && (
                      <Button
                        size="sm"
                        onClick={() => setActionModal('APPROVE')}
                        className="h-8 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve Order
                      </Button>
                    )}
                    {!isPendingApproval &&
                      order.status !== 'DRAFT' &&
                      !order.deliveryNoteNumber && (
                        <Button
                          size="sm"
                          onClick={() => setActionModal('DISPATCH')}
                          className="h-8 text-[11px] gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                          <Truck className="h-3 w-3" />
                          Dispatch Order
                        </Button>
                      )}
                    {order.deliveryNoteNumber && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActionModal('RETURN')}
                          className="h-8 text-[11px] gap-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          <RotateCcw className="h-3 w-3 text-rose-600" />
                          Record Return
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActionModal('REPLACEMENT')}
                          className="h-8 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <RefreshCw className="h-3 w-3 text-emerald-600" />
                          Dispatch Replacement
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Activities', count: fullTimeline.length },
            { id: 'APPROVALS', label: 'Approvals & Changes', count: fullTimeline.filter(e => ['SUBMITTED_FOR_APPROVAL', 'APPROVAL_ASSIGNED', 'APPROVAL_ESCALATED', 'PRODUCT_MODIFIED', 'ORDER_APPROVED', 'ORDER_REJECTED'].includes(e.type)).length },
            { id: 'DISPATCH', label: 'Fulfillment & Dispatch', count: fullTimeline.filter(e => ['STOCK_RESERVED', 'DELIVERY_NOTE_CREATED', 'DISPATCH_INITIATED', 'DISPATCH_UPDATED', 'DELIVERED'].includes(e.type)).length },
            { id: 'RETURNS', label: 'Returns & Replacements', count: fullTimeline.filter(e => ['PRODUCT_RETURNED', 'REPLACEMENT_DISPATCHED'].includes(e.type)).length },
            { id: 'INVOICES', label: 'Invoices', count: fullTimeline.filter(e => e.type === 'INVOICE_ISSUED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
                activeFilter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Search Box */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search timeline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-white"
          />
        </div>
      </div>

      {/* 3. Chronological Vertical Timeline Feed */}
      <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            No activities matching selected criteria.
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const visuals = getEventVisuals(evt.type);
            const Icon = visuals.icon;
            const isExpanded = !!expandedEvents[evt.id];
            const hasDetails =
              evt.productChanges ||
              evt.stockReservations ||
              evt.deliveryNote ||
              evt.dispatchDetails ||
              evt.returnDetails ||
              evt.replacementDetails ||
              evt.invoiceDetails;

            return (
              <div key={evt.id} className="relative mb-5 last:mb-0 group">
                {/* Node Milestone Circle */}
                <div
                  className={cn(
                    'absolute -left-6 sm:-left-8 top-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-white shadow-xs transition-transform group-hover:scale-110',
                    visuals.bg
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Event Card */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:border-slate-300 transition-all">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
                        {evt.title}
                      </span>
                      {evt.statusBadge && (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10.5px] font-semibold border',
                            visuals.pillBg
                          )}
                        >
                          {evt.statusBadge.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="font-mono">{formatDateTime(evt.timestamp)}</span>
                    </div>
                  </div>

                  {/* Actor Badge */}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <div className="flex items-center gap-1 font-medium text-slate-700">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>{evt.actorName}</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {evt.actorRole.replace('_', ' ')}
                    </span>
                    {evt.currentApproverName && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                        Approver: {evt.currentApproverName}
                      </span>
                    )}
                  </div>

                  {/* Event Description */}
                  {evt.description && (
                    <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                      {evt.description}
                    </p>
                  )}

                  {/* Embedded Detail Sections */}
                  {/* A. Product Modifications Diff Details */}
                  {evt.productChanges && (
                    <div className="mt-3 p-3 rounded-lg bg-orange-50/50 border border-orange-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-orange-900">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-orange-600" />
                          Product &amp; Quantity Changes
                        </span>
                        <span className="text-[10.5px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                          Pre-Approval Diff
                        </span>
                      </div>

                      {/* Items Modified */}
                      {evt.productChanges.modified && evt.productChanges.modified.length > 0 && (
                        <div className="space-y-1.5">
                          {evt.productChanges.modified.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-md bg-white border border-orange-200/60 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900">{m.productName}</span>
                                <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                  {m.sku}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 font-mono shrink-0">
                                <span className="line-through text-slate-400">{m.previousQuantity}</span>
                                <span className="text-slate-300">→</span>
                                <span className="font-bold text-slate-900">{m.newQuantity}</span>
                                <span
                                  className={cn(
                                    'px-1.5 py-0.2 rounded text-[10px] font-bold',
                                    m.delta > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  )}
                                >
                                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Items Added */}
                      {evt.productChanges.added && evt.productChanges.added.length > 0 && (
                        <div className="space-y-1.5">
                          {evt.productChanges.added.map((a, aIdx) => (
                            <div
                              key={aIdx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-md bg-emerald-50/60 border border-emerald-200 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <PlusCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-semibold text-emerald-900 truncate block">{a.productName}</span>
                                  <span className="text-[10px] text-emerald-600 font-mono">
                                    {a.sku}
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-emerald-800 font-mono shrink-0">
                                +{a.quantity} units
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Items Removed */}
                      {evt.productChanges.removed && evt.productChanges.removed.length > 0 && (
                        <div className="space-y-1.5">
                          {evt.productChanges.removed.map((r, rIdx) => (
                            <div
                              key={rIdx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-md bg-rose-50/60 border border-rose-200 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MinusCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-semibold text-rose-900 truncate block">{r.productName}</span>
                                  <span className="text-[10px] text-rose-600 font-mono">
                                    {r.sku}
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-rose-800 font-mono shrink-0">
                                Removed ({r.previousQuantity} units)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Customer Communication Reason */}
                      {evt.productChanges.reason && (
                        <div className="text-[11.5px] text-orange-900 bg-white p-2 rounded border border-orange-200/60">
                          <strong className="text-orange-950 font-semibold">Customer Contact Note:</strong>{' '}
                          {evt.productChanges.reason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* B. Stock Reservation Details */}
                  {evt.stockReservations && evt.stockReservations.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-teal-50/60 border border-teal-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                        <span className="flex items-center gap-1.5">
                          <Boxes className="h-3.5 w-3.5 text-teal-600" />
                          Warehouse Stock Reserved Automatically
                        </span>
                        <span className="text-[10.5px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                          {evt.stockReservations.length} Items Locked
                        </span>
                      </div>

                      <div className="divide-y divide-teal-100 bg-white rounded-md border border-teal-200/60 overflow-hidden">
                        {evt.stockReservations.map((st, sIdx) => (
                          <div key={sIdx} className="p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{st.productName}</div>
                              <div className="text-[10.5px] text-slate-400 font-mono">
                                SKU: {st.sku} • {st.warehouseName || 'Main Logistics Warehouse'}
                              </div>
                            </div>
                            <div className="text-left sm:text-right font-mono font-bold text-teal-800 shrink-0">
                              {st.reservedQuantity} PCS
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* C. Delivery Note Created Details */}
                  {evt.deliveryNote && (
                    <div className="mt-3 p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-indigo-900">
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          Delivery Note #{evt.deliveryNote.deliveryNoteNumber}
                        </span>
                        <span className="text-[10.5px] font-mono font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          Stock Keeper: {evt.deliveryNote.stockKeeperName}
                        </span>
                      </div>

                      <div className="bg-white rounded-md border border-indigo-200/60 p-2 space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500 mb-1">
                          Items Included for Dispatch:
                        </div>
                        {evt.deliveryNote.items.map((it, iIdx) => (
                          <div key={iIdx} className="flex flex-wrap justify-between gap-1 text-xs py-0.5">
                            <span className="text-slate-800">{it.productName}</span>
                            <span className="font-mono font-bold text-indigo-800">{it.quantity} PCS</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* D. Dispatch Details */}
                  {evt.dispatchDetails && (
                    <div className="mt-3 p-3 rounded-lg bg-cyan-50/60 border border-cyan-200/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-cyan-900">
                        <span className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                          Dispatch Details ({evt.dispatchDetails.dispatchNumber})
                        </span>
                        <span className="text-[10.5px] font-semibold text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded">
                          Vehicle Dispatched
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-md border border-cyan-200/60">
                        <div>
                          <span className="text-slate-400 text-[10.5px] block">Vehicle</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {evt.dispatchDetails.vehicleNumber || 'Direct Logistics Van'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10.5px] block">Driver / Carrier</span>
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <span>{evt.dispatchDetails.driverName || 'Designated Driver'}</span>
                            {evt.dispatchDetails.driverPhone && (
                              <a
                                href={`tel:${evt.dispatchDetails.driverPhone}`}
                                className="text-cyan-600 hover:text-cyan-800 inline-flex items-center ml-1"
                                title="Call Driver"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        {evt.dispatchDetails.notes && (
                          <div className="col-span-full pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                            <strong>Dispatch Notes:</strong> {evt.dispatchDetails.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* E. Customer Return / Refusal Details */}
                  {evt.returnDetails && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-50/70 border border-rose-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          Customer Refusal &amp; Return Record
                        </span>
                        <span className="text-[10.5px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                          Quantity: {evt.returnDetails.returnedQuantity} PCS
                        </span>
                      </div>

                      <div className="bg-white rounded-md border border-rose-200/80 p-2.5 text-xs space-y-1">
                        <div className="flex flex-wrap justify-between gap-1 font-semibold text-slate-900">
                          <span>{evt.returnDetails.productName}</span>
                          <span className="font-mono text-rose-700">
                            Refused: {evt.returnDetails.returnedQuantity} PCS
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SKU: {evt.returnDetails.sku}
                        </div>
                        <div className="mt-1 pt-1 border-t border-slate-100 text-rose-900 text-[11.5px]">
                          <strong>Customer Reason:</strong> "{evt.returnDetails.reason}"
                        </div>
                        <div className="text-[10.5px] text-slate-400 mt-1">
                          Recorded by {evt.returnDetails.recordedByName} ({evt.returnDetails.recordedByRole}) on{' '}
                          {formatDateTime(evt.returnDetails.recordedAt)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* F. Replacement Dispatch Details */}
                  {evt.replacementDetails && (
                    <div className="mt-3 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                          Replacement Dispatched ({evt.replacementDetails.replacementDeliveryNoteNumber})
                        </span>
                        <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Quantity: {evt.replacementDetails.quantity} PCS
                        </span>
                      </div>

                      <div className="bg-white rounded-md border border-emerald-200/80 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span>{evt.replacementDetails.productName}</span>
                          <span className="font-mono text-emerald-700">
                            Replacement: {evt.replacementDetails.quantity} PCS
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Replacement DN: {evt.replacementDetails.replacementDeliveryNoteNumber} • Stock Keeper:{' '}
                          {evt.replacementDetails.stockKeeperName}
                        </div>
                        {evt.replacementDetails.notes && (
                          <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                            <strong>Dispatch Notes:</strong> {evt.replacementDetails.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* G. Invoice Details */}
                  {evt.invoiceDetails && (
                    <div className="mt-3 p-3 rounded-lg bg-violet-50/70 border border-violet-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-violet-900">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="h-3.5 w-3.5 text-violet-600" />
                          Commercial Tax Invoice #{evt.invoiceDetails.invoiceNumber}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (evt.invoiceDetails?.invoiceId) {
                              navigate(`/invoices/${evt.invoiceDetails.invoiceId}`);
                            } else {
                              navigate('/invoices');
                            }
                          }}
                          className="h-7 text-[11px] border-violet-300 text-violet-800 hover:bg-violet-100 gap-1"
                        >
                          View Invoice
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-md bg-white border border-violet-200/60 text-xs">
                        <div>
                          <div className="text-slate-500 text-[10.5px]">Invoice Amount</div>
                          <div className="font-mono font-bold text-slate-900">
                            {formatCurrency(evt.invoiceDetails.totalAmount)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500 text-[10.5px]">Issued By</div>
                          <div className="font-semibold text-slate-800">
                            {evt.invoiceDetails.issuedByName}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comment / Note callout */}
                  {evt.comment && !evt.productChanges && !evt.returnDetails && (
                    <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                      "{evt.comment}"
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Action Modals for Workflow Simulation */}
      {/* A. Product & Quantity Modification Modal */}
      {actionModal === 'MODIFY_PRODUCTS' && (
        <Dialog open={true} onOpenChange={() => setActionModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Sliders className="h-5 w-5 text-amber-600" />
                Modify Products Before Approval
              </DialogTitle>
              <DialogDescription>
                Area Manager / Sales Manager customer contact &amp; order adjustment workflow.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11.5px]">
                <strong>Workflow Rule:</strong> Before approving, Area Managers may contact the customer and
                adjust quantities or add products. All before/after differences will be preserved in the activity log.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adjust Quantity on Line 1 ({order.items[0]?.productNameSnapshot})
                </label>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500">
                    Current: {order.items[0]?.orderedQuantity} units
                  </span>
                  <span className="text-slate-300">→</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModQtyChange((q) => q - 1)}
                      className="h-8 w-8 p-0"
                    >
                      -
                    </Button>
                    <span className="font-mono font-bold text-sm w-8 text-center">
                      {order.items[0]?.orderedQuantity + modQtyChange}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModQtyChange((q) => q + 1)}
                      className="h-8 w-8 p-0"
                    >
                      +
                    </Button>
                  </div>
                  <span className="font-semibold text-emerald-700 font-mono">
                    ({modQtyChange > 0 ? `+${modQtyChange}` : modQtyChange} units)
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Contact &amp; Modification Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={modCustomerNote}
                  onChange={(e) => setModCustomerNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="Record customer discussion details..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleProductModifySubmit}
                disabled={isSubmitting || !modCustomerNote.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSubmitting ? 'Saving...' : 'Record Changes & Log'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* B. Order Approval Modal */}
      {actionModal === 'APPROVE' && (
        <Dialog open={true} onOpenChange={() => setActionModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Approve Order &amp; Auto-Reserve Stock
              </DialogTitle>
              <DialogDescription>
                Authorizing order {order.orderNumber}. Stock will be committed immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-[11.5px]">
                Upon approval, system will automatically append a <strong>Stock Reserved</strong> event with
                all line item quantities locked from Central Logistics Warehouse.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Approval Notes
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApproveSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? 'Approving...' : 'Confirm Approval & Reserve Stock'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* C. Dispatch Modal */}
      {actionModal === 'DISPATCH' && !isSalesRep && (
        <Dialog open={true} onOpenChange={() => setActionModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Truck className="h-5 w-5 text-cyan-600" />
                Generate Delivery Note &amp; Dispatch
              </DialogTitle>
              <DialogDescription>
                Stock Keeper fulfillment and Delivery Note creation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Note #</label>
                <Input
                  value={dispatchDeliveryNote}
                  onChange={(e) => setDispatchDeliveryNote(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle #</label>
                  <Input
                    value={dispatchVehicle}
                    onChange={(e) => setDispatchVehicle(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Name</label>
                  <Input
                    value={dispatchDriver}
                    onChange={(e) => setDispatchDriver(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Driver Contact #</label>
                <Input
                  value={dispatchDriverPhone}
                  onChange={(e) => setDispatchDriverPhone(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDispatchSubmit}
                disabled={isSubmitting || !dispatchDeliveryNote.trim()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isSubmitting ? 'Generating...' : 'Dispatch Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* D. Product Return / Refusal Modal */}
      {actionModal === 'RETURN' && (
        <Dialog open={true} onOpenChange={() => setActionModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <RotateCcw className="h-5 w-5 text-rose-600" />
                Record Customer Return / Refusal
              </DialogTitle>
              <DialogDescription>
                Record customer delivery rejection without overwriting original order history.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-900 text-[11.5px]">
                Product: <strong>{order.items[0]?.productNameSnapshot}</strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Refused Quantity</label>
                <Input
                  type="number"
                  min={1}
                  max={order.items[0]?.orderedQuantity || 1}
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Return / Refusal <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Outer packaging dented in transit..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReturnSubmit}
                disabled={isSubmitting || !returnReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmitting ? 'Recording...' : 'Log Return Event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* E. Replacement Dispatch Modal */}
      {actionModal === 'REPLACEMENT' && (
        <Dialog open={true} onOpenChange={() => setActionModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <RefreshCw className="h-5 w-5 text-emerald-600" />
                Dispatch Replacement Quantity
              </DialogTitle>
              <DialogDescription>
                Stock Keeper generates a replacement Delivery Note.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Replacement Delivery Note #
                </label>
                <Input
                  value={replacementDN}
                  onChange={(e) => setReplacementDN(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-[11.5px]">
                Product: <strong>{order.items[0]?.productNameSnapshot}</strong> (Quantity: {returnQty || 1} PCS)
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReplacementSubmit}
                disabled={isSubmitting || !replacementDN.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? 'Dispatching...' : 'Confirm Replacement Dispatch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
