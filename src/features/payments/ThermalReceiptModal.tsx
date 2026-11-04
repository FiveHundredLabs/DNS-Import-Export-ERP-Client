import { useState } from 'react';
import { Payment } from '../../types/payment';
import { printerService } from '../../services/PrinterService';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import { encodeCode128, generateCode128SvgPath } from '../../utils/code128';
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
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [copied, setCopied] = useState(false);

  const showModal = isOpen !== undefined ? isOpen : Boolean(open);
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  if (!showModal || !payment) return null;

  const handlePrint = async () => {
    await printerService.printPaymentReceipt(payment, customerBalance, paperWidth);
  };

  const handlePrintAndHandover = async () => {
    await printerService.printPaymentReceipt(payment, customerBalance, paperWidth);
    toast.success(`Receipt ${payment.receiptNumber} printed & handed over!`);
    handleClose();
  };

  const handleShareWhatsApp = () => {
    const lines = [
      `*DNS DISTRIBUTION (PVT) LTD*`,
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
      `_Subject to Finance Department realization._`,
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

  const is58mm = paperWidth === '58mm';

  // Generate real barcode SVG for receipt number
  let barcodeSvgPath = '';
  let barcodeTotalModules = 120;
  try {
    const codeData = encodeCode128(payment.receiptNumber || 'REC-0000', 10);
    barcodeSvgPath = generateCode128SvgPath(codeData, 28);
    barcodeTotalModules = codeData.totalModules;
  } catch {
    // fallback if barcode fails
  }

  const formattedDate = new Date(payment.collectedAt).toLocaleDateString('en-GB');
  const formattedTime = new Date(payment.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-0 duration-150">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />

      {/* Main Responsive Modal Card */}
      <div className="relative z-[101] w-full max-w-[440px] max-h-[94dvh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95">
        
        {/* Fixed Header */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Printer className="h-4 w-4" />
            </div>
            <div className="truncate">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
                Thermal Receipt Preview
              </h2>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block truncate">
                Ref: {payment.receiptNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Paper Width Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700/60 text-[11px]">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-1 rounded-md font-semibold transition-all ${
                  paperWidth === '80mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm Standard
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-1 rounded-md font-semibold transition-all ${
                  paperWidth === '58mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm Mobile
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close receipt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body (Optimized for Mobile Viewing) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 bg-slate-950/60 flex justify-center items-start">
          <div
            className={`transition-all bg-[#FAF8F2] text-slate-900 shadow-xl rounded-md font-mono border border-amber-200/60 my-auto ${
              is58mm ? 'w-full max-w-[265px] text-[11px] p-3' : 'w-full max-w-[340px] text-xs p-4 sm:p-5'
            }`}
          >
            {/* Top Serrated Sawtooth Edge Graphic */}
            <div className="w-full flex justify-center mb-2 overflow-hidden opacity-30 select-none">
              <span className="text-[9px] tracking-widest text-slate-500 font-mono">
                ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
              </span>
            </div>

            {/* Company Branding */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className="w-4 h-4 bg-slate-900 text-white rounded-xs flex items-center justify-center font-black text-[9px]">
                  D
                </span>
                <span className="font-extrabold text-sm sm:text-base tracking-wide text-slate-950">
                  DNS DISTRIBUTION (PVT) LTD
                </span>
              </div>
              <div className="text-[10px] text-slate-600 font-sans font-medium">
                Official Electrical & Technology Wholesaler
              </div>
              <div className="text-[10px] text-slate-600">
                Colombo 11, Sri Lanka | Tel: +94 11 234 5678
              </div>
              <div className="text-[10px] text-slate-500">
                VAT Reg: 109847291-7000
              </div>
            </div>

            {/* Dotted Divider */}
            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Document Title Badge */}
            <div className="text-center">
              <span className="inline-block bg-slate-900 text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {payment.status === 'APPROVED' ? 'OFFICIAL RECEIPT' : 'COLLECTION ACKNOWLEDGEMENT'}
              </span>
              <div className="text-[9.5px] text-slate-500 mt-1 uppercase tracking-wide">
                Authorized Field Rep Collection Slip
              </div>
            </div>

            {/* Dotted Divider */}
            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Meta Key-Value Details */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Rcpt No:</span>
                <span className="font-bold text-slate-900 text-[12px]">{payment.receiptNumber}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-800">{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between items-start gap-2 pt-0.5">
                <span className="text-slate-500 shrink-0">Customer:</span>
                <span className="font-bold text-right text-slate-900 break-words leading-tight">
                  {payment.customerName}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-0.5">
                <span className="text-slate-500">Officer:</span>
                <span className="text-slate-800 font-medium">{payment.salesRepName}</span>
              </div>
            </div>

            {/* Dotted Divider */}
            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Payment Method Details */}
            <div className="space-y-1 bg-amber-100/50 p-2 rounded border border-amber-200/80">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-semibold text-[11px]">Method:</span>
                <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-300 text-[11px]">
                  {payment.paymentMethod}
                </span>
              </div>
              {payment.chequeNumber && (
                <div className="flex justify-between text-[11px] pt-0.5">
                  <span className="text-slate-600">Cheque No:</span>
                  <span className="font-semibold text-slate-900">{payment.chequeNumber}</span>
                </div>
              )}
              {payment.bankName && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">Drawee Bank:</span>
                  <span className="text-slate-800">{payment.bankName}</span>
                </div>
              )}
              {payment.chequeDate && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600">Cheque Date:</span>
                  <span className="text-slate-800">{payment.chequeDate}</span>
                </div>
              )}
            </div>

            {/* Amount Paid Big Display */}
            <div className="my-2.5 p-2.5 bg-slate-950 text-white rounded text-center shadow-xs">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                Amount Paid
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 tracking-tight mt-0.5 tabular-nums">
                {formatCurrency(payment.amount)}
              </div>
            </div>

            {/* Settled Invoices Table */}
            {payment.invoiceAllocations && payment.invoiceAllocations.length > 0 && (
              <>
                <div className="border-t border-dashed border-slate-400 my-2" />
                <div className="font-bold text-[10.5px] uppercase text-slate-700 mb-1 flex justify-between">
                  <span>Settled Invoices</span>
                  <span>Amount</span>
                </div>
                <div className="space-y-0.5">
                  {payment.invoiceAllocations.map((alloc) => (
                    <div key={alloc.invoiceId} className="flex justify-between items-baseline text-[11px] py-0.5">
                      <span className="text-slate-700 font-medium truncate max-w-[170px]">
                        {alloc.invoiceNumber}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(alloc.allocatedAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Remaining Ledger Balance Due */}
            {customerBalance !== undefined && (
              <>
                <div className="border-t border-dashed border-slate-400 my-2" />
                <div className="flex justify-between items-center py-1 px-2 bg-slate-200/60 rounded text-[11px]">
                  <span className="font-bold text-slate-700">Remaining Ledger Due:</span>
                  <span className="font-extrabold text-slate-950 tabular-nums">
                    {formatCurrency(customerBalance)}
                  </span>
                </div>
              </>
            )}

            {/* Barcode Section */}
            {barcodeSvgPath && (
              <div className="mt-3 text-center">
                <svg
                  viewBox={`0 0 ${barcodeTotalModules} 28`}
                  className="h-6 w-auto mx-auto max-w-[190px]"
                >
                  <path d={barcodeSvgPath} fill="#0f172a" />
                </svg>
                <div className="text-[9px] tracking-widest text-slate-500 font-mono mt-0.5">
                  *{payment.receiptNumber}*
                </div>
              </div>
            )}

            {/* Signature Acknowledgement Lines */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-dotted border-slate-400 text-center text-[9px] text-slate-600">
              <div>
                <div className="border-b border-slate-400 mb-1 h-3" />
                <span>Customer Signature</span>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1 h-3" />
                <span>Authorized Officer</span>
              </div>
            </div>

            {/* Footer Notes & Legal Notice */}
            <div className="border-t border-dashed border-slate-400 mt-3 pt-2 text-center space-y-1">
              <div className="text-[9.5px] text-slate-500 italic leading-snug">
                {payment.status === 'APPROVED'
                  ? 'Authorized and posted to official customer ledger.'
                  : 'Subject to Finance Department realization. Retain this slip for ledger reconciliation.'}
              </div>
              <div className="text-[10px] font-bold text-slate-800 tracking-wide pt-0.5">
                Thank you for your business!
              </div>
            </div>

            {/* Bottom Serrated Sawtooth Edge Graphic */}
            <div className="w-full flex justify-center mt-2 overflow-hidden opacity-30 select-none">
              <span className="text-[9px] tracking-widest text-slate-500 font-mono">
                ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Mobile-Optimized Footer Action Bar */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-800 bg-slate-900/95 space-y-2">
          {/* Quick Utility Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 text-xs gap-1.5 h-9"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 text-emerald-400" />}
              {copied ? 'Copied Details' : 'Share / WhatsApp'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-slate-700 bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 text-xs gap-1.5 h-9"
            >
              <Printer className="h-3.5 w-3.5 text-blue-400" />
              Print Thermal Receipt
            </Button>
          </div>

          {/* Primary Action Button: Print & Handover */}
          <Button
            type="button"
            size="sm"
            onClick={handlePrintAndHandover}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 h-10 shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Print & Handover
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
