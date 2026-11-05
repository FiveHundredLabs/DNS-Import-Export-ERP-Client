import { useState } from 'react';
import { Payment } from '../../types/payment';
import { printerService } from '../../services/PrinterService';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import {
  Printer,
  CheckCircle2,
  X,
  Share2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface ThermalReceiptModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  payment: Payment | null;
  customerBalance?: number;
}

export function ThermalReceiptModal({
  isOpen,
  open,
  onClose,
  onOpenChange,
  payment,
  customerBalance,
}: ThermalReceiptModalProps) {
  const [copied, setCopied] = useState(false);

  const showModal = isOpen !== undefined ? isOpen : Boolean(open);
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  if (!showModal || !payment) return null;

  const handlePrintAndHandover = async () => {
    await printerService.printPaymentReceipt(payment, customerBalance, '80mm');
    toast.success(`Receipt ${payment.receiptNumber} printed & handed over!`);
    handleClose();
  };

  const handleShareWhatsApp = () => {
    const lines = [
      `*DNS IMPORT & EXPORT (PVT) LTD*`,
      `*COLLECTION ACKNOWLEDGEMENT*`,
      `---------------------------------`,
      `*Receipt No:* ${payment.receiptNumber}`,
      `*Date:* ${new Date(payment.collectedAt).toLocaleDateString()} ${new Date(payment.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      `*Customer:* ${payment.customerName}`,
      `*Officer:* ${payment.salesRepName}`,
      `*Payment Method:* ${payment.paymentMethod}`,
      payment.chequeNumber ? `*Cheque No:* ${payment.chequeNumber} (${payment.bankName || ''})` : null,
      `*Amount Paid:* LKR ${payment.amount.toLocaleString()}`,
      payment.invoiceAllocations && payment.invoiceAllocations.length > 0
        ? `*Settled Invoices:*\n${payment.invoiceAllocations.map((a) => ` • ${a.invoiceNumber}: LKR ${a.allocatedAmount.toLocaleString()}`).join('\n')}`
        : null,
      customerBalance !== undefined ? `*Remaining Ledger Due:* LKR ${customerBalance.toLocaleString()}` : null,
      `---------------------------------`,
      `_Thank you for your business!_`,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      navigator.share({ title: `Receipt ${payment.receiptNumber}`, text: lines }).catch(() => {});
    } else {
      navigator.clipboard.writeText(lines);
      setCopied(true);
      toast.success('Receipt details copied! Paste in WhatsApp or SMS.');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formattedDate = new Date(payment.collectedAt).toLocaleDateString('en-GB');
  const formattedTime = new Date(payment.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0 duration-150">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />

      {/* Main Responsive Modal Card */}
      <div className="relative z-[101] w-full max-w-[420px] max-h-[94dvh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95">
        
        {/* Clean Responsive Header (Always 80mm Bill) */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2">
          {/* Title & Icon */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 border border-slate-700">
              <Printer className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate leading-tight">
                Thermal Receipt Preview
              </h2>
              <span className="text-[11px] text-slate-400 font-mono block truncate">
                Ref: {payment.receiptNumber}
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close receipt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body (Pure Black & White Standard 80mm Paper) */}
        <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4 bg-slate-950/60 flex justify-center items-start">
          <div className="w-full max-w-[320px] sm:max-w-[330px] text-xs p-4 sm:p-5 bg-white text-black shadow-2xl rounded-none font-mono border border-neutral-300 my-auto">
            
            {/* Top Serrated Edge Graphic */}
            <div className="w-full flex justify-center mb-2 overflow-hidden opacity-25 select-none text-black">
              <span className="text-[8px] tracking-widest font-mono">
                ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
              </span>
            </div>

            {/* Company Branding (Pure Black & White) */}
            <div className="text-center text-black">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-6 h-6 rounded bg-white p-0.5 border border-neutral-300 flex items-center justify-center overflow-hidden shrink-0">
                  <img src="/logo.png" alt="DNS Logo" className="h-full w-full object-contain" />
                </div>
                <span className="font-extrabold text-sm sm:text-base tracking-wide text-black">
                  DNS IMPORT & EXPORT (PVT) LTD
                </span>
              </div>
              <div className="text-[10px] text-neutral-700 font-sans font-medium">
                Official Electrical & Technology Wholesaler
              </div>
              <div className="text-[10px] text-neutral-700">
                Colombo 11, Sri Lanka | Tel: +94 11 234 5678
              </div>
              <div className="text-[10px] text-neutral-600">
                VAT Reg: 109847291-7000
              </div>
            </div>

            {/* Black Dashed Divider */}
            <div className="border-t border-dashed border-black my-2.5" />

            {/* Document Title Badge (Crisp Monochrome) */}
            <div className="text-center">
              <div className="inline-block border border-black bg-black text-white text-[10px] sm:text-[11px] font-bold px-3 py-0.5 uppercase tracking-wider">
                {payment.status === 'APPROVED' ? 'OFFICIAL RECEIPT' : 'COLLECTION ACKNOWLEDGEMENT'}
              </div>
              <div className="text-[9.5px] text-neutral-600 mt-1 uppercase tracking-wide">
                Authorized Field Rep Collection Slip
              </div>
            </div>

            {/* Black Dashed Divider */}
            <div className="border-t border-dashed border-black my-2" />

            {/* Meta Key-Value Details */}
            <div className="space-y-1 text-black">
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-600">Rcpt No:</span>
                <span className="font-bold text-black text-[12px]">{payment.receiptNumber}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-600">Date &amp; Time:</span>
                <span className="text-black">{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between items-start gap-2 pt-0.5">
                <span className="text-neutral-600 shrink-0">Customer:</span>
                <span className="font-bold text-right text-black break-words leading-tight">
                  {payment.customerName}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-0.5">
                <span className="text-neutral-600">Officer:</span>
                <span className="text-black font-medium">{payment.salesRepName}</span>
              </div>
            </div>

            {/* Black Dashed Divider */}
            <div className="border-t border-dashed border-black my-2.5" />

            {/* Payment Method Details (Monochrome Box) */}
            <div className="space-y-1 border border-black p-2 text-black">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px]">Method:</span>
                <span className="font-black text-[11px] uppercase tracking-wide border border-black px-1.5 py-0.5">
                  {payment.paymentMethod}
                </span>
              </div>
              {payment.chequeNumber && (
                <div className="flex justify-between text-[11px] pt-0.5">
                  <span className="text-neutral-700">Cheque No:</span>
                  <span className="font-bold">{payment.chequeNumber}</span>
                </div>
              )}
              {payment.bankName && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-700">Drawee Bank:</span>
                  <span>{payment.bankName}</span>
                </div>
              )}
              {payment.chequeDate && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-neutral-700">Cheque Date:</span>
                  <span>{payment.chequeDate}</span>
                </div>
              )}
            </div>

            {/* Amount Paid Big Display (Pure Black & White Solid Block) */}
            <div className="my-2.5 p-2 bg-black text-white text-center">
              <div className="text-[10px] uppercase tracking-widest font-bold text-neutral-300">
                Amount Paid
              </div>
              <div className="text-base sm:text-lg font-black tracking-tight mt-0.5 tabular-nums text-white">
                {formatCurrency(payment.amount)}
              </div>
            </div>

            {/* Settled Invoices Table */}
            {payment.invoiceAllocations && payment.invoiceAllocations.length > 0 && (
              <>
                <div className="border-t border-dashed border-black my-2" />
                <div className="font-bold text-[10.5px] uppercase text-black mb-1 flex justify-between">
                  <span>Settled Invoices</span>
                  <span>Amount</span>
                </div>
                <div className="space-y-0.5 text-black">
                  {payment.invoiceAllocations.map((alloc) => (
                    <div key={alloc.invoiceId} className="flex justify-between items-baseline text-[11px] py-0.5">
                      <span className="truncate max-w-[160px] font-medium">
                        {alloc.invoiceNumber}
                      </span>
                      <span className="font-bold tabular-nums">
                        {formatCurrency(alloc.allocatedAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Notes / Ledger reference if present */}
            {payment.notes && (
              <>
                <div className="border-t border-dashed border-black my-2" />
                <div className="text-[10.5px] text-black text-left">
                  <span className="font-bold">Reference / Ledger:</span>{' '}
                  <span className="text-neutral-800 break-words">{payment.notes}</span>
                </div>
              </>
            )}

            {/* Remaining Ledger Balance Due */}
            {customerBalance !== undefined && (
              <>
                <div className="border-t border-dashed border-black my-2" />
                <div className="flex justify-between items-center py-1 border-t border-b border-black text-[11px]">
                  <span className="font-bold text-black">Remaining Ledger Due:</span>
                  <span className="font-black text-black tabular-nums">
                    {formatCurrency(customerBalance)}
                  </span>
                </div>
              </>
            )}

            {/* Thank You Note */}
            <div className="border-t border-dashed border-black mt-3 pt-2 text-center text-black">
              <div className="text-[10px] font-bold tracking-wide">
                Thank you for your business!
              </div>
            </div>

            {/* Bottom Serrated Edge Graphic */}
            <div className="w-full flex justify-center mt-2 overflow-hidden opacity-25 select-none text-black">
              <span className="text-[8px] tracking-widest font-mono">
                ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Mobile-Optimized Footer Action Bar */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-800 bg-slate-900/95 space-y-2">
          {/* Quick WhatsApp Share Action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="w-full border-slate-700 bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 text-xs gap-1.5 h-9"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-white" /> : <Share2 className="h-3.5 w-3.5 text-slate-300" />}
            {copied ? 'Copied Receipt Details' : 'Share Receipt via WhatsApp'}
          </Button>

          {/* Primary Action Button: Print & Handover */}
          <Button
            type="button"
            size="sm"
            onClick={handlePrintAndHandover}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 h-10 shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Print &amp; Handover
          </Button>

          {/* Dismiss Text Link */}
          <div className="text-center pt-0.5">
            <button
              type="button"
              onClick={handleClose}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline decoration-slate-600 hover:decoration-slate-400 cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
