import React, { useState, useMemo } from 'react';
import { GRN, GRNItem } from '../../../types/inventory';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { ConfirmButton } from '../../../components/ui/confirm-button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import {
  Warehouse,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Barcode,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldCheck,
  Package,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { UnitSerialBarcodeInspector } from './UnitSerialBarcodeInspector';

interface GRNStockManagerVerificationPanelProps {
  grn: GRN;
  currentUser?: { id?: string; name?: string; role?: string };
  onApprove: (remarks?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const GRNStockManagerVerificationPanel: React.FC<GRNStockManagerVerificationPanelProps> = ({
  grn,
  currentUser,
  onApprove,
  onReject,
  isSubmitting = false,
}) => {
  const [productSearch, setProductSearch] = useState('');
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isStockManager =
    currentUser?.role === 'STOCK_MANAGER' ||
    currentUser?.role === 'MANAGER' ||
    currentUser?.role === 'DIRECTOR';

  const isPendingApproval = grn.status === 'PENDING_STOCK_MANAGER_APPROVAL';
  const isApproved =
    grn.status === 'SUBMITTED' ||
    grn.status === 'COSTED' ||
    grn.status === 'APPROVED' ||
    grn.status === 'PRICED';
  const isRejected =
    grn.status === 'STOCK_MANAGER_REJECTED' || grn.status === 'REJECTED';

  // Metrics
  const metrics = useMemo(() => {
    let totalExpected = 0;
    let totalReceived = 0;
    let totalDamaged = 0;
    let totalAccepted = 0;
    let totalLabeledUnits = 0;
    let totalUnitBarcodes = 0;

    (grn.items || []).forEach((item) => {
      totalExpected += item.expectedQuantity || 0;
      totalReceived += item.receivedQuantity || 0;
      totalDamaged += item.damagedQuantity || 0;
      const acc = item.acceptedQuantity ?? Math.max(0, (item.receivedQuantity || 0) - (item.damagedQuantity || 0));
      totalAccepted += acc;

      if (item.unitRecords && item.unitRecords.length > 0) {
        totalUnitBarcodes += item.unitRecords.length;
        totalLabeledUnits += item.unitRecords.filter((r) => r.status === 'LABELED').length;
      } else if (item.unitBarcodes && item.unitBarcodes.length > 0) {
        totalUnitBarcodes += item.unitBarcodes.length;
        totalLabeledUnits += item.unitBarcodes.length;
      }
    });

    const hasVariance = totalExpected !== totalReceived;
    const labelingRate =
      totalUnitBarcodes > 0 ? Math.round((totalLabeledUnits / totalUnitBarcodes) * 100) : 100;

    return {
      totalExpected,
      totalReceived,
      totalDamaged,
      totalAccepted,
      hasVariance,
      varianceQty: totalReceived - totalExpected,
      totalLabeledUnits,
      totalUnitBarcodes,
      labelingRate,
    };
  }, [grn]);

  // Toggle item expansion
  const toggleItemExpansion = (key: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    grn.items.forEach((item, idx) => {
      allExpanded[`item-${idx}-${item.productId}`] = true;
    });
    setExpandedProductIds(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedProductIds({});
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!productSearch.trim()) return grn.items || [];
    const q = productSearch.toLowerCase().trim();
    return (grn.items || []).filter(
      (item) =>
        item.productNameSnapshot?.toLowerCase().includes(q) ||
        item.skuSnapshot?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q) ||
        item.unitBarcodes?.some((ub) => ub.toLowerCase().includes(q)) ||
        item.unitRecords?.some((ur) => ur.unitBarcode.toLowerCase().includes(q))
    );
  }, [grn.items, productSearch]);

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 3) return;
    await onReject(rejectReason.trim());
    setRejectModalOpen(false);
  };

  return (
    <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden">
      {/* Top Banner / Verification Header */}
      <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Warehouse className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Goods Receipt Verification (Stock Manager)</span>
                {isPendingApproval && (
                  <Badge className="bg-amber-100 text-amber-800 text-[10px] font-semibold border-amber-300">
                    AWAITING VERIFICATION
                  </Badge>
                )}
                {isApproved && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold border-emerald-300">
                    VERIFIED &amp; FORWARDED
                  </Badge>
                )}
                {isRejected && (
                  <Badge className="bg-rose-100 text-rose-800 text-[10px] font-semibold border-rose-300">
                    REJECTED
                  </Badge>
                )}
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Physical warehouse intake inspection, discrepancy audit &amp; serial/barcode compliance verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-mono bg-white font-semibold text-slate-700">
              {grn.grnNumber}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3.5">
        {/* Supplier & Warehouse Metadata (Left-panel matching reference image) */}
        <div className="bg-slate-50/60 rounded-lg p-3 border border-slate-200/80 text-xs space-y-2">
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
              Supplier Name
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {grn.supplierName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                GRN Reference
              </span>
              <span className="font-mono font-semibold text-slate-800">
                {grn.grnNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                Intake Method
              </span>
              <span className="font-semibold text-slate-800">
                Standard Receiving
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                Linked PO
              </span>
              <span className="font-mono font-semibold text-primary">
                {grn.purchaseOrderNumber || grn.poNumber || 'PO Linked'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                Intake Date
              </span>
              <span className="text-slate-700 font-medium">
                {formatDate(grn.receivedDate || grn.submittedAt || new Date().toISOString())}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Metrics Strip (3 badges matching reference image) */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">
              Product Lines
            </span>
            <span className="font-mono font-bold text-slate-800 text-sm">{grn.items.length}</span>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">
              Received Units
            </span>
            <span className="font-mono font-bold text-primary text-sm">{metrics.totalReceived}</span>
            {metrics.hasVariance && (
              <span className="text-[9px] font-mono font-semibold block text-amber-600 mt-0.5">
                (PO: {metrics.totalExpected} | Var: {metrics.varianceQty > 0 ? `+${metrics.varianceQty}` : metrics.varianceQty})
              </span>
            )}
          </div>
          <div
            className={cn(
              'rounded-lg border p-2 shadow-2xs',
              metrics.totalDamaged > 0
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-white border-slate-200 text-slate-800'
            )}
          >
            <span className="text-[10px] font-semibold uppercase block opacity-75 tracking-wider">
              Damaged Units
            </span>
            <span className="font-mono font-bold text-sm">{metrics.totalDamaged}</span>
          </div>
        </div>

        {/* Physical Inbound Verification Header & Search */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-800 font-bold text-xs">
                Verified Physical Inbound Quantities:
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-slate-600 bg-white">
                {grn.items.length}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {grn.items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const isAnyExpanded = Object.values(expandedProductIds).some(Boolean);
                    if (isAnyExpanded) handleCollapseAll();
                    else handleExpandAll();
                  }}
                  className="h-6 text-[10px] px-1.5 text-slate-500 hover:text-slate-800"
                >
                  <Layers className="h-3 w-3 mr-1" />
                  <span>{Object.values(expandedProductIds).some(Boolean) ? 'Collapse All' : 'Expand All'}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Search filter for products */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder={`Search ${grn.items.length} products by name, SKU, or barcode...`}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="h-7 pl-8 text-xs bg-white border-slate-200"
            />
            {productSearch && (
              <button
                type="button"
                onClick={() => setProductSearch('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ×
              </button>
            )}
          </div>

          {/* Product Items List (Matching Reference Design) */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => {
                const itemKey = `item-${idx}-${item.productId}`;
                const isExpanded = Boolean(expandedProductIds[itemKey]);
                const hasDamaged = (item.damagedQuantity || 0) > 0;
                const hasSerials = item.serialNumbers && item.serialNumbers.length > 0;
                const totalUnitTags = item.unitRecords?.length || item.unitBarcodes?.length || 0;
                const labeledUnitTags =
                  item.unitRecords?.filter((r) => r.status === 'LABELED').length || totalUnitTags;

                return (
                  <div
                    key={itemKey}
                    className={cn(
                      'rounded-lg border bg-white p-2.5 text-xs transition-all shadow-2xs',
                      isExpanded
                        ? 'border-primary/40 ring-1 ring-primary/20 bg-slate-50/20'
                        : 'border-slate-200/90 hover:border-slate-300'
                    )}
                  >
                    {/* Item Summary Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md">
                            {item.productNameSnapshot}
                          </span>
                          {item.category && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase text-slate-500">
                              {item.category.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-mono text-slate-600 font-medium">SKU: {item.skuSnapshot}</span>
                          {item.barcode && (
                            <span className="font-mono text-slate-400 flex items-center gap-0.5">
                              <Barcode className="h-3 w-3 inline text-slate-400" />
                              {item.barcode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantities Badges (Right side) */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {item.receivedQuantity} {item.uom || 'units'}
                        </div>
                        {hasDamaged && (
                          <Badge className="bg-rose-100 text-rose-800 text-[10px] font-semibold border-rose-200 py-0 px-1.5">
                            Damaged: {item.damagedQuantity}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Barcode & Serialization Trigger */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleItemExpansion(itemKey)}
                        className="text-primary hover:text-primary-dark font-medium flex items-center gap-1"
                      >
                        <Barcode className="h-3 w-3" />
                        <span>{isExpanded ? 'Hide Barcode & Details' : 'Show Barcode & Details'}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      <div className="text-[10px] text-slate-400 font-mono">
                        {Math.max(item.receivedQuantity, item.serialNumbers?.length || 0) > 0 ? (
                          <span className="text-emerald-700 font-medium">
                            {Math.max(item.receivedQuantity, item.serialNumbers?.length || 0)} serials & barcodes verified
                          </span>
                        ) : (
                          <span>No unit serials</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Barcode & Detail Section */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 bg-slate-50/70 p-2.5 rounded-md space-y-2 text-[11px]">
                        {/* Quantity Breakdown Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2 rounded border border-slate-200/70 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">PO Expected</span>
                            <span className="font-mono font-bold text-slate-700">{item.expectedQuantity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Received</span>
                            <span className="font-mono font-bold text-primary">{item.receivedQuantity}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Damaged</span>
                            <span className={cn('font-mono font-bold', hasDamaged ? 'text-rose-700' : 'text-slate-400')}>
                              {item.damagedQuantity || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Good Inward</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {item.receivedQuantity - (item.damagedQuantity || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Damage notes if damaged */}
                        {hasDamaged && (
                          <div className="p-2 rounded bg-rose-50/80 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-600" />
                            <div>
                              <span className="font-bold">Damage Flagged: </span>
                              <span>{item.damageReason || 'Physical transit / container damage noted during dock counting.'}</span>
                            </div>
                          </div>
                        )}

                        {/* Unit Serial & Barcode Inspector */}
                        <div className="pt-1">
                          <UnitSerialBarcodeInspector
                            totalUnits={item.receivedQuantity}
                            unitRecords={item.unitRecords}
                            unitBarcodes={item.unitBarcodes}
                            serialNumbers={item.serialNumbers}
                            sku={item.skuSnapshot}
                            productName={item.productNameSnapshot}
                            grnNumber={grn.grnNumber}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No products match "{productSearch}".
              </div>
            )}
          </div>
        </div>

        {/* Existing Audit or Verification Details */}
        {grn.stockManagerApproval && (
          <div
            className={cn(
              'p-3 rounded-lg border text-xs space-y-1',
              grn.stockManagerApproval.status === 'APPROVED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : grn.stockManagerApproval.status === 'REJECTED'
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            )}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {grn.stockManagerApproval.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {grn.stockManagerApproval.status === 'REJECTED' && <XCircle className="h-4 w-4 text-rose-600" />}
                {grn.stockManagerApproval.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-600" />}
                <span>
                  {grn.stockManagerApproval.status === 'APPROVED' && 'Stock Manager Physical Verification Approved'}
                  {grn.stockManagerApproval.status === 'REJECTED' && 'Stock Manager Verification Rejected'}
                  {grn.stockManagerApproval.status === 'PENDING' && 'Pending Stock Manager Verification'}
                </span>
              </span>
              <span className="text-[11px] font-mono font-medium">
                {grn.stockManagerApproval.approvedAt
                  ? formatDate(grn.stockManagerApproval.approvedAt)
                  : grn.stockManagerApproval.rejectedAt
                  ? formatDate(grn.stockManagerApproval.rejectedAt)
                  : ''}
              </span>
            </div>
            {grn.stockManagerApproval.approvedByName && (
              <p className="text-[11px]">
                Verified by: <strong>{grn.stockManagerApproval.approvedByName}</strong>
              </p>
            )}
            {grn.stockManagerApproval.rejectedByName && (
              <p className="text-[11px]">
                Rejected by: <strong>{grn.stockManagerApproval.rejectedByName}</strong>
              </p>
            )}
            {grn.stockManagerApproval.rejectionReason && (
              <p className="text-[11px] font-medium text-rose-800">
                Reason: {grn.stockManagerApproval.rejectionReason}
              </p>
            )}
            {grn.stockManagerApproval.remarks && (
              <p className="text-[11px] text-slate-700 italic">
                "{grn.stockManagerApproval.remarks}"
              </p>
            )}
          </div>
        )}

        {/* Stock Manager Action Controls when PENDING_STOCK_MANAGER_APPROVAL */}
        {isPendingApproval && (
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            {isStockManager ? (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Stock Manager Verification Remarks (Optional)
                  </label>
                  <Textarea
                    placeholder="e.g. Physical counts, unit barcode labels, and serial numbers verified against PO specifications."
                    value={approvalRemarks}
                    onChange={(e) => setApprovalRemarks(e.target.value)}
                    rows={2}
                    className="text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectModalOpen(true)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" />
                    Reject Verification
                  </Button>

                  <ConfirmButton
                    variant="default"
                    size="sm"
                    dialogVariant="success"
                    confirmTitle="Approve Physical Inbound Verification"
                    confirmMessage={`Confirm physical stock verification for ${grn.grnNumber}? This will forward the GRN directly to Finance for approval and landed costing. Physical inventory will NOT be posted until Finance approves.`}
                    confirmText="Verify & Forward to Finance"
                    onConfirm={() => onApprove(approvalRemarks)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                    Approve &amp; Forward to Finance
                  </ConfirmButton>
                </div>
              </>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Awaiting Stock Manager Verification</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    This GRN has been submitted by the Stock Keeper and is currently waiting for physical inspection &amp; approval by the Stock Manager before it reaches Finance.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Reject Verification Dialog Modal */}
      {rejectModalOpen && (
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-rose-600" />
                  <span>Reject GRN Physical Verification</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  Document the discrepancy reason for rejecting {grn.grnNumber}. The shipment will NOT proceed to Finance and no inventory will be capitalized.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Rejection Reason / Discrepancy Note <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  placeholder="e.g. Broken packaging on 15 cartons, barcode labels unreadable, or severe shortage vs PO..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRejectSubmit}
                  disabled={!rejectReason.trim() || rejectReason.trim().length < 3 || isSubmitting}
                  className="text-xs font-semibold bg-rose-600 hover:bg-rose-700"
                >
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </div>
          </div>
        </Dialog>
      )}
    </Card>
  );
};

