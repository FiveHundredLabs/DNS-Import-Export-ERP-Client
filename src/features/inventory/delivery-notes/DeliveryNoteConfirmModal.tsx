import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Invoice } from '../../../types/invoice';
import {
  Lock,
  AlertTriangle,
  Truck,
  Building,
  Barcode,
  CheckCircle2,
  Calendar,
  FileText,
  ShieldAlert,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';

export interface DeliveryNoteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
  invoice: Invoice;
  logistics: {
    driverName: string;
    driverPhone?: string;
    vehicleNumber: string;
    dispatchDate: string;
    deliveryRoute?: string;
    notes?: string;
  };
  allocatedBarcodes: Record<string, string[]>;
  totalScannedUnits: number;
}

export const DeliveryNoteConfirmModal: React.FC<DeliveryNoteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  submitting,
  invoice,
  logistics,
  allocatedBarcodes,
  totalScannedUnits,
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Reset confirmation checkbox whenever the dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()} size="2xl" maxWidth="max-w-3xl">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-300">
              <Truck className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Confirm Delivery Note Creation</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px] gap-1">
                  <Lock className="h-3 w-3" />
                  Permanent Lock
                </Badge>
              </h2>
              <p className="text-xs text-slate-500">
                Double-check physical dispatch logistics, customer details, and unit barcodes before final submission.
              </p>
            </div>
          </div>
        </div>

        {/* Permanent Non-Editable Warning Banner */}
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>CRITICAL: Once created, this Delivery Note cannot be edited</span>
          </div>
          <p className="text-xs text-amber-900/90 leading-relaxed pl-6">
            To guarantee physical inventory audit integrity and prevent discrepancies in warehouse records,
            <strong> Delivery Notes become permanently non-editable immediately upon creation</strong>. No modifications to
            driver details, vehicle number, customer info, or assigned physical unit barcodes will be permitted.
          </p>
        </div>

        {/* Verification Grid: Transport & Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transport & Driver Details */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
              <span className="font-bold text-slate-800 uppercase text-[10.5px] flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                Transport Logistics
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                Date: {logistics.dispatchDate}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Driver Name</span>
                <span className="font-bold text-slate-900">{logistics.driverName}</span>
                {logistics.driverPhone && (
                  <span className="text-slate-500 text-[11px] block">{logistics.driverPhone}</span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vehicle / Lorry No</span>
                <span className="font-mono font-bold text-slate-900 uppercase">{logistics.vehicleNumber}</span>
              </div>
            </div>
            {logistics.deliveryRoute && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Route / Area</span>
                <span className="text-slate-700 font-medium">{logistics.deliveryRoute}</span>
              </div>
            )}
            {logistics.notes && (
              <div className="p-2 rounded bg-white border border-slate-200 text-slate-700 italic text-[11px]">
                "{logistics.notes}"
              </div>
            )}
          </div>

          {/* Consignee & Invoice Details */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
              <span className="font-bold text-slate-800 uppercase text-[10.5px] flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-primary" />
                Consignee & Order
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {invoice.customerCode}
              </Badge>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer Name</span>
              <span className="font-bold text-slate-900">{invoice.customerName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Invoice Reference</span>
                <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Order Reference</span>
                <span className="font-mono text-slate-700">{invoice.orderNumber || 'Direct Order'}</span>
              </div>
            </div>
            {invoice.customerAddress && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Destination Address</span>
                <span className="text-slate-600 line-clamp-1">{invoice.customerAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Allocated Items & Unit Barcodes Summary */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase text-[10.5px] flex items-center gap-1.5">
              <Barcode className="h-3.5 w-3.5 text-primary" />
              Verified Goods & Allocated Unit Barcodes
            </span>
            <span className="text-slate-600 font-semibold">
              Total Units: <strong className="text-primary font-bold">{totalScannedUnits} Units</strong>
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto p-2 space-y-2">
            {invoice.items.map((item) => {
              const barcodes = allocatedBarcodes[item.productId] || [];
              return (
                <div key={item.id || item.productId} className="p-2 bg-white rounded-lg border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between font-medium">
                    <span className="font-bold text-slate-900 truncate max-w-sm" title={item.productNameSnapshot}>
                      {item.productNameSnapshot}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-600">
                      {barcodes.length} / {item.quantity} {item.uomSnapshot || 'PCS'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {barcodes.map((bc, bIdx) => (
                      <span
                        key={bIdx}
                        className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                      >
                        {bc}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Double-Confirmation Acknowledgment Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 cursor-pointer select-none hover:bg-amber-50 transition-colors">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer shrink-0"
            aria-label="I have physically verified all cargo, driver details, and unit barcodes. I understand this Delivery Note is permanently non-editable upon creation."
          />
          <div className="space-y-0.5 text-xs text-slate-800">
            <span className="font-bold text-slate-900 block">
              I have physically verified all cargo, driver details, and unit barcodes.
            </span>
            <p className="text-[11px] text-slate-600">
              I acknowledge that this Delivery Note cannot be edited, deleted, or altered after creation.
            </p>
          </div>
        </label>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs text-slate-600 hover:text-slate-900 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go Back &amp; Edit Details
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={!isConfirmed || submitting}
            className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs px-4"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Finalizing Delivery Note...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Confirm &amp; Finalize Delivery Note
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

