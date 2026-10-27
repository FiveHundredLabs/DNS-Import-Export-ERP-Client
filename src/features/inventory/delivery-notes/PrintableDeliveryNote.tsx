import React from 'react';
import { DeliveryNote } from '../../../types/deliveryNote';
import { Button } from '../../../components/ui/button';
import { Printer, X, CheckCircle, AlertTriangle, Truck, ShieldCheck } from 'lucide-react';

interface PrintableDeliveryNoteProps {
  note: DeliveryNote;
  onClose?: () => void;
}

export const PrintableDeliveryNote: React.FC<PrintableDeliveryNoteProps> = ({ note, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm text-slate-800">
              Official Warehouse Delivery Note & Customer Acceptance Slip
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
              {note.deliveryNoteNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              <Printer className="h-4 w-4" />
              Print Delivery Note (A4)
            </Button>
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ── Printable A4 Sheet Body ── */}
        <div className="p-8 text-slate-900 font-sans print:p-6" id="delivery-note-print-area">
          {/* Header & Logo */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-white font-black text-sm">
                  DNS
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 leading-tight">
                    DNS ENGINEERING & ELECTRICALS (PVT) LTD
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Industrial Switchgear, Distribution Boards & Automation Importers
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 max-w-sm leading-relaxed">
                Central Logistics Warehouse • Bay 4, Industrial Zone, Orugodawatta, Sri Lanka
                <br />
                Hotline: +94 11 234 5600 | Dispatch Desk: +94 11 234 5609 | Email: dispatch@dns.lk
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white font-extrabold text-sm px-3.5 py-1 uppercase tracking-wider rounded-xs mb-2">
                DELIVERY NOTE / DISPATCH RECEIPT
              </div>
              <div className="text-lg font-mono font-bold text-slate-900">{note.deliveryNoteNumber}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Dispatch Date: <span className="font-semibold text-slate-800">{note.dispatchDate}</span>
              </div>
              <div className="text-xs text-slate-500">
                Invoice Ref: <span className="font-mono font-semibold text-slate-800">{note.invoiceNumber}</span>
              </div>
              {note.orderNumber && (
                <div className="text-xs text-slate-500">
                  Sales Order: <span className="font-mono font-semibold text-slate-800">{note.orderNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Transport Info Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Deliver To Customer */}
            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50">
              <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span>CONSIGNEE / DELIVER TO:</span>
              </div>
              <div className="font-bold text-sm text-slate-950">{note.customerName}</div>
              <div className="text-xs text-slate-700 font-mono mt-0.5">Code: {note.customerCode}</div>
              {note.customerAddress && (
                <div className="text-xs text-slate-600 mt-1 leading-snug">{note.customerAddress}</div>
              )}
              {note.customerPhone && (
                <div className="text-xs text-slate-600 mt-1">Tel / Mobile: {note.customerPhone}</div>
              )}
              {note.customerVatNumber && (
                <div className="text-[11px] text-slate-500 mt-0.5">VAT: {note.customerVatNumber}</div>
              )}
            </div>

            {/* Transport & Driver Information */}
            <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50">
              <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-slate-600" />
                <span>TRANSPORT & DISPATCH LOGISTICS:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Driver Name:</span>
                  <div className="font-semibold text-slate-900">{note.driverName || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Vehicle / Lorry No:</span>
                  <div className="font-mono font-bold text-slate-900 uppercase">
                    {note.vehicleNumber || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Driver Contact:</span>
                  <div className="text-slate-800">{note.driverPhone || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Delivery Route:</span>
                  <div className="text-slate-800">{note.deliveryRoute || 'Direct Delivery'}</div>
                </div>
              </div>
              {note.notes && (
                <div className="mt-2 pt-1.5 border-t border-slate-200 text-[11px] text-slate-600 italic">
                  Note: {note.notes}
                </div>
              )}
            </div>
          </div>

          {/* Table of Dispatched Goods */}
          <div className="mb-6">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>SCHEDULE OF GOODS DISPATCHED & PHYSICAL UNIT ALLOCATION</span>
              <span className="text-slate-500 font-normal">
                Total Dispatched: <strong className="text-slate-900">{note.totalDispatchedUnits} Units</strong>
              </span>
            </div>

            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2 px-3 w-10 text-center border-r border-slate-300">#</th>
                  <th className="py-2 px-3 border-r border-slate-300">Product Description & Specification</th>
                  <th className="py-2 px-3 w-28 border-r border-slate-300">SKU / Item Code</th>
                  <th className="py-2 px-3 w-16 text-center border-r border-slate-300">UoM</th>
                  <th className="py-2 px-3 w-20 text-right border-r border-slate-300">Invoiced</th>
                  <th className="py-2 px-3 w-20 text-right font-black border-r border-slate-300">Dispatched</th>
                  <th className="py-2 px-3 w-24 text-center">Customer Checked</th>
                </tr>
              </thead>
              <tbody>
                {note.items.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-slate-300">
                      <td className="py-2.5 px-3 text-center border-r border-slate-300 font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 font-medium text-slate-950">
                        <div>{item.productName}</div>
                        {/* Unit Barcodes Preview */}
                        <div className="mt-1 flex flex-wrap gap-1 print:gap-0.5">
                          {item.unitBarcodes.map((barcode, bIdx) => {
                            const isRejected = item.rejectedUnitBarcodes.includes(barcode);
                            return (
                              <span
                                key={bIdx}
                                className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-xs border ${
                                  isRejected
                                    ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                                    : 'bg-slate-50 border-slate-300 text-slate-700'
                                }`}
                              >
                                {barcode}
                                {isRejected && ' (REJECTED)'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 font-mono text-slate-700">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-slate-300 font-semibold text-slate-600">
                        {item.uom || 'PCS'}
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-slate-300 font-medium text-slate-700">
                        {item.invoicedQuantity}
                      </td>
                      <td className="py-2.5 px-3 text-right border-r border-slate-300 font-black text-slate-950 text-sm">
                        {item.dispatchedQuantity}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="w-4 h-4 border border-slate-400 rounded-xs mx-auto"></div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                  <td colSpan={4} className="py-2 px-3 text-right text-slate-700 uppercase">
                    Total Physical Units Dispatched:
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-700">
                    {note.totalInvoicedUnits}
                  </td>
                  <td className="py-2 px-3 text-right font-black text-slate-950 text-sm">
                    {note.totalDispatchedUnits}
                  </td>
                  <td className="py-2 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Customer Acceptance Acknowledgment Text */}
          <div className="border border-slate-300 bg-slate-50/70 rounded-lg p-3 mb-6 text-xs text-slate-700 leading-relaxed">
            <p className="font-bold text-slate-900 mb-0.5">Customer Receipt & Acceptance Declaration:</p>
            <p className="text-[11px] text-slate-600">
              I/We hereby acknowledge receipt of the electrical goods enumerated above in complete quantity and good physical condition,
              free from transit breakages or defects. Any discrepancies, damages, or warranty claims must be reported to DNS Customer
              Support within 48 hours with corresponding unit serial/barcode references.
            </p>
          </div>

          {/* ── Formal 3-Part Signature Blocks (Customer, Driver, Stock Keeper) ── */}
          <div className="grid grid-cols-3 gap-4 border border-slate-300 rounded-lg p-4 mb-4">
            {/* 1. Warehouse Stock Keeper */}
            <div className="flex flex-col justify-between h-32 pr-2 border-r border-slate-200">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  1. Dispatched By (Stock Keeper)
                </div>
                <div className="text-xs font-semibold text-slate-900">{note.createdBy}</div>
                <div className="text-[10px] text-slate-500 font-mono">Date: {note.dispatchDate}</div>
              </div>
              <div>
                <div className="border-b border-dashed border-slate-400 w-full mb-1"></div>
                <div className="text-[10px] text-slate-500 text-center">Store Keeper Signature</div>
              </div>
            </div>

            {/* 2. Delivery Driver / Transporter */}
            <div className="flex flex-col justify-between h-32 px-2 border-r border-slate-200">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  2. Handed Over To (Driver)
                </div>
                <div className="text-xs font-semibold text-slate-900">{note.driverName}</div>
                <div className="text-[10px] text-slate-500 font-mono">Vehicle: {note.vehicleNumber}</div>
              </div>
              <div>
                <div className="border-b border-dashed border-slate-400 w-full mb-1"></div>
                <div className="text-[10px] text-slate-500 text-center">Driver / Courier Signature</div>
              </div>
            </div>

            {/* 3. Customer Sign & Stamp Space */}
            <div className="flex flex-col justify-between h-32 pl-2 bg-amber-50/40 p-2 rounded-xs border border-amber-200/60">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
                  <span>3. Received By (Customer)</span>
                  <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-semibold">
                    Sign & Stamp Required
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Name: {note.customerSignatureName || '________________________'}
                </div>
                <div className="text-[10px] text-slate-500">NIC / ID: _____________________</div>
                <div className="text-[10px] text-slate-500">Date & Time: _________________</div>
              </div>
              <div>
                <div className="border-b-2 border-slate-700 w-full mb-1"></div>
                <div className="text-[10px] font-bold text-slate-800 text-center">
                  Authorized Customer Signature & Official Company Rubber Stamp
                </div>
              </div>
            </div>
          </div>

          {/* Rejection / Partial Acceptance Footnote (if applicable) */}
          {note.totalRejectedUnits > 0 && (
            <div className="mt-3 p-2.5 rounded-lg border border-rose-300 bg-rose-50 text-xs text-rose-900">
              <div className="font-bold flex items-center gap-1.5 mb-0.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                CUSTOMER RETURN / PARTIAL REJECTION RECORDED:
              </div>
              <p className="text-[11px] text-rose-800">
                {note.totalRejectedUnits} physical unit(s) were returned rejected by customer upon delivery.
                Reason: <strong>{note.items.find((i) => i.rejectedQuantity > 0)?.rejectionReason || 'Damaged'}</strong>.
                {note.rejectionApprovalRemarks && ` Supervisor Note: ${note.rejectionApprovalRemarks}`}
              </p>
            </div>
          )}

          <div className="mt-4 text-[9px] text-slate-400 text-center print:mt-2">
            Generated via DNS Import-Export ERP • Central Logistics Stock Keeper System • Document ID: {note.id}
          </div>
        </div>
      </div>
    </div>
  );
};
