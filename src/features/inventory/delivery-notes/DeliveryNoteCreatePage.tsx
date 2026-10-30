import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { deliveryNoteService } from '../../../services/DeliveryNoteService';
import { Invoice } from '../../../types/invoice';
import { useAuth } from '../../../hooks/useAuth';
import { BarcodeVisual } from '../../../components/common/BarcodeVisual';
import { PaginationControls } from '../../../components/common/PaginationControls';
import { PageHeader } from '../../../components/common/PageHeader';
import { DeliveryNoteBarcodeModal } from './DeliveryNoteBarcodeModal';
import {
  Truck,
  FileText,
  Barcode,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Trash2,
  Printer,
  Sparkles,
  Boxes,
  ShieldCheck,
  Clock,
  Calendar,
  Building,
  Scan,
  Copy,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../utils/cn';

export const DeliveryNoteCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedInvoiceId = searchParams.get('invoiceId');

  const { currentUser } = useAuth();
  const [draftInvoices, setDraftInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stepper state: 1: Invoice & Logistics, 2: Item Allocation, 3: Barcode Studio, 4: Review & Dispatch
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

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

  // Step 3 Barcode Studio local state
  const [studioProductFilter, setStudioProductFilter] = useState<string>('ALL');
  const [studioBarcodePage, setStudioBarcodePage] = useState<number>(1);
  const [studioBarcodePageSize, setStudioBarcodePageSize] = useState<number>(12);
  const [studioScannerInput, setStudioScannerInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal print studio state (for popup printing)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalFilterProduct, setPrintModalFilterProduct] = useState<string>('ALL');
  const [printModalSingleBarcode, setPrintModalSingleBarcode] = useState<string | undefined>(undefined);

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

  // Prepare items for Barcode Modal & Studio
  const modalBarcodeItems = useMemo(() => {
    if (!selectedInvoice) return [];
    return selectedInvoice.items.map((item) => ({
      productId: item.productId,
      productName: item.productNameSnapshot,
      sku: item.skuSnapshot,
      uom: item.uomSnapshot || 'PCS',
      unitBarcodes: allocatedBarcodes[item.productId] || [],
    }));
  }, [selectedInvoice, allocatedBarcodes]);

  // Flattened stickers for Step 3 Studio
  const studioAllStickers = useMemo(() => {
    const list: {
      productId: string;
      productName: string;
      sku: string;
      unitIndex: number;
      totalUnits: number;
      barcode: string;
    }[] = [];

    modalBarcodeItems.forEach((item) => {
      if (studioProductFilter !== 'ALL' && item.productId !== studioProductFilter) {
        return;
      }
      item.unitBarcodes.forEach((code, idx) => {
        list.push({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          unitIndex: idx + 1,
          totalUnits: item.unitBarcodes.length,
          barcode: code,
        });
      });
    });

    return list;
  }, [modalBarcodeItems, studioProductFilter]);

  // Pagination for Step 3 Studio
  const studioTotalPages = Math.max(1, Math.ceil(studioAllStickers.length / studioBarcodePageSize));
  const studioSafePage = Math.min(Math.max(1, studioBarcodePage), studioTotalPages);
  const studioPagedStickers = useMemo(() => {
    const start = (studioSafePage - 1) * studioBarcodePageSize;
    return studioAllStickers.slice(start, start + studioBarcodePageSize);
  }, [studioAllStickers, studioSafePage, studioBarcodePageSize]);

  // Open modal printing
  const handleOpenPrintModal = (productId: string = 'ALL') => {
    setPrintModalFilterProduct(productId);
    setPrintModalSingleBarcode(undefined);
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintSingle = (_item: any, barcode: string) => {
    setPrintModalFilterProduct('ALL');
    setPrintModalSingleBarcode(barcode);
    setIsPrintModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied barcode: ${code}`);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  // Quick scanner test in Step 3 Studio
  const handleStudioScanTest = () => {
    const val = studioScannerInput.trim();
    if (!val) return;
    const match = studioAllStickers.find((s) => s.barcode.toLowerCase() === val.toLowerCase());
    if (match) {
      toast.success(`✓ Scanner Verified: Unit ${match.unitIndex} for ${match.productName} (${match.barcode})`);
      setStudioScannerInput('');
    } else {
      toast.error(`Barcode "${val}" not recognized in allocated items.`);
    }
  };

  // Submit delivery note
  const handleSubmit = async () => {
    if (!selectedInvoice) {
      toast.error('Please select an invoice first.');
      return;
    }

    if (!driverName.trim()) {
      toast.error('Please enter the Delivery Driver Name.');
      setCurrentStep(1);
      return;
    }

    if (!vehicleNumber.trim()) {
      toast.error('Please enter the Vehicle / Lorry Number.');
      setCurrentStep(1);
      return;
    }

    if (totalScannedUnits === 0) {
      toast.error('Please scan or allocate at least one physical unit barcode from stock.');
      setCurrentStep(2);
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

  // Stepper definition metadata (Matching GRN Stepper pattern)
  const STEPS = [
    {
      step: 1 as const,
      title: 'Invoice & Logistics',
      subtitle: selectedInvoice ? `${selectedInvoice.invoiceNumber} · ${driverName || 'Set Driver'}` : 'Pick Draft Invoice',
      icon: FileText,
      isComplete: Boolean(selectedInvoice && driverName.trim() && vehicleNumber.trim()),
    },
    {
      step: 2 as const,
      title: 'Unit Barcode Allocation',
      subtitle: `${totalScannedUnits} of ${totalRequiredUnits} Units Allocated`,
      icon: ScanLine,
      isComplete: totalScannedUnits > 0 && totalScannedUnits >= totalRequiredUnits,
    },
    {
      step: 3 as const,
      title: 'Barcode Stickers Studio',
      subtitle: `${totalScannedUnits} Barcode Labels · Bulk & Item Print`,
      icon: Barcode,
      isComplete: totalScannedUnits > 0,
    },
    {
      step: 4 as const,
      title: 'Review & Dispatch Note',
      subtitle: 'Customer Signature & Driver Handover',
      icon: Truck,
      isComplete: false,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* ── Page Top Header ── */}
      <PageHeader
        title="Create Warehouse Delivery Note"
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Delivery Notes', href: '/inventory/delivery-notes' },
          { label: 'New' },
        ]}
        onBack={() => navigate('/inventory/delivery-notes')}
        actions={
          selectedInvoice && (
            <div className="flex items-center gap-2 flex-wrap">
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
              {totalScannedUnits > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPrintModal('ALL')}
                  className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Bulk Print Barcodes ({totalScannedUnits})
                </Button>
              )}
            </div>
          )
        }
      />

      {/* ── Warehouse Stock Keeper Isolation Banner ── */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong className="font-bold">Stock Keeper Dispatch Mode Active:</strong> Storekeepers scan and allocate physical unit barcodes directly from warehouse stock before driver vehicle departure.
          </span>
        </div>
        <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 shrink-0 self-start sm:self-auto text-[11px] font-mono">
          Physical Dispatch Only
        </Badge>
      </div>

      {/* ── Smart Stepper Navigation Bar (Like GRN Stepper) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-3 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.step;
            const isDone = s.isComplete && !isActive;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step)}
                className={cn(
                  'flex items-center gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all relative overflow-hidden select-none',
                  isActive
                    ? 'bg-primary/10 border-2 border-primary text-slate-900 shadow-xs'
                    : isDone
                    ? 'bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-50 text-slate-800'
                    : 'bg-slate-50/70 border border-slate-200 hover:bg-slate-100/70 text-slate-600'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : s.step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs truncate">
                      {s.step}. {s.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                    {s.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── STEPS 1 & 2: Dual-Pane Invoice, Logistics & Barcode Allocation ─────── */}
      {/* (Rendered when on Step 1 or Step 2)                                     */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {(currentStep === 1 || currentStep === 2) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Column: Step 1 (Select Invoice & Driver Transport) ── */}
          <div className="lg:col-span-4 space-y-4">
            <Card className={cn('border-slate-200 shadow-2xs transition-all', currentStep === 1 && 'ring-1 ring-primary/40')}>
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
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
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
                        <span className="font-bold text-slate-900 block text-xs">
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
                        <span>Order Ref: {selectedInvoice.orderNumber}</span>
                        <span>Date: {selectedInvoice.issueDate}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Logistics & Driver Details Form */}
            {selectedInvoice && (
              <Card className={cn('border-slate-200 shadow-2xs transition-all', currentStep === 1 && 'ring-1 ring-primary/40')}>
                <CardHeader className="p-4 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    2. Driver & Vehicle Transport Details
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
                      Delivery Route / Destination Area
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

                  {currentStep === 1 && (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="w-full mt-2 gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs"
                    >
                      Continue to Unit Barcode Allocation (Step 2)
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Column: Step 2 (Unit Barcode Scanning & Physical Allocation) ── */}
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

                      <div className="flex items-center gap-2 flex-wrap">
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

                        {/* Bulk Print Barcodes Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPrintModal('ALL')}
                          disabled={totalScannedUnits === 0}
                          className="text-xs gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/5"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Bulk Print All Barcodes ({totalScannedUnits})
                        </Button>
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

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Pick from Stock */}
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

                            {/* Item-wise Print Barcodes Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPrintModal(item.productId)}
                              disabled={scannedList.length === 0}
                              className="text-[11px] h-7 px-2 text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Print Barcodes ({scannedList.length})
                            </Button>

                            {/* Count Badge */}
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

                          {/* Scanned Barcode Chips with One-by-One Print Button */}
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

                                  {/* One-by-One Print Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPrintSingle(item, barcode)}
                                    title="Print this single sticker"
                                    className="text-slate-400 hover:text-primary transition-colors p-0.5 ml-0.5"
                                  >
                                    <Printer className="h-3 w-3" />
                                  </button>

                                  {/* Remove Button */}
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
                      Step 2: Barcode Allocation Progress
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Total: {totalScannedUnits} units allocated to driver {driverName || '—'} ({vehicleNumber || '—'}).
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(3)}
                      disabled={totalScannedUnits === 0}
                      className="text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                    >
                      <Barcode className="h-3.5 w-3.5" />
                      Open Barcode Studio (Step 3) →
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSubmit}
                      disabled={submitting || totalScannedUnits === 0}
                      className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs"
                    >
                      <Check className="h-4 w-4" />
                      Save &amp; Dispatch Delivery Note
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 3: Dedicated Barcode Labels Studio ───────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Barcode className="h-5 w-5 text-primary" />
                Delivery Note Barcode Stickers Studio
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Code-128 physical unit barcode stickers generated for goods delivery to{' '}
                <strong className="text-slate-800">{selectedInvoice?.customerName || 'Customer'}</strong>.
                Print in bulk, item-wise, or one-by-one.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Print Button */}
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenPrintModal('ALL')}
                className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Bulk Print All Stickers ({totalScannedUnits})
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-5">
            {/* Filter & Laser Scan Testing Bar */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                  Filter by Item:
                </span>
                <select
                  value={studioProductFilter}
                  onChange={(e) => {
                    setStudioProductFilter(e.target.value);
                    setStudioBarcodePage(1);
                  }}
                  className="h-8 text-xs rounded-md border border-slate-200 bg-white px-2 py-0 font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Items ({totalScannedUnits} Stickers)</option>
                  {modalBarcodeItems.map((it) => (
                    <option key={it.productId} value={it.productId}>
                      {it.productName} ({it.unitBarcodes.length} stickers)
                    </option>
                  ))}
                </select>

                {/* Item-wise Print button */}
                {studioProductFilter !== 'ALL' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPrintModal(studioProductFilter)}
                    className="h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Line Barcodes ({studioAllStickers.length})
                  </Button>
                )}
              </div>

              {/* Laser scan test */}
              <div className="flex items-center gap-1.5">
                <Scan className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <Input
                  value={studioScannerInput}
                  onChange={(e) => setStudioScannerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleStudioScanTest();
                    }
                  }}
                  placeholder="Test laser scan sticker..."
                  className="h-8 text-xs font-mono bg-white w-40 sm:w-48"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStudioScanTest}
                  className="h-8 text-xs px-2 shadow-2xs font-semibold"
                >
                  Verify
                </Button>
              </div>
            </div>

            {/* Grid of Barcode Stickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {studioPagedStickers.map((sticker) => (
                <div
                  key={sticker.barcode}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  {/* Sticker Top Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
                        DNS DISPATCH STICKER
                      </span>
                      <h5 className="font-bold text-xs text-slate-900 truncate" title={sticker.productName}>
                        {sticker.productName}
                      </h5>
                      <span className="text-[10.5px] font-mono text-slate-600 block mt-0.5">
                        {sticker.sku}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-700 shrink-0 px-1.5 py-0">
                      Unit {sticker.unitIndex}/{sticker.totalUnits}
                    </Badge>
                  </div>

                  {/* SVG Barcode Visual */}
                  <div className="py-2.5 my-2 flex flex-col items-center justify-center bg-slate-50/50 rounded-lg border border-slate-100/80">
                    <BarcodeVisual
                      value={sticker.barcode}
                      width={180}
                      height={46}
                      className="max-w-full"
                    />
                    <span className="font-mono font-bold text-xs text-slate-900 tracking-wider mt-1 select-all">
                      {sticker.barcode}
                    </span>
                  </div>

                  {/* Sticker Footer Details & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
                    <div className="truncate max-w-[150px]">
                      <span className="font-semibold text-slate-700 block truncate">
                        {selectedInvoice?.customerName}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        Invoice: {selectedInvoice?.invoiceNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(sticker.barcode)}
                        title="Copy barcode string"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-800"
                      >
                        {copiedCode === sticker.barcode ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>

                      {/* One-by-One Print Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPrintSingle(sticker, sticker.barcode)}
                        title="Print this single sticker"
                        className="h-6 text-[10.5px] px-1.5 gap-1 text-primary hover:bg-primary/5 font-semibold"
                      >
                        <Printer className="h-3 w-3" />
                        Print One
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {studioAllStickers.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <PaginationControls
                  currentPage={studioSafePage}
                  totalItems={studioAllStickers.length}
                  pageSize={studioBarcodePageSize}
                  onPageChange={setStudioBarcodePage}
                  onPageSizeChange={(newSize) => {
                    setStudioBarcodePageSize(newSize);
                    setStudioBarcodePage(1);
                  }}
                  pageSizeOptions={[12, 24, 48, 96]}
                  label="unit barcode stickers"
                />
              </div>
            )}

            {/* Bottom Navigation for Step 3 */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(2)}
                className="text-xs gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Allocation (Step 2)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs gap-1.5 font-bold bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Proceed to Review &amp; Dispatch (Step 4)
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── STEP 4: Review & Final Dispatch Sign-Off ─────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Delivery Note Dispatch Sign-Off Summary
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Verify customer details, driver logistics, and physical item barcode allocations before generating the official dispatch receipt.
                </CardDescription>
              </div>

              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-mono text-xs px-2.5 py-1">
                Ready for Dispatched Status
              </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6 text-xs">
              {/* 2-Column Summary: Customer & Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer & Invoice Details */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Customer &amp; Order Reference
                    </span>
                    <span className="font-mono font-bold text-primary">{selectedInvoice?.invoiceNumber}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="font-black text-slate-900 text-sm block">
                      {selectedInvoice?.customerName}
                    </span>
                    <p className="text-slate-600 font-mono text-[11px]">
                      Code: {selectedInvoice?.customerCode} • Order: {selectedInvoice?.orderNumber}
                    </p>
                    {selectedInvoice?.customerAddress && (
                      <p className="text-slate-600 text-[11px] mt-1">
                        Address: {selectedInvoice.customerAddress}
                      </p>
                    )}
                  </div>
                </div>

                {/* Driver & Transport Logistics */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Driver &amp; Vehicle Transport
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {dispatchDate}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <p>
                      Driver: <strong className="text-slate-900 font-bold">{driverName || '—'}</strong> ({driverPhone || 'No phone'})
                    </p>
                    <p>
                      Vehicle / Lorry: <strong className="text-slate-900 font-mono uppercase">{vehicleNumber || '—'}</strong>
                    </p>
                    {deliveryRoute && <p>Route / Area: {deliveryRoute}</p>}
                    {notes && <p className="text-slate-500 italic mt-1">Notes: "{notes}"</p>}
                  </div>
                </div>
              </div>

              {/* Items & Barcodes Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">#</th>
                      <th className="py-2.5 px-3 text-left">Product &amp; SKU</th>
                      <th className="py-2.5 px-3 text-right">Invoiced Qty</th>
                      <th className="py-2.5 px-3 text-right">Allocated Units</th>
                      <th className="py-2.5 px-3 text-center">Unit Barcodes Summary</th>
                      <th className="py-2.5 px-3 text-center">Sticker Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice?.items.map((item, idx) => {
                      const barcodes = allocatedBarcodes[item.productId] || [];
                      const isComplete = barcodes.length >= item.quantity;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">{item.productNameSnapshot}</span>
                            <span className="font-mono text-slate-500 text-[11px]">{item.skuSnapshot}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {item.quantity} {item.uomSnapshot || 'PCS'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={isComplete ? 'text-emerald-700' : 'text-amber-700'}>
                              {barcodes.length} Units
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {barcodes.length > 0 ? (
                              <Badge variant="outline" className="font-mono text-[10.5px] bg-slate-50 text-slate-700">
                                {barcodes.length} Barcodes Tagged
                              </Badge>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPrintModal(item.productId)}
                              disabled={barcodes.length === 0}
                              className="h-6 text-[10.5px] px-2 gap-1 text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                            >
                              <Printer className="h-3 w-3" />
                              Print ({barcodes.length})
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Customer Signature & Official Declaration Notice */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="font-bold text-slate-900 text-xs">
                    Official Customer Signature &amp; Rubber Stamp Spaces Included
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Saving and dispatching will generate the printable A4 Delivery Slip with dedicated signature blocks for the <strong>Customer Declaration &amp; Acceptance (with Rubber Stamp space)</strong>, <strong>Delivery Driver Sign-Off</strong>, and <strong>Storekeeper Issue Signature</strong>.
                  </p>
                </div>
              </div>

              {/* Stepper Footer Action Bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Barcode Studio (Step 3)
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPrintModal('ALL')}
                    disabled={totalScannedUnits === 0}
                    className="text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Bulk Print All Barcodes ({totalScannedUnits})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting || totalScannedUnits === 0}
                    className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs px-4"
                  >
                    <Check className="h-4 w-4" />
                    Save &amp; Dispatch Delivery Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Popup Barcode Stickers Modal (for Bulk, Item-wise & One-by-One Print) ── */}
      {selectedInvoice && isPrintModalOpen && (
        <DeliveryNoteBarcodeModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          deliveryNoteNumber={`DN-DRAFT-${selectedInvoice.invoiceNumber}`}
          invoiceNumber={selectedInvoice.invoiceNumber}
          customerName={selectedInvoice.customerName}
          items={modalBarcodeItems}
          initialProductId={printModalFilterProduct}
          initialSingleBarcode={printModalSingleBarcode}
        />
      )}
    </div>
  );
};
