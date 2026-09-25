import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { ShopWarrantyFollowUp } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle, ClipboardList } from 'lucide-react';

interface RecordFollowUpModalProps {
  followUp: ShopWarrantyFollowUp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecordFollowUpModal({
  followUp,
  open,
  onOpenChange,
  onSuccess,
}: RecordFollowUpModalProps) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState('');
  const [collectedCount, setCollectedCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please enter visit notes or discussion summary.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await warrantyService.recordFollowUp(
        followUp.customerId,
        notes.trim(),
        currentUser,
        Number(collectedCount) || 0
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to record shop follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900 text-sm">
          <ClipboardList className="h-4 w-4 text-primary" />
          Field Follow-up: {followUp.customerName}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase">Units Sold</span>
            <span className="text-sm font-bold text-slate-900">{followUp.totalUnitsSold}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase">Cards Received</span>
            <span className="text-sm font-bold text-emerald-700">{followUp.warrantyNotesReceived}</span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
            <span className="block text-[10px] text-amber-700 uppercase font-semibold">Pending</span>
            <span className="text-sm font-bold text-amber-900">{followUp.pendingNotesCount}</span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Physical Warranty Cards Collected During Visit
          </label>
          <Input
            type="number"
            min={0}
            max={followUp.pendingNotesCount}
            value={collectedCount}
            onChange={(e) => setCollectedCount(parseInt(e.target.value, 10) || 0)}
            placeholder="0"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Enter the number of completed customer warranty cards retrieved from this shopkeeper.
          </p>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Shop Visit Notes <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes on card collection status, contractor sales, shopkeeper feedback..."
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
            {loading ? 'Recording...' : 'Save Follow-up'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
