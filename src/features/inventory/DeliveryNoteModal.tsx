import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Printer, Truck, FileText, CheckCircle2, UserCheck, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface DeliveryNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onConfirmDispatch?: (driverDetails: {
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    notes: string;
  }) => Promise<void>;
}

export function DeliveryNoteModal({
  open,
  onOpenChange,
  order,
  onConfirmDispatch,
}: DeliveryNoteModalProps) {
  const [driverName, setDriverName] = useState('Nimal Bandara');
  const [driverPhone, setDriverPhone] = useState('+94 77 123 4567');
  const [vehicleNumber, setVehicleNumber] = useState('WP CAD-8890');
  const [gatePassNumber, setGatePassNumber] = useState(`GP-${Date.now().toString().slice(-4)}`);
  const [notes, setNotes] = useState('Handle with care. Verify physical seal on container before signing.');
  const [submitting, setSubmitting] = useState(false);
  const [activeCopy, setActiveCopy] = useState<'ALL' | 'CUSTOMER' | 'ACCOUNTS' | 'STORES'>('ALL');

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleConfirm = async () => {
    if (onConfirmDispatch) {
      try {
        setSubmitting(true);
        await onConfirmDispatch({
          driverName,
          driverPhone,
          vehicleNumber,
          notes,
        });
        onOpenChange(false);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const copies = [
    { id: 'CUSTOMER', name: '1st Ply — Customer Original', border: 'border-blue-400', badge: 'Customer Copy (White)' },
    { id: 'ACCOUNTS', name: '2nd Ply — Accounts & Finance Copy', border: 'border-rose-400', badge: 'Finance Copy (Pink)' },
    { id: 'STORES', name: '3rd Ply — Warehouse Store Copy', border: 'border-amber-400', badge: 'Stores Copy (Yellow)' },
  ];

  const visibleCopies = activeCopy === 'ALL' ? copies : copies.filter((c) => c.id === activeCopy);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <DialogTitle>3-Ply Delivery Note &amp; Driver Dispatch</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 text-primary" />
              <span>Print 3-Ply Note</span>
            </Button>
          </div>
        </div>
        <DialogDescription>
          Generate authorized 3-ply delivery notes for customer signature, stock dispatch, and driver clearance.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Driver & Logistics Info Bar */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Pickup Driver &amp; Logistics Details
            </span>
            <Badge variant="outline" className="text-[11px] font-mono bg-white text-slate-700">
              Gate Pass: {gatePassNumber}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Driver Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Nimal Bandara"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Driver Contact Phone <span className="text-rose-500">*</span>
              </label>
              <Input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Vehicle Reg Number <span className="text-rose-500">*</span>
              </label>
              <Input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="WP CAD-8890"
                className="h-8 text-xs bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Dispatch Special Notes &amp; Handling Instructions
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customer signature required on 3-ply copy before offloading"
              className="h-8 text-xs bg-white"
            />
          </div>
        </div>

        {/* Copy Selector Pills */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-semibold text-slate-600">3-Ply Print Preview:</span>
          <div className="flex items-center gap-1 text-xs">
            {(['ALL', 'CUSTOMER', 'ACCOUNTS', 'STORES'] as const).map((cp) => (
              <button
                key={cp}
                type="button"
                onClick={() => setActiveCopy(cp)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  activeCopy === cp ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cp === 'ALL' ? 'All 3 Copies' : cp.charAt(0) + cp.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Ply Rendered Cards */}
        <div className="space-y-4 print:space-y-8">
          {visibleCopies.map((copy) => (
            <div
              key={copy.id}
              className={`rounded-lg border-2 ${copy.border} bg-white p-4 space-y-3 shadow-xs print:shadow-none print:break-after-page`}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900 tracking-tight">DNS GLOBAL LOGISTICS (PVT) LTD</span>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 border-slate-300">
                      {copy.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    104 Nawam Mawatha, Colombo 02 • Tel: +94 11 234 5678 • VAT: 102938475-7000
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-primary">
                    DELIVERY NOTE: DN-{order.orderNumber || order.id}
                  </div>
                  <div className="text-[11px] text-slate-500">Date: {formatDate(order.createdAt || new Date().toISOString())}</div>
                </div>
              </div>

              {/* Order & Customer Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-2.5 rounded border border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Deliver To</span>
                  <div className="font-bold text-slate-900">{order.customerName || 'N/A'}</div>
                  <div className="text-slate-600 text-[11px]">{order.deliveryAddress || 'Warehouse Customer Pickup'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block">Dispatch Ref</span>
                  <div className="font-mono text-slate-800">Order Ref: {order.orderNumber || order.id}</div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Driver: {driverName} ({vehicleNumber})
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left text-xs border border-slate-200 rounded">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Item Code / Description</th>
                    <th className="p-2 text-center">UOM</th>
                    <th className="p-2 text-right">Dispatched Qty</th>
                    <th className="p-2 text-right">Customer Received Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items || []).map((it: any, idx: number) => (
                    <tr key={idx} className="text-slate-700">
                      <td className="p-2">
                        <span className="font-semibold text-slate-900">{it.productName || it.productNameSnapshot || 'Product Item'}</span>
                        <span className="text-slate-400 font-mono text-[10px] ml-1.5">({it.sku || it.skuSnapshot || 'SKU'})</span>
                      </td>
                      <td className="p-2 text-center font-mono text-slate-600">{it.uom || 'PCS'}</td>
                      <td className="p-2 text-right font-bold text-slate-900 font-mono">{it.quantity || it.receivedQuantity || 1}</td>
                      <td className="p-2 text-right border-l border-slate-200 text-slate-400 font-mono">[ &nbsp; &nbsp; &nbsp; &nbsp; ]</td>
                    </tr>
                  ))}
                  {(!order.items || order.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                        Standard dispatch goods as verified by stores supervisor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Notes */}
              {notes && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="font-bold">Instructions: </span> {notes}
                </div>
              )}

              {/* 3-Ply Signature Governance Blocks */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-center text-[10px]">
                <div className="p-2 rounded bg-slate-50 border border-slate-100 space-y-4">
                  <span className="font-bold text-slate-600 block uppercase">Warehouse Authorized</span>
                  <div className="h-6 border-b border-dashed border-slate-300" />
                  <span className="text-slate-400 block">Authorized Storekeeper Signature</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 space-y-4">
                  <span className="font-bold text-slate-600 block uppercase">Driver Clearance</span>
                  <div className="h-6 border-b border-dashed border-slate-300" />
                  <span className="text-slate-400 block">{driverName} ({vehicleNumber})</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 space-y-4">
                  <span className="font-bold text-slate-600 block uppercase">Customer Received By</span>
                  <div className="h-6 border-b border-dashed border-slate-300" />
                  <span className="text-slate-400 block">Name, Sign, Date &amp; Company Seal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        {onConfirmDispatch && (
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={submitting || !driverName.trim() || !vehicleNumber.trim()}
            className="gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{submitting ? 'Confirming...' : 'Confirm Dispatch & Release Gate Pass'}</span>
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
