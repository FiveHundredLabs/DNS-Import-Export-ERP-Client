import { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatters';
import { determinePriceApprovalRoute } from '../../rules/approvalRules';
import { useAuth } from '../../hooks/useAuth';

interface ProductPriceProposalModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitProposal: (params: {
    productId: string;
    productSku: string;
    productName: string;
    currentSellingPrice: number;
    proposedSellingPrice: number;
    proposedMinSellingPrice: number;
    costPrice: number;
    reason: string;
    userId: string;
    userName: string;
  }) => Promise<void>;
}

export function ProductPriceProposalModal({
  product,
  open,
  onOpenChange,
  onSubmitProposal,
}: ProductPriceProposalModalProps) {
  const { currentUser } = useAuth();
  const [proposedPrice, setProposedPrice] = useState<number>(0);
  const [proposedMinPrice, setProposedMinPrice] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product && open) {
      setProposedPrice(product.pricing.currentSellingPrice);
      setProposedMinPrice(product.pricing.minimumSellingPrice);
      setReason('');
      setError(null);
    }
  }, [product, open]);

  if (!product) return null;

  const currentPrice = product.pricing.currentSellingPrice;
  const costPrice = product.pricing.costPrice;
  const effectiveProposedPrice = proposedPrice || currentPrice;
  const difference = effectiveProposedPrice - currentPrice;
  const diffPct = currentPrice > 0 ? (difference / currentPrice) * 100 : 0;

  const routeEvaluation = determinePriceApprovalRoute(
    costPrice,
    currentPrice,
    effectiveProposedPrice
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please enter a business justification for this price adjustment.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmitProposal({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        currentSellingPrice: currentPrice,
        proposedSellingPrice: effectiveProposedPrice,
        proposedMinSellingPrice: proposedMinPrice || product.pricing.minimumSellingPrice,
        costPrice,
        reason,
        userId: currentUser.id,
        userName: currentUser.name,
      });
      onOpenChange(false);
      setReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Propose Selling Price Change</DialogTitle>
        <DialogDescription>
          {product.name} (SKU: {product.sku})
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg text-xs border border-slate-200">
          <div>
            <span className="text-slate-500 block">Unit Cost Price</span>
            <span className="font-semibold text-slate-800">{formatCurrency(costPrice)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Selling Price</span>
            <span className="font-bold text-slate-900">{formatCurrency(currentPrice)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proposed Price (LKR)
            </label>
            <Input
              type="number"
              value={proposedPrice || ''}
              placeholder={currentPrice.toString()}
              onChange={(e) => setProposedPrice(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proposed Floor Limit (LKR)
            </label>
            <Input
              type="number"
              value={proposedMinPrice || ''}
              placeholder={product.pricing.minimumSellingPrice.toString()}
              onChange={(e) => setProposedMinPrice(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Real-time Business Rule Evaluation */}
        <div className="rounded-lg p-3 border border-slate-200 bg-white text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Price Variance:</span>
            <span className={`font-semibold ${difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {difference >= 0 ? '+' : ''}{formatCurrency(difference)} ({diffPct.toFixed(1)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Gross Margin:</span>
            <span className="font-semibold text-slate-900">{routeEvaluation.marginPercentage}%</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-slate-600">Approval Destination:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                routeEvaluation.requiresDirectorApproval
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {routeEvaluation.requiresDirectorApproval ? 'Director Approval Required' : 'Manager Sign-off'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 italic mt-1">{routeEvaluation.reason}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Business Justification <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Supplier raw material tariff increase / Promotional volume tier..."
            className="w-full rounded-md border border-slate-300 p-2 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Price Proposal'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
