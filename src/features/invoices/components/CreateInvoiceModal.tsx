import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useOrders } from '../../../hooks/useOrders';
import { invoiceService } from '../../../services/InvoiceService';
import { SalesOrder } from '../../../types/order';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { toast } from 'sonner';
import {
  FileText,
  Search,
  Plus,
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateInvoiceModal({ isOpen, onClose }: CreateInvoiceModalProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { orders, loading: ordersLoading } = useOrders();

  const [activeTab, setActiveTab] = useState<'EXISTING_ORDER' | 'NEW_ORDER'>('EXISTING_ORDER');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNAPPROVED' | 'APPROVED'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter eligible orders: not yet invoiced
  const eligibleOrders = useMemo(() => {
    return orders.filter((order) => {
      // Exclude already invoiced or cancelled orders
      if (order.status === 'INVOICED' || order.status === 'CANCELLED') {
        return false;
      }

      // Filter by status group
      const isUnapproved = [
        'DRAFT',
        'SUBMITTED',
        'PENDING_APPROVAL',
        'SPECIAL_APPROVAL',
      ].includes(order.status);

      if (statusFilter === 'UNAPPROVED' && !isUnapproved) return false;
      if (statusFilter === 'APPROVED' && isUnapproved) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer =
          order.customerName.toLowerCase().includes(q) ||
          order.customerCode.toLowerCase().includes(q);
        return matchesNumber || matchesCustomer;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  // Handle generating draft invoice from chosen order
  const handleGenerateInvoice = async () => {
    if (!selectedOrderId) {
      toast.error('Please select a Sales Order first.');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in to create an invoice.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedOrder = orders.find((o) => o.id === selectedOrderId);
      const invoice = await invoiceService.createInvoiceFromOrder(
        selectedOrderId,
        currentUser,
        { asDraft: true, allowUnapproved: true }
      );

      toast.success(
        `Draft Invoice ${invoice.invoiceNumber} created from Order ${selectedOrder?.orderNumber || ''}`
      );
      onClose();
      // Directly go to draft edit view
      navigate(`/invoices/${invoice.id}/edit`);
    } catch (err: any) {
      console.error('Failed to create draft invoice:', err);
      toast.error(err.message || 'Failed to create invoice from order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewSalesOrder = () => {
    onClose();
    navigate('/orders/new?createInvoice=true');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} size="xl">
      <DialogContent className="p-0 overflow-hidden max-w-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Create Commercial Sales Invoice
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Generate an editable draft sales invoice from an existing sales order, or initialize a new order.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl mt-4 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('EXISTING_ORDER')}
              className={cn(
                'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'EXISTING_ORDER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <ShoppingCart className="h-3.5 w-3.5 text-primary" />
              <span>Select Existing Sales Order</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('NEW_ORDER')}
              className={cn(
                'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                activeTab === 'NEW_ORDER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              <span>Create Entirely New Sales Order</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Existing Order Selection */}
        {activeTab === 'EXISTING_ORDER' && (
          <div className="p-5 space-y-3.5">
            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search order #, customer name, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8.5 rounded-lg w-full"
                />
              </div>

              <div className="flex items-center gap-1 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  All ({orders.filter((o) => o.status !== 'INVOICED' && o.status !== 'CANCELLED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('UNAPPROVED')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === 'UNAPPROVED'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  )}
                >
                  Pending / Unapproved
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('APPROVED')}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === 'APPROVED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  )}
                >
                  Approved
                </button>
              </div>
            </div>

            {/* Orders Selection Grid / List */}
            <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/40">
              {ordersLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading open sales orders...</div>
              ) : eligibleOrders.length === 0 ? (
                <div className="py-10 text-center space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">No eligible sales orders found</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    All existing orders might be invoiced or don't match the current filters. You can create a new sales order below.
                  </p>
                </div>
              ) : (
                eligibleOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  const isPending = [
                    'DRAFT',
                    'SUBMITTED',
                    'PENDING_APPROVAL',
                    'SPECIAL_APPROVAL',
                  ].includes(order.status);

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={cn(
                        'p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Radio indicator */}
                        <div
                          className={cn(
                            'h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all',
                            isSelected
                              ? 'border-primary bg-primary text-white'
                              : 'border-slate-300 bg-white'
                          )}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900">
                              {order.orderNumber}
                            </span>
                            {isPending ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-mono text-[10px] px-1.5 py-0">
                                {order.status === 'PENDING_APPROVAL'
                                  ? 'Pending Approval'
                                  : order.status === 'SPECIAL_APPROVAL'
                                  ? 'Special Approval'
                                  : 'Draft / Unapproved'}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[10px] px-1.5 py-0">
                                {order.status}
                              </Badge>
                            )}
                            <span className="text-[10.5px] text-slate-400">
                              {formatDate(order.orderDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600 mt-1 truncate">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">
                              {order.customerName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({order.customerCode})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Order Total
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {order.items?.length || 0} product lines
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Unapproved Orders Allowed in Draft Mode</p>
                <p className="text-[11px] text-amber-700/90 mt-0.5">
                  Generating an invoice from a not-yet-approved sales order creates an editable Draft Invoice. You will be able to revise product lines, adjust quantities, and change discounts before issuing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: New Order Creation */}
        {activeTab === 'NEW_ORDER' && (
          <div className="p-6 space-y-4">
            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">
                    Create New Sales Order &amp; Auto-Convert to Draft Invoice
                  </h4>
                  <p className="text-xs text-emerald-800/90 mt-0.5">
                    Launch the enterprise Sales Order builder. Configure customer details, delivery location, items, and batch pricing.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-emerald-100 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Configurable discounts, quantities, and customer loyalty credit rules.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Automatically generates an editable Draft Invoice upon saving.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>No waiting for multi-tier manager approvals to preview financial drafts.</span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCreateNewSalesOrder}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer rounded-xl"
            >
              <span>Launch Sales Order Builder &amp; Invoice Flow</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Footer */}
        {activeTab === 'EXISTING_ORDER' && (
          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {selectedOrderId
                ? `Selected: ${orders.find((o) => o.id === selectedOrderId)?.orderNumber}`
                : 'Select an order to proceed'}
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!selectedOrderId || isSubmitting}
                onClick={handleGenerateInvoice}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'Generating...' : 'Generate Draft Invoice'}</span>
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
