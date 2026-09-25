import { useState } from 'react';
import { Quotation, ConvertedOrderPayload } from '../../types/quotation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface QuotationConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  onConfirmConvert: (details: {
    deliveryAddress?: string;
    deliveryDate?: string;
    customerPoNumber?: string;
  }) => Promise<ConvertedOrderPayload>;
  onSuccess?: (result: ConvertedOrderPayload) => void;
}

export function QuotationConvertModal({
  isOpen,
  onClose,
  quotation,
  onConfirmConvert,
  onSuccess,
}: QuotationConvertModalProps) {
  const [deliveryAddress, setDeliveryAddress] = useState(quotation.customerAddressSnapshot || '');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertedOrder, setConvertedOrder] = useState<ConvertedOrderPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await onConfirmConvert({
        deliveryAddress,
        deliveryDate,
        customerPoNumber: customerPoNumber.trim() || undefined,
      });
      setConvertedOrder(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert quotation to order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setConvertedOrder(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Convert Quotation to Sales Order
          </DialogTitle>
          <DialogDescription>
            Generate an official enterprise Sales Order directly from Quotation{' '}
            <strong className="font-mono text-slate-800">{quotation.quotationNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        {convertedOrder ? (
          <div className="space-y-4 py-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-bold text-emerald-900 text-base">Order Converted Successfully!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Sales Order <span className="font-mono font-bold">{convertedOrder.orderNumber}</span> has been created
                with full historical pricing snapshot integrity.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Quotation Ref:</span>
                <span className="font-mono font-semibold text-slate-800">{convertedOrder.quotationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{convertedOrder.customerNameSnapshot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items:</span>
                <span className="font-semibold text-slate-800">{convertedOrder.items.length} Lines</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="text-slate-700">Total Order Value:</span>
                <span className="text-primary-text">{formatCurrency(convertedOrder.totalAmount)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-primary-border/40 bg-primary-light/70 p-3 text-xs text-indigo-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Snapshot Integrity Guaranteed
              </div>
              <p className="text-[11px] text-primary-text leading-relaxed">
                Unit prices, discounts, and item specifications from quotation{' '}
                <span className="font-mono font-semibold">{quotation.quotationNumber}</span> are locked and
                copied as immutable snapshots. Future price changes to the Product Master will not alter this order.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Customer:</span>
                <p className="font-semibold text-slate-800 truncate">{quotation.customerNameSnapshot}</p>
              </div>
              <div>
                <span className="text-slate-500">Total Quoted Value:</span>
                <p className="font-semibold text-primary-text">{formatCurrency(quotation.totalAmount)}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Delivery Address <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter fulfillment delivery address"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Requested Delivery Date <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Customer PO # (Optional)
                  </label>
                  <Input
                    value={customerPoNumber}
                    onChange={(e) => setCustomerPoNumber(e.target.value)}
                    placeholder="e.g. PO-89472"
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConvert}
                disabled={isSubmitting || !deliveryAddress}
                className="bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5"
              >
                {isSubmitting ? 'Converting...' : 'Confirm Conversion'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
