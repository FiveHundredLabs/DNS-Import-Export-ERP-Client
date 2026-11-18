import React, { useState, useMemo } from 'react';
import {
  DeliveryNote,
  RejectionReasonCode,
  SubmitDeliveryOutcomePayload,
  ReturnedUnitDetail,
} from '../../../types/deliveryNote';
import { Button } from '../../../components/ui/button';
import { ConfirmButton } from '../../../components/ui/confirm-button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import {
  X,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ScanLine,
  Minus,
  Plus,
  RefreshCw,
  Check,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../utils/cn';

interface ProductReturnFormState {
  productId: string;
  returnedQuantity: number;
  damagedQuantity: number;
  taggedBarcodes: Record<string, 'REUSABLE' | 'DAMAGED'>; // barcode -> condition
  reasonNotes: string;
}

interface CustomerRejectionModalProps {
  note: DeliveryNote;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
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
  const [scanCondition, setScanCondition] = useState<'REUSABLE' | 'DAMAGED'>('DAMAGED');
  const [submitting, setSubmitting] = useState(false);
  const [overallNotes, setOverallNotes] = useState('');

  // Per-product return form state
  const [productStates, setProductStates] = useState<Record<string, ProductReturnFormState>>(() => {
    const initial: Record<string, ProductReturnFormState> = {};
    note.items.forEach((item) => {
      const tagged: Record<string, 'REUSABLE' | 'DAMAGED'> = {};
      const damagedBarcodes = item.damagedUnitBarcodes || [];
      const reusableBarcodes = item.reusableUnitBarcodes || [];

      damagedBarcodes.forEach((bc) => {
        tagged[bc] = 'DAMAGED';
      });
      reusableBarcodes.forEach((bc) => {
        tagged[bc] = 'REUSABLE';
      });

      const retQty = item.rejectedQuantity || (damagedBarcodes.length + reusableBarcodes.length) || 0;
      const damQty = item.damagedQuantity || damagedBarcodes.length || 0;

      initial[item.productId] = {
        productId: item.productId,
        returnedQuantity: retQty,
        damagedQuantity: damQty,
        taggedBarcodes: tagged,
        reasonNotes: item.rejectionNotes || '',
      };
    });
    return initial;
  });

  if (!isOpen) return null;

  const currentItem = note.items.find((i) => i.productId === selectedProductId) || note.items[0];
  const currentState = productStates[currentItem.productId] || {
    productId: currentItem.productId,
    returnedQuantity: 0,
    damagedQuantity: 0,
    taggedBarcodes: {},
    reasonNotes: '',
  };

  // Calculations for current active item
  const currentDispatchedQty = currentItem.dispatchedQuantity;
  const currentReturnedQty = Math.min(currentState.returnedQuantity, currentDispatchedQty);
  const currentDamagedQty = Math.min(currentState.damagedQuantity, currentReturnedQty);
  const currentReusableQty = Math.max(0, currentReturnedQty - currentDamagedQty);
  const currentDeliveredQty = Math.max(0, currentDispatchedQty - currentReturnedQty);

  // Overall calculations across all line items
  const overallTally = Object.entries(productStates).reduce(
    (acc, [pId, st]) => {
      const item = note.items.find((i) => i.productId === pId);
      const disp = item ? item.dispatchedQuantity : 0;
      const ret = Math.min(st.returnedQuantity, disp);
      const dam = Math.min(st.damagedQuantity, ret);
      const reu = Math.max(0, ret - dam);
      const del = Math.max(0, disp - ret);

      acc.dispatched += disp;
      acc.delivered += del;
      acc.returned += ret;
      acc.damaged += dam;
      acc.reusable += reu;
      return acc;
    },
    { dispatched: 0, delivered: 0, returned: 0, damaged: 0, reusable: 0 }
  );

