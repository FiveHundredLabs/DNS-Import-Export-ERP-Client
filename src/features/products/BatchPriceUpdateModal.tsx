import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { formatCurrency } from '../../utils/formatters';
import { useBatchPricePreview, useUpdateBatchSellingPrice } from '../../api/products/products.hooks';
import { TrendingUp, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Loader2, Percent, ShieldAlert } from 'lucide-react';

interface BatchPriceUpdateModalProps {
  productId: string;
  productName: string;
  sku: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BatchPriceUpdateModal({
  productId,
  productName,
  sku,
  open,
  onOpenChange,
  onSuccess,
}: BatchPriceUpdateModalProps) {
  const [newSellingPrice, setNewSellingPrice] = useState<string>('');
  const [minFloorPricePercentage, setMinFloorPricePercentage] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: previewData, isLoading: isPreviewLoading, refetch: fetchPreview } = useBatchPricePreview(
    productId,
    open,
  );

  const updateMutation = useUpdateBatchSellingPrice();
  const eligibleBatches = previewData?.batches ?? [];

  // When modal opens or batches load, populate default floor % if available
  useEffect(() => {
    if (open && eligibleBatches.length > 0 && minFloorPricePercentage === '') {
      const defaultFloor = eligibleBatches[0].minFloorPricePercentage;
      if (defaultFloor !== undefined && defaultFloor !== null && defaultFloor > 0) {
        setMinFloorPricePercentage(String(defaultFloor));
      }
    }
  }, [open, eligibleBatches, minFloorPricePercentage]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('input');
      setNewSellingPrice('');
      setMinFloorPricePercentage('');
      setReason('');
      setFormError(null);
    }
    onOpenChange(isOpen);
  };

  const parsedPrice = parseFloat(newSellingPrice) || 0;
  const parsedFloorPct = minFloorPricePercentage !== '' ? parseFloat(minFloorPricePercentage) : 0;

  // Safe profit markup calculation across eligible batches:
  // Formula: Profit Markup % = ((SellingPrice - UnitCost) / UnitCost) * 100
  const maxFloorPct = eligibleBatches.length > 0 && parsedPrice > 0
    ? Math.max(0, Math.min(...eligibleBatches.map((b) => (b.unitCost > 0 ? ((parsedPrice - b.unitCost) / b.unitCost) * 100 : 0))))
    : 0;

  const minCost = eligibleBatches.length > 0 ? Math.min(...eligibleBatches.map((b) => b.unitCost)) : 0;
  const maxCost = eligibleBatches.length > 0 ? Math.max(...eligibleBatches.map((b) => b.unitCost)) : 0;
  const effectiveFloorPct = !isNaN(parsedFloorPct) ? Math.max(0, parsedFloorPct) : 0;
  const computedMaxFloorPrice = maxCost * (1 + effectiveFloorPct / 100);

  const handleProceedToPreview = async () => {
    setFormError(null);
    const parsed = parseFloat(newSellingPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setFormError('Please enter a valid positive selling price.');
      return;
    }

    if (minFloorPricePercentage !== '') {
      const floorVal = parseFloat(minFloorPricePercentage);
      if (isNaN(floorVal) || floorVal < 0) {
        setFormError('Minimum floor price percentage cannot be negative.');
        return;
      }
      if (floorVal > maxFloorPct) {
        setFormError(
          `Minimum floor percentage (${floorVal.toFixed(2)}%) cannot exceed profit markup (${maxFloorPct.toFixed(2)}%). Allowed range is 0.00% to ${maxFloorPct.toFixed(2)}%.`,
        );
        return;
      }
    }

    setStep('preview');
    await fetchPreview();
  };

  const handleConfirmUpdate = async () => {
    setFormError(null);
    const parsed = parseFloat(newSellingPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setFormError('Please enter a valid positive selling price.');
      return;
    }

    const floorVal = minFloorPricePercentage !== '' ? parseFloat(minFloorPricePercentage) : undefined;
    if (floorVal !== undefined) {
      if (isNaN(floorVal) || floorVal < 0) {
        setFormError('Minimum floor price percentage cannot be negative.');
        return;
      }
      if (floorVal > maxFloorPct) {
        setFormError(
          `Minimum floor percentage (${floorVal.toFixed(2)}%) cannot exceed profit markup (${maxFloorPct.toFixed(2)}%). Allowed range is 0.00% to ${maxFloorPct.toFixed(2)}%.`,
        );
        return;
      }
    }

    try {
      await updateMutation.mutateAsync({
        productId,
        payload: {
          newSellingPrice: parsed,
          minFloorPricePercentage: floorVal,
          reason: reason.trim() || undefined,
        },
      });
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update batch selling prices. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Bulk Update Batch Selling Price &amp; Floor Limit
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono mt-0.5">
                {productName} • SKU: {sku}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {formError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Director &amp; Manager Batch Pricing Policy
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Updating the selling price applies across all eligible batches (<strong className="text-emerald-700">ACTIVE</strong> and <strong className="text-amber-700">HOLD</strong> batches with available quantity &gt; 0). Historical transactions, invoiced items, and zero-stock/depleted batches are strictly excluded.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Proposed Selling Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Proposed New Selling Price (LKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-medium text-slate-400 font-mono">
                    LKR
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    className="pl-12 font-mono text-base font-bold text-slate-900"
                    autoFocus
                  />
                </div>
              </div>

              {/* Minimum Floor Percentage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Min Floor Margin % (0% = Cost)
                  </label>
                  {parsedPrice > 0 && eligibleBatches.length > 0 && (
                    <span className="text-[10px] font-mono text-indigo-600 font-medium">
                      Profit Markup: +{maxFloorPct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={maxFloorPct > 0 ? maxFloorPct : undefined}
                    placeholder="0.00"
                    value={minFloorPricePercentage}
                    onChange={(e) => setMinFloorPricePercentage(e.target.value)}
                    className="pr-10 font-mono text-base font-bold text-slate-900"
                  />
                  <span className="absolute right-3.5 top-2.5 text-sm font-bold text-slate-400 font-mono">
                    %
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  0% = sold at cost. Maximum allowable = batch profit markup ({maxFloorPct.toFixed(2)}%).
                </span>
              </div>
            </div>

            {/* Live Pricing & Margin Breakdown Card */}
            {parsedPrice > 0 && eligibleBatches.length > 0 && (
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Stock Unit Cost</span>
                  <span className="font-mono font-bold text-slate-800">
                    {minCost === maxCost ? formatCurrency(minCost) : `${formatCurrency(minCost)} - ${formatCurrency(maxCost)}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Max Profit Markup</span>
                  <span className="font-mono font-bold text-emerald-700">
                    +{maxFloorPct.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Floor Percentage</span>
                  <span className="font-mono font-bold text-indigo-900">
                    {effectiveFloorPct.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block">Protected Floor (LKR)</span>
                  <span className="font-mono font-bold text-indigo-950">
                    {formatCurrency(computedMaxFloorPrice)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Update Reason / Remarks (Optional)
              </label>
              <Input
                placeholder="e.g. Annual vendor price revision, inflation adjustment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block">
                  Proposed Target Price
                </span>
                <span className="text-lg font-bold font-mono text-indigo-950">
                  {formatCurrency(parsedPrice)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block">
                  Protected Floor ({effectiveFloorPct.toFixed(2)}%)
                </span>
                <span className="text-base font-bold text-indigo-900 font-mono">
                  {formatCurrency(computedMaxFloorPrice)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block">
                  Eligible Batches Affected
                </span>
                <span className="text-base font-bold text-indigo-900 font-mono">
                  {previewData?.count ?? 0} batches
                </span>
              </div>
            </div>

            {isPreviewLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Scanning eligible batches...</span>
              </div>
            ) : eligibleBatches.length === 0 ? (
              <div className="p-6 rounded-xl border border-amber-200 bg-amber-50 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="text-sm font-semibold text-amber-900">
                  No Eligible Batches Available
                </p>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                  This product has no ACTIVE or HOLD batches with available stock. Depleted batches and batches with 0 quantity cannot be repriced.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 overflow-y-auto [scrollbar-width:thin]">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Batch / GRN</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right font-bold text-indigo-900">New Price (+Markup)</TableHead>
                      <TableHead className="text-right font-bold text-violet-900">Floor Price (LKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleBatches.map((batch) => {
                      const batchMarkup = batch.unitCost > 0 ? ((parsedPrice - batch.unitCost) / batch.unitCost) * 100 : 0;
                      const batchFloorPrice = batch.unitCost * (1 + effectiveFloorPct / 100);

                      return (
                        <TableRow key={batch.id} className="hover:bg-slate-50/60">
                          <TableCell>
                            <div className="font-mono font-semibold text-slate-900">
                              {batch.batchNumber}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {batch.grnNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={batch.status === 'ACTIVE' ? 'success' : 'secondary'}
                              className="text-[10px]"
                            >
                              {batch.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium text-slate-800">
                            {batch.availableQuantity}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-600">
                            {formatCurrency(batch.unitCost)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-slate-700">
                            <div>{formatCurrency(batch.currentSellingPrice)}</div>
                            <div className="text-[10px] text-slate-400">{batch.minFloorPricePercentage}% flr</div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-indigo-700">
                            <div className="flex items-center justify-end gap-1">
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              {formatCurrency(parsedPrice)}
                            </div>
                            <div className="text-[10px] text-emerald-600 font-normal">
                              +{batchMarkup.toFixed(1)}% profit
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-violet-900">
                            <div>{formatCurrency(batchFloorPrice)}</div>
                            <div className="text-[10px] text-violet-600 font-normal">
                              {effectiveFloorPct.toFixed(1)}% flr
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-slate-100">
          {step === 'input' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleProceedToPreview}
                disabled={!newSellingPrice || parseFloat(newSellingPrice) <= 0}
              >
                Preview Impact
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('input')}
                disabled={updateMutation.isPending}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmUpdate}
                disabled={eligibleBatches.length === 0 || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Updating Batches...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Confirm &amp; Apply to {eligibleBatches.length} Batches
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
