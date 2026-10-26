import React from 'react';
import { Invoice } from '../../../types/invoice';
import { formatCurrency, formatDate, numberToWordsLKR } from '../../../utils/formatters';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';

interface IrdTaxInvoiceTemplateProps {
  invoice: Invoice;
}

export function IrdTaxInvoiceTemplate({ invoice }: IrdTaxInvoiceTemplateProps) {
  const taxableBase = Math.max(0, invoice.subtotal - invoice.discountTotal);
  const vatAmount = invoice.taxTotal;
  const vatRate = invoice.taxRatePercentage ?? 18;
  const amountInWords = numberToWordsLKR(invoice.totalAmount);
  const isVatRegisteredBuyer = Boolean(invoice.customerVatNumber);

  return (
    <div className="w-full h-full flex flex-col justify-between text-slate-900 font-sans text-xs select-text">
      <div className="space-y-4">
        {/* IRD Top Banner */}
        <div className="border-b-2 border-slate-900 pb-3">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
            <span>Inland Revenue Department — Sri Lanka</span>
            <span>Value Added Tax (VAT) Act No. 14 of 2002 — Section 20</span>
            <span className="text-slate-900">Original for Buyer</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            {/* Supplier Profile */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs tracking-wider shrink-0">
                  DNS
                </div>
                <div>
                  <h1 className="text-base font-extrabold tracking-tight text-slate-950 uppercase">
                    DNS DISTRIBUTION (PVT) LTD
                  </h1>
                  <p className="text-[10px] text-slate-600 font-medium">
                    142 First Cross Street, Colombo 11, Sri Lanka
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-700 pt-1">
                <div>
                  <span className="font-semibold text-slate-500">TIN: </span>
                  <span className="font-mono font-bold text-slate-900">109847291</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">VAT Reg No: </span>
                  <span className="font-mono font-bold text-slate-900">109847291-7000</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">SVAT Reg No: </span>
                  <span className="font-mono font-bold text-slate-900">SVAT-004219</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Contact: </span>
                  <span>+94 11 234 5678 / tax@dnsdistribution.lk</span>
                </div>
              </div>
            </div>

            {/* Document Header & Serial Meta */}
            <div className="text-right shrink-0 space-y-1">
              <div className="inline-block border-2 border-slate-900 px-3 py-1 bg-slate-100/90 text-center">
                <h2 className="text-base font-black tracking-wider text-slate-950 uppercase">
                  TAX INVOICE
                </h2>
                <div className="text-[9px] uppercase font-bold text-slate-600 tracking-wider">
                  Approved Computer-Generated
                </div>
              </div>

              <div className="pt-1 text-[11px] space-y-0.5">
                <div>
                  <span className="text-slate-500 font-medium">Invoice Serial No: </span>
                  <span className="font-mono font-black text-slate-950 text-xs">{invoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Date of Supply / Issue: </span>
                  <span className="font-semibold text-slate-900">{formatDate(invoice.issueDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Sales Order Ref: </span>
                  <span className="font-mono text-slate-800">{invoice.orderNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Payment Due Date: </span>
                  <span className="font-semibold text-slate-900">{formatDate(invoice.dueDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipient / Purchaser Tax Profile Grid */}
        <div className="border border-slate-300 rounded-md p-3 bg-slate-50/60 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>Purchaser / Recipient Details (Buyer)</span>
                {isVatRegisteredBuyer ? (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold">
                    VAT Registered
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-medium">
                    Unregistered Person
                  </span>
                )}
              </div>
              <div className="font-bold text-slate-950 text-sm">{invoice.customerName}</div>
              <div className="text-slate-600 text-[11px]">
                {invoice.customerAddress || 'Colombo, Sri Lanka'}
              </div>
              <div className="text-slate-600 text-[11px]">
                Contact: {invoice.customerPhone || 'N/A'} | Code: {invoice.customerCode}
              </div>
            </div>

            <div className="space-y-1 text-right text-[11px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Buyer Tax Registration (Section 20 Compliance)
              </div>
              <div>
                <span className="text-slate-500">Buyer TIN: </span>
                <span className="font-mono font-bold text-slate-900">
                  {invoice.customerVatNumber ? invoice.customerVatNumber.split('-')[0] : 'Unregistered'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Buyer VAT Registration No: </span>
                <span className="font-mono font-bold text-slate-900">
                  {invoice.customerVatNumber || 'Unregistered Person under Section 20'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Commercial Route / Territory: </span>
                <span className="font-medium text-slate-800">{invoice.salesRepName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Goods & Supply Table */}
        <div className="border border-slate-300 rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 border-b border-slate-300 text-[10.5px]">
                <TableHead className="w-8 text-center font-bold text-slate-900">#</TableHead>
                <TableHead className="font-bold text-slate-900">Description of Goods / Technical Specification</TableHead>
                <TableHead className="w-16 text-center font-bold text-slate-900">Qty</TableHead>
                <TableHead className="w-24 text-right font-bold text-slate-900">Unit Price (Excl. VAT)</TableHead>
                <TableHead className="w-24 text-right font-bold text-slate-900">Taxable Value (LKR)</TableHead>
                <TableHead className="w-14 text-center font-bold text-slate-900">VAT %</TableHead>
                <TableHead className="w-20 text-right font-bold text-slate-900">VAT (LKR)</TableHead>
                <TableHead className="w-28 text-right font-bold text-slate-900">Total Consideration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, idx) => {
                const itemBase = item.lineTotal / (1 + (item.taxPercentage || vatRate) / 100);
                const itemVat = item.lineTotal - itemBase;

                return (
                  <TableRow key={item.id} className="border-b border-slate-200 text-xs hover:bg-transparent">
                    <TableCell className="text-center font-mono text-slate-500 text-[11px]">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-950">{item.productNameSnapshot}</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        SKU: {item.skuSnapshot} {item.discountPercentage > 0 ? `(Disc: ${item.discountPercentage}%)` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-slate-800 tabular-nums">
                      {item.quantity} {item.uomSnapshot || 'pcs'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-700 tabular-nums text-[11px]">
                      {formatCurrency(item.unitPriceSnapshot)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-800 tabular-nums text-[11px]">
                      {formatCurrency(itemBase)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-slate-700 tabular-nums text-[11px]">
                      {item.taxPercentage || vatRate}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-800 tabular-nums text-[11px]">
                      {formatCurrency(itemVat)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-950 tabular-nums text-[11px]">
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* IRD Statutory Tax Summary & Amount in Words */}
        <div className="grid grid-cols-12 gap-4 pt-1">
          {/* Amount in words & Certifications */}
          <div className="col-span-7 space-y-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Consideration in Words (Sri Lanka Currency)
              </span>
              <p className="font-serif italic font-semibold text-slate-900 text-[11.5px] mt-0.5 leading-snug">
                {amountInWords}
              </p>
            </div>

            <div className="p-2.5 border border-dashed border-slate-300 rounded-md bg-white text-[10px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 uppercase tracking-wide">
                IRD Statutory Declaration under Value Added Tax Act No. 14 of 2002
              </div>
              <p className="leading-snug">
                "I/We hereby certify that the particulars given in this Tax Invoice are true and correct and that the value of supply and the tax charged herein comply with the Value Added Tax Act No. 14 of 2002 and amendments thereto."
              </p>
              <p className="text-[9.5px] text-slate-500">
                Payment Terms: {invoice.paymentTerms || '30 Days Net'}. Remit strictly to DNS Distribution (Pvt) Ltd A/C No: 1000984721 at Commercial Bank of Ceylon.
              </p>
            </div>
          </div>

          {/* Official Tax Calculation Ledger */}
          <div className="col-span-5 border border-slate-300 rounded-md p-2.5 bg-slate-50/90 text-[11px] space-y-1">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1">
              IRD Tax Schedule (VAT Breakdown)
            </div>

            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Standard Rated Supplies (18%):</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(taxableBase)}</span>
            </div>

            <div className="flex justify-between py-0.5 text-slate-500">
              <span>Zero-Rated / Exempt Supplies:</span>
              <span className="font-mono font-semibold">LKR 0.00</span>
            </div>

            <div className="flex justify-between py-0.5 font-bold text-slate-800 border-t border-slate-200 pt-1">
              <span>Total Taxable Value of Supplies:</span>
              <span className="font-mono">{formatCurrency(taxableBase)}</span>
            </div>

            <div className="flex justify-between py-0.5 font-bold text-slate-800">
              <span>Value Added Tax (VAT 18%):</span>
              <span className="font-mono">{formatCurrency(vatAmount)}</span>
            </div>

            <div className="flex justify-between py-1.5 border-t-2 border-b-2 border-slate-900 font-black text-slate-950 text-xs mt-1">
              <span>TOTAL INVOICE CONSIDERATION:</span>
              <span className="font-mono">{formatCurrency(invoice.totalAmount)}</span>
            </div>

            <div className="flex justify-between py-0.5 text-slate-600 text-[10px] pt-1">
              <span>Paid / Credited to Date:</span>
              <span className="font-mono font-semibold text-emerald-700">{formatCurrency(invoice.paidAmount)}</span>
            </div>

            <div className="flex justify-between py-0.5 font-bold text-xs bg-white p-1 rounded border border-slate-200">
              <span className={invoice.balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                Net Balance Payable:
              </span>
              <span className={`font-mono ${invoice.balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatCurrency(invoice.balanceAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* IRD Official Execution & Seal Section */}
      <div className="border-t-2 border-slate-900 pt-4 mt-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="space-y-1">
            <div className="h-10 flex items-end justify-center">
              <span className="text-[10px] font-mono text-slate-400">Authorized Electronic Signature</span>
            </div>
            <div className="border-t border-dashed border-slate-400 w-36 mx-auto pt-1 text-[10px] uppercase font-bold text-slate-700">
              Authorized Signatory
            </div>
            <p className="text-[9px] text-slate-500">For DNS Distribution (Pvt) Ltd</p>
          </div>

          <div className="space-y-1">
            <div className="h-10 flex items-center justify-center">
              <div className="border border-slate-300 rounded px-3 py-1 text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                Official Corporate Stamp
              </div>
            </div>
            <div className="border-t border-dashed border-slate-400 w-36 mx-auto pt-1 text-[10px] uppercase font-bold text-slate-700">
              Tax Rubber Seal
            </div>
            <p className="text-[9px] text-slate-500">Registered Taxable Entity</p>
          </div>

          <div className="space-y-1">
            <div className="h-10 flex items-end justify-center">
              <span className="text-[10px] font-mono text-slate-400">Date: ____ / ____ / ________</span>
            </div>
            <div className="border-t border-dashed border-slate-400 w-36 mx-auto pt-1 text-[10px] uppercase font-bold text-slate-700">
              Recipient Acknowledgment
            </div>
            <p className="text-[9px] text-slate-500">Signature & Dealer Stamp</p>
          </div>
        </div>
      </div>
    </div>
  );
}
