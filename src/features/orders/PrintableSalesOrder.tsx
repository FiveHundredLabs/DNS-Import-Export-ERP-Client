import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { SalesOrder } from '../../types/order';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { pdfService } from '../../services/PdfService';
import { Printer, Download, X, FileText, ShoppingCart, Check } from 'lucide-react';

interface PrintableSalesOrderProps {
  order: SalesOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintableSalesOrder({ order, open, onOpenChange }: PrintableSalesOrderProps) {
  const printContentRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      await pdfService.printSalesOrder(order);
    } catch (e) {
      console.error('Failed to print sales order:', e);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await pdfService.downloadSalesOrderPdf(order);
    } catch (e) {
      console.error('Failed to download sales order:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedDate = order.createdAt
    ? formatDate(order.createdAt)
    : '—';

  const reqDelivery = order.requestedDeliveryDate
    ? formatDate(order.requestedDeliveryDate)
    : 'Standard Dispatch Schedule';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="full" maxWidth="max-w-5xl" className="p-0 overflow-hidden bg-slate-100 max-h-[94vh] flex flex-col">
      <DialogContent className="max-w-5xl w-full max-h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-100 space-y-0">
        {/* Modal Action Bar (Hidden in Print) */}
        <DialogHeader className="px-6 py-3.5 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0 mb-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                Official Sales Order Confirmation — Print Preview
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-semibold text-slate-500">
                  {order.orderNumber}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="gap-1.5 text-xs bg-primary hover:bg-primary-hover text-white font-medium shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              {isPrinting ? 'Printing...' : 'Print Sales Order (A4)'}
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/90 print:p-0 print:bg-white">
          <div
            ref={printContentRef}
            className="print-container bg-white border border-slate-200 shadow-xl rounded-md p-8 sm:p-10 mx-auto max-w-[210mm] text-slate-800 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* ── Document Header ── */}
            <div className="border-b-2 border-slate-800 pb-5 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    DNS Import & Export (Pvt) Ltd
                  </h1>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Authorized Electrical, Industrial Switchgear &amp; Automation Importers
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    142 First Cross Street, Colombo 11, Sri Lanka
                  </p>
                  <p className="text-xs text-slate-500">
                    Hotline: +94 11 234 5678 | Email: sales@dnsdistribution.lk | VAT Reg: 109847291-7000
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-black text-sm px-3.5 py-1 uppercase tracking-wider rounded">
                    Sales Order Confirmation
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                      Order Number
                    </span>
                    <span className="text-lg font-black font-mono text-slate-900">
                      {order.orderNumber}
                    </span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Order Date: <span className="font-semibold text-slate-800">{formattedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Meta Information Matrix ── */}
            <div className="grid grid-cols-2 gap-6 border border-slate-200 rounded-md p-4 mb-6 bg-slate-50/70 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Customer / Buyer Details:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {order.customerNameSnapshot || 'Valued Customer'}
                </div>
                <div className="font-mono text-xs text-slate-600 mt-0.5">
                  Dealer Code: <span className="font-bold text-slate-800">{order.customerCodeSnapshot || '—'}</span>
                </div>
                {order.customerAddressSnapshot && (
                  <div className="text-slate-600 mt-1 leading-snug">
                    Address: {order.customerAddressSnapshot}
                  </div>
                )}
                {order.deliveryAddress && order.deliveryAddress !== order.customerAddressSnapshot && (
                  <div className="text-slate-600 mt-1 leading-snug">
                    Delivery To: {order.deliveryAddress}
                  </div>
                )}
                {order.customerPhoneSnapshot && (
                  <div className="text-slate-500 mt-1">
                    Phone: {order.customerPhoneSnapshot}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Commercial &amp; Dispatch Terms:
                </div>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold w-36">Payment Terms:</td>
                      <td className="py-1 font-bold text-slate-900">{order.paymentTerms || 'Standard Credit'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Sales Representative:</td>
                      <td className="py-1 font-semibold text-slate-900">{order.salesRepNameSnapshot || 'Internal Sales Desk'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Customer PO Ref:</td>
                      <td className="py-1 font-mono font-bold text-slate-900">{order.customerPoNumber || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Requested Delivery:</td>
                      <td className="py-1 font-medium text-slate-900">{reqDelivery}</td>
                    </tr>
                    {order.quotationNumber && (
                      <tr>
                        <td className="py-1 text-slate-500 font-semibold">Quotation Ref:</td>
                        <td className="py-1 font-mono text-primary font-semibold">{order.quotationNumber}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Line Items Table ── */}
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Confirmed Order Line Items ({order.items?.length || 0} Items)
              </div>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="py-2.5 px-2 border-r border-slate-300 text-center w-8">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-left">Item Description &amp; Specification</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">Quantity</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-28">Unit Price</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right w-20">Disc %</th>
                    <th className="py-2.5 px-3 text-right w-32">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-slate-200">
                      <td className="py-2.5 px-2 border-r border-slate-200 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900 leading-tight">
                          {item.productNameSnapshot || item.productId}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          SKU: {item.skuSnapshot || '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center tabular-nums font-semibold">
                        {item.orderedQuantity} <span className="text-[10px] text-slate-500 font-normal">{item.uomSnapshot || 'pcs'}</span>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right tabular-nums font-mono">
                        {formatCurrency(item.unitPriceSnapshot).replace('LKR ', '')}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-right tabular-nums">
                        {item.discountPercentage > 0 ? (
                          <span className="text-emerald-700 font-bold">{item.discountPercentage}%</span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900 font-mono">
                        {formatCurrency(item.lineTotal).replace('LKR ', '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Totals Breakdown ── */}
            <div className="flex justify-end mb-6">
              <div className="w-80 border border-slate-200 rounded-md p-3 bg-slate-50/70 text-xs">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 text-slate-500">Subtotal:</td>
                      <td className="py-1 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(order.subtotal)}
                      </td>
                    </tr>
                    {order.discountAmount > 0 && (
                      <tr>
                        <td className="py-1 text-emerald-700 font-medium">Commercial Discount:</td>
                        <td className="py-1 text-right font-mono font-semibold text-emerald-700">
                          - {formatCurrency(order.discountAmount)}
                        </td>
                      </tr>
                    )}
                    {order.taxEnabled !== false && order.taxAmount > 0 && (
                      <tr>
                        <td className="py-1 text-slate-500">VAT ({order.taxRatePercentage ?? 18}% Included):</td>
                        <td className="py-1 text-right font-mono font-semibold text-slate-800">
                          {formatCurrency(order.taxAmount)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-slate-800 font-bold text-sm">
                      <td className="pt-2 text-slate-900 font-black">Total Order Value:</td>
                      <td className="pt-2 text-right font-mono font-black text-slate-900 text-base">
                        {formatCurrency(order.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Notes / Observations ── */}
            {order.notes && (
              <div className="mb-6 border border-slate-200 rounded p-3 bg-slate-50 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Order Remarks / Special Delivery Instructions:</span>
                <p className="text-slate-600 italic whitespace-pre-line">{order.notes}</p>
              </div>
            )}

            {/* ── Official Authorization & Sign-off Blocks ── */}
            <div className="border-t-2 border-slate-800 pt-6 mt-8">
              <div className="grid grid-cols-3 gap-6 text-xs">
                {/* Prepared By */}
                <div className="border border-slate-200 rounded p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Prepared By (Sales Rep)
                  </span>
                  <div className="h-12 border-b border-dashed border-slate-300 my-2"></div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    {order.salesRepNameSnapshot || 'Sales Representative'}
                  </div>
                  <div className="text-[10px] text-slate-400">Date: _______________</div>
                </div>

                {/* Approved By */}
                <div className="border border-slate-200 rounded p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Authorized Approval
                  </span>
                  <div className="h-12 border-b border-dashed border-slate-300 my-2"></div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    {order.approvedByName || 'Sales Operations Manager'}
                  </div>
                  <div className="text-[10px] text-slate-400">Date: _______________</div>
                </div>

                {/* Customer Acceptance */}
                <div className="border border-slate-200 rounded p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Customer Acceptance
                  </span>
                  <div className="h-12 border-b border-dashed border-slate-300 my-2"></div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    Authorized Signatory &amp; Stamp
                  </div>
                  <div className="text-[10px] text-slate-400">Date: _______________</div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-slate-400">
                This Sales Order Confirmation is generated via DNS Import & Export ERP. Goods remain property of DNS Import & Export (Pvt) Ltd until full settlement.
                <br />Printed: {new Date().toLocaleString()} • Form ERP-SO-01 Rev 2
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
