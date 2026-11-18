import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { deliveryNoteService, EligibleOrderForDispatch } from '../../../services/DeliveryNoteService';
import { SalesOrder } from '../../../types/order';
import { useAuth } from '../../../hooks/useAuth';
import { BarcodeVisual } from '../../../components/common/BarcodeVisual';
import { PaginationControls } from '../../../components/common/PaginationControls';
import { PageHeader } from '../../../components/common/PageHeader';
import { DeliveryNoteBarcodeModal } from './DeliveryNoteBarcodeModal';
import { DeliveryNoteConfirmModal } from './DeliveryNoteConfirmModal';
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
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../utils/cn';

export const DeliveryNoteCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get('orderId');

  const { currentUser, role } = useAuth();
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrderForDispatch[]>([]);
  const [selectedOrderData, setSelectedOrderData] = useState<EligibleOrderForDispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Stepper state: 1: Approved Order & Logistics, 2: Item Allocation, 3: Barcode Studio, 4: Review & Dispatch
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
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

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

  // Role permissions check
  const effectiveRole = role || currentUser?.role;
  const canCreateDeliveryNote =
    effectiveRole === 'DIRECTOR' ||
    effectiveRole === 'MANAGER' ||
    effectiveRole === 'STOCK_MANAGER' ||
    effectiveRole === 'STOCK_KEEPER';

  useEffect(() => {
    async function loadEligibleOrders() {
      try {
        setLoading(true);
        const list = await deliveryNoteService.getEligibleOrdersForDispatch();
        setEligibleOrders(list);

        if (preselectedOrderId) {
          const match = list.find((item) => item.order.id === preselectedOrderId || item.order.orderNumber === preselectedOrderId);
          if (match) {
            handleSelectOrder(match);
          }
        } else if (list.length > 0 && !selectedOrderData) {
          handleSelectOrder(list[0]);
        }
      } catch (err: any) {
        toast.error('Failed to load eligible sales orders: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEligibleOrders();
  }, [preselectedOrderId]);

  const handleSelectOrder = (orderData: EligibleOrderForDispatch) => {
    setSelectedOrderData(orderData);
    const firstProduct = orderData.order.items[0]?.productId || '';
    setActiveScanProductId(firstProduct);

    // Initialize empty barcode allocations
    const initialMap: Record<string, string[]> = {};
    orderData.order.items.forEach((item) => {
      initialMap[item.productId] = [];
    });
    setAllocatedBarcodes(initialMap);

    // Auto-populate delivery route from order delivery address if available
    if (orderData.order.deliveryAddress) {
      setDeliveryRoute(orderData.order.deliveryAddress);
    }
  };

  const selectedOrder = selectedOrderData?.order || null;
  const remainingQuantities = selectedOrderData?.remainingQuantities || {};

  // Add a scanned barcode for an item
  const handleScanBarcode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;
    if (!selectedOrder) return;

    // Use actively selected product or search for matched item
    const targetItem = selectedOrder.items.find((i) => i.productId === activeScanProductId);
    if (!targetItem) {
      toast.error('Please select an item to scan barcodes for.');
      return;
    }

    const maxAllowed = remainingQuantities[targetItem.productId] || targetItem.orderedQuantity || 0;
    const currentScanned = allocatedBarcodes[targetItem.productId] || [];

    // Check if limit reached
    if (currentScanned.length >= maxAllowed) {
      toast.warning(
        `All ${maxAllowed} units for ${targetItem.productNameSnapshot} have already been scanned for this dispatch.`
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
      `Scanned unit (${currentScanned.length + 1}/${maxAllowed}): ${barcode}`
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
    if (!selectedOrder) return;
    selectedOrder.items.forEach((item) => {
      const allowed = remainingQuantities[item.productId] || item.orderedQuantity || 0;
      handleQuickAllocateFromStock(item.productId, allowed, item.skuSnapshot);
    });
  };

  // Compute total progress
  const totalRequiredUnits = useMemo(() => {
    if (!selectedOrder) return 0;
    return selectedOrder.items.reduce((sum, item) => {
      const allowed = remainingQuantities[item.productId] ?? item.orderedQuantity ?? 0;
      return sum + allowed;
    }, 0);
  }, [selectedOrder, remainingQuantities]);

  const totalScannedUnits = Object.values(allocatedBarcodes).reduce(
    (sum, list) => sum + list.length,
    0
  );

  const isFullyScanned =
    totalRequiredUnits > 0 && totalScannedUnits >= totalRequiredUnits;

  // Prepare items for Barcode Modal & Studio
  const modalBarcodeItems = useMemo(() => {
    if (!selectedOrder) return [];
    return selectedOrder.items.map((item) => ({
      productId: item.productId,
      productName: item.productNameSnapshot,
      sku: item.skuSnapshot,
      uom: item.uomSnapshot || 'PCS',
      unitBarcodes: allocatedBarcodes[item.productId] || [],
    }));
  }, [selectedOrder, allocatedBarcodes]);

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

  // Validate and initiate double-confirmation workflow
  const handleInitiateSubmission = () => {
    if (!selectedOrder) {
      toast.error('Please select an approved sales order first.');
      return;
    }

    if (!driverName.trim()) {
      toast.error('Please enter the Delivery Driver Name.');
      setCurrentStep(1);
      return;
    }

    if (!vehicleNumber.trim()) {
      toast.error('Please enter the Vehicle / Lorry Registration Number.');
      setCurrentStep(1);
      return;
    }

    if (totalScannedUnits === 0) {
      toast.error('Please scan or allocate at least one physical unit barcode from stock.');
      setCurrentStep(2);
      return;
    }

    setShowConfirmModal(true);
  };

  // Final submission after user confirms
  const handleFinalSubmit = async () => {
    if (!selectedOrder) return;

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
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        customerId: selectedOrder.customerId,
        customerName: selectedOrder.customerNameSnapshot,
        customerCode: selectedOrder.customerCodeSnapshot,
        customerAddress: selectedOrder.deliveryAddress,
        customerPhone: selectedOrder.customerPhoneSnapshot,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        dispatchDate,
        deliveryRoute: deliveryRoute.trim(),
        notes: notes.trim(),
        items: selectedOrder.items
          .filter((item) => (allocatedBarcodes[item.productId]?.length || 0) > 0)
          .map((item) => ({
            productId: item.productId,
            productName: item.productNameSnapshot,
            sku: item.skuSnapshot,
            uom: item.uomSnapshot || 'PCS',
            invoicedQuantity: allocatedBarcodes[item.productId]?.length || 0,
            unitBarcodes: allocatedBarcodes[item.productId] || [],
          })),
        createdBy: user.name,
      };

      const created = await deliveryNoteService.createDeliveryNote(payload, user as any);
      setShowConfirmModal(false);
      toast.success(
        `Delivery Note ${created.deliveryNoteNumber} created and marked DISPATCHED!`
      );
      navigate(`/inventory/delivery-notes/${created.id}`);
    } catch (err: any) {
      toast.error('Failed to create delivery note: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = eligibleOrders.filter((item) => {
    if (!orderSearchQuery) return true;
    const q = orderSearchQuery.toLowerCase();
    const o = item.order;
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerNameSnapshot.toLowerCase().includes(q) ||
      o.customerCodeSnapshot.toLowerCase().includes(q) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(q))
    );
  });

  // Stepper definition metadata
  const STEPS = [
    {
      step: 1 as const,
      title: 'Approved Order & Logistics',
      subtitle: selectedOrder ? `${selectedOrder.orderNumber} · ${driverName || 'Set Driver'}` : 'Select Approved Order',
      icon: FileText,
      isComplete: Boolean(selectedOrder && driverName.trim() && vehicleNumber.trim()),
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
      subtitle: 'Customer Verification & Driver Handover',
      icon: Truck,
      isComplete: false,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Canonical Page Header */}
      <PageHeader
        title="Create Warehouse Delivery Note"
        subtitle="Dispatch approved sales orders with physical unit Code-128 barcodes and verified driver logistics."
        badge={
          <Badge
            variant="outline"
            className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold"
          >
            Approved Order Fulfillment Mode
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/inventory/delivery-notes')}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </Button>
        }
      />

      {/* Permission Warning Banner if unauthorized */}
      {!canCreateDeliveryNote && (
        <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">Role Authorization Notice:</span>
            <p className="mt-0.5 text-rose-800">
              Your current role ({effectiveRole || 'User'}) does not have the <code>delivery-notes:create</code> permission.
              In production, Delivery Note creation is restricted to <strong>Stock Keeper, Stock Manager, Manager, and Director</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ── Visual 4-Step Process Header ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
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
                'flex items-center gap-3 p-3 rounded-xl text-left transition-all border cursor-pointer',
                isActive
                  ? 'bg-primary/5 border-primary/40 shadow-xs'
                  : isDone
                    ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
                    : 'bg-slate-50/50 border-slate-200/70 hover:bg-slate-100/70'
              )}
            >
              <div
                className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                )}
              >
                {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Step {s.step}
                  </span>
                  {isDone && (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold bg-emerald-100/80 text-emerald-800 border-emerald-300">
                      Done
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">{s.title}</div>
                <div className="text-[11px] text-slate-500 truncate">{s.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── STEP 1: Approved Order Selection & Transport Logistics ── */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Approved Order Selection Dropdown & Cards */}
            <div className="lg:col-span-6 space-y-4">
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        1. Select Approved Sales Order
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Sorted by scheduled delivery date (earliest delivery date first).
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">
                      {eligibleOrders.length} Order(s) Eligible
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Order Search Filter */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Search order no, customer name or code..."
                      className="text-xs pl-9 h-9"
                    />
                  </div>

                  {/* Orders List Container */}
                  <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                    {loading ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        Loading approved sales orders...
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="py-8 text-center space-y-2 border border-dashed rounded-xl p-4">
                        <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                        <div className="text-xs font-bold text-slate-700">No Eligible Orders Found</div>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          Only approved orders with outstanding quantities eligible for dispatch are shown.
                        </p>
                      </div>
                    ) : (
                      filteredOrders.map(({ order, remainingQuantities: remMap, totalRemainingQty }) => {
                        const isSelected = selectedOrder?.id === order.id;
                        const hasDeliveryDate = Boolean(order.requestedDeliveryDate);

                        return (
                          <div
                            key={order.id}
                            onClick={() => handleSelectOrder({ order, remainingQuantities: remMap, totalRemainingQty })}
                            className={cn(
                              'p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2',
                              isSelected
                                ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900 text-xs">
                                    {order.orderNumber}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[9px] bg-slate-100 text-slate-700"
                                  >
                                    {order.customerCodeSnapshot}
                                  </Badge>
                                </div>
                                <span className="font-semibold text-slate-800 text-xs block mt-0.5">
                                  {order.customerNameSnapshot}
                                </span>
                              </div>

                              <div className="text-right shrink-0">
                                {hasDeliveryDate ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    <Calendar className="h-3 w-3" />
                                    Due: {order.requestedDeliveryDate}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic block">
                                    No delivery date set
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Products & Remaining Quantities preview */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <span className="truncate max-w-[200px]">
                                {order.items.length} line item(s) •{' '}
                                {order.items.map((i) => i.productNameSnapshot).slice(0, 2).join(', ')}
                                {order.items.length > 2 ? '...' : ''}
                              </span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {totalRemainingQty} unit(s) remaining
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Driver & Vehicle Logistics Form */}
            <div className="lg:col-span-6 space-y-4">
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    2. Transport & Delivery Details
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Mandatory driver information for physical dispatch handover.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Driver / Courier Name *
                      </label>
                      <Input
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. Kamal Silva"
                        className="text-xs h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Driver Phone Number
                      </label>
                      <Input
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="e.g. +94 77 123 4567"
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Vehicle / Lorry Reg Number *
                      </label>
                      <Input
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. WP WP-8921"
                        className="text-xs h-9 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Dispatch Date *
                      </label>
                      <Input
                        type="date"
                        value={dispatchDate}
                        onChange={(e) => setDispatchDate(e.target.value)}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Delivery Drop-Off Address / Route
                    </label>
                    <Input
                      value={deliveryRoute}
                      onChange={(e) => setDeliveryRoute(e.target.value)}
                      placeholder="e.g. No. 45, Galle Road, Colombo 03"
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Dispatch Remarks / Handling Notes
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Handle with fragile caution. Customer verified bay delivery."
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Action */}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (!selectedOrder) {
                      toast.error('Please select an approved sales order.');
                      return;
                    }
                    if (!driverName.trim()) {
                      toast.error('Please enter the driver name.');
                      return;
                    }
                    if (!vehicleNumber.trim()) {
                      toast.error('Please enter the vehicle registration number.');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  className="gap-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Continue to Barcode Allocation
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Unit Barcode Allocation & Physical Scanner ── */}
      {currentStep === 2 && selectedOrder && (
        <div className="space-y-6">
          {/* Top Banner: Order details summary */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Fulfilling Sales Order:
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base font-bold text-slate-900">{selectedOrder.orderNumber}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-800">{selectedOrder.customerNameSnapshot}</span>
                {selectedOrder.requestedDeliveryDate && (
                  <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/5">
                    Delivery Date: {selectedOrder.requestedDeliveryDate}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickAllocateAll}
                className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Quick Allocate All Items from Warehouse Stock
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Line Items List */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Order Line Items:
              </h3>
              {selectedOrder.items.map((item) => {
                const maxAllowed = remainingQuantities[item.productId] ?? item.orderedQuantity ?? 0;
                const scannedCount = allocatedBarcodes[item.productId]?.length || 0;
                const isItemDone = scannedCount >= maxAllowed;
                const isSelected = item.productId === activeScanProductId;

                return (
                  <div
                    key={item.productId}
                    onClick={() => setActiveScanProductId(item.productId)}
                    className={cn(
                      'p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-2',
                      isSelected
                        ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30'
                        : isItemDone
                          ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          {item.productNameSnapshot}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          SKU: {item.skuSnapshot} • UOM: {item.uomSnapshot || 'PCS'}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-mono font-bold',
                          isItemDone
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {scannedCount} / {maxAllowed} Units
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">
                        Remaining Dispatchable: <strong>{maxAllowed}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAllocateFromStock(item.productId, maxAllowed, item.skuSnapshot);
                        }}
                        className="text-primary font-semibold hover:underline"
                        aria-label="Pick from Stock"
                      >
                        Pick from Stock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Barcode Scanning Box & Allocated Barcodes Grid */}
            <div className="lg:col-span-7 space-y-4">
              {/* Barcode Scanner Box */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-primary" />
                      Physical Unit Barcode Scanner
                    </CardTitle>
                    <span className="text-[11px] text-slate-500">Press Enter after scanning</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleScanBarcode} className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan or type unit barcode (e.g. DNS-MCB32-WH101-001)..."
                        className="font-mono text-xs pr-10"
                        autoFocus
                      />
                      <Barcode className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                    <Button type="submit" size="sm" className="gap-1.5 text-xs font-semibold">
                      Scan Unit
                    </Button>
                  </form>

                  {/* Scanned Units Grid for Active Product */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Allocated Barcodes for Selected Item:
                      </span>
                      <span className="text-xs font-mono font-bold text-primary">
                        {(allocatedBarcodes[activeScanProductId] || []).length} unit(s) scanned
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                      {(allocatedBarcodes[activeScanProductId] || []).length === 0 ? (
                        <div className="col-span-full py-6 text-center text-xs text-slate-400">
                          No unit barcodes scanned yet for this line item.
                        </div>
                      ) : (
                        allocatedBarcodes[activeScanProductId].map((bc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-mono"
                          >
                            <span className="truncate">{bc}</span>
                            <button
                              type="button"
                              onClick={() => removeScannedBarcode(activeScanProductId, bc)}
                              className="text-slate-400 hover:text-rose-600 ml-1.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Actions */}
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)} className="text-xs">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back to Logistics
                </Button>

                <Button
                  onClick={() => {
                    if (totalScannedUnits === 0) {
                      toast.error('Please scan at least one unit barcode.');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  className="gap-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
                >
                  Continue to Barcode Studio
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Barcode Stickers Studio ── */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-primary" />
                    Physical Barcode Label Studio
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Preview and print Code-128 physical adhesive barcode labels for dispatched cartons.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPrintModal('ALL')}
                    className="text-xs gap-1.5 border-primary/30 text-primary font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print All Barcode Stickers ({studioAllStickers.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Scanner Verification Test */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full">
                  <Input
                    value={studioScannerInput}
                    onChange={(e) => setStudioScannerInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStudioScanTest()}
                    placeholder="Scan sticker barcode with handheld scanner to test readability..."
                    className="text-xs h-9 font-mono bg-white"
                  />
                </div>
                <Button size="sm" onClick={handleStudioScanTest} className="text-xs shrink-0 w-full sm:w-auto">
                  Test Scan
                </Button>
              </div>

              {/* Grid of Barcode Stickers */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {studioPagedStickers.map((sticker, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-white text-center space-y-1.5 shadow-2xs"
                  >
                    <div className="text-[11px] font-bold text-slate-900 truncate">
                      {sticker.productName}
                    </div>
                    <div className="font-mono text-[9px] text-slate-500">
                      Unit {sticker.unitIndex} of {sticker.totalUnits}
                    </div>
                    <div className="py-1">
                      <BarcodeVisual value={sticker.barcode} height={36} showText={false} />
                    </div>
                    <div className="font-mono text-[10px] font-bold text-slate-800">
                      {sticker.barcode}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(sticker.barcode)}
                        className="text-[10px] text-slate-500 hover:text-primary flex items-center gap-1 font-semibold"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedCode === sticker.barcode ? 'Copied!' : 'Copy'}
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => handleOpenPrintSingle(sticker, sticker.barcode)}
                        className="text-[10px] text-slate-500 hover:text-primary flex items-center gap-1 font-semibold"
                      >
                        <Printer className="h-3 w-3" />
                        Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {studioTotalPages > 1 && (
                <PaginationControls
                  currentPage={studioSafePage}
                  totalPages={studioTotalPages}
                  onPageChange={setStudioBarcodePage}
                />
              )}
            </CardContent>
          </Card>

          {/* Navigation Actions */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)} className="text-xs">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Allocation
            </Button>

            <Button
              onClick={() => setCurrentStep(4)}
              className="gap-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              Continue to Review & Dispatch
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review & Final Dispatch Note ── */}
      {currentStep === 4 && selectedOrder && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Review Dispatch Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Verify transport logistics and physical unit barcode allocations before creating the Delivery Note.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Transport & Consignee Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                  <span className="font-bold text-slate-800 uppercase text-[10.5px] block border-b pb-1.5">
                    Transport Logistics
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Driver Name</span>
                    <span className="font-bold text-slate-900">{driverName}</span>
                    {driverPhone && <span className="text-slate-500 ml-1">({driverPhone})</span>}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Vehicle Registration No</span>
                    <span className="font-mono font-bold text-slate-900">{vehicleNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Destination / Route</span>
                    <span className="text-slate-800">{deliveryRoute || 'Direct Delivery'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                  <span className="font-bold text-slate-800 uppercase text-[10.5px] block border-b pb-1.5">
                    Consignee & Order Information
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Customer</span>
                    <span className="font-bold text-slate-900">{selectedOrder.customerNameSnapshot}</span>
                    <span className="font-mono text-slate-500 ml-1">({selectedOrder.customerCodeSnapshot})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Originating Sales Order</span>
                    <span className="font-mono font-bold text-primary">{selectedOrder.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dispatch Date</span>
                    <span className="font-mono text-slate-800">{dispatchDate}</span>
                  </div>
                </div>
              </div>

              {/* Items Summary Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-right">Ordered Qty</th>
                      <th className="p-3 text-right">Dispatched Qty</th>
                      <th className="p-3 text-right">Scanned Barcodes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items
                      .filter((i) => (allocatedBarcodes[i.productId]?.length || 0) > 0)
                      .map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">{item.productNameSnapshot}</td>
                          <td className="p-3 font-mono text-slate-600">{item.skuSnapshot}</td>
                          <td className="p-3 text-right font-mono">{item.orderedQuantity}</td>
                          <td className="p-3 text-right font-mono font-bold text-primary">
                            {allocatedBarcodes[item.productId]?.length || 0}
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                              {allocatedBarcodes[item.productId]?.length || 0} Barcode(s) Verified
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Navigation & Submit Action */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(3)} className="text-xs">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Barcode Studio
            </Button>

            <Button
              onClick={handleInitiateSubmission}
              disabled={submitting}
              className="gap-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              <Check className="h-4 w-4" />
              Save & Dispatch Delivery Note
            </Button>
          </div>
        </div>
      )}

      {/* ── Modal: Double Confirmation Dialog ── */}
      {selectedOrder && (
        <DeliveryNoteConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleFinalSubmit}
          submitting={submitting}
          order={{
            orderNumber: selectedOrder.orderNumber,
            customerName: selectedOrder.customerNameSnapshot,
            customerCode: selectedOrder.customerCodeSnapshot,
            deliveryAddress: deliveryRoute || selectedOrder.deliveryAddress,
            requestedDeliveryDate: selectedOrder.requestedDeliveryDate,
          }}
          logistics={{
            driverName,
            driverPhone,
            vehicleNumber,
            dispatchDate,
            deliveryRoute,
            notes,
          }}
          allocatedBarcodes={allocatedBarcodes}
          totalScannedUnits={totalScannedUnits}
        />
      )}

      {/* ── Modal: Barcode Stickers Print Dialog ── */}
      <DeliveryNoteBarcodeModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        deliveryNoteNumber={`PREVIEW-DN`}
        customerName={selectedOrder?.customerNameSnapshot || 'Customer'}
        items={modalBarcodeItems}
        initialFilterProduct={printModalFilterProduct}
        singleBarcode={printModalSingleBarcode}
      />
    </div>
  );
};
