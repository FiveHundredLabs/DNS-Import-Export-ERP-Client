import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { WarrantyClaim, ClaimResolutionType } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle, Wrench, RefreshCw, XCircle } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!claim) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide resolution and inspection notes.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await warrantyService.resolveClaim(claim.id, resolution, notes.trim(), currentUser);
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
        <DialogTitle className="text-slate-900 text-sm">
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
            "{claim.complaintReason}"
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
                  ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 font-bold ring-1 ring-indigo-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className="h-4 w-4 text-indigo-600" />
              <span className="text-xs">Replace Unit</span>
              <span className="text-[10px] text-slate-400 font-normal">Issue new stock</span>
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

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Technical Findings & Resolution Notes <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record technical inspection outcome, root cause, and warranty resolution remarks..."
            className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? 'Saving...' : 'Finalize Resolution'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
