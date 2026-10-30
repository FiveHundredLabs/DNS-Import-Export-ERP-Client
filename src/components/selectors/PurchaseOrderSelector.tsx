import React, { useState, useEffect, useRef, useMemo } from 'react';
import { purchaseOrderService } from '../../services/PurchaseOrderService';
import { PurchaseOrder } from '../../types/purchasing';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { Search, ShoppingCart, Check, ChevronDown, X, Building2, Calendar } from 'lucide-react';
import { Badge } from '../ui/badge';

export interface PurchaseOrderSelectorProps {
  onSelect: (po: PurchaseOrder) => void;
  selectedPoNumber?: string;
  supplierId?: string;
  placeholder?: string;
  className?: string;
  statusFilter?: string[];
}

export function PurchaseOrderSelector({
  onSelect,
  selectedPoNumber,
  supplierId,
  placeholder = 'Select Purchase Order...',
  className,
  statusFilter,
}: PurchaseOrderSelectorProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        const all = await purchaseOrderService.getAll();
        setOrders(all);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPO = useMemo(() => {
    return orders.find((o) => o.poNumber === selectedPoNumber || o.id === selectedPoNumber);
  }, [orders, selectedPoNumber]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (supplierId && o.supplierId !== supplierId) {
        return false;
      }
      if (statusFilter && statusFilter.length > 0 && !statusFilter.includes(o.status)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.poNumber.toLowerCase().includes(q) ||
        o.supplierName.toLowerCase().includes(q) ||
        (o.supplierCode && o.supplierCode.toLowerCase().includes(q))
      );
    });
  }, [orders, supplierId, statusFilter, searchQuery]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs transition-all shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20',
          isOpen && 'border-primary ring-2 ring-primary/20'
        )}
      >
        {selectedPO ? (
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold text-slate-900">{selectedPO.poNumber}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 truncate">{selectedPO.supplierName}</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono font-semibold text-primary">{formatCurrency(selectedPO.grandTotal, selectedPO.currency)}</span>
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95">
          <div className="p-2 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PO #, supplier name, code..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading purchase orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No purchase orders found.
              </div>
            ) : (
              filteredOrders.map((po) => {
                const isSelected = selectedPO?.id === po.id;
                return (
                  <button
                    key={po.id}
                    type="button"
                    onClick={() => {
                      onSelect(po);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between p-2.5 text-left text-xs transition-colors hover:bg-slate-50 cursor-pointer',
                      isSelected && 'bg-primary-light/40 text-primary-text'
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{po.poNumber}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold py-0 px-1.5',
                            po.status === 'APPROVED' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                            po.status === 'SENT_TO_SUPPLIER' && 'border-blue-200 bg-blue-50 text-blue-800',
                            po.status === 'DRAFT' && 'border-slate-200 bg-slate-100 text-slate-700',
                            po.status === 'PENDING_APPROVAL' && 'border-amber-200 bg-amber-50 text-amber-800'
                          )}
                        >
                          {po.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                        {po.supplierName} ({po.supplierCode})
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>Date: {formatDate(po.orderDate)}</span>
                        <span>•</span>
                        <span>{po.items.length} item(s)</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-slate-900">
                        {formatCurrency(po.grandTotal, po.currency)}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary ml-auto mt-1" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