  // Update returned quantity for a product
  const handleReturnedQtyChange = (productId: string, newRetVal: number) => {
    const item = note.items.find((i) => i.productId === productId);
    const maxQty = item ? item.dispatchedQuantity : 0;
    const clampedRet = Math.max(0, Math.min(newRetVal, maxQty));

    setProductStates((prev) => {
      const existing = prev[productId] || {
        productId,
        returnedQuantity: 0,
        damagedQuantity: 0,
        taggedBarcodes: {},
        reasonNotes: '',
      };

      // If damaged qty exceeds new returned qty, clamp damaged qty
      const clampedDam = Math.min(existing.damagedQuantity, clampedRet);

      return {
        ...prev,
        [productId]: {
          ...existing,
          returnedQuantity: clampedRet,
          damagedQuantity: clampedDam,
        },
      };
    });
  };

  // Update damaged quantity for a product
  const handleDamagedQtyChange = (productId: string, newDamVal: number) => {
    setProductStates((prev) => {
      const existing = prev[productId] || {
        productId,
        returnedQuantity: 0,
        damagedQuantity: 0,
        taggedBarcodes: {},
        reasonNotes: '',
      };

      const clampedDam = Math.max(0, Math.min(newDamVal, existing.returnedQuantity));

      return {
        ...prev,
        [productId]: {
          ...existing,
          damagedQuantity: clampedDam,
        },
      };
    });
  };

  // Toggle or cycle barcode status between DELIVERED -> REUSABLE -> DAMAGED -> DELIVERED
  const handleCycleBarcode = (productId: string, barcode: string) => {
    setProductStates((prev) => {
      const existing = prev[productId] || {
        productId,
        returnedQuantity: 0,
        damagedQuantity: 0,
        taggedBarcodes: {},
        reasonNotes: '',
      };

      const currentCond = existing.taggedBarcodes[barcode];
      const newTagged = { ...existing.taggedBarcodes };

      let nextCond: 'REUSABLE' | 'DAMAGED' | null = null;
      if (!currentCond) {
        nextCond = 'REUSABLE';
      } else if (currentCond === 'REUSABLE') {
        nextCond = 'DAMAGED';
      } else {
        nextCond = null;
      }

      if (nextCond) {
        newTagged[barcode] = nextCond;
      } else {
        delete newTagged[barcode];
      }

      // Recompute quantities based on tagged count
      const totalTagged = Object.keys(newTagged).length;
      const totalDamaged = Object.values(newTagged).filter((c) => c === 'DAMAGED').length;

      return {
        ...prev,
        [productId]: {
          ...existing,
          taggedBarcodes: newTagged,
          returnedQuantity: totalTagged,
          damagedQuantity: totalDamaged,
        },
      };
    });
  };

  // Handle handheld scanner input
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

    if (matchedItem.productId !== selectedProductId) {
      setSelectedProductId(matchedItem.productId);
    }

    setProductStates((prev) => {
      const existing = prev[matchedItem.productId] || {
        productId: matchedItem.productId,
        returnedQuantity: 0,
        damagedQuantity: 0,
        taggedBarcodes: {},
        reasonNotes: '',
      };

      const newTagged = { ...existing.taggedBarcodes, [barcode]: scanCondition };
      const totalTagged = Object.keys(newTagged).length;
      const totalDamaged = Object.values(newTagged).filter((c) => c === 'DAMAGED').length;

      return {
        ...prev,
        [matchedItem.productId]: {
          ...existing,
          taggedBarcodes: newTagged,
          returnedQuantity: Math.max(existing.returnedQuantity, totalTagged),
          damagedQuantity: totalDamaged,
        },
      };
    });

