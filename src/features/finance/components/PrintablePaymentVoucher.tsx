import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { PaymentVoucher } from '../../../types/cashbook';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { Printer, X, Building2, CheckCircle2, ShieldCheck, FileText, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface PrintablePaymentVoucherProps {
  voucher: PaymentVoucher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintablePaymentVoucher({
  voucher,
  open,
  onOpenChange,
}: PrintablePaymentVoucherProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPayment = voucher.voucherType === 'PAYMENT';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="p-4 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isPayment ? 'Official Payment Voucher' : 'Cash Receipt Voucher'}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Official dual-authorized accounting voucher • {voucher.voucherNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary-hover text-white text-xs h-8 gap-1.5 font-medium shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Voucher
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Voucher Paper */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-2xl bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Company & Voucher Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-white font-bold text-xs tracking-wider">
                    DNS
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                      DNS IMPORT & EXPORT ERP
                    </h1>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No. 48, Bloemendhal Road, Colombo 13, Sri Lanka • +94 11 234 5678
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-slate-900 text-white rounded">
                  {isPayment ? 'PAYMENT VOUCHER' : 'RECEIPT VOUCHER'}
                </span>
                <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                  {voucher.voucherNumber}
                </div>
                <div className="text-xs text-slate-500">Date: {formatDate(voucher.date)}</div>
              </div>
            </div>

            {/* Voucher Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                  {isPayment ? 'Paid To (Payee):' : 'Received From (Payer):'}
                </span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {voucher.payeeOrPayer}
                </div>
                <div className="text-slate-600 mt-0.5">
                  Category: <span className="font-medium text-slate-800">{voucher.category}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                  Payment Mode & Accounts:
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {voucher.paymentMethod || 'CASH'}{' '}
                  {voucher.chequeNumber && `(Cheque #${voucher.chequeNumber})`}
                </div>
                <div className="text-slate-600 mt-0.5 font-mono text-[11px]">
                  Account: {voucher.cashAccountCode} - {voucher.cashAccountName}
                </div>
              </div>
            </div>

            {/* Reason / Narrative Description */}
            <div className="py-4 border-b border-slate-200">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                Particulars / Purpose of Disbursement:
              </span>
              <p className="text-xs text-slate-800 mt-1 bg-slate-50 p-3 rounded border border-slate-100 font-sans leading-relaxed">
                {voucher.description}
              </p>
            </div>

            {/* Double-Entry Ledger Breakdown */}
            <div className="py-4 border-b border-slate-200">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold mb-2 block">
                Accounting Double-Entry Impact:
              </span>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="py-1.5 text-left font-semibold">GL Account</th>
                    <th className="py-1.5 text-left font-semibold">Type</th>
                    <th className="py-1.5 text-right font-semibold">Debit (LKR)</th>
                    <th className="py-1.5 text-right font-semibold">Credit (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr>
                    <td className="py-2 text-slate-900 font-sans">
                      <span className="font-mono font-medium">{voucher.offsetAccountCode}</span> - {voucher.offsetAccountName}
                    </td>
                    <td className="py-2 text-slate-500 font-sans">Expense / Asset</td>
                    <td className="py-2 text-right font-bold text-slate-900">
                      {isPayment ? formatCurrency(voucher.amount) : '-'}
                    </td>
                    <td className="py-2 text-right text-slate-400">
                      {!isPayment ? formatCurrency(voucher.amount) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-900 font-sans">
                      <span className="font-mono font-medium">{voucher.cashAccountCode}</span> - {voucher.cashAccountName}
                    </td>
                    <td className="py-2 text-slate-500 font-sans">Cash / Bank</td>
                    <td className="py-2 text-right text-slate-400">
                      {!isPayment ? formatCurrency(voucher.amount) : '-'}
                    </td>
                    <td className="py-2 text-right font-bold text-slate-900">
                      {isPayment ? formatCurrency(voucher.amount) : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Amount Box */}
            <div className="flex items-center justify-between py-4 bg-slate-50 px-4 rounded-lg border border-slate-200 mt-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  Total Amount Authorized:
                </span>
                <div className="text-xs text-slate-600 font-medium">Sri Lankan Rupees</div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {formatCurrency(voucher.amount)}
              </div>
            </div>

            {/* Sign-off Blocks */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-4 border-t border-slate-300 text-[11px] text-center">
              <div>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-slate-500">{voucher.createdByName}</span>
                </div>
                <div className="mt-1 font-semibold text-slate-700">Prepared By</div>
                <div className="text-[10px] text-slate-400">Accounts Clerk</div>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-emerald-600 font-medium">Verified System</span>
                </div>
                <div className="mt-1 font-semibold text-slate-700">Checked By</div>
                <div className="text-[10px] text-slate-400">Accountant</div>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-slate-300 flex items-end justify-center pb-1">
                  {voucher.approvedByName ? (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      {voucher.approvedByName}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 italic">Pending Approval</span>
                  )}
                </div>
                <div className="mt-1 font-semibold text-slate-700">Approved By</div>
                <div className="text-[10px] text-slate-400">Finance Manager / Director</div>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-slate-300"></div>
                <div className="mt-1 font-semibold text-slate-700">Received By</div>
                <div className="text-[10px] text-slate-400">Signature & NIC</div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
              Generated by DNS ERP Finance Engine • Reference: {voucher.glJournalId || voucher.voucherNumber} • Audit Log Tracked
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
