import React, { useState, useEffect, useMemo } from 'react';
import { Payment } from '../../../types/payment';
import { User } from '../../../types/auth';
import { CashHandover } from '../../../types/handover';
import { handoverService } from '../../../services/HandoverService';
import { UserSearchPicker } from './UserSearchPicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import {
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  FileText,
  Clock,
  ArrowRight,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface CashHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onHandoverSuccess: (handover: CashHandover) => void;
}

export function CashHandoverModal({
  isOpen,
  onClose,
  currentUser,
  onHandoverSuccess,
}: CashHandoverModalProps) {
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [eligiblePayments, setEligiblePayments] = useState<Payment[]>([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load eligible collections when modal opens
  useEffect(() => {
    async function load() {
      if (!isOpen) return;
      try {
        setLoadingPayments(true);
        setError(null);
        const payments = await handoverService.getEligibleCollectionsForHandover(
          currentUser.role === 'SALES_REP' ? currentUser.id : undefined
        );
        setEligiblePayments(payments);
        // Pre-select all unhanded collections by default
        setSelectedPaymentIds(new Set(payments.map((p) => p.id)));
      } catch (err: any) {
        console.error('Failed to load eligible collections for handover:', err);
        setError('Failed to load collections. Please try again.');
      } finally {
        setLoadingPayments(false);
      }
    }
    load();
  }, [isOpen, currentUser.id, currentUser.role]);

  // Selected payments
  const selectedPayments = useMemo(() => {
    return eligiblePayments.filter((p) => selectedPaymentIds.has(p.id));
  }, [eligiblePayments, selectedPaymentIds]);

  // Aggregate totals
  const totalAmount = useMemo(() => {
    return selectedPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [selectedPayments]);

  const uniqueCustomerCount = useMemo(() => {
    return new Set(selectedPayments.map((p) => p.customerId)).size;
  }, [selectedPayments]);

  const totalInvoiceCount = useMemo(() => {
    return selectedPayments.reduce((sum, p) => sum + (p.invoiceAllocations?.length || 1), 0);
  }, [selectedPayments]);

  const togglePayment = (id: string) => {
    const next = new Set(selectedPaymentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPaymentIds(next);
  };

  const toggleAll = () => {
    if (selectedPaymentIds.size === eligiblePayments.length) {
      setSelectedPaymentIds(new Set());
    } else {
      setSelectedPaymentIds(new Set(eligiblePayments.map((p) => p.id)));
    }
  };

  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRecipient) {
      setError('Please select the Finance Department person receiving the money.');
      return;
    }

    if (selectedPaymentIds.size === 0) {
      setError('Please select at least one customer collection to include in the handover.');
      return;
    }

    try {
      setSubmitting(true);
      const handover = await handoverService.createHandover(
        {
          recipientUserId: selectedRecipient.id,
          paymentIds: Array.from(selectedPaymentIds),
          notes: notes.trim() || undefined,
        },
        currentUser
      );

      onHandoverSuccess(handover);
      onClose();
    } catch (err: any) {
      console.error('Handover creation error:', err);
      setError(err?.message || 'Failed to submit cash handover.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] rounded-3xl p-5 sm:p-7 bg-white space-y-4 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Daily Cash Handover to Finance
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Hand over collected customer payments to the Finance Department for verification & ledger settlement.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleConfirmHandover} className="space-y-4">
          {/* Step 1: Searchable Finance User Selection (GitHub style) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <UserSearchPicker
              selectedUserId={selectedRecipient?.id}
              onSelectUser={(user) => {
                setSelectedRecipient(user);
                setError(null);
              }}
              placeholder="Type recipient name (e.g. Nimal Perera, Dilani)..."
            />

            {selectedRecipient && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Designated recipient: <strong>{selectedRecipient.name}</strong> (
                  {selectedRecipient.title || 'Finance Officer'}). Physical cash will be reconciled with this officer.
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Total Handover Summary Box */}
          <div className="rounded-2xl sm:rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] via-primary-light/40 to-white p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Handover Amount
                </span>
                <AmountDisplay amount={totalAmount} className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5" />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customers</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {uniqueCustomerCount}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoices</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {totalInvoiceCount}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-center shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Collections</span>
                  <span className="text-xs font-bold text-primary font-mono">
                    {selectedPayments.length} of {eligiblePayments.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Breakdown of Invoices and Customer Payments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Included Customer Collections & Invoices
              </span>
              {eligiblePayments.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {selectedPaymentIds.size === eligiblePayments.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {loadingPayments ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading collections...</div>
            ) : eligiblePayments.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700">No Pending Collections Available</p>
                <p className="text-[11px]">
                  All your customer collections have already been handed over or verified.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {eligiblePayments.map((p) => {
                  const isChecked = selectedPaymentIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePayment(p.id)}
                      className={cn(
                        'p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-xs select-none',
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 opacity-60'
                      )}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-emerald-600 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePayment(p.id);
                        }}
                      >
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {p.customerName}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>{p.receiptNumber}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold">{p.paymentMethod}</span>
                          <span>•</span>
                          <span>{formatDate(p.collectedAt)}</span>
                        </div>

                        {/* Invoice breakdown lines */}
                        {p.invoiceAllocations && p.invoiceAllocations.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                            {p.invoiceAllocations.map((alloc) => (
                              <span
                                key={alloc.invoiceId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-white border border-slate-200 font-mono"
                              >
                                <strong>{alloc.invoiceNumber}</strong>: {formatCurrency(alloc.allocatedAmount)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Handover Remarks */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Handover Remarks (Optional)
            </label>
            <Input
              placeholder="e.g. Colombo route afternoon cash handover, physical bills verified"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs rounded-xl bg-white"
            />
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Governance Notice */}
          <div className="rounded-xl bg-slate-100 p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
            <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Once submitted, this handover will be locked in <strong>Pending Finance Approval</strong>. Collections will not be editable until verified and settled by Finance.
            </p>
          </div>

          {/* Modal Actions */}
          <DialogFooter className="p-0 pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
              className="h-11 rounded-xl text-xs font-semibold w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || selectedPaymentIds.size === 0 || !selectedRecipient}
              className="h-11 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 flex-1"
            >
              {submitting ? (
                'Submitting Handover...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Confirm Handover ({formatCurrency(totalAmount)})
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
