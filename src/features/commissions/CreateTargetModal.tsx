import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { commissionService } from '../../services/CommissionService';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_USERS } from '../../mock/mockUsers';
import { TargetPeriodType } from '../../types/commission';
import { Target, AlertTriangle } from 'lucide-react';

interface CreateTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTargetModal({ open, onOpenChange, onSuccess }: CreateTargetModalProps) {
  const { currentUser } = useAuth();
  const salesReps = MOCK_USERS.filter((u) => u.role === 'SALES_REP' || u.role === 'AREA_MANAGER');

  const [salesRepId, setSalesRepId] = useState(salesReps[0]?.id || 'usr-106');
  const [periodType, setPeriodType] = useState<TargetPeriodType>('MONTHLY');
  const [startDate, setStartDate] = useState('2025-03-01');
  const [endDate, setEndDate] = useState('2025-03-31');
  const [targetAmount, setTargetAmount] = useState<number>(2500000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAmount || targetAmount <= 0) {
      setError('Target amount must be greater than zero.');
      return;
    }

    const rep = salesReps.find((r) => r.id === salesRepId);
    if (!rep) {
      setError('Please select a valid sales representative.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await commissionService.setSalesTarget(
        {
          salesRepId: rep.id,
          salesRepName: rep.name,
          periodType,
          startDate,
          endDate,
          targetAmount: Number(targetAmount),
        },
        currentUser
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to configure sales target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900 text-sm">
          <Target className="h-4 w-4 text-primary" />
          Configure Sales Rep Target
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Sales Representative <span className="text-rose-500">*</span>
          </label>
          <select
            value={salesRepId}
            onChange={(e) => setSalesRepId(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {salesReps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Period Cycle</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as TargetPeriodType)}
              className="w-full rounded-md border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Target Value (LKR) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              min={10000}
              step={10000}
              value={targetAmount}
              onChange={(e) => setTargetAmount(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
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
            {loading ? 'Configuring...' : 'Set Sales Target'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
