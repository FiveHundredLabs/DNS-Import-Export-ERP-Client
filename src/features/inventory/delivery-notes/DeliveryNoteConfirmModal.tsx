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
  order?: {
    orderNumber: string;
    customerName: string;
    customerCode: string;
    deliveryAddress?: string;
    requestedDeliveryDate?: string;
  };
  invoice?: Invoice;
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
  order,
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

  const customerName = order?.customerName || invoice?.customerName || 'General Customer';
  const customerCode = order?.customerCode || invoice?.customerCode || 'GEN-001';
  const orderNumber = order?.orderNumber || invoice?.orderNumber || 'Direct Order';
  const invoiceNumber = invoice?.invoiceNumber || 'To Be Billed Post-Delivery';

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
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Route / Destination</span>
                <span className="text-slate-700 font-medium">{logistics.deliveryRoute}</span>
              </div>
            )}
            {logistics.notes && (
              <div className="p-2 rounded bg-white border border-slate-200 text-slate-700 italic text-[11px]">
                "{logistics.notes}"
              </div>
            )}
          </div>

          {/* Consignee & Order Details */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
              <span className="font-bold text-slate-800 uppercase text-[10.5px] flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-primary" />
                Consignee & Order Reference
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {customerCode}
              </Badge>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer Name</span>
              <span className="font-bold text-slate-900">{customerName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sales Order Ref</span>
                <span className="font-mono font-bold text-primary">{orderNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Invoice Ref</span>
                <span className="font-mono text-slate-600 text-[11px]">{invoiceNumber}</span>
              </div>
            </div>
            {order?.deliveryAddress && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Drop-Off Address</span>
                <span className="text-slate-700 font-medium">{order.deliveryAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Physical Unit Barcodes Allocation Summary */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Barcode className="h-4 w-4 text-primary" />
              Verified Goods & Allocated Unit Barcodes
            </span>
            <span className="text-xs font-bold text-primary">
              {totalScannedUnits} Units Ready for Dispatch
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {Object.entries(allocatedBarcodes).map(([productId, barcodes]) => (
              <div
                key={productId}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
              >
                <div className="truncate max-w-[60%]">
                  <span className="font-semibold text-slate-800 font-mono text-[11px]">
                    Product ID: {productId.slice(0, 8)}...
                  </span>
                  <span className="text-slate-400 text-[10px] ml-2">
                    ({barcodes.length} units scanned)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-w-[40%] justify-end">
                  {barcodes.slice(0, 2).map((bc, idx) => (
                    <span key={idx} className="font-mono text-[9.5px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded">
                      {bc}
                    </span>
                  ))}
                  {barcodes.length > 2 && (
                    <span className="font-mono text-[9.5px] bg-slate-200 text-slate-800 px-1 py-0.5 rounded">
                      +{barcodes.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mandatory Explicit Confirmation Checkbox */}
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900 block">
                I confirm that all physical barcodes and transport details have been physically verified.
              </span>
              <span className="text-[11px] text-slate-500">
                CRITICAL: Once created, this Delivery Note cannot be edited. I understand this record will be permanently saved to the warehouse ledger and cannot be altered or deleted.
              </span>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Edit
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={!isConfirmed || submitting}
            className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing Delivery Note...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirm & Finalize Delivery Note
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
