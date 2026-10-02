import React from 'react';
import { POSTransaction } from '../../types/pos';
import { printerService } from '../../services/PrinterService';
import { formatCurrency } from '../../utils/formatters';
import { Printer, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface ThermalReceiptModalProps {
  transaction: POSTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ThermalReceiptModal({
  transaction,
  isOpen,
  onClose,
}: ThermalReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  const handlePrint = async () => {
    await printerService.printPOSTransactionReceipt(transaction);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sale Receipt</h3>
              <p className="text-xs text-slate-500">80mm ESC/POS Thermal Format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 80mm Thermal Receipt Simulation Paper */}
        <div className="my-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 font-mono text-xs text-slate-800 shadow-inner">
          <div className="text-center">
            <p className="font-bold text-sm tracking-wide text-slate-900">
              DNS DISTRIBUTION (PVT) LTD
            </p>
            <p className="text-[11px] text-slate-600">Showroom Sales Outlet</p>
            <p className="text-[10px] text-slate-500">142 First Cross Street, Colombo 11</p>
            <p className="text-[10px] text-slate-500">Tel: +94 11 234 5678 | VAT: 109847291-7000</p>
          </div>

          <div className="my-2 border-t border-dashed border-slate-300" />

          <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-900">
            {transaction.status === 'REFUNDED' ? 'REFUND RECEIPT' : 'RETAIL SALES RECEIPT'}
          </div>

          <div className="mt-2 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-semibold text-slate-800">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{new Date(transaction.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{transaction.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-medium">{transaction.customerName || 'Walk-in Retail Customer'}</span>
            </div>
            {transaction.customerCode && (
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Code:</span>
                <span>{transaction.customerCode}</span>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-dashed border-slate-300" />

          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Purchased Items
            </div>
            {transaction.items.map((it, idx) => (
              <div key={idx} className="text-[11px]">
                <div className="font-semibold text-slate-900 line-clamp-1">
                  {it.productNameSnapshot}
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>
                    {it.quantity} x {formatCurrency(it.unitPriceSnapshot)}
                    {it.discountPercentage > 0 && (
                      <span className="text-emerald-600 ml-1">(-{it.discountPercentage}%)</span>
                    )}
                  </span>
                  <span className="font-semibold text-slate-900">{formatCurrency(it.lineTotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="my-2 border-t border-dashed border-slate-300" />

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount:</span>
                <span>- {formatCurrency(transaction.discountTotal)}</span>
              </div>
            )}
            {transaction.taxTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>VAT (18% Included):</span>
                <span>{formatCurrency(transaction.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-dashed border-slate-300 pt-1 text-slate-900">
              <span>TOTAL AMOUNT:</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </div>
          </div>

          <div className="my-2 border-t border-dashed border-slate-300" />

          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Payment Tendered:</span>
              <span className="font-semibold text-slate-900">{transaction.paymentMethod}</span>
            </div>
            {transaction.cashTendered !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-600">Cash Received:</span>
                <span>{formatCurrency(transaction.cashTendered)}</span>
              </div>
            )}
            {transaction.changeGiven !== undefined && (
              <div className="flex justify-between font-bold text-slate-900">
                <span>Change Given:</span>
                <span>{formatCurrency(transaction.changeGiven)}</span>
              </div>
            )}
            {transaction.chequeDetails && (
              <div className="text-[10px] text-slate-500 mt-0.5">
                Cheque: {transaction.chequeDetails.chequeNumber} ({transaction.chequeDetails.bankName})
              </div>
            )}
          </div>

          {transaction.status === 'REFUNDED' && (
            <div className="mt-3 rounded bg-amber-50 p-2 border border-amber-200 text-amber-800 text-[10px]">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> REFUNDED
              </div>
              <div>Reason: {transaction.refundReason}</div>
              <div>Refunded At: {new Date(transaction.refundedAt || '').toLocaleString()}</div>
            </div>
          )}

          <div className="mt-4 text-center text-[10px] text-slate-400">
            <p>Authorized Showroom Invoice Receipt</p>
            <p>Thank you for choosing DNS Distribution!</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary-hover text-primary-foreground flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
