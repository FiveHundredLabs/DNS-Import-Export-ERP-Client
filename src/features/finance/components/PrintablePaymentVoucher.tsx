import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { PaymentVoucher } from '../../../types/cashbook';
import { formatCurrency, formatDate, numberToWordsLKR } from '../../../utils/formatters';
import { pdfService } from '../../../services/PdfService';
import {
  Printer,
  X,
  Building2,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Download,
  Clock,
  XCircle,
  ExternalLink,
  CreditCard,
  Banknote,
  Landmark,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Expand,
} from 'lucide-react';

interface PrintablePaymentVoucherProps {
  voucher: PaymentVoucher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (voucherId: string) => void;
  onReject?: (voucher: PaymentVoucher) => void;
  canApprove?: boolean;
}

export function PrintablePaymentVoucher({
  voucher,
  open,
  onOpenChange,
  onApprove,
  onReject,
  canApprove = false,
}: PrintablePaymentVoucherProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sheetWidthMode, setSheetWidthMode] = useState<'standard' | 'full'>('full');

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    pdfService.downloadPaymentVoucherPdf(voucher, true);
  };

  const isPayment = voucher.voucherType === 'PAYMENT';
  const amountWords = numberToWordsLKR(voucher.amount);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth={isFullScreen ? 'max-w-[99vw] w-[99vw]' : 'max-w-[96vw] 2xl:max-w-7xl w-full'}
      className={
        isFullScreen
          ? 'p-0 max-h-[98vh] h-[98vh] flex flex-col bg-slate-100 overflow-hidden rounded-xl border border-slate-300 shadow-2xl transition-all duration-200'
          : 'p-0 max-h-[95vh] h-[93vh] flex flex-col bg-slate-100 overflow-hidden rounded-2xl border border-slate-300 shadow-2xl transition-all duration-200'
      }
    >
      <DialogContent className="h-full flex flex-col p-0 overflow-hidden space-y-0 w-full print:border-none print:shadow-none print:max-w-none print:w-full print:bg-white print:p-0">
        {/* Style block for pristine A4 modal printing */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .voucher-printable-sheet,
            .voucher-printable-sheet * {
              visibility: visible;
            }
            .voucher-printable-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 12mm 15mm !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
            }
          }
        `}} />

        {/* System View Top Control Bar (Excluded from physical print) */}
        <DialogHeader className="px-5 py-3 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0 print:hidden shadow-2xs mb-0">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
              isPayment ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                  {isPayment ? 'Official Payment Voucher' : 'Cash Receipt Voucher'}
                </DialogTitle>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                  {voucher.voucherNumber}
                </span>
                {voucher.status === 'APPROVED' ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Approved & Posted
                  </Badge>
                ) : voucher.status === 'PENDING_APPROVAL' ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] gap-1 font-semibold animate-pulse">
                    <Clock className="h-3 w-3" /> Awaiting MG-02 Approval
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] gap-1 font-semibold">
                    <XCircle className="h-3 w-3" /> Rejected
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Statutory dual-authorized accounting order • Live GL Impact Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Actions if Pending and Manager */}
            {voucher.status === 'PENDING_APPROVAL' && canApprove && (
              <>
                {onApprove && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onApprove(voucher.id);
                      onOpenChange(false);
                    }}
                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve Voucher
                  </Button>
                )}
                {onReject && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onReject(voucher);
                      onOpenChange(false);
                    }}
                    className="h-8 px-3 border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                )}
              </>
            )}

            {/* Sheet Width Mode Toggle: Standard A4 vs Full View */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSheetWidthMode('standard')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  sheetWidthMode === 'standard' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Standard Document Width (A4)"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setSheetWidthMode('full')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  sheetWidthMode === 'full' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Full Expanded Width View"
              >
                Full View
              </button>
            </div>

            {/* Toggle Fullscreen / Maximize */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="h-8 px-2.5 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
              title={isFullScreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden md:inline">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden md:inline">Full Screen</span>
                </>
              )}
            </Button>

            {/* Download Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-3 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
              title="Download voucher as standalone HTML / PDF"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Download</span>
            </Button>

            {/* Print Button */}
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 px-3.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
              title="Print voucher on standard A4 paper"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Voucher</span>
            </Button>

            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Inner View Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center bg-slate-200/60">
          {/* Printable Voucher Paper Sheet */}
          <div
            ref={printRef}
            className={`voucher-printable-sheet w-full bg-white p-8 md:p-12 rounded-xl border border-slate-300/80 shadow-md text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 transition-all duration-150 ${
              sheetWidthMode === 'full' ? 'max-w-5xl' : 'max-w-3xl'
            }`}
          >
            {/* 1. Company Letterhead & Document Banner */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-6 gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-base tracking-wider shadow-sm shrink-0">
                  DNS
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase leading-none">
                    DNS IMPORT &amp; EXPORT (PVT) LTD
                  </h1>
                  <p className="text-xs font-bold text-slate-700 mt-1.5">
                    Wholesale Electrical, Automation &amp; Industrial Supplies
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    104 Nawam Mawatha, Colombo 02, Sri Lanka • Tel: +94 11 234 5678 • finance@dnsgroup.lk
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    VAT: VAT-102938475 • SVAT: SVAT-009988 • Company Reg: PV 0029384
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className={`inline-block px-3.5 py-1 text-xs font-black uppercase tracking-wider rounded-md ${
                  isPayment ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {isPayment ? 'PAYMENT VOUCHER' : 'RECEIPT VOUCHER'}
                </span>
                <div className="text-lg font-mono font-bold text-slate-950 mt-1.5">
                  {voucher.voucherNumber}
                </div>
                <div className="text-xs text-slate-600 font-medium mt-0.5">
                  Date: <span className="font-semibold text-slate-900">{formatDate(voucher.date)}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                  Status: <span className="font-bold">{voucher.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>

            {/* 2. Voucher Particulars Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-slate-200 text-xs">
              <div className="space-y-1.5">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  {isPayment ? 'Paid To (Payee / Recipient):' : 'Received From (Payer):'}
                </span>
                <div className="text-base font-bold text-slate-950">
                  {voucher.payeeOrPayer}
                </div>
                <div className="text-slate-600 flex items-center gap-2 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Category:</span>
                  <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                    {voucher.category.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="sm:text-right space-y-1.5">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  Disbursement Mode &amp; Float:
                </span>
                <div className="font-bold text-slate-950 flex sm:justify-end items-center gap-1.5 text-sm">
                  {voucher.paymentMethod === 'CHEQUE' ? (
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Banknote className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>{voucher.paymentMethod || 'CASH'}</span>
                  {voucher.chequeNumber && (
                    <span className="font-mono text-slate-700">(Cheque #{voucher.chequeNumber})</span>
                  )}
                </div>
                <div className="text-slate-600 font-mono text-[11px]">
                  Account: <span className="font-semibold text-slate-900">{voucher.cashAccountCode}</span> - {voucher.cashAccountName}
                </div>
                {voucher.bankName && (
                  <div className="text-[11px] text-slate-500">
                    Bank: {voucher.bankName}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Narrative Description / Purpose */}
            <div className="py-5 border-b border-slate-200">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold block mb-1.5">
                Particulars / Purpose of Disbursement:
              </span>
              <div className="text-sm text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200 font-sans leading-relaxed">
                {voucher.description}
              </div>
            </div>

            {/* 4. Double-Entry General Ledger Impact Breakdown */}
            <div className="py-5 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  Statutory Double-Entry GL Impact:
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Balanced Journal Entry
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[550px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-500 uppercase text-[10px]">
                      <th className="py-2.5 px-4 text-left font-bold">GL Account &amp; Description</th>
                      <th className="py-2.5 px-3 text-left font-bold">Classification</th>
                      <th className="py-2.5 px-4 text-right font-bold text-slate-700">Debit (LKR)</th>
                      <th className="py-2.5 px-4 text-right font-bold text-slate-700">Credit (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {/* Row 1: Offset Account */}
                    <tr>
                      <td className="py-3 px-4 text-slate-900 font-sans">
                        <span className="font-mono font-bold text-slate-950">{voucher.offsetAccountCode}</span> - {voucher.offsetAccountName}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-sans text-xs">
                        Expense / Liability
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-950">
                        {isPayment ? formatCurrency(voucher.amount) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {!isPayment ? formatCurrency(voucher.amount) : '-'}
                      </td>
                    </tr>

                    {/* Row 2: Cash / Bank Account */}
                    <tr>
                      <td className="py-3 px-4 text-slate-900 font-sans">
                        <span className="font-mono font-bold text-slate-950">{voucher.cashAccountCode}</span> - {voucher.cashAccountName}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-sans text-xs">
                        Cash &amp; Bank Float
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {!isPayment ? formatCurrency(voucher.amount) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-950">
                        {isPayment ? formatCurrency(voucher.amount) : '-'}
                      </td>
                    </tr>

                    {/* Balanced Total Row */}
                    <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-300">
                      <td colSpan={2} className="py-2.5 px-4 text-slate-800 font-sans uppercase text-[11px]">
                        Total Balanced Posting
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-950 text-sm">
                        {formatCurrency(voucher.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-950 text-sm">
                        {formatCurrency(voucher.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Total Amount Box & Amount in Words */}
            <div className="py-5 px-6 bg-gradient-to-r from-slate-50 to-slate-100/70 rounded-xl border border-slate-300 mt-5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                    Total Amount Authorized:
                  </span>
                  <div className="text-xs text-slate-600 font-medium">Sri Lankan Rupees (LKR)</div>
                </div>
                <div className="text-3xl font-black font-mono text-slate-950 tracking-tight">
                  {formatCurrency(voucher.amount)}
                </div>
              </div>

              {/* Amount in words */}
              <div className="pt-2.5 border-t border-slate-200/80 flex items-start gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mt-0.5">In Words:</span>
                <p className="text-sm font-semibold text-primary italic leading-snug">
                  {amountWords}
                </p>
              </div>
            </div>

            {/* Rejection Note if Rejected */}
            {voucher.status === 'REJECTED' && voucher.rejectionReason && (
              <div className="mt-5 p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  Voucher Disapproved / Rejected:
                </div>
                <p className="text-rose-700 mt-1 pl-5 text-sm">
                  {voucher.rejectionReason}
                </p>
              </div>
            )}

            {/* 6. Four-Tier Statutory Governance Sign-off Blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10 pt-5 border-t-2 border-slate-300 text-xs text-center">
              {/* 1. Prepared By */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="text-xs font-serif italic text-slate-800">
                      {voucher.createdByName || 'Accounts Clerk'}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-bold text-slate-800">1. Prepared By</div>
                  <div className="text-[10px] text-slate-500">Accounts Clerk</div>
                </div>
              </div>

              {/* 2. Checked By */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Verified System
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-bold text-slate-800">2. Checked By</div>
                  <div className="text-[10px] text-slate-500">Accountant / Auditor</div>
                </div>
              </div>

              {/* 3. Approved By */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    {voucher.approvedByName ? (
                      <span className="text-xs text-emerald-800 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {voucher.approvedByName}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 font-medium italic">
                        Pending Sign-Off
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-bold text-slate-800">3. Approved By</div>
                  <div className="text-[10px] text-slate-500">Finance Manager / Director</div>
                </div>
              </div>

              {/* 4. Received By */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="h-16 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                    <span className="text-[10px] text-slate-400 italic">Signature &amp; NIC</span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-bold text-slate-800">4. Received By</div>
                  <div className="text-[10px] text-slate-500">Payee / Carrier Acknowledgment</div>
                </div>
              </div>
            </div>

            {/* 7. Footer Audit Stamp */}
            <div className="mt-10 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3 flex flex-col sm:flex-row items-center justify-between gap-1">
              <span>
                Generated by DNS ERP Finance Engine • Ref: {voucher.glJournalId || voucher.voucherNumber}
              </span>
              <span className="font-mono">
                System Timestamp: {voucher.createdAt.replace('T', ' ').slice(0, 19)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
