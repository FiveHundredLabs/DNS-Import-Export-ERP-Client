import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { deliveryNoteService } from '../../../services/DeliveryNoteService';
import { Invoice } from '../../../types/invoice';
import { useAuth } from '../../../hooks/useAuth';
import {
  Truck,
  FileText,
  Barcode,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  ArrowLeft,
  Search,
  Check,
  Trash2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const DeliveryNoteCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoiceId');

  const { currentUser } = useAuth();
  const [draftInvoices, setDraftInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Logistics form state
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [deliveryRoute, setDeliveryRoute] = useState('');
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Item allocation state: map of productId -> array of scanned barcodes
  const [allocatedBarcodes, setAllocatedBarcodes] = useState<Record<string, string[]>>({});
  const [activeScanProductId, setActiveScanProductId] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  useEffect(() => {
    async function loadInvoices() {
      try {
        setLoading(true);
        const list = await deliveryNoteService.getDraftInvoices();
        setDraftInvoices(list);

        if (preselectedInvoiceId) {
          const match = list.find((inv) => inv.id === preselectedInvoiceId);
          if (match) {
            handleSelectInvoice(match);
          }
        }
      } catch (err: any) {
        toast.error('Failed to load draft invoices: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, [preselectedInvoiceId]);

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setActiveScanProductId(invoice.items[0]?.productId || '');

    // Initialize empty barcode allocations
    const initialMap: Record<string, string[]> = {};
    invoice.items.forEach((item) => {
      initialMap[item.productId] = [];
    });
    setAllocatedBarcodes(initialMap);

    // Auto-populate delivery route from customer address if available
    if (invoice.customerAddress) {
      setDeliveryRoute(invoice.customerAddress);
    }
  };

  // Add a scanned barcode for an item
  const handleScanBarcode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;
    if (!selectedInvoice) return;

    // Use actively selected product or search for matched item
    const targetItem = selectedInvoice.items.find((i) => i.productId === activeScanProductId);
    if (!targetItem) {
      toast.error('Please select an item to scan barcodes for.');
      return;
    }

    const currentScanned = allocatedBarcodes[targetItem.productId] || [];

    // Check if limit reached
    if (currentScanned.length >= targetItem.quantity) {
      toast.warning(
        `All ${targetItem.quantity} units for ${targetItem.productNameSnapshot} have already been scanned.`
      );
      setBarcodeInput('');
      return;
    }

    // Check for duplicate barcode anywhere in this delivery note
    const allScanned = Object.values(allocatedBarcodes).flat();
    if (allScanned.includes(barcode)) {
      toast.error(`Barcode "${barcode}" has already been allocated in this delivery note!`);
      return;
    }

    setAllocatedBarcodes((prev) => ({
      ...prev,
      [targetItem.productId]: [...currentScanned, barcode],
    }));

    toast.success(
      `Scanned unit (${currentScanned.length + 1}/${targetItem.quantity}): ${barcode}`
    );
    setBarcodeInput('');
  };

  const removeScannedBarcode = (productId: string, barcodeToRemove: string) => {
    setAllocatedBarcodes((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).filter((b) => b !== barcodeToRemove),
    }));
  };

  // Quick helper to simulate barcode gun scanning from stock
  const handleQuickAllocateFromStock = (productId: string, neededCount: number, sku: string) => {
    const current = allocatedBarcodes[productId] || [];
    const remaining = neededCount - current.length;
    if (remaining <= 0) return;

    const generated = deliveryNoteService.getSuggestedStockBarcodes(sku, remaining);
    setAllocatedBarcodes((prev) => ({
      ...prev,
      [productId]: [...current, ...generated],
    }));
    toast.success(`Allocated ${remaining} physical unit barcodes from warehouse bins for ${sku}.`);
  };

  const handleQuickAllocateAll = () => {
    if (!selectedInvoice) return;
    selectedInvoice.items.forEach((item) => {
      handleQuickAllocateFromStock(item.productId, item.quantity, item.skuSnapshot);
    });
  };

  // Compute total progress
  const totalRequiredUnits =
    selectedInvoice?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalScannedUnits = Object.values(allocatedBarcodes).reduce(
    (sum, list) => sum + list.length,
    0
  );
  const isFullyScanned =
    totalRequiredUnits > 0 && totalScannedUnits >= totalRequiredUnits;

  const handleSubmit = async () => {
    if (!selectedInvoice) {
      toast.error('Please select an invoice first.');
      return;
    }

    if (!driverName.trim()) {
      toast.error('Please enter the Delivery Driver Name.');
      return;
    }

    if (!vehicleNumber.trim()) {
      toast.error('Please enter the Vehicle / Lorry Number.');
      return;
    }

    if (totalScannedUnits === 0) {
      toast.error('Please scan at least one physical unit barcode from stock.');
      return;
    }

    try {
      setSubmitting(true);
      const user = currentUser || {
        id: 'stock-01',
        name: 'Amal Perera',
        role: 'STOCK_KEEPER',
        email: 'amal@dns.lk',
        phone: '0771234567',
        status: 'ACTIVE',
      };

      const payload = {
        invoiceId: selectedInvoice.id,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        dispatchDate,
        deliveryRoute: deliveryRoute.trim(),
        notes: notes.trim(),
        items: selectedInvoice.items.map((item) => ({
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          uom: item.uomSnapshot || 'PCS',
          invoicedQuantity: item.quantity,
          unitBarcodes: allocatedBarcodes[item.productId] || [],
        })),
        createdBy: user.name,
      };

      const created = await deliveryNoteService.createDeliveryNote(payload, user as any);
      toast.success(
        `Delivery Note ${created.deliveryNoteNumber} created and ready for dispatch!`
      );
      navigate(`/inventory/delivery-notes/${created.id}`);
    } catch (err: any) {
      toast.error('Failed to create delivery note: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = draftInvoices.filter((inv) => {
    if (!invoiceSearchQuery) return true;
    const q = invoiceSearchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.customerCode.toLowerCase().includes(q) ||
      inv.orderNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/inventory/delivery-notes')}
            className="text-xs mb-1 -ml-2 text-slate-500 hover:text-slate-900 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Delivery Notes
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Create Warehouse Delivery Note
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Convert Draft Sales Invoices into physical dispatch notes with unit barcode allocation.
              </p>
            </div>
          </div>
        </div>

        {selectedInvoice && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleQuickAllocateAll}
              className="gap-1.5 text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Quick Allocate All from Stock
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || totalScannedUnits === 0}
              className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              <Check className="h-4 w-4" />
              Save & Dispatch Note
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Step 1 (Select Invoice) or Selected Invoice Preview ── */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  1. Select Draft Invoice
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Invoices converted from approved Sales Orders
                </p>
              </div>
              {selectedInvoice && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedInvoice(null)}
                  className="text-xs text-primary hover:underline h-7 px-2"
                >
                  Change
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {!selectedInvoice ? (
                <>
                  <div className="relative">
                    <Input
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      placeholder="Search draft invoice #, customer..."
                      className="text-xs pl-8 h-9"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>

                  <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                    {filteredInvoices.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No draft invoices found.
                      </div>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => handleSelectInvoice(inv)}
                          className="p-3 rounded-lg border border-slate-200 hover:border-primary/60 hover:bg-slate-50/60 cursor-pointer transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {inv.invoiceNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200"
                            >
                              {inv.status}
                            </Badge>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {inv.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Order: {inv.orderNumber || 'SO-NEW'}</span>
                            <span className="font-medium text-slate-700">
                              {inv.items.length} Items ({inv.items.reduce((s, i) => s + i.quantity, 0)} Units)
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-slate-950">
                        {selectedInvoice.invoiceNumber}
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                        Active Selected
                      </Badge>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Customer
                      </span>
                      <span className="font-bold text-slate-900 block">
                        {selectedInvoice.customerName}
                      </span>
                      <span className="text-slate-600 font-mono text-[11px]">
                        {selectedInvoice.customerCode}
                      </span>
                    </div>
                    {selectedInvoice.customerAddress && (
                      <div className="text-[11px] text-slate-600 leading-snug">
                        {selectedInvoice.customerAddress}
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-600">
                      <span>Order: {selectedInvoice.orderNumber}</span>
                      <span>Date: {selectedInvoice.issueDate}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logistics & Driver Details Form */}
          {selectedInvoice && (
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  2. Driver & Vehicle Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Driver Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Kamal Silva"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Vehicle / Lorry No <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="e.g. WP WP-8921"
                      className="h-9 text-xs uppercase font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Driver Contact
                    </label>
                    <Input
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      placeholder="e.g. 077-8899112"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Delivery Route / Area
                  </label>
                  <Input
                    value={deliveryRoute}
                    onChange={(e) => setDeliveryRoute(e.target.value)}
                    placeholder="e.g. Colombo Commercial Central Route"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Dispatch Date
                  </label>
                  <Input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Additional Dispatch Instructions / Notes
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Handle with care. Fragile items. Obtain customer rubber stamp on slip."
                    rows={2}
                    className="text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Column: Step 3 (Unit Barcode Scanning & Physical Allocation) ── */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedInvoice ? (
            <Card className="border-slate-200 border-dashed shadow-none py-16 text-center">
              <CardContent className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Barcode className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Select a Draft Invoice to Begin Unit Allocation
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When you select an invoice on the left, the required product lines will populate here for handheld barcode scanning from warehouse stock.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Barcode Scanner Gun Station */}
              <Card className="border-primary/40 bg-gradient-to-r from-primary/5 via-white to-slate-50 shadow-2xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ScanLine className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Handheld Barcode Scanner Station
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Scanning physically allocates stock units directly to this delivery note.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Overall Allocation:</span>
                      <Badge
                        className={`text-xs px-2.5 py-0.5 font-bold ${
                          isFullyScanned
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {totalScannedUnits} / {totalRequiredUnits} Units ({Math.round((totalScannedUnits / (totalRequiredUnits || 1)) * 100)}%)
                      </Badge>
                    </div>
                  </div>

                  <form onSubmit={handleScanBarcode} className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder={`Scan unit barcode for active item: ${
                          selectedInvoice.items.find((i) => i.productId === activeScanProductId)?.productNameSnapshot || ''
                        }...`}
                        className="font-mono text-xs pr-10 bg-white border-slate-300"
                        autoFocus
                      />
                      <Barcode className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                    <Button type="submit" size="sm" className="gap-1.5 text-xs font-semibold">
                      Add Scan
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Product Lines & Scanned Barcodes List */}
              <div className="space-y-4">
                {selectedInvoice.items.map((item, idx) => {
                  const scannedList = allocatedBarcodes[item.productId] || [];
                  const isComplete = scannedList.length >= item.quantity;
                  const isActive = item.productId === activeScanProductId;

                  return (
                    <Card
                      key={item.id}
                      className={`border transition-all ${
                        isActive
                          ? 'border-primary ring-1 ring-primary/30 shadow-xs'
                          : 'border-slate-200 shadow-2xs'
                      }`}
                    >
                      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-slate-100">
                        <div
                          className="cursor-pointer flex-1"
                          onClick={() => setActiveScanProductId(item.productId)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400 w-5">
                              #{idx + 1}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 hover:text-primary transition-colors">
                              {item.productNameSnapshot}
                            </h4>
                            {isActive && (
                              <Badge className="bg-primary text-white text-[10px] px-1.5 py-0">
                                Active Scanner Target
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 ml-7">
                            SKU: {item.skuSnapshot} • Invoiced Qty:{' '}
                            <strong className="text-slate-800">{item.quantity} {item.uomSnapshot || 'PCS'}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleQuickAllocateFromStock(item.productId, item.quantity, item.skuSnapshot)
                            }
                            disabled={isComplete}
                            className="text-[11px] h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Pick from Stock
                          </Button>

                          <div
                            className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <ScanLine className="h-3.5 w-3.5 text-slate-500" />
                            )}
                            {scannedList.length} / {item.quantity}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3">
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isComplete ? 'bg-emerald-500' : 'bg-primary'
                            }`}
                            style={{
                              width: `${Math.min(100, (scannedList.length / item.quantity) * 100)}%`,
                            }}
                          />
                        </div>

                        {/* Scanned Barcode Chips */}
                        {scannedList.length === 0 ? (
                          <div className="text-center py-3 text-xs text-slate-400 italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            No barcodes scanned yet for this line. Use scanner gun or "Pick from Stock".
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                            {scannedList.map((barcode, bIdx) => (
                              <span
                                key={bIdx}
                                className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-800 shadow-2xs group"
                              >
                                <span className="text-[10px] text-slate-400 font-sans">
                                  #{bIdx + 1}
                                </span>
                                <span>{barcode}</span>
                                <button
                                  type="button"
                                  onClick={() => removeScannedBarcode(item.productId, barcode)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                                  title="Remove scanned unit"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Ready to Dispatch?
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Total: {totalScannedUnits} units allocated to driver {driverName || '—'} ({vehicleNumber || '—'}).
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/inventory/delivery-notes')}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting || totalScannedUnits === 0}
                    className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs"
                  >
                    <Check className="h-4 w-4" />
                    Save & Dispatch Delivery Note
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
