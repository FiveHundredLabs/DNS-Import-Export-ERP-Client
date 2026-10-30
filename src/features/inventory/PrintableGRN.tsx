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
import { Printer, Download, X, Building2, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';

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
  const totalAccepted = totalReceived - totalDamaged;

  const totalValue =
    grn.totalValue ||
    grn.items?.reduce(
      (sum, i) => sum + (i.receivedQuantity - (i.damagedQuantity || 0)) * (i.unitCostSnapshot || 0),
      0
    ) ||
    0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="p-4 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base font-bold text-slate-900">
              Official Goods Received Note — Print Preview
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs bg-primary hover:bg-primary-hover text-white font-medium"
            >
              <Printer className="h-3.5 w-3.5" />
              Print (A4)
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div
            ref={printContentRef}
            className="print-container bg-white border border-slate-200 shadow-sm rounded-lg p-8 mx-auto max-w-[210mm] text-slate-800 font-sans"
            style={{ minHeight: '297mm' }}
          >
            {/* ── Document Header ── */}
            <div className="border-b-2 border-slate-800 pb-5 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    DNS Import &amp; Export (Pvt) Ltd
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Central Logistics &amp; Distribution Operations • Bay 1, Colombo Port Road, Colombo 13
                  </p>
                  <p className="text-xs text-slate-500">
                    Tel: +94 11 234 5678 | Email: warehouse@dns-group.lk
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-black text-sm px-3 py-1 uppercase tracking-wider rounded">
                    Goods Received Note
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider">
                      GRN Number
                    </span>
                    <span className="text-lg font-black font-mono text-slate-900">
                      {grn.grnNumber || grn.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Meta Information Matrix ── */}
            <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded p-4 mb-6 bg-slate-50/50 text-xs">
              <div>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold w-32">Supplier Name:</td>
                      <td className="py-1 font-bold text-slate-900">{grn.supplierName || '—'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Linked PO #:</td>
                      <td className="py-1 font-mono font-bold text-primary">
                        {grn.purchaseOrderNumber || grn.poNumber || grn.poId || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 font-semibold">Vendor Inv / DN:</td>
                      <td className="py-1 font-mono text-slate-700">
                        {grn.supplierInvoiceNumber || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold w-32">Received Date:</td>
                      <td className="py-1 font-medium text-slate-900">
                        {formatDate(grn.receivedDate || grn.submittedAt || new Date().toISOString())}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-1 text-slate-500 font-semibold">Destination Bay:</td>
                      <td className="py-1 font-medium text-slate-900">{grn.warehouseId || 'WH-MAIN'}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 font-semibold">Lifecycle Status:</td>
                      <td className="py-1">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-800">
                          {grn.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Line Items Table ── */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                {pricingData ? 'Costed & Priced Inventory Line Items' : 'Received Line Items & Physical Verification'}
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  {pricingData ? (
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="py-2 px-2 border-r border-slate-300 text-center w-8">#</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-left">Product Name</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Quantity</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right w-32">Unit Cost</th>
                      <th className="py-2 px-3 text-right w-32 text-emerald-800">Selling Price</th>
                    </tr>
                  ) : (
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="py-2 px-2 border-r border-slate-300 text-center w-8">#</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-left">Product / SKU</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-right w-16">Expected</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-right w-16">Received</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-right w-16 text-rose-600">Damaged</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-right w-16 text-emerald-700 font-bold">Net Accepted</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-center w-12">UOM</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Unit Cost</th>
                      <th className="py-2 px-3 text-right w-28">Total (LKR)</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {grn.items?.map((item, idx) => {
                    const netQty = Math.max(0, item.receivedQuantity - (item.damagedQuantity || 0));
                    const pricing = pricingData?.find((p) => p.productId === item.productId);
                    const unitCost = pricing ? pricing.unitCost : (item.unitCostSnapshot || 0);
                    const sellingPrice = pricing ? pricing.sellingPrice : 0;
                    const lineTotal = netQty * unitCost;

                    if (pricingData) {
                      return (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="py-2.5 px-2 border-r border-slate-200 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                            {item.productNameSnapshot || item.productId}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-primary tabular-nums">
                            {item.receivedQuantity} {item.uom || 'units'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono tabular-nums text-slate-700">
                            {formatCurrency(unitCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums bg-emerald-50/40">
                            {formatCurrency(sellingPrice)}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="py-2 px-2 border-r border-slate-200 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="font-bold text-slate-900 leading-tight">
                            {item.productNameSnapshot || item.productId}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {item.skuSnapshot}
                          </div>
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-right tabular-nums">
                          {item.expectedQuantity}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-right tabular-nums font-semibold">
                          {item.receivedQuantity}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-right tabular-nums text-rose-600 font-medium">
                          {item.damagedQuantity || 0}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-right tabular-nums text-emerald-800 font-bold bg-emerald-50/50">
                          {netQty}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center text-[10px] text-slate-500">
                          {item.uom || 'PCS'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right tabular-nums">
                          {formatCurrency(unitCost).replace('LKR ', '')}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold">
                          {formatCurrency(lineTotal).replace('LKR ', '')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300 uppercase text-slate-600">
                      Summary Totals:
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-300 text-right tabular-nums">
                      {totalExpected}
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-300 text-right tabular-nums">
                      {totalReceived}
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-300 text-right tabular-nums text-rose-600">
                      {totalDamaged}
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-300 text-right tabular-nums text-emerald-800 font-black">
                      {totalAccepted}
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-300"></td>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-right uppercase text-[11px] text-slate-500">
                      Grand Net:
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-black text-slate-900">
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Notes / Observations ── */}
            {grn.notes && (
              <div className="mb-6 border border-slate-200 rounded p-3 bg-slate-50 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Receiving Remarks / Notes:</span>
                <p className="text-slate-600 italic whitespace-pre-line">{grn.notes}</p>
              </div>
            )}

            {/* ── Official Authorization & Sign-off Blocks ── */}
            <div className="border-t-2 border-slate-800 pt-6 mt-8">
              <div className="grid grid-cols-3 gap-6 text-xs">
                {/* Stock Keeper */}
                <div className="border border-slate-200 rounded p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Received &amp; Counted By
                  </span>
                  <div className="h-12 border-b border-dashed border-slate-300 my-2"></div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    Stock Keeper: {grn.receivedById || 'Warehouse Officer'}
                  </div>
                  <div className="text-[10px] text-slate-400">Date: _______________</div>
                </div>

                {/* Stock Manager / Inspector */}
                <div className="border border-slate-200 rounded p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Verified &amp; Approved By
                  </span>
                  <div className="h-12 border-b border-dashed border-slate-300 my-2"></div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    Stock Manager: {grn.approvedById || 'Pending Sign-off'}
                  </div>
                  <div className="text-[10px] text-slate-400">Date: _______________</div>
                </div>

                {/* Finance AP Clerk */}
                <div className="border border-slate-200 rounded p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Accounts Payable Entry
                  </span>
                  <div className="h-12 border-b border-dashed border-slate-300 my-2"></div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    Finance AP Sign-off
                  </div>
                  <div className="text-[10px] text-slate-400">Bill Ref: _______________</div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-slate-400">
                This document is a certified record of goods intake for DNS Import &amp; Export (Pvt) Ltd.
                Generated via DNS Enterprise Resource Planning System on {new Date().toLocaleString()}.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
