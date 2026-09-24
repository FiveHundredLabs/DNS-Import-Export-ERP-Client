import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { ApprovalRequest, ApprovalActionType } from '../../types/approval';
import { UserRole } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';

interface ApprovalActionDialogProps {
  request: ApprovalRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: (
    action: ApprovalActionType,
    comment: string,
    targetRole?: UserRole
  ) => Promise<void>;
}

export function ApprovalActionDialog({
  request,
  open,
  onOpenChange,
  onActionComplete,
}: ApprovalActionDialogProps) {
  const { currentUser } = useAuth();
  const [action, setAction] = useState<ApprovalActionType>('APPROVE');
  const [comment, setComment] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('MANAGER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide a justification comment.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onActionComplete(action, comment, action === 'ESCALATE' ? targetRole : undefined);
      setComment('');
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Process Approval Request</DialogTitle>
        <DialogDescription>
          Reference: <span className="font-mono font-bold text-slate-800">{request.documentReferenceNumber}</span> - {request.title}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {request.isSpecialScenario && (
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800">
            <span className="font-bold">⚠️ Special Scenario Flagged:</span> {request.specialReason}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Action</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAction('APPROVE')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                action === 'APPROVE'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setAction('REJECT')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                action === 'REJECT'
                  ? 'border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setAction('ESCALATE')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                action === 'ESCALATE'
                  ? 'border-sky-600 bg-sky-50 text-sky-700 ring-2 ring-sky-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Escalate
            </button>
          </div>
        </div>

        {action === 'ESCALATE' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Escalate To</label>
            <Select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as UserRole)}
            >
              {currentUser.role === 'SALES_MANAGER' && (
                <>
                  <option value="MANAGER">Operational Manager</option>
                  <option value="DIRECTOR">Director (Executive Escalation)</option>
                </>
              )}
              {currentUser.role === 'MANAGER' && (
                <option value="DIRECTOR">Director (Executive Escalation)</option>
              )}
            </Select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason / Justification Comment <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Explain the rationale for this approval decision..."
            className="w-full rounded-md border border-slate-300 p-2 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            variant={action === 'REJECT' ? 'destructive' : 'default'}
          >
            {loading ? 'Processing...' : `Confirm ${action}`}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
