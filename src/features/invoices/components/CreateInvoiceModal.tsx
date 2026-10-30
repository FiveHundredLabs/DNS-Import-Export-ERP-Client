import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useOrders } from '../../../hooks/useOrders';
import { invoiceService } from '../../../services/InvoiceService';
import { SalesOrder, OrderStatus } from '../../../types/order';
import {
  Dialog,
  DialogContent,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { toast } from 'sonner';
import {
  Receipt,
  Search,
  X,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedOrderId?: string;
}

// Status chip configuration
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  APPROVED:           { label: 'Approved',           className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  DELIVERED:          { label: 'Delivered',           className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  PARTIALLY_INVOICED: { label: 'Partial Invoice',     className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  PARTIALLY_ISSUED:   { label: 'Partially Issued',    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  PICKING:            { label: 'Picking',             className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  ISSUED:             { label: 'Issued',              className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  DISPATCHED:         { label: 'Dispatched',          className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  DEFAULT:            { label: 'Active',              className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
};

function StatusChip({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DEFAULT;
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap', cfg.className)}>
      {cfg.label}
    </span>
  );
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  preselectedOrderId,
}: CreateInvoiceModalProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { orders, loading: ordersLoading, refreshOrders } = useOrders();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(preselectedOrderId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvedStatuses: OrderStatus[] = [
    'APPROVED', 'PICKING', 'PARTIALLY_ISSUED',
    'ISSUED', 'DISPATCHED', 'DELIVERED', 'PARTIALLY_INVOICED',
  ];

  const eligibleOrders = useMemo(() => {
    return orders.filter((order) => {
      if (order.status === 'CLOSED' || order.status === 'CANCELLED') return false;
      if (!approvedStatuses.includes(order.status)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = order.orderNumber.toLowerCase().includes(q);
        const name = (order.customerName || order.customerNameSnapshot || '').toLowerCase().includes(q);
        const code = (order.customerCode || order.customerCodeSnapshot || '').toLowerCase().includes(q);
        return num || name || code;
      }
      return true;
    });
  }, [orders, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedOrderId) {
        setSelectedOrderId(preselectedOrderId);
      } else if (!selectedOrderId && eligibleOrders.length > 0) {
        setSelectedOrderId(eligibleOrders[0].id);
      }
    }
  }, [isOpen, preselectedOrderId, eligibleOrders]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const handleGenerateInvoice = async () => {
    if (!selectedOrderId || !selectedOrder) {
      toast.error('Please select a sales order.');
      return;
    }
    if (!currentUser) {
      toast.error('You must be logged in.');
      return;
    }
    try {
      setIsSubmitting(true);
      const invoice = await invoiceService.createInvoiceFromOrder(
        selectedOrderId,
        currentUser,
        { asDraft: false }
      );
      toast.success(`Invoice ${invoice.invoiceNumber} generated — ${formatCurrency(invoice.totalAmount)}`);
      if (refreshOrders) refreshOrders();
      onClose();
      navigate(`/invoices/${invoice.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-w-lg w-full rounded-2xl border-0 shadow-2xl flex flex-col max-h-[85vh]">

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Generate Commercial Invoice
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Choose a sales order to invoice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── SEARCH ─────────────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number or customer…"
              className="w-full h-9 pl-8.5 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── COUNT LABEL ───────────────────────────────────────────── */}
        <div className="px-5 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Sales Orders
          </span>
          {!ordersLoading && (
            <span className="text-[11px] text-slate-400">
              {eligibleOrders.length} {eligibleOrders.length === 1 ? 'order' : 'orders'}
            </span>
          )}
        </div>

        {/* ── ORDER LIST ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {ordersLoading ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading orders…</span>
            </div>
          ) : eligibleOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-xs font-semibold text-slate-600">
                {searchQuery ? 'No orders match your search' : 'No eligible orders'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-[220px]">
                {searchQuery
                  ? 'Try a different keyword or clear the search.'
                  : 'Only approved orders that are not closed or cancelled can be invoiced.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {eligibleOrders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                const customerName = order.customerName || order.customerNameSnapshot || '—';
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/80'
                    )}
                  >
                    {/* Row: Order # + Status + Amount */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Selection indicator */}
                        <span
                          className={cn(
                            'inline-block h-2 w-2 rounded-full shrink-0 transition-colors',
                            isSelected ? 'bg-primary' : 'bg-slate-200'
                          )}
                        />
                        <span className="font-mono text-[11px] font-bold text-slate-800 truncate">
                          {order.orderNumber}
                        </span>
                        <StatusChip status={order.status} />
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-900 shrink-0">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>

                    {/* Row: Customer + Date */}
                    <div className="flex items-center justify-between gap-2 pl-4">
                      <span className="text-[11px] text-slate-500 truncate">
                        {customerName}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          {/* Selected order mini-summary */}
          <div className="min-w-0 flex-1">
            {selectedOrder ? (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">
                  Selected
                </p>
                <p className="text-xs font-bold text-slate-800 truncate font-mono">
                  {selectedOrder.orderNumber}
                  <span className="font-normal text-slate-500 font-sans ml-1.5">
                    — {selectedOrder.customerName || selectedOrder.customerNameSnapshot}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No order selected</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-8 px-3 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateInvoice}
              disabled={isSubmitting || !selectedOrderId}
              className="text-xs h-8 px-4 rounded-lg font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Receipt className="h-3.5 w-3.5" />
                  Generate Invoice
                </>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
