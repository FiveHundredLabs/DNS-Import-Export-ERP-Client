import React, { useState } from 'react';
import { CashHandover } from '../../../types/handover';
import { User } from '../../../types/auth';
import { handoverService } from '../../../services/HandoverService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import {
  Banknote,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  FileText,
  Clock,
  ArrowRight,
  Building,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface HandoverDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  handover: CashHandover | null;
  currentUser: User;
  onUpdate: (updatedHandover: CashHandover) => void;
}

export function HandoverDetailModal({
  isOpen,
  onClose,
  handover,
  currentUser,
  onUpdate,
}: HandoverDetailModalProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!handover) return null;

  const isFinanceUser = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER', 'CASHIER'].includes(currentUser.role);
  const isPending = handover.status === 'PENDING_APPROVAL';

  const handleApprove = async () => {
    try {
      setProcessing(true);
      setError(null);
      const updated = await handoverService.approveHandover(
        handover.id,
        currentUser,
        approvalComment.trim() || undefined
      );
      onUpdate(updated);
      onClose();
    } catch (err: any) {
      console.error('Handover approval error:', err);
      setError(err?.message || 'Failed to approve cash handover.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('A mandatory reason is required to reject a cash handover.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const updated = await handoverService.rejectHandover(
        handover.id,
        currentUser,
        rejectionReason.trim()
      );
      onUpdate(updated);
      onClose();
    } catch (err: any) {
      console.error('Handover rejection error:', err);
      setError(err?.message || 'Failed to reject cash handover.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !processing && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] rounded-3xl p-5 sm:p-7 bg-white space-y-4 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="p-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Daily Cash Handover: {handover.handoverNumber}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Submitted: {formatDateTime(handover.submittedAt)}
                </p>
              </div>
            </div>

            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold border',
                handover.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : handover.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              )}
            >
              {handover.status === 'APPROVED' && 'Approved & Settled'}
              {handover.status === 'REJECTED' && 'Rejected by Finance'}
              {handover.status === 'PENDING_APPROVAL' && 'Pending Finance Approval'}
            </span>
          </div>
        </DialogHeader>

        {/* Handover Executive Summary (User Prompt Specification) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sales Rep</span>
              <span className="font-bold text-slate-900 block mt-0.5">{handover.salesRepName}</span>
              <span className="text-[11px] text-slate-500 font-mono">{handover.salesRepEmail || 'Field Officer'}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Received By</span>
              <span className="font-bold text-slate-900 block mt-0.5">{handover.recipientUserName}</span>
              <span className="text-[11px] text-emerald-700 font-semibold">{handover.recipientUserRole}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customers</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm block mt-0.5">
                {handover.customerCount} Customers
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoices</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm block mt-0.5">
                {handover.invoiceCount} Invoices
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-slate-600">Total Handover Amount:</span>
            <AmountDisplay amount={handover.totalAmount} className="text-xl sm:text-2xl font-black text-slate-900" />
          </div>

          {handover.notes && (
            <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-700">Remarks:</span> {handover.notes}
            </div>
          )}
        </div>

        {/* Audit Trail: Status notices */}
        {handover.status === 'APPROVED' && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Verified & Approved by {handover.approvedByName}</span>
            </div>
            <p className="text-[11.5px] text-emerald-800">
              Approved on {formatDateTime(handover.approvedAt!)}. All {handover.invoiceCount} invoices have been officially credited and customer ledger balances updated.
            </p>
          </div>
        )}

        {handover.status === 'REJECTED' && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <XCircle className="h-4 w-4 text-rose-600" />
              <span>Rejected by {handover.rejectedByName} on {formatDateTime(handover.rejectedAt!)}</span>
            </div>
            <p className="text-[11.5px] text-rose-800">
              <strong>Mandatory Reason:</strong> {handover.rejectionReason}
            </p>
          </div>
        )}

        {/* Itemized Collections & Invoices Breakdown */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block px-1">
            Itemized Collections & Invoices ({handover.items.length})
          </span>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {handover.items.map((item, idx) => (
              <div
                key={item.paymentId || idx}
                className="p-3 rounded-2xl border border-slate-200 bg-white text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 block">{item.customerName}</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {item.customerCode} • Receipt: {item.receiptNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 text-sm block">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {item.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Invoices breakdown */}
                {item.invoiceAllocations && item.invoiceAllocations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Invoices Credited:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {item.invoiceAllocations.map((alloc) => (
                        <div
                          key={alloc.invoiceId}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px]"
                        >
                          <span className="font-mono font-semibold text-slate-700">
                            {alloc.invoiceNumber}
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(alloc.allocatedAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Finance Actions: Approve or Reject */}
        {isFinanceUser && isPending && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            {rejectMode ? (
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs">
                <span className="font-bold text-rose-950 block text-[11px] uppercase tracking-wider">
                  Mandatory Rejection Explanation
                </span>
                <p className="text-[11px] text-rose-800">
                  Please provide a clear reason for the Sales Rep (e.g. Cash shortfall of LKR 500, missing bank receipt slip).
                </p>
                <Input
                  required
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-white text-xs h-9"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRejectMode(false);
                      setRejectionReason('');
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    {processing ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Approval remark (optional, e.g. Cash counted and stored in safe)..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="bg-white text-xs h-9"
                />
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRejectMode(true)}
                    disabled={processing}
                    className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs font-semibold h-11 rounded-xl"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject Handover
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApprove}
                    disabled={processing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-11 rounded-xl shadow-xs gap-1.5"
                  >
                    {processing ? (
                      'Approving & Settling...'
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Approve Handover & Settle Payments</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="p-0 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-10 rounded-xl text-xs font-semibold"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
