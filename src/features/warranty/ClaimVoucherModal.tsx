import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { WarrantyClaim } from '../../types/warranty';
import { formatDate, formatDateTime } from '../../utils/formatters';
import {
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Clock,
  Store,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClaimVoucherModalProps {
  claim: WarrantyClaim | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaimVoucherModal({ claim, open, onOpenChange }: ClaimVoucherModalProps) {
  const [copied, setCopied] = useState(false);

  if (!claim) return null;

  const refCode = claim.referenceCode || `WRC-${claim.claimNumber.replace('CLM-', '')}`;
  const isFulfilled = claim.status === 'REPLACED';
  const expiresAt = claim.referenceCodeExpiresAt
    ? new Date(claim.referenceCodeExpiresAt)
    : new Date(new Date(claim.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);

  const now = new Date();
  const isExpired = !isFulfilled && now > expiresAt;
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(refCode);
      setCopied(true);
      toast.success('Reference code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-w-[95vw] w-full p-0 overflow-hidden rounded-2xl border-slate-200">
        <DialogHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary p-6 pr-12 text-white text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs text-white">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Warranty Replacement Voucher
                </DialogTitle>
                <p className="text-xs text-slate-300 mt-0.5">
                  Approved by Sales Manager · Authorized for Showroom POS Issuance
                </p>
              </div>
            </div>
            {isFulfilled && (
              <Badge
                variant="outline"
                className="border-emerald-400 bg-emerald-500/20 text-emerald-300 text-xs"
              >
                Fulfilled at POS
              </Badge>
            )}
            {isExpired && (
              <Badge
                variant="outline"
                className="border-rose-400 bg-rose-500/20 text-rose-300 text-xs"
              >
                Code Expired
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Reference Code Card */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-white p-6 text-center shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Store className="h-4 w-4 text-primary" /> Showroom POS Reference Code
              </span>
              <span className="text-slate-500 font-mono">Claim: {claim.claimNumber}</span>
            </div>

            <div className="my-4 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-slate-900 bg-white px-8 py-3 rounded-xl border border-slate-200/90 shadow-2xs whitespace-nowrap">
                {refCode}
              </span>

              {/* Barcode representation */}
              <div className="mt-3 flex flex-col items-center">
                <div className="flex items-center gap-[2px] h-10 px-4 py-1 bg-white rounded border border-slate-200">
                  {/* Stylized code 128 bars */}
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2].map(
                    (w, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900 h-full"
                        style={{ width: `${w * 1.5}px` }}
                      />
                    )
                  )}
                </div>
                <span className="text-[10px] font-mono tracking-widest text-slate-400 mt-1 uppercase">
                  *{refCode}*
                </span>
              </div>
            </div>

            {/* Validity alert banner */}
            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-xs font-medium ${
                isFulfilled
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : isExpired
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {isFulfilled ? (
                <span>
                  <strong>Replacement Issued:</strong> Handed over on{' '}
                  {claim.issuedAt ? formatDateTime(claim.issuedAt) : 'N/A'}.
                </span>
              ) : isExpired ? (
                <span>
                  <strong>Expired:</strong> Reference code expired on {formatDate(expiresAt.toISOString())}.
                </span>
              ) : (
                <span>
                  <strong>Strict 14-Day Validity:</strong> Expires on{' '}
                  <strong>{formatDate(expiresAt.toISOString())}</strong> ({daysRemaining} days remaining).
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Customer Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                Customer Details
              </span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{claim.customerName}</p>
                {claim.customerPhone && (
                  <p className="text-slate-500 mt-0.5">Phone: {claim.customerPhone}</p>
                )}
                {claim.endCustomerName && (
                  <p className="text-slate-500">End Customer: {claim.endCustomerName}</p>
                )}
              </div>
            </div>

            {/* Approved Product to Issue */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-emerald-600" /> Authorized Replacement Unit
              </span>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  {claim.replacementProductName || claim.productName}
                </p>
                <p className="text-slate-500 mt-0.5">
                  SKU: <strong>{claim.replacementProductSku || claim.sku}</strong> · Qty: 1 Unit
                </p>
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  Cashier will scan physical replacement barcode at POS.
                </p>
              </div>
            </div>

            {/* Defective Item Info */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-1.5 md:col-span-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                Defective Product & Claim Justification
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 pt-1">
                <div>
                  <span className="text-slate-400 block text-[11px]">Product / Model:</span>
                  <span className="font-medium text-slate-800">{claim.productName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Defective Barcode / SN:</span>
                  <span className="font-mono text-slate-800">
                    {claim.defectiveBarcode || claim.serialNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Approval Date:</span>
                  <span className="text-slate-800">
                    {claim.approvedAt ? formatDateTime(claim.approvedAt) : formatDate(claim.createdAt)}
                  </span>
                </div>
              </div>
              <div className="mt-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-slate-700">
                <span className="text-slate-400 block text-[11px]">Defect Reason:</span>
                <p className="italic mt-0.5">{claim.complaintReason}</p>
              </div>
            </div>

            {/* POS Fulfillment Section if already issued */}
            {isFulfilled && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 space-y-2 md:col-span-2 text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-bold text-sm">Issued by Showroom POS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-emerald-800 text-[11px] block">Replacement Note:</span>
                    <strong className="font-mono text-slate-900">{claim.replacementNoteNumber || 'RN-CONFIRMED'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-800 text-[11px] block">Issued Barcode:</span>
                    <strong className="font-mono text-slate-900">{claim.replacementBarcode || 'Scanned Unit'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-800 text-[11px] block">POS Terminal:</span>
                    <span className="text-slate-800">{claim.posTerminalId || 'Showroom POS'}</span>
                  </div>
                  <div>
                    <span className="text-emerald-800 text-[11px] block">Issued Date:</span>
                    <span className="text-slate-800">{claim.issuedAt ? formatDateTime(claim.issuedAt) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Showroom Instructions */}
          {!isFulfilled && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 text-xs text-blue-900">
              <Store className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Showroom Redemption Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 mt-1 text-blue-800">
                  <li>Present this voucher or Reference Code to any DNS Showroom Cashier.</li>
                  <li>The Cashier enters or scans the reference code directly in the Showroom POS system.</li>
                  <li>Upon scanning the replacement unit barcode, the POS prints your official Replacement Note.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="gap-1.5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Code Copied' : 'Copy Reference Code'}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
