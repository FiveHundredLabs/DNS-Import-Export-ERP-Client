import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { GRN } from '../../types/inventory';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { BarcodeVisual } from '../../components/common/BarcodeVisual';
import {
  Printer,
  X,
  FileText,
  Building2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  PackageCheck,
} from 'lucide-react';

export interface CostedPriceItemInfo {
  productId: string;
  unitCost: number;
  sellingPrice: number;
}

interface PrintableGRNProps {
  grn: GRN;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricingData?: CostedPriceItemInfo[];
}

export function PrintableGRN({ grn, open, onOpenChange, pricingData }: PrintableGRNProps) {
  const printContentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const totalExpected = grn.items?.reduce((sum, i) => sum + (i.expectedQuantity || 0), 0) || 0;
  const totalReceived = grn.items?.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0) || 0;
  const totalDamaged = grn.items?.reduce((sum, i) => sum + (i.damagedQuantity || 0), 0) || 0;
  const totalAccepted = Math.max(0, totalReceived - totalDamaged);

  const totalValue =
    grn.totalValue ||
    grn.items?.reduce((sum, i) => {
      const net = Math.max(0, i.receivedQuantity - (i.damagedQuantity || 0));
      const cost = i.unitCostSnapshot || 0;
      return sum + net * cost;
    }, 0) ||
    0;

  // Flatten serialized units for audit
  const serializedItems = (grn.items || []).filter(
    (item) => (item.serialNumbers && item.serialNumbers.length > 0) || (item.unitRecords && item.unitRecords.length > 0)
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="5xl"
      maxWidth="max-w-5xl"
      className="p-0 overflow-hidden max-w-5xl w-full"
      hideCloseButton
    >
      <div className="flex flex-col max-h-[92vh] bg-slate-100">
        {/* Printable CSS Injection */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              color: black !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-grn-document,
            #printable-grn-document * {
              visibility: visible;
            }
            #printable-grn-document {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* ── Modal Header (Screen Only) ── */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0 shadow-xs z-10 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 leading-tight truncate">
                Official Goods Received Note — Print Preview
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 hidden sm:block truncate">
                Standard corporate A4 intake voucher. Verify physical verification counts before submitting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 text-slate-600 px-2.5 sm:px-3"
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary-hover text-white font-bold shadow-xs px-3 sm:px-3.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print (A4)</span>
            </Button>
          </div>
        </div>

        {/* ── Scrollable Document Canvas ── */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 flex justify-center [scrollbar-width:thin]">
          <div
            id="printable-grn-document"
            ref={printContentRef}
            className="w-full max-w-[210mm] bg-white border border-slate-200 shadow-xl rounded-xl p-4 sm:p-6 md:p-8 print:p-8 text-slate-800 font-sans min-h-[297mm] flex flex-col justify-between"
          >
            <div>
              {/* ── 1. CORPORATE HEADER ── */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-3">
                  {/* Left: Company Identity */}
                  <div className="max-w-md min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs sm:text-sm tracking-wider shrink-0">
                        DNS
                      </div>
                      <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">
                        DNS Import &amp; Export (Pvt) Ltd
                      </h1>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-1">
                      Central Logistics &amp; Distribution Operations • Colombo Port Logistics Bay 01
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500">
                      Bay 1, Port Access Road, Colombo 13, Sri Lanka • Tel: +94 11 234 5678 / +94 77 123 4567
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                      Reg: PV-00234190 • VAT: 102341901-7000 • Customs Whse: CW-COL-01 • Email: warehouse@dnsgroup.lk
                    </p>
                  </div>

                  {/* Right: Document Title & Identifiers */}
                  <div className="text-left md:text-right flex flex-col items-start md:items-end shrink-0 w-full md:w-auto">
                    <div className="inline-block bg-slate-900 text-white font-black text-[11px] sm:text-xs md:text-sm px-3 py-1 uppercase tracking-wider rounded">
                      Goods Received Note (GRN)
                    </div>

                    <div className="mt-2 text-left md:text-right">
                      <span className="text-[9px] sm:text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        GRN Voucher Number
                      </span>
                      <span className="text-base sm:text-lg md:text-xl font-black font-mono text-slate-900 block leading-tight whitespace-nowrap">
                        {grn.grnNumber || grn.id}
                      </span>
                    </div>

                    {/* Authentic Code-128 Barcode Simulation */}
                    <div className="mt-1 flex flex-col items-start md:items-end">
                      <BarcodeVisual
                        value={grn.grnNumber || grn.id}
                        width={150}
                        height={28}
                        showText={false}
                      />
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                        *{grn.grnNumber || grn.id}*
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. STRUCTURED METADATA MATRIX ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 border border-slate-200 rounded-lg p-3 sm:p-4 mb-4 bg-slate-50/50 text-xs">
                {/* Consignor / Supplier Details */}
                <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 md:pr-4 pb-2.5 md:pb-0">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Supplier / Consignor Details
                  </div>
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <span className="text-slate-500 font-medium w-28 sm:w-32 shrink-0">Supplier Name:</span>
                    <span className="font-bold text-slate-900 text-right truncate">{grn.supplierName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-500 font-medium w-28 sm:w-32 shrink-0">Linked PO Ref:</span>
                    <span className="font-mono font-bold text-primary truncate">
                      {grn.purchaseOrderNumber || grn.poNumber || grn.poId || 'Direct Intake'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-500 font-medium w-28 sm:w-32 shrink-0">Supplier Inv / DN #:</span>
                    <span className="font-mono text-slate-800 font-semibold truncate">
                      {grn.supplierInvoiceNumber || '—'}
                    </span>
                  </div>
                </div>

                {/* Warehouse & Receiving Details */}
                <div className="space-y-1.5 md:pl-2">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Receiving &amp; Intake Details
                  </div>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-500 font-medium w-28 sm:w-32 shrink-0">Intake Date:</span>
                    <span className="font-semibold text-slate-900 truncate">
                      {formatDate(grn.receivedDate || grn.submittedAt || new Date().toISOString())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-500 font-medium w-28 sm:w-32 shrink-0">Destination Bay:</span>
                    <span className="font-semibold text-slate-800 truncate">
                      {grn.warehouseId || 'WH-MAIN'} (Port Bay 01)
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-500 font-medium w-28 sm:w-32 shrink-0">Lifecycle Status:</span>
                    <span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0 shrink-0 ${
                          grn.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : grn.status === 'SUBMITTED'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {grn.status === 'SUBMITTED'
                          ? 'PENDING APPROVAL'
                          : grn.status || 'DRAFT'}
                      </Badge>
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 3. RECEIVED LINE ITEMS TABLE ── */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    {pricingData
                      ? 'Costed & Priced Inventory Line Items'
                      : 'Received Line Items & Physical Verification'}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Total Line Items: {grn.items?.length || 0}
                  </span>
                </div>

                <div className="border border-slate-300 rounded overflow-x-auto print:overflow-visible [scrollbar-width:thin]">
                  <table className="w-full min-w-[680px] print:min-w-0 border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                        <th className="py-2.5 px-2 border-r border-slate-300 text-center w-8">#</th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-left">
                          Item SKU &amp; Description
                        </th>
                        <th className="py-2.5 px-2 border-r border-slate-300 text-center w-14">UOM</th>
                        <th className="py-2.5 px-2 border-r border-slate-300 text-right w-20">
                          PO Expected
                        </th>
                        <th className="py-2.5 px-2 border-r border-slate-300 text-right w-20">
                          Received
                        </th>
                        <th className="py-2.5 px-2 border-r border-slate-300 text-right w-20 text-rose-700">
                          Damaged
                        </th>
                        <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-24 text-emerald-800 bg-emerald-50/70 font-black">
                          Net Accepted
                        </th>
                        <th className="py-2.5 px-3 border-r border-slate-300 text-right w-24">
                          Unit Cost
                        </th>
                        <th className="py-2.5 px-3 text-right w-28">
                          Total (LKR)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {grn.items?.map((item, idx) => {
                        const netQty = Math.max(0, item.receivedQuantity - (item.damagedQuantity || 0));
                        const pricing = pricingData?.find((p) => p.productId === item.productId);
                        const unitCost = pricing ? pricing.unitCost : (item.unitCostSnapshot || 0);
                        const lineTotal = netQty * unitCost;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200">
                              <div className="font-bold text-slate-900 leading-snug">
                                {item.productNameSnapshot || item.productId}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 font-semibold">
                                SKU: {item.skuSnapshot || item.productId}
                              </div>
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 text-center text-[11px] text-slate-600 font-medium">
                              {item.uom || 'PCS'}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 text-right tabular-nums text-slate-700">
                              {item.expectedQuantity}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 text-right tabular-nums font-semibold text-slate-900">
                              {item.receivedQuantity}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 text-right tabular-nums text-rose-600 font-semibold">
                              {item.damagedQuantity || 0}
                            </td>
                            <td className="py-2 px-2.5 border-r border-slate-200 text-right tabular-nums text-emerald-800 font-black bg-emerald-50/40">
                              {netQty}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-right tabular-nums font-mono text-slate-700">
                              {formatCurrency(unitCost).replace('LKR ', '')}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums font-mono font-bold text-slate-900">
                              {formatCurrency(lineTotal).replace('LKR ', '')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/90 border-t-2 border-slate-400 font-bold">
                        <td colSpan={3} className="py-2.5 px-3 border-r border-slate-300 uppercase text-slate-700 text-[11px]">
                          Intake Summary Totals:
                        </td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-right tabular-nums text-slate-700">
                          {totalExpected}
                        </td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-right tabular-nums text-slate-900 font-bold">
                          {totalReceived}
                        </td>
                        <td className="py-2.5 px-2 border-r border-slate-300 text-right tabular-nums text-rose-700 font-bold">
                          {totalDamaged}
                        </td>
                        <td className="py-2.5 px-2.5 border-r border-slate-300 text-right tabular-nums text-emerald-800 font-black bg-emerald-100/60">
                          {totalAccepted}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-300 text-right text-[10px] text-slate-500 uppercase">
                          Grand Total:
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-black font-mono text-slate-900 text-xs">
                          {formatCurrency(totalValue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── 4. SERIAL NUMBERS & TRACEABILITY AUDIT (IF APPLICABLE) ── */}
              {serializedItems.length > 0 && (
                <div className="mb-5 border border-slate-200 rounded p-3 bg-slate-50/60 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wide text-[10px] mb-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Serialized Unit Traceability Log
                  </div>
                  <div className="space-y-1.5">
                    {serializedItems.map((it, i) => {
                      const serialList =
                        (it.serialNumbers && it.serialNumbers.length > 0)
                          ? it.serialNumbers
                          : (it.unitRecords || []).map((u) => u.serialNumber).filter(Boolean);

                      if (serialList.length === 0) return null;

                      return (
                        <div key={i} className="text-[11px]">
                          <span className="font-semibold text-slate-800">
                            {it.productNameSnapshot || it.productId}:
                          </span>{' '}
                          <span className="font-mono text-slate-600">
                            {serialList.join(', ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── 5. RECEIVING REMARKS & DISCREPANCY NOTES ── */}
              {grn.notes && (
                <div className="mb-5 border border-slate-200 rounded p-3 bg-slate-50 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">
                    Receiving Remarks &amp; Inspection Observations:
                  </span>
                  <p className="text-slate-600 italic whitespace-pre-line leading-relaxed">
                    {grn.notes}
                  </p>
                </div>
              )}
            </div>

            {/* ── 6. OFFICIAL AUTHORIZATION & 4-WAY SIGN-OFF BLOCKS ── */}
            <div className="border-t-2 border-slate-900 pt-5 mt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* 1. Received by Stock Keeper */}
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Received &amp; Counted By
                    </span>
                    <div className="h-10 border-b border-dashed border-slate-300 my-1.5"></div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 truncate">
                      Stock Keeper: {grn.receivedById || 'Warehouse Officer'}
                    </div>
                    <div className="text-[10px] text-slate-500">Date: ____/____/2026</div>
                  </div>
                </div>

                {/* 2. Inspected by QA */}
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Quality Inspected By
                    </span>
                    <div className="h-10 border-b border-dashed border-slate-300 my-1.5"></div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900">
                      Physical Inspection Pass
                    </div>
                    <div className="text-[10px] text-slate-500">Date: ____/____/2026</div>
                  </div>
                </div>

                {/* 3. Inventory Manager Sign-off */}
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Verified &amp; Approved By
                    </span>
                    <div className="h-10 border-b border-dashed border-slate-300 my-1.5"></div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900 truncate">
                      Manager: {grn.approvedById || (grn.status === 'APPROVED' ? 'Operations Manager' : 'Pending Sign-Off')}
                    </div>
                    <div className="text-[10px] text-slate-500">Date: ____/____/2026</div>
                  </div>
                </div>

                {/* 4. Finance AP Costing */}
                <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Accounts Payable Entry
                    </span>
                    <div className="h-10 border-b border-dashed border-slate-300 my-1.5"></div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-900">
                      AP Bill Voucher Entry
                    </div>
                    <div className="text-[10px] text-slate-500">Ref: AP-GRN-______</div>
                  </div>
                </div>
              </div>

              {/* Legal Disclaimer */}
              <div className="mt-5 text-center text-[9px] text-slate-400 leading-tight">
                This document is a certified commercial intake voucher for DNS Import &amp; Export (Pvt) Ltd. All goods listed above have been received in good order subject to physical inspection and supplier delivery invoice audit. Generated via DNS Enterprise Resource Planning System on {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default PrintableGRN;
