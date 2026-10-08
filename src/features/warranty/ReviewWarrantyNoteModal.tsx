import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { WarrantyNote } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';

interface ReviewWarrantyNoteModalProps {
  note: WarrantyNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReviewWarrantyNoteModal({
  note,
  open,
  onOpenChange,
  onSuccess,
}: ReviewWarrantyNoteModalProps) {
  const { currentUser } = useAuth();
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!note) return null;

  const handleAction = async (action: 'VERIFY' | 'REJECT') => {
    if (action === 'REJECT' && !reviewNotes.trim()) {
      setError('Please provide a reason or comment when rejecting a distributor warranty note.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await warrantyService.reviewWarrantyNote(
        note.id,
        action,
        reviewNotes.trim(),
        currentUser
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to review warranty note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
          <FileCheck2 className="h-5 w-5 text-primary" />
          Review Distributor Warranty Note — {note.noteNumber}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 text-xs">
        {/* Context Alert */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Distributor Warranty Validation Protocol
          </div>
          <p>
            Because DNS ERP supplies distributors and does not sell directly to retail end customers,
            warranty claims must be verified against this distributor warranty note.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Note & Product Metadata Summary */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Distributor</span>
            <span className="font-semibold text-slate-900 block truncate">{note.distributorName}</span>
            <span className="text-[11px] font-mono text-primary">Invoice: {note.invoiceNumber}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Product / SKU</span>
            <span className="font-semibold text-slate-900 block truncate">{note.productName}</span>
            <span className="text-[11px] font-mono text-slate-500">SN: {note.serialNumber || 'N/A'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Distributor Sale Date</span>
            <span className="font-semibold text-slate-900">{formatDate(note.distributorSaleDate)}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Received at DNS</span>
            <span className="font-semibold text-slate-900">{formatDate(note.receivedDate)}</span>
          </div>

          <div className="col-span-2 pt-1 border-t border-slate-200/60">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Retail End Customer</span>
            <span className="font-semibold text-slate-900">{note.endCustomerName || 'Not specified'}</span>
            {note.endCustomerPhone && (
              <span className="text-[11px] text-slate-500 block">Phone: {note.endCustomerPhone}</span>
            )}
            {note.endCustomerAddress && (
              <span className="text-[11px] text-slate-500 block">Address: {note.endCustomerAddress}</span>
            )}
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="space-y-1.5 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/70 text-[11px] text-emerald-900">
          <span className="font-semibold block text-emerald-950">Verification Checklist:</span>
          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            Distributor official seal/stamp confirmed on warranty card
          </div>
          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            Unit serial number verified against warehouse batch dispatch record
          </div>
          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            Retail sale date verified within manufacturer coverage limits
          </div>
        </div>

        {/* Reviewer Comments */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Sales Manager Review Comments / Findings
          </label>
          <Input
            type="text"
            placeholder="e.g. Card verified against distributor register. Serial number matches."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="text-xs h-9"
          />
        </div>

        <DialogFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAction('REJECT')}
              disabled={loading}
              className="text-rose-600 border-rose-300 hover:bg-rose-50 gap-1"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject Note
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleAction('VERIFY')}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verify & Validate Note
            </Button>
          </div>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
