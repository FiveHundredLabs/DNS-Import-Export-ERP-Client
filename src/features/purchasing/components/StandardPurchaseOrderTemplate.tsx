import React from 'react';
import { PurchaseOrder } from '../../../types/purchasing';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/table';
import {
  paginatePurchaseOrder,
  POPageData,
  PaginatedPOItem,
} from '../utils/purchaseOrderPaginator';

interface StandardPurchaseOrderTemplateProps {
  purchaseOrder: PurchaseOrder;
}

export function StandardPurchaseOrderTemplate({
  purchaseOrder,
}: StandardPurchaseOrderTemplateProps) {
  const pages = paginatePurchaseOrder(purchaseOrder);

  return (
    <div className="w-full flex flex-col items-center select-text font-sans">
      {pages.map((page) => (
        <POPageSheet
          key={page.pageNumber}
          purchaseOrder={purchaseOrder}
          page={page}
        />
      ))}
    </div>
  );
}

interface POPageSheetProps {
  purchaseOrder: PurchaseOrder;
  page: POPageData;
}

/**
 * Renders a single standard A4 sheet for the Purchase Order.
 * Fixed dimensions: 794px width x 1123px minHeight (210mm x 297mm standard A4).
 */
export function POPageSheet({ purchaseOrder, page }: POPageSheetProps) {
  return (
    <div
      data-testid={`po-page-${page.pageNumber}`}
      className="a4-print-sheet w-[794px] min-h-[1123px] bg-white text-slate-800 p-10 flex flex-col justify-between mb-8 print:mb-0 print:p-0 print:shadow-none print:border-0 shadow-md border border-slate-200 rounded-sm relative box-border"
    >
      {/* Top Section */}
      <div className="space-y-4">
        {page.isFirstPage ? (
          <POFirstPageHeader purchaseOrder={purchaseOrder} page={page} />
        ) : (
          <POContinuationHeader purchaseOrder={purchaseOrder} page={page} />
        )}

        {/* Product Items Table (shown on pages with items) */}
        {page.items.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table className="text-[11px] table-fixed w-full">
              <TableHeader className="bg-slate-100 text-slate-800">
                <TableRow className="border-b border-slate-300 hover:bg-transparent">
                  <TableHead className="w-10 font-bold text-slate-900 text-center">#</TableHead>
                  <TableHead className="font-bold text-slate-900">Product / SKU & Description</TableHead>
                  <TableHead className="w-14 text-right font-bold text-slate-900">Qty</TableHead>
                  <TableHead className="w-28 text-right font-bold text-slate-900 whitespace-nowrap">
                    Unit Price ({purchaseOrder.currency})
                  </TableHead>
                  <TableHead className="w-16 text-right font-bold text-slate-900">Disc %</TableHead>
                  <TableHead className="w-16 text-right font-bold text-slate-900">Tax %</TableHead>
                  <TableHead className="w-32 text-right font-bold text-slate-900 whitespace-nowrap">
                    Line Total ({purchaseOrder.currency})
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((paginated) => (
                  <POItemRow
                    key={paginated.item.id || `${paginated.item.productCode}-${paginated.itemNumber}`}
                    paginated={paginated}
                    currency={purchaseOrder.currency}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* If this is a standalone continuation page for terms & signatures, provide context notice */}
        {page.isStandaloneSignaturesPage && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 mb-2">
            <span className="font-semibold text-slate-800">
              Continuation: Financial Summary, Terms & Authorization Signatures for Purchase Order {purchaseOrder.poNumber}
            </span>
          </div>
        )}

        {/* Financial Summary & Terms (Rendered once on the designated closing page) */}
        {page.showSummaryAndTerms && (
          <div className="break-inside-avoid">
            <POFinancialSummaryAndTerms purchaseOrder={purchaseOrder} />
          </div>
        )}

        {/* Signature Blocks (Rendered once on the final content page) */}
        {page.showSignatures && (
          <div className="break-inside-avoid pt-2">
            <POSignaturesSection purchaseOrder={purchaseOrder} />
          </div>
        )}
      </div>

      {/* Page Footer */}
      <POPageFooter page={page} />
    </div>
  );
}

/**
 * First Page Corporate Header: Full DNS branding, Document Title, PO Number, Meta,
 * and Vendor/Shipping information grid.
 * NOTE: The PO status badge is REMOVED from printable output per Requirement 1.
 */
function POFirstPageHeader({
  purchaseOrder,
  page,
}: {
  purchaseOrder: PurchaseOrder;
  page: POPageData;
}) {
  return (
    <div className="space-y-4">
      {/* Top Banner Row */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-3">
        <div className="space-y-1">
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
          <div className="text-[11px] text-slate-500 space-y-0.5 pt-0.5">
            <p>142 First Cross Street, Colombo 11, Sri Lanka</p>
            <p>Tel: +94 11 234 5678 | Email: procurement@dnsdistribution.lk</p>
            <p className="font-semibold text-slate-700">VAT Registration No: 109847291-7000</p>
          </div>
        </div>

        <div className="text-right space-y-1 shrink-0">
          <div className="flex items-center justify-end gap-2">
            <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-xs uppercase tracking-wider font-bold">
              PURCHASE ORDER
            </span>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Page {page.pageNumber} of {page.totalPages}
            </span>
          </div>

          <div className="font-mono text-xl font-bold tabular-nums text-slate-900 pt-0.5">
            {purchaseOrder.poNumber}
          </div>

          {/* NOTE: Status badge explicitly omitted from printable document */}

          <div className="text-[11px] text-slate-500 pt-0.5 space-y-0.5">
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
      <div className="grid grid-cols-2 gap-4 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 text-xs">
        <div className="space-y-0.5">
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

        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Delivery Destination & Contact
          </span>
          <div className="font-bold text-slate-900 text-sm">Central Warehouse (DNS Central Hub)</div>
          <div className="text-slate-600 text-[11px]">18 Bloemendhal Road, Kotahena, Colombo 13</div>
          <div className="text-slate-600 text-[11px]">Receiving Hours: Mon-Fri 08:30 - 16:30</div>
          <div className="text-slate-600 text-[11px]">Storekeeper Desk: +94 11 245 8899</div>
          <div className="pt-1 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-700">Currency:</span> {purchaseOrder.currency || 'LKR'}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Header for Continuation Pages (Page 2, 3, etc.):
 * Saves space for table rows while repeating company ID, document title, PO number, and page count.
 */
function POContinuationHeader({
  purchaseOrder,
  page,
}: {
  purchaseOrder: PurchaseOrder;
  page: POPageData;
}) {
  return (
    <div className="flex items-center justify-between pb-2.5 border-b-2 border-slate-900 mb-2">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
          DNS
        </div>
        <div>
          <span className="font-bold text-slate-900 text-xs">DNS DISTRIBUTION (PVT) LTD</span>
          <span className="text-[10px] text-slate-500 ml-2 hidden sm:inline">
            VAT: 109847291-7000 | Procurement
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="font-mono font-bold text-slate-900 text-xs">
            PURCHASE ORDER: {purchaseOrder.poNumber}
          </span>
          <span className="text-[11px] text-slate-500 ml-2">
            ({formatDate(purchaseOrder.orderDate)})
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
          Page {page.pageNumber} of {page.totalPages}
        </span>
      </div>
    </div>
  );
}

/**
 * Single product item table row with right-aligned currency and continuous global numbering
 */
function POItemRow({
  paginated,
  currency,
}: {
  paginated: PaginatedPOItem;
  currency: string;
}) {
  const { item, itemNumber } = paginated;

  return (
    <TableRow className="border-b border-slate-200 hover:bg-transparent">
      <TableCell className="text-center font-mono text-slate-500 font-semibold align-top py-2">
        {itemNumber}
      </TableCell>
      <TableCell className="align-top py-2">
        <div className="font-semibold text-slate-900 text-xs">{item.productName}</div>
        <div className="font-mono text-[10px] text-slate-500">{item.productCode}</div>
        {item.notes && <div className="text-[10px] text-slate-500 italic mt-0.5">{item.notes}</div>}
      </TableCell>
      <TableCell className="text-right font-mono font-semibold tabular-nums align-top py-2">
        {item.quantity}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums whitespace-nowrap align-top py-2">
        {formatCurrency(item.unitPrice, currency)}
      </TableCell>
      <TableCell className="text-right font-mono text-slate-600 tabular-nums align-top py-2">
        {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
      </TableCell>
      <TableCell className="text-right font-mono text-slate-600 tabular-nums align-top py-2">
        {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
      </TableCell>
      <TableCell className="text-right font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap align-top py-2">
        {formatCurrency(item.total, currency)}
      </TableCell>
    </TableRow>
  );
}

/**
 * Financial Totals Breakdown & Notes/Terms: Displayed once after the last product item
 */
function POFinancialSummaryAndTerms({
  purchaseOrder,
}: {
  purchaseOrder: PurchaseOrder;
}) {
  return (
    <div className="grid grid-cols-12 gap-4 pt-1">
      {/* Left Column: Notes, Delivery Instructions & Policy Terms */}
      <div className="col-span-7 space-y-2.5">
        {purchaseOrder.notes && (
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px]">
            <span className="font-bold text-slate-700 block mb-0.5">Order Notes:</span>
            <p className="text-slate-600 leading-relaxed">{purchaseOrder.notes}</p>
          </div>
        )}
        {purchaseOrder.deliveryInstructions && (
          <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200/80 text-[11px]">
            <span className="font-bold text-amber-800 block mb-0.5">Delivery & Handling Instructions:</span>
            <p className="text-amber-900 leading-relaxed">{purchaseOrder.deliveryInstructions}</p>
          </div>
        )}
        <div className="p-2.5 bg-blue-50/40 rounded-lg border border-blue-100 text-[10px] text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block">General Terms & Delivery Policy:</span>
          <p>1. Please reference this PO number on all packing slips, commercial invoices, and correspondence.</p>
          <p>2. Goods received are subject to physical inspection and verification against technical specifications.</p>
          <p>3. Invoices will be matched against authorized Goods Received Notes (GRN) prior to disbursement.</p>
        </div>
      </div>

      {/* Right Column: Financial Summary Breakdown */}
      <div className="col-span-5 bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/90 space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal:</span>
          <span className="font-mono font-semibold tabular-nums">
            {formatCurrency(purchaseOrder.subtotal, purchaseOrder.currency)}
          </span>
        </div>
        {purchaseOrder.totalDiscount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discounts Applied:</span>
            <span className="font-mono font-semibold tabular-nums">
              -{formatCurrency(purchaseOrder.totalDiscount, purchaseOrder.currency)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-slate-600">
          <span>Applicable Taxes (VAT/SSCL):</span>
          <span className="font-mono font-semibold tabular-nums">
            {formatCurrency(purchaseOrder.taxTotal, purchaseOrder.currency)}
          </span>
        </div>
        {purchaseOrder.shippingCharges > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Freight / Shipping Charges:</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(purchaseOrder.shippingCharges, purchaseOrder.currency)}
            </span>
          </div>
        )}
        {purchaseOrder.otherCharges > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Handling & Other Charges:</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(purchaseOrder.otherCharges, purchaseOrder.currency)}
            </span>
          </div>
        )}
        <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline text-slate-900">
          <span className="font-bold text-xs sm:text-sm">Grand Total ({purchaseOrder.currency}):</span>
          <span className="font-mono font-black text-base sm:text-lg tabular-nums">
            {formatCurrency(purchaseOrder.grandTotal, purchaseOrder.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Signature Blocks: Prepared By, Authorized Signatory, and Supplier Acceptance
 */
function POSignaturesSection({ purchaseOrder }: { purchaseOrder: PurchaseOrder }) {
  const isApproved =
    Boolean(purchaseOrder.approvedByName) ||
    purchaseOrder.status === 'APPROVED' ||
    purchaseOrder.status === 'SENT_TO_SUPPLIER';

  return (
    <div className="pt-4 border-t border-slate-200 mt-3">
      <div className="grid grid-cols-3 gap-6 text-[10px] text-slate-600">
        {/* Prepared By */}
        <div className="space-y-1">
          <span className="font-bold text-slate-700 block">Prepared By:</span>
          <p className="font-semibold text-slate-900 text-[11px]">
            {purchaseOrder.createdByName || 'Purchasing Officer'}
          </p>
          <p className="text-slate-400">Date: {formatDate(purchaseOrder.createdAt)}</p>
          <div className="h-9 border-b border-dashed border-slate-300 mt-1"></div>
          <span className="text-[9px] text-slate-400 block text-center pt-1">Procurement Department</span>
        </div>

        {/* Manager / Director Authorization */}
        <div className="space-y-1">
          <span className="font-bold text-slate-700 block">Manager / Director Authorization:</span>
          <p className="font-semibold text-slate-900 text-[11px]">
            {isApproved
              ? purchaseOrder.approvedByName || 'Authorized Executive Signatory'
              : 'Pending Authorization'}
          </p>
          <p className="text-slate-400">
            Date: {purchaseOrder.approvedAt ? formatDate(purchaseOrder.approvedAt) : 'Pending'}
          </p>
          <div className="h-9 border-b border-dashed border-slate-300 mt-1 flex items-center justify-center">
            {isApproved && (
              <span className="text-[9px] font-mono text-emerald-600 font-bold tracking-wider uppercase">
                ✓ Digitally Signed & Approved
              </span>
            )}
          </div>
          <span className="text-[9px] text-slate-400 block text-center pt-1">Authorized Executive Signatory</span>
        </div>

        {/* Supplier Acceptance */}
        <div className="space-y-1">
          <span className="font-bold text-slate-700 block">Supplier Acceptance:</span>
          <p className="font-semibold text-slate-900 text-[11px] truncate">{purchaseOrder.supplierName}</p>
          <p className="text-slate-400">Acknowledged / Accepted Date: ____________</p>
          <div className="h-9 border-b border-dashed border-slate-300 mt-1"></div>
          <span className="text-[9px] text-slate-400 block text-center pt-1">Authorized Vendor Stamp & Signature</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Standard Page Footer: Page number indicator and legal disclaimer
 */
function POPageFooter({ page }: { page: POPageData }) {
  return (
    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
      <span>
        DNS Distribution (Pvt) Ltd • Official Purchase Order • Non-Transferable
      </span>
      <span className="font-bold text-slate-500 font-mono">
        Page {page.pageNumber} of {page.totalPages}
      </span>
    </div>
  );
}
