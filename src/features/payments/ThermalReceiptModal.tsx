import { Payment } from '../../types/payment';
import { printerService } from '../../services/PrinterService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer, CheckCircle, Download, X } from 'lucide-react';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  customerBalance?: number;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  payment,
  customerBalance,
}: ThermalReceiptModalProps) {
  if (!payment) return null;

  const handlePrint = async () => {
    await printerService.printPaymentReceipt(payment, customerBalance);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900/90 text-white border-slate-700">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-white">
              <Printer className="h-4 w-4 text-emerald-400" />
              Thermal 80mm ESC/POS Preview
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Realistic ESC/POS Paper simulation */}
        <div className="my-2 p-4 bg-amber-50/95 text-slate-900 rounded shadow-inner font-mono text-xs max-h-[460px] overflow-y-auto">
          <div className="text-center font-bold text-sm tracking-wide">
            DNS DISTRIBUTION (PVT) LTD
          </div>
          <div className="text-center text-[10px] text-slate-600">
            Colombo 11, Sri Lanka | Tel: +94 11 234 5678
          </div>
          <div className="text-center text-[10px] text-slate-600">
            VAT Reg: 109847291-7000
          </div>
          <div className="border-t border-dashed border-slate-400 my-2" />

          <div className="text-center font-bold text-xs uppercase mb-1">
            {payment.status === 'APPROVED' ? 'OFFICIAL RECEIPT' : 'COLLECTION ACKNOWLEDGEMENT'}
          </div>

          <div className="flex justify-between text-[11px] py-0.5">
            <span className="text-slate-500">Rcpt No:</span>
            <span className="font-bold">{payment.receiptNumber}</span>
          </div>
          <div className="flex justify-between text-[11px] py-0.5">
            <span className="text-slate-500">Date:</span>
            <span>{new Date(payment.collectedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-[11px] py-0.5">
            <span className="text-slate-500">Customer:</span>
            <span className="font-bold truncate max-w-[170px]">{payment.customerName}</span>
          </div>
          <div className="flex justify-between text-[11px] py-0.5">
            <span className="text-slate-500">Officer:</span>
            <span>{payment.salesRepName}</span>
          </div>

          <div className="border-t border-dashed border-slate-400 my-2" />

          <div className="flex justify-between text-[11px] py-0.5">
            <span className="text-slate-500">Method:</span>
            <span className="font-bold">{payment.paymentMethod}</span>
          </div>
          {payment.chequeNumber && (
            <div className="flex justify-between text-[11px] py-0.5">
              <span className="text-slate-500">Cheque No:</span>
              <span>{payment.chequeNumber}</span>
            </div>
          )}
          {payment.bankName && (
            <div className="flex justify-between text-[11px] py-0.5">
              <span className="text-slate-500">Bank:</span>
              <span>{payment.bankName}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-black pt-2 pb-1 border-t border-slate-900 mt-2">
            <span>AMOUNT PAID:</span>
            <span>{formatCurrency(payment.amount)}</span>
          </div>

          {payment.invoiceAllocations && payment.invoiceAllocations.length > 0 && (
            <>
              <div className="border-t border-dashed border-slate-400 my-2" />
              <div className="font-bold text-[10px] uppercase text-slate-600 mb-1">
                Settled Invoices:
              </div>
              {payment.invoiceAllocations.map((alloc) => (
                <div key={alloc.invoiceId} className="flex justify-between text-[11px] py-0.5">
                  <span className="truncate max-w-[160px]">{alloc.invoiceNumber}</span>
                  <span className="font-semibold">{formatCurrency(alloc.allocatedAmount)}</span>
                </div>
              ))}
            </>
          )}

          {customerBalance !== undefined && (
            <>
              <div className="border-t border-dashed border-slate-400 my-2" />
              <div className="flex justify-between text-[11px] font-bold">
                <span>Remaining Ledger Due:</span>
                <span>{formatCurrency(customerBalance)}</span>
              </div>
            </>
          )}

          <div className="border-t border-dashed border-slate-400 my-2" />
          <div className="text-center text-[10px] text-slate-500 italic">
            {payment.status === 'APPROVED'
              ? 'Authorized and posted to customer ledger.'
              : 'Subject to Finance Department realization.'}
          </div>
          <div className="text-center text-[10px] font-bold text-slate-700 mt-1">
            Thank you for your business!
          </div>
        </div>

        <DialogFooter className="border-t border-slate-800 pt-3 flex flex-row items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-slate-400 hover:text-white">
            Close
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print Thermal Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