    toast.success(
      `Marked "${barcode}" as ${scanCondition === 'DAMAGED' ? 'Damaged Return' : 'Reusable Return'}`
    );
    setScanInput('');
  };

  // Helper: auto-tag barcodes to match entered quantities
  const handleAutoAlignBarcodes = (productId: string) => {
    const item = note.items.find((i) => i.productId === productId);
    if (!item) return;

    const st = productStates[productId];
    if (!st) return;

    const newTagged: Record<string, 'REUSABLE' | 'DAMAGED'> = {};
    const barcodes = item.unitBarcodes || [];

    for (let i = 0; i < st.returnedQuantity && i < barcodes.length; i++) {
      if (i < st.damagedQuantity) {
        newTagged[barcodes[i]] = 'DAMAGED';
      } else {
        newTagged[barcodes[i]] = 'REUSABLE';
      }
    }

    setProductStates((prev) => ({
      ...prev,
      [productId]: {
        ...st,
        taggedBarcodes: newTagged,
      },
    }));

    toast.info(`Assigned physical serial barcodes for ${st.returnedQuantity} unit(s).`);
  };

  // Form submission
  const handleSubmitOutcome = async () => {
    try {
      setSubmitting(true);

      const returnedUnits: ReturnedUnitDetail[] = [];
      const productSummary = note.items.map((item) => {
        const st = productStates[item.productId] || {
          productId: item.productId,
          returnedQuantity: 0,
          damagedQuantity: 0,
          taggedBarcodes: {},
          reasonNotes: '',
        };

        const retQty = Math.min(st.returnedQuantity, item.dispatchedQuantity);
        const damQty = Math.min(st.damagedQuantity, retQty);
        const reuQty = Math.max(0, retQty - damQty);
        const delQty = Math.max(0, item.dispatchedQuantity - retQty);

        // Populate unit-level traceability
        const itemBarcodes = item.unitBarcodes || [];
        itemBarcodes.forEach((bc, idx) => {
          const condition = st.taggedBarcodes[bc];
          if (condition) {
            returnedUnits.push({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              barcode: bc,
              condition,
              reason: condition === 'DAMAGED' ? 'DAMAGED' : 'CUSTOMER_REFUSED',
              notes: st.reasonNotes,
            });
          } else if (idx < retQty && !Object.keys(st.taggedBarcodes).length) {
            // Fallback auto-assignment if user entered quantity without clicking every barcode
            const autoCond = idx < damQty ? 'DAMAGED' : 'REUSABLE';
            returnedUnits.push({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              barcode: bc,
              condition: autoCond,
              reason: autoCond === 'DAMAGED' ? 'DAMAGED' : 'CUSTOMER_REFUSED',
              notes: st.reasonNotes,
            });
          }
        });

        return {
          productId: item.productId,
          dispatchedQuantity: item.dispatchedQuantity,
          deliveredQuantity: delQty,
          returnedQuantity: retQty,
          damagedQuantity: damQty,
          reusableQuantity: reuQty,
        };
      });

      const payload: SubmitDeliveryOutcomePayload = {
        deliveryNoteId: note.id,
        deliveredUnitIds: [],
        returnedUnits,
        productSummary,
        notes: overallNotes,
        submittedBy: 'Stock Keeper',
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit delivery outcome: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Process Delivery Outcome & Customer Returns
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

        {/* Live Status Tally Cards (4-Column) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-semibold uppercase">Total Dispatched</span>
            <span className="text-base font-black text-slate-900">{overallTally.dispatched} Units</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
            <span className="text-emerald-700 block text-[11px] font-semibold uppercase">Delivered & Accepted</span>
            <span className="text-base font-black text-emerald-700">{overallTally.delivered} Units</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-sky-200 shadow-2xs">
            <span className="text-sky-700 block text-[11px] font-semibold uppercase">Reusable Returns</span>
            <span className="text-base font-black text-sky-700">{overallTally.reusable} Units</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-rose-200 shadow-2xs">
            <span className="text-rose-700 block text-[11px] font-semibold uppercase">Damaged (Quarantine)</span>
            <span className="text-base font-black text-rose-700">{overallTally.damaged} Units</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Handheld Barcode Scanner Panel */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ScanLine className="h-4 w-4 text-primary" />
                Physical Returned Unit Barcode Scanner
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Scan Tag:</span>
                <button
                  type="button"
                  onClick={() => setScanCondition('DAMAGED')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10.5px] font-bold border transition-colors',
                    scanCondition === 'DAMAGED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  Damaged
                </button>
                <button
                  type="button"
                  onClick={() => setScanCondition('REUSABLE')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10.5px] font-bold border transition-colors',
                    scanCondition === 'REUSABLE'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  Reusable
                </button>
              </div>
            </div>

            <form onSubmit={handleScanBarcode} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan returned barcode with barcode gun (e.g. DNS-MCB32-WH101-001)..."
                  className="font-mono text-xs pr-10 bg-white"
                />
                <Barcode className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <Button type="submit" size="sm" className="gap-1.5 text-xs font-semibold">
                Scan Tag
              </Button>
            </form>
          </div>

          {/* Product Tabs / Item Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Line Item to Enter Return Quantities:
            </label>
            <div className="flex flex-wrap gap-2">
              {note.items.map((item) => {
                const st = productStates[item.productId];
                const retCount = st?.returnedQuantity || 0;
                const damCount = st?.damagedQuantity || 0;
                const isSelected = item.productId === selectedProductId;

                return (
                  <button
                    key={item.productId}
                    type="button"
                    onClick={() => setSelectedProductId(item.productId)}
                    className={cn(
                      'px-3.5 py-2.5 rounded-xl text-xs font-medium text-left border transition-all flex items-center gap-2.5 cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs ring-1 ring-primary/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    <div>
                      <span className="block font-bold">{item.productName}</span>
                      <span className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>
                    </div>
                    {retCount > 0 ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                        {retCount} Ret ({damCount} Dam)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
                        {item.dispatchedQuantity} disp
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Product Return Controls Box */}
          {currentItem && (
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{currentItem.productName}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    SKU: {currentItem.sku} • UOM: {currentItem.uom || 'PCS'} • Dispatched: <strong>{currentDispatchedQty} Units</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutoAlignBarcodes(currentItem.productId)}
                    className="text-xs gap-1.5 border-slate-300"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Auto-Assign Barcodes
                  </Button>
                </div>
              </div>

              {/* Intuitive Quantity Steppers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Returned Quantity Stepper */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Total Returned Quantity:
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">Max: {currentDispatchedQty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleReturnedQtyChange(currentItem.productId, currentReturnedQty - 1)}
                      disabled={currentReturnedQty <= 0}
                      className="h-9 w-9 p-0"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      max={currentDispatchedQty}
                      value={currentReturnedQty}
                      onChange={(e) => handleReturnedQtyChange(currentItem.productId, parseInt(e.target.value) || 0)}
                      className="text-center font-mono font-bold text-sm h-9 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleReturnedQtyChange(currentItem.productId, currentReturnedQty + 1)}
                      disabled={currentReturnedQty >= currentDispatchedQty}
                      className="h-9 w-9 p-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Units customer did not accept upon delivery attempt.
                  </p>
                </div>

                {/* 2. Damaged Quantity Stepper (Active when Returned > 0) */}
                <div className={cn(
                  'p-4 rounded-xl border space-y-2 transition-all',
                  currentReturnedQty > 0
                    ? 'border-rose-200 bg-rose-50/40'
                    : 'border-slate-200 bg-slate-50/30 opacity-60'
                )}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-900">
                      Damaged Quantity:
                    </label>
                    <span className="text-[11px] font-mono text-rose-600">Max: {currentReturnedQty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentReturnedQty <= 0 || currentDamagedQty <= 0}
                      onClick={() => handleDamagedQtyChange(currentItem.productId, currentDamagedQty - 1)}
                      className="h-9 w-9 p-0 border-rose-300"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      max={currentReturnedQty}
                      disabled={currentReturnedQty <= 0}
                      value={currentDamagedQty}
                      onChange={(e) => handleDamagedQtyChange(currentItem.productId, parseInt(e.target.value) || 0)}
                      className="text-center font-mono font-bold text-sm h-9 bg-white border-rose-300 text-rose-700"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentReturnedQty <= 0 || currentDamagedQty >= currentReturnedQty}
                      onClick={() => handleDamagedQtyChange(currentItem.productId, currentDamagedQty + 1)}
                      className="h-9 w-9 p-0 border-rose-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10.5px] text-rose-700">
                    Units moved to quarantine bay upon approval.
                  </p>
                </div>

                {/* 3. Automatic Live Summary for this product */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-2 text-xs">
                  <span className="font-bold text-slate-800 uppercase text-[10.5px]">
                    Outcome for this Item:
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Delivered & Accepted:</span>
                      <strong className="font-mono text-emerald-700">{currentDeliveredQty} Units</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Normal Reusable Returns:</span>
                      <strong className="font-mono text-sky-700">{currentReusableQty} Units</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Damaged Returns:</span>
                      <strong className="font-mono text-rose-700">{currentDamagedQty} Units</strong>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200">
                    Normal Returns = Total Returned - Damaged
                  </div>
                </div>
              </div>

              {/* Physical Unit Barcodes Matrix with Click-to-Tag */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Physical Dispatched Barcodes (Click to toggle status):
                  </label>
                  <div className="flex items-center gap-2 text-[10.5px]">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Delivered
                    </span>
                    <span className="flex items-center gap-1 text-sky-700">
                      <span className="h-2 w-2 rounded-full bg-sky-500" /> Reusable Return
                    </span>
                    <span className="flex items-center gap-1 text-rose-700">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Damaged Return
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                  {currentItem.unitBarcodes.map((bc, idx) => {
                    const tag = currentState.taggedBarcodes[bc];
                    const isDamaged = tag === 'DAMAGED';
                    const isReusable = tag === 'REUSABLE';

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCycleBarcode(currentItem.productId, bc)}
                        className={cn(
                          'p-2 rounded-lg text-xs font-mono border text-left flex items-center justify-between transition-all cursor-pointer',
                          isDamaged
                            ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold ring-1 ring-rose-200 shadow-2xs'
                            : isReusable
                              ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold ring-1 ring-sky-200 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        )}
                      >
                        <span className="truncate">{bc}</span>
                        {isDamaged ? (
                          <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0 h-4">DAMAGED</Badge>
                        ) : isReusable ? (
                          <Badge className="bg-sky-600 text-white text-[9px] px-1 py-0 h-4">RETURN</Badge>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold">OK</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes for this item */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Item Return Remarks:
                </label>
                <Input
                  value={currentState.reasonNotes}
                  onChange={(e) =>
                    setProductStates((prev) => ({
                      ...prev,
                      [currentItem.productId]: {
                        ...currentState,
                        reasonNotes: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. 2 units damaged in transit packaging; 3 units refused by customer"
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {/* Overall Handover Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Stock Keeper Overall Delivery Outcome Note:
            </label>
            <Textarea
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="e.g. Driver Kamal returned to Bay Q-01 with customer signed delivery slip..."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Two-Step Approval Notice */}
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 text-xs text-amber-900 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Two-Step Approval Protocol:</div>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Submitting this outcome will update the Delivery Note to <strong>REJECTION_PENDING_APPROVAL</strong>.
                Physical units remain in <code>DISPATCHED</code> status and inventory balances are preserved until the
                <strong> Stock Manager</strong> formally inspects the returned barcodes and approves the submission.
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
            onClick={handleSubmitOutcome}
            disabled={submitting}
            className="gap-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <CheckCircle2 className="h-4 w-4" />
            Submit Delivery Outcome ({overallTally.delivered} Delivered, {overallTally.returned} Returned)
          </Button>
        </div>
      </div>
    </div>
  );
};
