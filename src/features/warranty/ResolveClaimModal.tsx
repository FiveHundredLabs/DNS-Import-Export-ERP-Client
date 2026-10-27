import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { WarrantyClaim, ClaimResolutionType } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle, Wrench, RefreshCw, XCircle, Plus, Trash2, ShieldCheck, Box } from 'lucide-react';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';

interface ResolveClaimModalProps {
  claim: WarrantyClaim | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ResolveClaimModal({
  claim,
  open,
  onOpenChange,
  onSuccess,
}: ResolveClaimModalProps) {
  const { currentUser } = useAuth();
  const [resolution, setResolution] = useState<ClaimResolutionType>('REPLACE');
  const [notes, setNotes] = useState('');
  const [replacementSerial, setReplacementSerial] = useState('');
  const [spareParts, setSpareParts] = useState<Array<{ productId: string; productName: string; quantity: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!claim) return null;

  const handleAddSparePart = () => {
    const firstProd = MOCK_PRODUCTS[0];
    setSpareParts((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        productName: firstProd.name,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveSparePart = (idx: number) => {
    setSpareParts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSparePart = (idx: number, productId: string, quantity: number) => {
    const prod = MOCK_PRODUCTS.find((p) => p.id === productId);
    setSpareParts((prev) => {
      const next = [...prev];
      next[idx] = {
        productId,
        productName: prod ? prod.name : next[idx].productName,
        quantity: Math.max(1, quantity),
      };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide resolution and inspection notes.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await warrantyService.resolveClaim(claim.id, resolution, notes.trim(), currentUser, {
        replacementSerial: resolution === 'REPLACE' ? replacementSerial.trim() || undefined : undefined,
        spareParts: resolution === 'REPAIR' && spareParts.length > 0 ? spareParts : undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="text-slate-900 text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Resolve Warranty Claim: {claim.claimNumber}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
          <div className="font-semibold text-slate-800">{claim.productName} ({claim.sku})</div>
          <div className="text-slate-500 text-[11px]">
            Customer: {claim.customerName} | Serial: {claim.serialNumber || 'N/A'}
          </div>
          <div className="text-slate-700 text-xs italic mt-1 bg-white p-2 rounded border border-slate-200">
            &ldquo;{claim.complaintReason}&rdquo;
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-2">
            Resolution Action <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setResolution('REPLACE')}
              className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                resolution === 'REPLACE'
                  ? 'border-primary bg-primary-light/60 text-primary-text font-bold ring-1 ring-indigo-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-xs">Replace Unit</span>
              <span className="text-[10px] text-slate-400 font-normal">Issue good stock</span>
            </button>

            <button
              type="button"
              onClick={() => setResolution('REPAIR')}
              className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                resolution === 'REPAIR'
                  ? 'border-amber-600 bg-amber-50/60 text-amber-700 font-bold ring-1 ring-amber-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wrench className="h-4 w-4 text-amber-600" />
              <span className="text-xs">Repair & Return</span>
              <span className="text-[10px] text-slate-400 font-normal">Fix defective part</span>
            </button>

            <button
              type="button"
              onClick={() => setResolution('REJECT')}
              className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                resolution === 'REJECT'
                  ? 'border-rose-600 bg-rose-50/60 text-rose-700 font-bold ring-1 ring-rose-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              <span className="text-xs">Reject Claim</span>
              <span className="text-[10px] text-slate-400 font-normal">Outside terms</span>
            </button>
          </div>
        </div>

        {/* Dynamic Resolution Details */}
        {resolution === 'REPLACE' && (
          <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200 space-y-2 animate-in fade-in-50">
            <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs">
              <Box className="h-4 w-4 text-indigo-600" />
              <span>Stock Replacement & Damaged Unit Return</span>
            </div>
            <p className="text-[11px] text-indigo-700">
              ⚡ 1 unit of <span className="font-semibold">{claim.productName}</span> will be decremented from available stock, and the customer&apos;s defective unit will be logged into damaged stock.
            </p>
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-medium text-indigo-900">
                New Replacement Serial Number (Optional)
              </label>
              <Input
                placeholder="e.g. SN-RHD-2026-9901"
                value={replacementSerial}
                onChange={(e) => setReplacementSerial(e.target.value)}
                className="h-8 text-xs font-mono bg-white"
              />
            </div>
          </div>
        )}

        {resolution === 'REPAIR' && (
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 space-y-2.5 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
                <Wrench className="h-4 w-4 text-amber-600" />
                <span>Spare Parts Consumed During Repair</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSparePart}
                className="h-7 text-[11px] gap-1 text-amber-800 border-amber-300 hover:bg-amber-100"
              >
                <Plus className="h-3 w-3" />
                Add Spare Part
              </Button>
            </div>
            <p className="text-[11px] text-amber-700">
              ⚡ Selected spare parts will be automatically deducted from inventory available stock upon resolution.
            </p>

            {spareParts.length === 0 ? (
              <div className="p-2.5 bg-white/80 rounded border border-amber-200/60 text-center text-[11px] text-amber-600 italic">
                No spare parts added. (Click &ldquo;Add Spare Part&rdquo; if replacement components were used).
              </div>
            ) : (
              <div className="space-y-2">
                {spareParts.map((part, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-amber-200">
                    <select
                      value={part.productId}
                      onChange={(e) => handleUpdateSparePart(idx, e.target.value, part.quantity)}
                      className="h-7 flex-1 rounded border border-slate-200 text-xs px-2"
                    >
                      {MOCK_PRODUCTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-500 font-mono">Qty:</span>
                      <Input
                        type="number"
                        min={1}
                        value={part.quantity}
                        onChange={(e) =>
                          handleUpdateSparePart(idx, part.productId, parseInt(e.target.value) || 1)
                        }
                        className="h-7 w-16 text-xs text-center font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSparePart(idx)}
                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Technical Findings & Resolution Notes <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record technical inspection outcome, root cause, and warranty resolution remarks..."
            className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
        </div>

        <DialogFooter className="mt-4 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            {loading ? 'Saving...' : 'Finalize Resolution'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
