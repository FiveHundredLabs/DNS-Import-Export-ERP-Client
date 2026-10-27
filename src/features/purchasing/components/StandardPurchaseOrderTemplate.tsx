import React from 'react';
import { PurchaseOrder } from '../../../types/purchasing';
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';

interface StandardPurchaseOrderTemplateProps {
  purchaseOrder: PurchaseOrder;
}

export function StandardPurchaseOrderTemplate({
  purchaseOrder,
}: StandardPurchaseOrderTemplateProps) {
  return (
    <div className="w-full h-full flex flex-col justify-between text-slate-800 font-sans text-xs select-text">
      <div className="space-y-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-sm shrink-0">
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
              <p>Tel: +94 11 234 5678 | Email: procurement@dnsdistribution.lk</p>
              <p className="font-semibold text-slate-700">VAT Registration No: 109847291-7000</p>
            </div>
          </div>

          <div className="text-right space-y-1 shrink-0">
            <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-xs uppercase tracking-wider font-bold">
              PURCHASE ORDER
            </span>
            <div className="font-mono text-xl font-bold tabular-nums text-slate-900 pt-0.5">
              {purchaseOrder.poNumber}
            </div>
            <div className="pt-0.5 flex justify-end">
              <PurchaseOrderStatusBadge status={purchaseOrder.status} />
            </div>
            <div className="text-[11px] text-slate-500 pt-1 space-y-0.5">
              <p>
                PO Date: <span className="font-semibold text-slate-800">{formatDate(purchaseOrder.orderDate)}</span>
              </p>
              <p>
                Delivery Due: <span className="font-semibold text-slate-800">{formatDate(purchaseOrder.expectedDeliveryDate)}</span>
              </p>
              <p>
                Payment Terms: <span className="font-semibold text-slate-800">{purchaseOrder.paymentTerms}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Vendor & Shipping Meta Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50/90 p-4 rounded-xl border border-slate-200/90 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Vendor / Supplier
            </span>
            <div className="font-bold text-slate-900 text-sm">{purchaseOrder.supplierName}</div>
            <div className="text-slate-600 font-mono text-[11px]">
              Code: {purchaseOrder.supplierCode}
            </div>
            {purchaseOrder.supplierContactPerson && (
              <div className="text-slate-600 text-[11px]">Attn: {purchaseOrder.supplierContactPerson}</div>
            )}
            {purchaseOrder.supplierAddress && (
              <div className="text-slate-600 text-[11px]">{purchaseOrder.supplierAddress}</div>
            )}
            {purchaseOrder.supplierPhone && (
              <div className="text-slate-600 text-[11px]">Phone: {purchaseOrder.supplierPhone}</div>
            )}
            {purchaseOrder.supplierEmail && (
              <div className="text-slate-600 text-[11px]">Email: {purchaseOrder.supplierEmail}</div>
            )}
            {purchaseOrder.supplierVatNumber && (
              <div className="text-slate-600 text-[11px] font-medium">VAT: {purchaseOrder.supplierVatNumber}</div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Delivery Destination & Contact
            </span>
            <div className="font-bold text-slate-900 text-sm">Central Warehouse (DNS Central Hub)</div>
            <div className="text-slate-600 text-[11px]">18 Bloemendhal Road, Kotahena, Colombo 13</div>
            <div className="text-slate-600 text-[11px]">Receiving Hours: Mon-Fri 08:30 - 16:30</div>
            <div className="text-slate-600 text-[11px]">Storekeeper Desk: +94 11 245 8899</div>
            <div className="pt-1.5 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">Currency:</span> {purchaseOrder.currency || 'LKR'}
            </div>
          </div>
        </div>

        {/* Product Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <Table className="text-[11px]">
            <TableHeader className="bg-slate-100/90 text-slate-700">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 font-bold text-slate-900 text-center">#</TableHead>
                <TableHead className="font-bold text-slate-900">Product / SKU</TableHead>
                <TableHead className="w-16 text-right font-bold text-slate-900">Qty</TableHead>
                <TableHead className="w-24 text-right font-bold text-slate-900">Unit Price</TableHead>
                <TableHead className="w-20 text-right font-bold text-slate-900">Disc %</TableHead>
                <TableHead className="w-16 text-right font-bold text-slate-900">Tax %</TableHead>
                <TableHead className="w-28 text-right font-bold text-slate-900">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrder.items.map((item, idx) => (
                <TableRow key={item.id || idx} className="hover:bg-slate-50/50">
                  <TableCell className="text-center font-mono text-slate-400">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="font-mono text-[10px] text-slate-500">{item.productCode}</div>
                    {item.notes && <div className="text-[10px] text-slate-400 italic">{item.notes}</div>}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-600 tabular-nums">
                    {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-600 tabular-nums">
                    {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold tabular-nums text-slate-900">
                    {formatCurrency(item.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Notes & Financial Totals Breakdown */}
        <div className="grid grid-cols-12 gap-4 pt-1">
          <div className="col-span-7 space-y-3">
            {purchaseOrder.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px]">
                <span className="font-bold text-slate-700 block mb-0.5">Order Notes:</span>
                <p className="text-slate-600 leading-relaxed">{purchaseOrder.notes}</p>
              </div>
            )}
            {purchaseOrder.deliveryInstructions && (
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-[11px]">
                <span className="font-bold text-amber-800 block mb-0.5">Delivery & Handling Instructions:</span>
                <p className="text-amber-900 leading-relaxed">{purchaseOrder.deliveryInstructions}</p>
              </div>
            )}
            <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-100 text-[10px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">General Terms & Delivery Policy:</span>
              <p>1. Please reference this PO number on all packing slips, commercial invoices, and correspondence.</p>
              <p>2. Goods received are subject to physical inspection and verification against technical specifications.</p>
              <p>3. Invoices will be matched against authorized Goods Received Notes (GRN) prior to disbursement.</p>
            </div>
          </div>

          <div className="col-span-5 bg-slate-50/90 p-4 rounded-xl border border-slate-200/90 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatCurrency(purchaseOrder.subtotal)}
              </span>
            </div>
            {purchaseOrder.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discounts Applied:</span>
                <span className="font-mono font-semibold tabular-nums">
                  -{formatCurrency(purchaseOrder.totalDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Applicable Taxes (VAT/SSCL):</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatCurrency(purchaseOrder.taxTotal)}
              </span>
            </div>
            {purchaseOrder.shippingCharges > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Freight / Shipping Charges:</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(purchaseOrder.shippingCharges)}
                </span>
              </div>
            )}
            {purchaseOrder.otherCharges > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Handling & Other Charges:</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatCurrency(purchaseOrder.otherCharges)}
                </span>
              </div>
            )}
            <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline text-slate-900">
              <span className="font-bold text-sm">Grand Total ({purchaseOrder.currency}):</span>
              <span className="font-mono font-black text-lg tabular-nums">
                {formatCurrency(purchaseOrder.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature & Audit Footer */}
      <div className="pt-6 border-t border-slate-200 mt-6">
        <div className="grid grid-cols-3 gap-6 text-[10px] text-slate-600">
          <div className="space-y-1">
            <span className="font-bold text-slate-700 block">Prepared By:</span>
            <p className="font-semibold text-slate-900 text-[11px]">{purchaseOrder.createdByName || 'Purchasing Officer'}</p>
            <p className="text-slate-400">Date: {formatDate(purchaseOrder.createdAt)}</p>
            <div className="h-10 border-b border-dashed border-slate-300 mt-2"></div>
            <span className="text-[9px] text-slate-400 block text-center pt-1">Procurement Department</span>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-700 block">Manager / Director Authorization:</span>
            <p className="font-semibold text-slate-900 text-[11px]">
              {purchaseOrder.approvedByName || (purchaseOrder.status === 'APPROVED' || purchaseOrder.status === 'SENT_TO_SUPPLIER' ? 'Operations Manager' : 'Pending Authorization')}
            </p>
            <p className="text-slate-400">
              Date: {purchaseOrder.approvedAt ? formatDate(purchaseOrder.approvedAt) : 'Pending'}
            </p>
            <div className="h-10 border-b border-dashed border-slate-300 mt-2 flex items-center justify-center">
              {purchaseOrder.approvedByName && (
                <span className="text-[9px] font-mono text-emerald-600 font-bold tracking-widest uppercase">
                  ✓ Digitally Signed & Approved
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400 block text-center pt-1">Authorized Executive Signatory</span>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-700 block">Supplier Acceptance:</span>
            <p className="font-semibold text-slate-900 text-[11px]">{purchaseOrder.supplierName}</p>
            <p className="text-slate-400">Acknowledged / Accepted Date: ____________</p>
            <div className="h-10 border-b border-dashed border-slate-300 mt-2"></div>
            <span className="text-[9px] text-slate-400 block text-center pt-1">Authorized Vendor Stamp & Signature</span>
          </div>
        </div>

        <div className="mt-4 text-center text-[9px] text-slate-400 border-t border-slate-100 pt-2">
          This is an official Purchase Order generated by DNS ERP Cloud. All goods delivered must conform to specifications above.
        </div>
      </div>
    </div>
  );
}
