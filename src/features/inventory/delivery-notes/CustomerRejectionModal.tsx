import React, { useState } from 'react';
import { DeliveryNote, RejectionReasonCode, SubmitRejectionPayload } from '../../../types/deliveryNote';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  X,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  ArrowRight,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerRejectionModalProps {
  note: DeliveryNote;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SubmitRejectionPayload) => Promise<void>;
}

export const CustomerRejectionModal: React.FC<CustomerRejectionModalProps> = ({
  note,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    note.items[0]?.productId || ''
  );
  const [scanInput, setScanInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [overallNotes, setOverallNotes] = useState('');

  // Item rejection state: map of productId -> { rejectedBarcodes: string[], reason: string, notes: string }
  const [rejectionsByProduct, setRejectionsByProduct] = useState<
    Record<
      string,
      {
        rejectedBarcodes: string[];
        reason: RejectionReasonCode;
        notes: string;
      }
    >
  >(() => {
    const initial: Record<string, any> = {};
    note.items.forEach((item) => {
      initial[item.productId] = {
        rejectedBarcodes: [...item.rejectedUnitBarcodes],
        reason: (item.rejectionReason as RejectionReasonCode) || 'DAMAGED_IN_TRANSIT',
        notes: item.rejectionNotes || '',
      };
    });
    return initial;
  });

  if (!isOpen) return null;

  const currentItem = note.items.find((i) => i.productId === selectedProductId) || note.items[0];
  const currentRejection = rejectionsByProduct[selectedProductId] || {
    rejectedBarcodes: [],
    reason: 'DAMAGED_IN_TRANSIT',
    notes: '',
  };

  const handleScanBarcode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const barcode = scanInput.trim();
    if (!barcode) return;

    // Check if barcode belongs to this delivery note
    const matchedItem = note.items.find((item) => item.unitBarcodes.includes(barcode));
    if (!matchedItem) {
      toast.error(`Barcode "${barcode}" does not belong to this Delivery Note!`);
      return;
    }

    // Switch to matched product if different
    if (matchedItem.productId !== selectedProductId) {
      setSelectedProductId(matchedItem.productId);
    }

    const itemState = rejectionsByProduct[matchedItem.productId] || {
      rejectedBarcodes: [],
      reason: 'DAMAGED_IN_TRANSIT',
      notes: '',
    };

    if (itemState.rejectedBarcodes.includes(barcode)) {
      toast.info(`Barcode "${barcode}" is already in the rejection list.`);
      setScanInput('');
      return;
    }

    setRejectionsByProduct((prev) => ({
      ...prev,
      [matchedItem.productId]: {
        ...itemState,
        rejectedBarcodes: [...itemState.rejectedBarcodes, barcode],
      },
    }));

    toast.warning(`Marked unit "${barcode}" as rejected (${matchedItem.productName})`);
    setScanInput('');
  };

  const toggleBarcodeRejection = (productId: string, barcode: string) => {
    const itemState = rejectionsByProduct[productId] || {
      rejectedBarcodes: [],
      reason: 'DAMAGED_IN_TRANSIT',
      notes: '',
    };

    const isAlreadyRejected = itemState.rejectedBarcodes.includes(barcode);
    const updatedBarcodes = isAlreadyRejected
      ? itemState.rejectedBarcodes.filter((b) => b !== barcode)
      : [...itemState.rejectedBarcodes, barcode];

    setRejectionsByProduct((prev) => ({
      ...prev,
      [productId]: {
        ...itemState,
        rejectedBarcodes: updatedBarcodes,
      },
    }));
  };

  const handleReasonChange = (productId: string, reason: RejectionReasonCode) => {
    setRejectionsByProduct((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        reason,
      },
    }));
  };

  const handleItemNotesChange = (productId: string, notes: string) => {
    setRejectionsByProduct((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        notes,
      },
    }));
  };

  // Compute live counts across all items
  const totalDispatched = note.totalDispatchedUnits;
  const totalRejected = Object.values(rejectionsByProduct).reduce(
    (sum, val) => sum + val.rejectedBarcodes.length,
    0
  );
  const totalAccepted = Math.max(0, totalDispatched - totalRejected);

  const handleSubmitRejection = async () => {
    if (totalRejected === 0) {
      toast.error('Please scan or mark at least one rejected unit barcode.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: SubmitRejectionPayload = {
        deliveryNoteId: note.id,
        rejectedItems: Object.entries(rejectionsByProduct)
          .filter(([_, data]) => data.rejectedBarcodes.length > 0)
          .map(([productId, data]) => ({
            productId,
            rejectedBarcodes: data.rejectedBarcodes,
            reason: data.reason,
            notes: data.notes,
          })),
        notes: overallNotes,
        submittedBy: 'Stock Keeper',
      };

      await onSubmit(payload);
      toast.success(
        `Customer rejection logged for ${totalRejected} unit(s). Submitted for Manager Approval!`
      );
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit customer rejection: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Process Customer Returns & Rejections
              </h2>
              <p className="text-xs text-slate-500">
                Delivery Note: <span className="font-mono font-semibold">{note.deliveryNoteNumber}</span> • Customer: {note.customerName}
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Live Status Tally */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px]">Total Dispatched</span>
            <span className="text-base font-bold text-slate-900">{totalDispatched} Units</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-emerald-200 shadow-2xs">
            <span className="text-emerald-600 block text-[11px] font-medium">Customer Accepted</span>
            <span className="text-base font-bold text-emerald-700">{totalAccepted} Units</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-rose-200 shadow-2xs">
            <span className="text-rose-600 block text-[11px] font-medium">Customer Rejected</span>
            <span className="text-base font-bold text-rose-700">{totalRejected} Units</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Barcode Scanner Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ScanLine className="h-4 w-4 text-primary" />
                Physical Returned Barcode Scanner (Handheld Gun / Manual Input)
              </label>
              <span className="text-[11px] text-slate-500">Press Enter after scanning</span>
            </div>

            <form onSubmit={handleScanBarcode} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan returned unit barcode (e.g. DNS-MCB32A2P-001-001)..."
                  className="font-mono text-xs pr-10 bg-white"
                  autoFocus
                />
                <Barcode className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <Button type="submit" size="sm" className="gap-1.5 text-xs font-semibold">
                Scan Unit
              </Button>
            </form>
          </div>

          {/* Product Tabs / Item Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Line Item to Review Unit Barcodes:
            </label>
            <div className="flex flex-wrap gap-2">
              {note.items.map((item) => {
                const itemRejCount = rejectionsByProduct[item.productId]?.rejectedBarcodes.length || 0;
                const isSelected = item.productId === selectedProductId;
                return (
                  <button
                    key={item.productId}
                    type="button"
                    onClick={() => setSelectedProductId(item.productId)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-colors flex items-center gap-2 ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary font-bold shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{item.productName}</span>
                    {itemRejCount > 0 ? (
                      <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {itemRejCount} rejected
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">
                        ({item.dispatchedQuantity} units)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Item Details & Barcode Toggle Grid */}
          {currentItem && (
            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{currentItem.productName}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    SKU: {currentItem.sku} • Invoiced: {currentItem.invoicedQuantity} • Dispatched: {currentItem.dispatchedQuantity} Units
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-600 block">Status for this Item:</span>
                  <span className="text-xs font-bold text-slate-900">
                    {currentItem.dispatchedQuantity - currentRejection.rejectedBarcodes.length} Accepted,{' '}
                    <span className="text-rose-600">{currentRejection.rejectedBarcodes.length} Rejected</span>
                  </span>
                </div>
              </div>

              {/* Dispatched Unit Barcodes Matrix */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Click a barcode to mark as returned / rejected by customer:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-100 rounded-lg bg-slate-50/50">
                  {currentItem.unitBarcodes.map((barcode, idx) => {
                    const isRejected = currentRejection.rejectedBarcodes.includes(barcode);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleBarcodeRejection(currentItem.productId, barcode)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-mono border text-left flex items-center justify-between transition-all ${
                          isRejected
                            ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-2xs ring-1 ring-rose-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{barcode}</span>
                        {isRejected ? (
                          <span className="text-[10px] text-rose-600 font-bold ml-1">REJECT</span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium ml-1">OK</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If any barcodes are rejected for this product, show reason and notes */}
              {currentRejection.rejectedBarcodes.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Customer Rejection Reason:
                      </label>
                      <Select
                        value={currentRejection.reason}
                        onValueChange={(val) =>
                          handleReasonChange(currentItem.productId, val as RejectionReasonCode)
                        }
                      >
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAMAGED_IN_TRANSIT">
                            Damaged in Transit / Impact Damage
                          </SelectItem>
                          <SelectItem value="DEFECTIVE_PRODUCT">
                            Defective Unit / Factory Fault
                          </SelectItem>
                          <SelectItem value="WRONG_SPECIFICATION">
                            Wrong Item / Rating Discrepancy
                          </SelectItem>
                          <SelectItem value="PACKAGING_DAMAGED">
                            Crushed / Wet Packaging
                          </SelectItem>
                          <SelectItem value="CUSTOMER_REFUSED">
                            Customer Refused / Excess
                          </SelectItem>
                          <SelectItem value="OTHER">Other / Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Damage / Condition Inspection Notes:
                      </label>
                      <Input
                        value={currentRejection.notes}
                        onChange={(e) =>
                          handleItemNotesChange(currentItem.productId, e.target.value)
                        }
                        placeholder="e.g. Scratched casing, terminal screw stripped..."
                        className="text-xs h-9"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overall Rejection Remarks & Approval Gating Notice */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Stock Keeper Overall Rejection Handover Note (for Supervisor / Manager):
            </label>
            <Textarea
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="Driver Kamal Silva returned 2 units to warehouse bay Q-01. Customer verified on site..."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Formal Approval Workflow Notice */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Manager Approval Gating Required:</div>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                As per DNS Warehouse SOP, a Stock Keeper cannot unilaterally write off or finalize customer rejections.
                Submitting this report will place the entire Delivery Note in <strong>Pending Manager Approval</strong>.
                The Operations Manager will review the physical returned barcodes before confirming credit or stock quarantine adjustments.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSubmitRejection}
            disabled={submitting || totalRejected === 0}
            className="gap-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <ShieldAlert className="h-4 w-4" />
            Submit {totalRejected} Rejected Unit(s) for Manager Approval
          </Button>
        </div>
      </div>
    </div>
  );
};
