import { useState } from 'react';
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
import { TrendingUp, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

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
  const [reason, setReason] = useState<string>('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: previewData, isLoading: isPreviewLoading, refetch: fetchPreview } = useBatchPricePreview(
    productId,
    open && step === 'preview',
  );

  const updateMutation = useUpdateBatchSellingPrice();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('input');
      setNewSellingPrice('');
      setReason('');
      setFormError(null);
    }
    onOpenChange(isOpen);
  };

  const handleProceedToPreview = async () => {
    setFormError(null);
    const parsed = parseFloat(newSellingPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setFormError('Please enter a valid positive selling price.');
      return;
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

    try {
      await updateMutation.mutateAsync({
        productId,
        payload: {
          newSellingPrice: parsed,
          reason: reason.trim() || undefined,
        },
      });
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update batch selling prices. Please try again.');
    }
  };

  const parsedPrice = parseFloat(newSellingPrice) || 0;
  const eligibleBatches = previewData?.batches ?? [];

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
                Bulk Update Batch Selling Price
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
                Director & Manager Batch Pricing Policy
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Updating the selling price applies across all eligible batches (<strong className="text-emerald-700">ACTIVE</strong> and <strong className="text-amber-700">HOLD</strong> batches with available quantity &gt; 0). Historical transactions, invoiced items, and zero-stock/depleted batches are strictly excluded.
              </p>
            </div>

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
                      <TableHead className="text-center">Available Stock</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right font-bold text-indigo-900">New Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eligibleBatches.map((batch) => (
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
                          {formatCurrency(batch.currentSellingPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-indigo-700">
                          <div className="flex items-center justify-end gap-1">
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            {formatCurrency(parsedPrice)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
