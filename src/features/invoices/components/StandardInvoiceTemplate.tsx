import React from 'react';
import { Invoice } from '../../../types/invoice';
import { InvoiceStatusBadge } from '../InvoiceStatusBadge';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';

interface StandardInvoiceTemplateProps {
  invoice: Invoice;
}

export function StandardInvoiceTemplate({ invoice }: StandardInvoiceTemplateProps) {
  const isOverdue = invoice.status === 'OVERDUE';
  const previouslyCollected = invoice.collectedAmount || 0;

  return (
    <div className="w-full h-full flex flex-col justify-between text-slate-800 font-sans text-xs select-text">
      <div className="space-y-6">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-sm shrink-0">
                DNS
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                  DNS DISTRIBUTION (PVT) LTD
                </h1>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  Authorized Wholesale Electrical, Automation & Industrial Switchgear Solutions
                </p>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
              <p>142 First Cross Street, Colombo 11, Sri Lanka</p>
              <p>Tel: +94 11 234 5678 | Email: billing@dnsdistribution.lk</p>
              <p className="font-semibold text-slate-700">VAT Registration No: 109847291-7000</p>
            </div>
          </div>

          <div className="text-right space-y-1 shrink-0">
            <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider font-bold">
              COMMERCIAL TAX INVOICE
            </span>
            <div className="font-mono text-xl font-bold tabular-nums text-primary pt-0.5">
              {invoice.invoiceNumber}
            </div>
            <div className="pt-0.5 flex justify-end">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="text-[11px] text-slate-500 pt-1 space-y-0.5">
              <p>
                Order Ref: <span className="font-mono font-semibold text-slate-800">{invoice.orderNumber}</span>
              </p>
              <p>
                Issue Date: <span className="font-semibold text-slate-800">{formatDate(invoice.issueDate)}</span>
              </p>
              <p className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-700 font-semibold'}>
                Due Date: {formatDate(invoice.dueDate)} {isOverdue && '(OVERDUE)'}
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Commercial Terms Meta Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50/90 p-4 rounded-xl border border-slate-200/90 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Billed Customer
            </span>
            <div className="font-bold text-slate-900 text-sm">{invoice.customerName}</div>
            <div className="text-slate-600 font-mono text-[11px]">Dealer Code: {invoice.customerCode}</div>
            {invoice.customerVatNumber && (
              <div className="text-slate-600 text-[11px]">VAT Reg: {invoice.customerVatNumber}</div>
            )}
            {invoice.customerAddress && (
              <div className="text-slate-600 text-[11px]">{invoice.customerAddress}</div>
            )}
            {invoice.customerPhone && (
              <div className="text-slate-600 text-[11px]">Contact: {invoice.customerPhone}</div>
            )}
          </div>

          <div className="space-y-1 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Commercial Reference
            </span>
            <div>
              <span className="text-slate-500">Sales Representative: </span>
              <span className="font-semibold text-slate-800">{invoice.salesRepName}</span>
            </div>
            <div>
              <span className="text-slate-500">Payment Terms: </span>
              <span className="font-semibold text-primary">{invoice.paymentTerms || 'Standard Credit'}</span>
            </div>
            <div>
              <span className="text-slate-500">Created At: </span>
              <span className="text-slate-700">{new Date(invoice.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100/80 border-b border-slate-200 text-[11px]">
                <TableHead className="w-10 text-center font-bold text-slate-700">#</TableHead>
                <TableHead className="font-bold text-slate-700">Item & Description</TableHead>
                <TableHead className="w-20 text-center font-bold text-slate-700">Qty</TableHead>
                <TableHead className="w-28 text-right font-bold text-slate-700">Unit Price (LKR)</TableHead>
                <TableHead className="w-20 text-right font-bold text-slate-700">Disc %</TableHead>
                <TableHead className="w-20 text-right font-bold text-slate-700">Tax %</TableHead>
                <TableHead className="w-32 text-right font-bold text-slate-700">Line Total (LKR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, idx) => (
                <TableRow key={item.id} className="border-b border-slate-100 text-xs hover:bg-transparent">
                  <TableCell className="text-center font-mono text-slate-400 text-[11px]">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.productNameSnapshot}</div>
                    <div className="font-mono text-[10.5px] text-slate-500">SKU: {item.skuSnapshot}</div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-slate-800 font-semibold tabular-nums">
                    {item.quantity} {item.uomSnapshot || 'pcs'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700 tabular-nums">
                    {formatCurrency(item.unitPriceSnapshot)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-600 tabular-nums">
                    {item.discountPercentage > 0 ? `${item.discountPercentage}%` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-600 tabular-nums">
                    {item.taxPercentage}%
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Financial Calculation Breakdown */}
        <div className="flex justify-between gap-6 pt-1">
          <div className="flex-1 space-y-2.5 max-w-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/90 space-y-1 text-[11px]">
              <span className="font-bold text-slate-800 block uppercase tracking-wide text-[10px]">
                Remittance Advice & Banking Details
              </span>
              <p className="text-slate-600">Bank: Commercial Bank of Ceylon | Branch: City Office</p>
              <p className="text-slate-600">Account Name: DNS Distribution (Pvt) Ltd</p>
              <p className="font-mono font-bold text-primary">Account No: 1000984721</p>
              <p className="text-[10px] text-slate-500 pt-0.5">
                Please quote Invoice Number <strong>{invoice.invoiceNumber}</strong> upon remitting funds.
              </p>
            </div>

            {invoice.notes && (
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Notes:</span> {invoice.notes}
              </div>
            )}
          </div>

          <div className="w-72 space-y-1.5 text-xs">
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-emerald-600">
              <span>Total Discount:</span>
              <span className="font-mono font-semibold tabular-nums">- {formatCurrency(invoice.discountTotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600 border-b border-slate-200 pb-1.5">
              <span>
                {invoice.taxEnabled !== false && invoice.taxTotal > 0
                  ? `VAT (${invoice.taxRatePercentage ?? 18}% Included):`
                  : 'Tax:'}
              </span>
              <span className="font-mono font-semibold tabular-nums text-slate-800">{formatCurrency(invoice.taxTotal)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b-2 border-slate-900 text-sm font-bold text-slate-900">
              <span>Total Amount:</span>
              <span className="font-mono tabular-nums">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Paid to Date:</span>
              <span className="font-mono font-semibold tabular-nums text-emerald-600">
                {formatCurrency(invoice.paidAmount)}
              </span>
            </div>
            {previouslyCollected > 0 && (
              <div className="flex justify-between py-0.5 text-blue-600">
                <span>Collected (Pending Verification):</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(previouslyCollected)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5 bg-slate-50 px-2.5 rounded-lg border border-slate-200 text-xs font-bold mt-1">
              <span className={invoice.balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                Balance Due:
              </span>
              <span className={`font-mono tabular-nums ${invoice.balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(invoice.balanceAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commercial Authorization Signatures Footer */}
      <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-200/80 text-center mt-6">
        <div className="space-y-1">
          <div className="border-t border-dashed border-slate-400 w-32 mx-auto pt-1.5 text-[10px] uppercase font-bold text-slate-600">
            Commercial Officer
          </div>
          <p className="text-[10px] text-slate-500">{invoice.salesRepName}</p>
        </div>
        <div className="space-y-1">
          <div className="border-t border-dashed border-slate-400 w-32 mx-auto pt-1.5 text-[10px] uppercase font-bold text-slate-600">
            Accountant / Cashier
          </div>
          <p className="text-[10px] text-slate-500">DNS Finance Dept</p>
        </div>
        <div className="space-y-1">
          <div className="border-t border-dashed border-slate-400 w-32 mx-auto pt-1.5 text-[10px] uppercase font-bold text-slate-600">
            Customer Acceptance
          </div>
          <p className="text-[10px] text-slate-500">Authorized Dealer Seal</p>
        </div>
      </div>
    </div>
  );
}
