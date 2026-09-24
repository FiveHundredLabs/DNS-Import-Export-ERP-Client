import { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Customer, CommercialTerms } from '../../types/customer';
import { determineCustomerApprovalRoute } from '../../rules/approvalRules';

interface CustomerCommercialApprovalModalProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitTerms: (customerId: string, terms: CommercialTerms) => Promise<void>;
}

export function CustomerCommercialApprovalModal({
  customer,
  open,
  onOpenChange,
  onSubmitTerms,
}: CustomerCommercialApprovalModalProps) {
  const [creditLimit, setCreditLimit] = useState<number>(customer?.commercialTerms.creditLimit || 1000000);
  const [creditDays, setCreditDays] = useState<number>(customer?.commercialTerms.creditDays || 30);
  const [defaultDiscount, setDefaultDiscount] = useState<number>(customer?.commercialTerms.defaultDiscountPercentage || 5);
  const [maxDiscount, setMaxDiscount] = useState<number>(customer?.commercialTerms.maxDiscountPercentage || 10);
  const [notes, setNotes] = useState(customer?.commercialTerms.paymentTermNotes || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer && open) {
      setCreditLimit(customer.commercialTerms.creditLimit);
      setCreditDays(customer.commercialTerms.creditDays);
      setDefaultDiscount(customer.commercialTerms.defaultDiscountPercentage);
      setMaxDiscount(customer.commercialTerms.maxDiscountPercentage);
      setNotes(customer.commercialTerms.paymentTermNotes || '');
    }
  }, [customer, open]);

  if (!customer) return null;

  const routeEvaluation = determineCustomerApprovalRoute(creditDays, creditLimit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onSubmitTerms(customer.id, {
        creditLimit: Number(creditLimit),
        creditDays: Number(creditDays),
        defaultDiscountPercentage: Number(defaultDiscount),
        maxDiscountPercentage: Number(maxDiscount),
        paymentTermNotes: notes,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Configure Commercial Terms & Routing</DialogTitle>
        <DialogDescription>
          {customer.name} ({customer.code}) • Set credit parameters & discount privileges
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Credit Limit (LKR)
            </label>
            <Input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Credit Days (Terms)
            </label>
            <Input
              type="number"
              value={creditDays}
              onChange={(e) => setCreditDays(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Discount (%)
            </label>
            <Input
              type="number"
              value={defaultDiscount}
              onChange={(e) => setDefaultDiscount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Allowable Discount (%)
            </label>
            <Input
              type="number"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Dynamic Approval Routing Feedback */}
        <div
          className={`p-3 rounded-lg border text-xs ${
            routeEvaluation.isExceptional
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center justify-between font-semibold">
            <span>Approval Destination:</span>
            <span className="uppercase tracking-wider font-bold">
              {routeEvaluation.targetRole} APPROVAL
            </span>
          </div>
          <p className="mt-1 text-[11px]">{routeEvaluation.reason}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Commercial Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Security cheques deposited, bank guarantees, etc."
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Routing...' : `Submit to ${routeEvaluation.targetRole}`}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
