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
import {
  useFloorPercentagePreview,
  useUpdateProductFloorPercentage,
} from '../../api/products/products.hooks';
import {
  Percent,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ProductFloorPercentageModalProps {
  productId: string;
  productName: string;
  sku: string;
  currentFloorPercentage: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProductFloorPercentageModal({
  productId,
  productName,
  sku,
  currentFloorPercentage,
  open,
  onOpenChange,
  onSuccess,
}: ProductFloorPercentageModalProps) {
  const [proposedFloorPct, setProposedFloorPct] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [step, setStep] = useState<'step1_default' | 'step2_batch_confirm'>('step1_default');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProposedFloorPct(currentFloorPercentage > 0 ? String(currentFloorPercentage) : '');
      setReason('');
      setStep('step1_default');
      setFormError(null);
    }
  }, [open, currentFloorPercentage]);

  const { data: previewData, isLoading: isPreviewLoading, refetch: fetchPreview } =
    useFloorPercentagePreview(productId, open && step === 'step2_batch_confirm');

  const updateMutation = useUpdateProductFloorPercentage();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('step1_default');
      setFormError(null);
    }
    onOpenChange(isOpen);
  };

  const validateInput = (): number | null => {
    const val = parseFloat(proposedFloorPct);
    if (isNaN(val) || val < 0 || val > 100) {
      setFormError('Floor percentage must be a number between 0% and 100%.');
      return null;
    }
    return Number(val.toFixed(2));
  };

  // Step 1 Choice A: Update only the Product-level default (future GRN batches only)
  const handleSaveProductDefaultOnly = async () => {
    setFormError(null);
    const validPct = validateInput();
    if (validPct === null) return;

    try {
      await updateMutation.mutateAsync({
        productId,
        payload: {
          newFloorPercentage: validPct,
          propagateToBatches: false,
          reason: reason.trim() || undefined,
        },
      });
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update product floor percentage.');
    }
  };

  // Step 1 Choice B: Proceed to Step 2 for explicit existing batch confirmation
  const handleProceedToBatchConfirmation = async () => {
    setFormError(null);
    const validPct = validateInput();
    if (validPct === null) return;

    setStep('step2_batch_confirm');
    await fetchPreview();
  };

  // Step 2: Second explicit confirmation applying to both product default and eligible batches
  const handleConfirmBatchPropagation = async () => {
    setFormError(null);
    const validPct = validateInput();
    if (validPct === null) return;

    try {
      await updateMutation.mutateAsync({
        productId,
        payload: {
          newFloorPercentage: validPct,
          propagateToBatches: true,
          reason: reason.trim() || 'Floor percentage updated and propagated to existing batches',
        },
      });
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to propagate floor percentage to existing batches.');
    }
  };

  const eligibleBatches = previewData?.batches ?? [];
  const parsedProposedPct = parseFloat(proposedFloorPct) || 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {step === 'step1_default'
                  ? 'Update Product Floor Price Percentage'
                  : 'Confirm Propagation to Existing Batches'}
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

        {/* STEP 1: CHANGE PRODUCT DEFAULT */}
        {step === 'step1_default' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-violet-50/70 border border-violet-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-900">
                <ShieldAlert className="h-4 w-4 text-violet-600" />
                Floor Price Governance Policy (Decision 4)
              </div>
              <p className="text-xs text-violet-800/90 leading-relaxed">
                This change will apply as the default for <strong>future GRN batches</strong>. Existing inventory batches will remain unchanged unless you explicitly choose to preview and update them in the next step.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Current Product Default
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {currentFloorPercentage}%
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Formula Standard
                </span>
                <span className="text-xs text-slate-600 mt-1 block">
                  Markup over Cost: <code className="font-mono bg-white px-1 py-0.5 rounded border text-[11px]">Cost × (1 + Floor% / 100)</code>
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Proposed Floor Price Percentage (0.00% – 100.00%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 15.00"
                  value={proposedFloorPct}
                  onChange={(e) => setProposedFloorPct(e.target.value)}
                  className="pr-10 font-mono text-base font-bold text-slate-900"
                  autoFocus
                />
                <span className="absolute right-3.5 top-2.5 text-sm font-bold text-slate-400 font-mono">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Update Reason / Remarks (Optional)
              </label>
              <Input
                placeholder="e.g. Corporate floor margin revision"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* STEP 2: EXPLICIT EXISTING BATCH UPDATE CONFIRMATION */}
        {step === 'step2_batch_confirm' && (
          <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-violet-50/70 border border-violet-100">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 block">
                  Proposed Floor Percentage
                </span>
                <span className="text-lg font-bold font-mono text-violet-950">
                  {parsedProposedPct}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 block">
                  Eligible Batches Affected
                </span>
                <span className="text-base font-bold text-violet-900 font-mono">
                  {previewData?.count ?? 0} batches
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Review affected batches below before confirming. Only <strong className="text-emerald-700">ACTIVE</strong> and <strong className="text-amber-700">HOLD</strong> batches with available stock &gt; 0 are updated. Depleted batches and zero-stock records are strictly excluded.
            </p>

            {isPreviewLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                <span className="text-xs font-medium">Scanning eligible batches...</span>
              </div>
            ) : eligibleBatches.length === 0 ? (
              <div className="p-6 rounded-xl border border-amber-200 bg-amber-50 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
                <p className="text-sm font-semibold text-amber-900">
                  No Eligible Existing Batches Found
                </p>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                  There are no ACTIVE or HOLD batches with available stock for this product. You can safely save this percentage as the default for future GRNs.
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
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Current Floor %</TableHead>
                      <TableHead className="text-right font-bold text-violet-900">New Floor %</TableHead>
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
                          {formatCurrency(batch.sellingPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {batch.currentFloorPercentage}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-violet-700">
                          <div className="flex items-center justify-end gap-1">
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            {parsedProposedPct}%
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

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
          {step === 'step1_default' ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveProductDefaultOnly}
                  disabled={!proposedFloorPct || updateMutation.isPending}
                  title="Update product-level default only; existing batches remain unchanged"
                >
                  Save Future Default Only
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProceedToBatchConfirmation}
                  disabled={!proposedFloorPct}
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Preview &amp; Update Existing Batches
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('step1_default')}
                disabled={updateMutation.isPending}
              >
                Back to Step 1
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmBatchPropagation}
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
                    Confirm Update to {eligibleBatches.length} Batches &amp; Default
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
