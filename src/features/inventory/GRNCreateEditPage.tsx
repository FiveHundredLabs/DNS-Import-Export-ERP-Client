import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { BarcodeVisual } from '../../components/common/BarcodeVisual';
import { UnitBarcodeModal } from '../../components/inventory/UnitBarcodeModal';
import { PaginationControls } from '../../components/common/PaginationControls';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { MOCK_PURCHASE_ORDERS } from '../../mock/mockInventory';
import { GRN, GRNItem, UnitBarcodeRecord } from '../../types/inventory';
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import {
  FileText,
  PlusCircle,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  Barcode,
  Scan,
  Boxes,
  Truck,
  Hash,
  Search,
  Check,
  FileCheck,
  Zap,
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9);

const SUPPLIERS = [
  { id: 'sup-01', name: 'Schneider Electric Lanka (Pvt) Ltd' },
  { id: 'sup-02', name: 'ABB Power Products' },
  { id: 'sup-03', name: 'Havells India Limited' },
  { id: 'sup-04', name: 'Siemens Industrial Automation' },
];

const LOCATIONS = [
  { value: 'WH-MAIN', label: 'Colombo Central Warehouse (Bay 1)' },
  { value: 'WH-KANDY', label: 'Kandy Regional Depot (Bay 2)' },
  { value: 'WH-GALLE', label: 'Galle Distribution Hub (Bay 3)' },
  { value: 'WH-BOND', label: 'Peliyagoda Bonded Logistics Bay' },
];

interface LineItem extends GRNItem {
  _tempId: string;
  unitCost: number;
}

export function GRNCreateEditPage() {
  const navigate = useNavigate();
  const { grnService } = useGRN();
  const { user, currentUser } = useAuth();

  // Stepper state: 1: Inbound Details, 2: Product Counts, 3: Barcode Stickers, 4: Review & Sign-Off
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Intake source mode: from Purchase Order (PO) or Manual one-by-one entry
  const [sourceType, setSourceType] = useState<'PO' | 'MANUAL'>('PO');

  // PO-specific state
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');

  // General GRN Header State
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [deliveryNoteRef, setDeliveryNoteRef] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('WH-MAIN');
  const [notes, setNotes] = useState<string>('');

  // Line items
  const [items, setItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Manual intake: One-by-one product + quantity selection state
  const [manualProductId, setManualProductId] = useState<string>('');
  const [manualReceivedQty, setManualReceivedQty] = useState<number>(1);
  const [manualDamagedQty, setManualDamagedQty] = useState<number>(0);

  // Product picker modal state (catalogue search)
  const [showProductPicker, setShowProductPicker] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');

  // Step 3 Barcode Studio state
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [scannerTestInput, setScannerTestInput] = useState<string>('');
  const [verifiedBarcode, setVerifiedBarcode] = useState<string | null>(null);
  const [barcodePage, setBarcodePage] = useState<number>(1);
  const [barcodePageSize, setBarcodePageSize] = useState<number>(12);
  const [isPrintingStep3, setIsPrintingStep3] = useState<boolean>(false);

  // Fallback modal for viewing/reprinting
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState<boolean>(false);
  const [unlabeledPromptOpen, setUnlabeledPromptOpen] = useState<boolean>(false);

  const activeUser = user || currentUser;
  const isStockKeeper = activeUser?.role === 'STOCK_KEEPER';

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    if (!productSearch) return true;
    const s = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      (p.barcode && p.barcode.toLowerCase().includes(s))
    );
  });

  // Handle selecting an existing Purchase Order (PO)
  const handleSelectPO = (poId: string) => {
    setSelectedPoId(poId);
    const po = MOCK_PURCHASE_ORDERS.find((p) => p.id === poId);
    if (!po) return;

    setSupplierName(po.supplierName);
    setPoNumber(po.poNumber);
    setWarehouseId(po.warehouseId || 'WH-MAIN');

    const poItems: LineItem[] = po.items.map((pItem) => {
      const product = MOCK_PRODUCTS.find((p) => p.id === pItem.productId);
      const cost = pItem.unitCost || product?.pricing?.costPrice || 0;
      const initialItem: LineItem = {
        _tempId: generateId(),
        productId: pItem.productId,
        productNameSnapshot: pItem.productName,
        skuSnapshot: pItem.sku,
        expectedQuantity: pItem.expectedQuantity,
        receivedQuantity: pItem.expectedQuantity,
        damagedQuantity: 0,
        unitCostSnapshot: cost,
        unitCost: cost,
        lineValue: pItem.expectedQuantity * cost,
      };

      // Automatically generate unit barcodes for the expected quantity
      const unitRecords = unitBarcodeService.generateUnitBarcodesForLine(
        initialItem,
        po.poNumber
      );
      initialItem.unitRecords = unitRecords;
      initialItem.unitBarcodes = unitRecords.map((r) => r.unitBarcode);

      return initialItem;
    });

    setItems(poItems);
    toast.success(`Loaded PO "${po.poNumber}" with ${po.items.length} line items`);
  };

  // Add product one-by-one in manual mode
  const handleAddManualProduct = () => {
    if (!manualProductId) {
      toast.error('Please select a product to add');
      return;
    }
    const product = MOCK_PRODUCTS.find((p) => p.id === manualProductId);
    if (!product) return;

    if (manualReceivedQty <= 0) {
      toast.error('Received quantity must be greater than 0');
      return;
    }

    if (manualDamagedQty > manualReceivedQty) {
      toast.error('Damaged quantity cannot exceed received quantity');
      return;
    }

    const existingIdx = items.findIndex((i) => i.productId === manualProductId);
    if (existingIdx >= 0) {
      setItems((prev) => {
        const copy = [...prev];
        const existing = copy[existingIdx];
        const newReceived = existing.receivedQuantity + manualReceivedQty;
        const newDamaged = existing.damagedQuantity + manualDamagedQty;
        const updatedItem: LineItem = {
          ...existing,
          receivedQuantity: newReceived,
          damagedQuantity: newDamaged,
          expectedQuantity: existing.expectedQuantity + manualReceivedQty,
          lineValue: (newReceived - newDamaged) * existing.unitCost,
        };

        const unitRecords = unitBarcodeService.generateUnitBarcodesForLine(
          updatedItem,
          poNumber || deliveryNoteRef || 'GRN-MANUAL'
        );
        updatedItem.unitRecords = unitRecords;
        updatedItem.unitBarcodes = unitRecords.map((r) => r.unitBarcode);
        updatedItem.barcodesConfirmed = false;

        copy[existingIdx] = updatedItem;
        return copy;
      });
      toast.success(`Updated quantity for ${product.name} (+${manualReceivedQty})`);
    } else {
      const cost = product.pricing.costPrice;
      const good = manualReceivedQty - manualDamagedQty;
      const newItem: LineItem = {
        _tempId: generateId(),
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        expectedQuantity: manualReceivedQty,
        receivedQuantity: manualReceivedQty,
        damagedQuantity: manualDamagedQty,
        unitCostSnapshot: cost,
        unitCost: cost,
        lineValue: good * cost,
        barcode: product.barcode || '',
        serialNumber: '',
        uom: (product as any).uomCode || 'PCS',
      };

      const unitRecords = unitBarcodeService.generateUnitBarcodesForLine(
        newItem,
        poNumber || deliveryNoteRef || 'GRN-MANUAL'
      );
      newItem.unitRecords = unitRecords;
      newItem.unitBarcodes = unitRecords.map((r) => r.unitBarcode);

      setItems((prev) => [...prev, newItem]);
      toast.success(`Added ${product.name} (${manualReceivedQty} units) with unit barcodes`);
    }

    setManualProductId('');
    setManualReceivedQty(1);
    setManualDamagedQty(0);
  };

  // Add product from picker modal
  const addProduct = (productId: string, qty: number = 1) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    if (items.some((i) => i.productId === productId)) {
      toast.info('Product already added. Adjust quantity in the table.');
      return;
    }
    const newItem: LineItem = {
      _tempId: generateId(),
      productId: product.id,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      expectedQuantity: qty,
      receivedQuantity: qty,
      damagedQuantity: 0,
      unitCostSnapshot: product.pricing.costPrice,
      unitCost: product.pricing.costPrice,
      lineValue: qty * product.pricing.costPrice,
      barcode: product.barcode || '',
      serialNumber: '',
      uom: (product as any).uomCode || 'PCS',
    };

    const unitRecords = unitBarcodeService.generateUnitBarcodesForLine(
      newItem,
      poNumber || deliveryNoteRef || 'GRN-CATALOG'
    );
    newItem.unitRecords = unitRecords;
    newItem.unitBarcodes = unitRecords.map((r) => r.unitBarcode);

    setItems((prev) => [...prev, newItem]);
    setShowProductPicker(false);
    setProductSearch('');
  };

  const updateItem = (tempId: string, field: keyof LineItem, value: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        updated.lineValue = (updated.receivedQuantity - updated.damagedQuantity) * updated.unitCost;

        if (field === 'receivedQuantity' || field === 'damagedQuantity') {
          const goodQty = Math.max(0, updated.receivedQuantity - updated.damagedQuantity);
          if (!updated.unitRecords || updated.unitRecords.length !== goodQty) {
            const records = unitBarcodeService.generateUnitBarcodesForLine(
              updated,
              poNumber || deliveryNoteRef || 'GRN-INTAKE'
            );
            updated.unitRecords = records;
            updated.unitBarcodes = records.map((r) => r.unitBarcode);
            updated.barcodesConfirmed = false;
          }
        }
        return updated;
      })
    );
  };

  const updateItemString = (tempId: string, field: 'barcode' | 'serialNumber' | 'uom', value: string) => {
    setItems(prev =>
      prev.map(item => {
        if (item._tempId !== tempId) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const removeItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i._tempId !== tempId));
  };

  // Step 3 Sticker Print Trigger
  const handlePrintAllStickers = () => {
    toast.info(`Sending ${barcodeSummary.totalUnits} barcode stickers to printer...`);
    setIsPrintingStep3(true);
    setTimeout(() => {
      window.print();
      setIsPrintingStep3(false);
    }, 250);
  };

  // Step 3 Barcode Scanner Verification Test
  const handleTestScan = (codeToTest?: string) => {
    const val = (codeToTest || scannerTestInput).trim();
    if (!val) return;
    setScannerTestInput(val);

    const foundIdx = allStickers.findIndex(
      (s) =>
        s.record.unitBarcode.toLowerCase() === val.toLowerCase() ||
        (s.record.serialNumber && s.record.serialNumber.toLowerCase() === val.toLowerCase())
    );

    if (foundIdx !== -1) {
      const found = allStickers[foundIdx];
      const targetPage = Math.floor(foundIdx / barcodePageSize) + 1;
      setBarcodePage(targetPage);
      setVerifiedBarcode(found.record.unitBarcode);
      toast.success(
        `✓ Scanner Match (Page ${targetPage}): Unit ${found.unitIndex} of ${found.productName} (${found.record.unitBarcode})`
      );
      setScannerTestInput('');
    } else {
      setVerifiedBarcode(null);
      toast.error(`Barcode "${val}" not found in this GRN receiving session.`);
    }
  };

  // Step 3 Confirm All Affixed in Bay
  const handleConfirmAllAffixedInStudio = () => {
    const updated = unitBarcodeService.confirmAllAffixed(items);
    setItems(updated);
    toast.success(
      `✓ Confirmed! All ${barcodeSummary.totalUnits} physical unit stickers affixed in warehouse bay.`
    );
  };

  const totalValue = items.reduce((s, i) => s + i.lineValue, 0);
  const totalReceivedUnits = items.reduce((s, i) => s + i.receivedQuantity, 0);
  const totalDamagedUnits = items.reduce((s, i) => s + i.damagedQuantity, 0);
  const totalGoodUnits = totalReceivedUnits - totalDamagedUnits;

  const barcodeSummary = useMemo(() => {
    return unitBarcodeService.getSummary(items);
  }, [items]);

  // Flattened stickers list for Step 3 preview
  const allStickers = useMemo(() => {
    const list: {
      productId: string;
      productName: string;
      sku: string;
      unitIndex: number;
      totalUnitsForProduct: number;
      record: UnitBarcodeRecord;
    }[] = [];

    items.forEach((item) => {
      if (selectedProductFilter !== 'ALL' && item.productId !== selectedProductFilter) {
        return;
      }
      const records = item.unitRecords || [];
      records.forEach((r: UnitBarcodeRecord) => {
        list.push({
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          unitIndex: r.unitIndex,
          totalUnitsForProduct: records.length,
          record: r,
        });
      });
    });

    return list;
  }, [items, selectedProductFilter]);

  // Paginated barcode stickers for Step 3
  const totalBarcodeStickers = allStickers.length;
  const totalBarcodePages = Math.max(1, Math.ceil(totalBarcodeStickers / barcodePageSize));
  const safeBarcodePage = Math.min(Math.max(1, barcodePage), totalBarcodePages);
  const barcodeStartIndex = (safeBarcodePage - 1) * barcodePageSize;
  const barcodeEndIndex = Math.min(barcodeStartIndex + barcodePageSize, totalBarcodeStickers);
  const pagedBarcodeStickers = useMemo(() => {
    return allStickers.slice(barcodeStartIndex, barcodeEndIndex);
  }, [allStickers, barcodeStartIndex, barcodeEndIndex]);

  const renderStickerCard = (sticker: (typeof allStickers)[0], idx: number) => {
    const isVerified = verifiedBarcode === sticker.record.unitBarcode;
    const isAffixed = sticker.record.status === 'LABELED';

    return (
      <div
        key={`${sticker.record.unitBarcode}-${idx}`}
        className={cn(
          'p-3.5 rounded-xl border bg-white flex flex-col justify-between transition-all select-none overflow-hidden',
          isVerified
            ? 'border-emerald-500 ring-2 ring-emerald-400/40 shadow-xs'
            : isAffixed
            ? 'border-slate-200'
            : 'border-amber-200/90 shadow-2xs'
        )}
      >
        {/* Sticker Top Header */}
        <div className="flex items-start justify-between gap-1 border-b border-slate-100 pb-1.5">
          <div className="min-w-0 pr-1">
            <span className="text-[9.5px] font-bold text-slate-400 tracking-wider uppercase block">
              DNS WAREHOUSE • INTAKE
            </span>
            <h4 className="font-bold text-xs text-slate-900 truncate" title={sticker.productName}>
              {sticker.productName}
            </h4>
            <span className="font-mono text-[10px] text-slate-500 block truncate">
              SKU: {sticker.sku}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[9.5px] px-1.5 py-0 font-mono shrink-0 bg-slate-50 text-slate-700 border-slate-200"
          >
            Unit {sticker.unitIndex}/{sticker.totalUnitsForProduct}
          </Badge>
        </div>

        {/* SVG Barcode Visual */}
        <div className="py-2 px-1 flex flex-col items-center justify-center bg-slate-50/50 rounded my-1.5 overflow-hidden">
          <BarcodeVisual
            value={sticker.record.unitBarcode}
            width={180}
            height={40}
            showText={false}
          />
          <span className="font-mono font-bold text-[11px] text-slate-800 tracking-wider mt-1 truncate max-w-full text-center">
            {sticker.record.unitBarcode}
          </span>
        </div>

        {/* Sticker Footer Metadata */}
        <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
          {sticker.record.serialNumber ? (
            <div className="flex items-center gap-1 font-mono font-semibold text-indigo-700 truncate">
              <Hash className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="truncate">SN: {sticker.record.serialNumber}</span>
            </div>
          ) : (
            <span className="text-slate-400 italic">Non-Serialized Item</span>
          )}

          <span className="font-mono text-[9.5px] text-slate-400 shrink-0">
            {poNumber || deliveryNoteRef || 'GRN'} · {warehouseId}
          </span>
        </div>

        {/* Sticker Physical Affix Status */}
        <div className="mt-2 pt-1 border-t border-dashed border-slate-100 flex items-center justify-between text-[10px]">
          {isAffixed ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Sticker Affixed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <Clock className="h-3 w-3 text-amber-600" />
              Pending Affixing
            </span>
          )}
          {isVerified && (
            <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">
              Verified
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const validate = (): string | null => {
    if (sourceType === 'PO' && !selectedPoId && !poNumber) {
      return 'Please select a Purchase Order (PO)';
    }
    if (!supplierName.trim()) return 'Supplier name is required';
    if (!warehouseId) return 'Warehouse is required';
    if (items.length === 0) return 'At least one product line is required';
    for (const item of items) {
      if (item.receivedQuantity <= 0) {
        return `Received quantity must be > 0 for ${item.productNameSnapshot}`;
      }
      if (item.damagedQuantity > item.receivedQuantity) {
        return `Damaged qty cannot exceed received qty for ${item.productNameSnapshot}`;
      }
      if (item.unitCost < 0) {
        return `Unit cost cannot be negative for ${item.productNameSnapshot}`;
      }
    }
    return null;
  };

  const executeSave = async (status: 'DRAFT' | 'SUBMITTED', confirmedItems?: LineItem[]) => {
    if (!activeUser) {
      toast.error('Not authenticated');
      return;
    }

    try {
      setSubmitting(true);
      const itemsToSave = confirmedItems || items;
      const grnItems: GRNItem[] = itemsToSave.map((i) => ({
        productId: i.productId,
        productNameSnapshot: i.productNameSnapshot,
        skuSnapshot: i.skuSnapshot,
        expectedQuantity: i.expectedQuantity,
        receivedQuantity: i.receivedQuantity,
        damagedQuantity: i.damagedQuantity,
        unitCostSnapshot: i.unitCost,
        lineValue: i.lineValue,
        barcode: i.barcode?.trim() || undefined,
        serialNumber: i.serialNumber?.trim() || undefined,
        uom: i.uom || 'PCS',
        serialNumbers: i.serialNumbers,
        unitBarcodes: i.unitBarcodes,
        unitRecords: i.unitRecords,
        barcodesConfirmed: i.barcodesConfirmed,
        barcodesConfirmedAt: i.barcodesConfirmedAt,
      }));

      const grnId = generateId();
      const generatedGrnNumber = `GRN-${Date.now().toString().slice(-6)}`;
      const isFullyLabeled = unitBarcodeService.isGRNFullyLabeled(grnItems);

      const grn: GRN = {
        id: grnId,
        grnNumber: generatedGrnNumber,
        sourceType,
        poId: sourceType === 'PO' ? selectedPoId : undefined,
        poNumber: sourceType === 'PO' ? poNumber : deliveryNoteRef.trim() || undefined,
        supplierId: 'sup-manual',
        supplierName: supplierName.trim(),
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        receivedDate,
        warehouseId,
        status: 'DRAFT' as const,
        items: grnItems,
        totalValue,
        receivedById: activeUser.id,
        notes: notes.trim() || undefined,
        barcodesGenerated: grnItems.some((i) => i.unitRecords && i.unitRecords.length > 0),
        barcodesConfirmed: isFullyLabeled,
        barcodesConfirmedAt: isFullyLabeled ? new Date().toISOString() : undefined,
        barcodesConfirmedBy: isFullyLabeled ? activeUser.name : undefined,
      };

      if (status === 'SUBMITTED') {
        await grnService.submitGRN(grn);
      } else {
        await grnService.createGRN(grn, activeUser);
      }

      toast.success(
        `GRN ${generatedGrnNumber} saved as ${status}${
          isFullyLabeled ? ' with all unit barcodes confirmed' : ''
        }`
      );
      navigate('/inventory/grn');
    } catch (e: any) {
      toast.error(e.message ?? 'Error saving GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async (status: 'DRAFT' | 'SUBMITTED') => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    if (status === 'SUBMITTED' && isStockKeeper) {
      const isFullyConfirmed = unitBarcodeService.isGRNFullyLabeled(items);
      if (!isFullyConfirmed) {
        setUnlabeledPromptOpen(true);
        return;
      }
    }

    await executeSave(status);
  };

  const handleConfirmAffixedAndSubmit = async () => {
    const updated = unitBarcodeService.confirmAllAffixed(items);
    setItems(updated);
    setUnlabeledPromptOpen(false);
    toast.success('Confirmed all physical unit barcode stickers affixed in receiving bay.');
    await executeSave('SUBMITTED', updated);
  };

  // Stepper definition metadata
  const STEPS = [
    {
      step: 1 as const,
      title: 'Inbound Details',
      subtitle: sourceType === 'PO' ? (poNumber || 'Select PO') : (supplierName || 'Manual Supplier'),
      icon: Truck,
      isComplete: Boolean(supplierName.trim() && warehouseId && (sourceType === 'MANUAL' || selectedPoId || poNumber)),
    },
    {
      step: 2 as const,
      title: 'Product Counts',
      subtitle: `${items.length} product(s) · ${totalReceivedUnits} units`,
      icon: Boxes,
      isComplete: items.length > 0 && items.every((i) => i.receivedQuantity > 0),
    },
    {
      step: 3 as const,
      title: 'Barcode Stickers',
      subtitle: `${barcodeSummary.generatedBarcodes} barcodes · ${barcodeSummary.confirmedUnits}/${barcodeSummary.totalUnits} affixed`,
      icon: Barcode,
      isComplete: barcodeSummary.isFullyConfirmed,
    },
    {
      step: 4 as const,
      title: 'Review & Approval',
      subtitle: 'Manager sign-off ready',
      icon: FileCheck,
      isComplete: false,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Create Goods Receipt Note
            </h1>
            {isStockKeeper && (
              <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Stock Keeper Intake
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Physical receiving, unit-wise barcode generation, sticker verification, and manager approval intake.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(3)}
              className="gap-1.5 text-xs font-semibold shadow-xs text-primary border-primary/30 hover:bg-primary/5"
            >
              <Printer className="h-3.5 w-3.5" />
              Unit Barcode Stickers ({barcodeSummary.totalUnits})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory/grn')}>
            Cancel
          </Button>
        </div>
      </div>

      {/* ── Warehouse Isolation Mode Alert Banner ── */}
      {isStockKeeper && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong className="font-bold">Warehouse Isolation Mode Active:</strong> Stock Keepers record physical quantities received and damaged only. All financial costing and GL postings are restricted to Finance Accounts Payable.
            </span>
          </div>
          <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 shrink-0 self-start sm:self-auto text-[11px]">
            Physical Inventory Only
          </Badge>
        </div>
      )}

      {/* ── Smart Stepper Navigation Bar ── */}
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

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── STEP 1: INBOUND SOURCE & SUPPLIER HEADER ─────────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={cn('space-y-6', currentStep !== 1 && 'hidden')}>
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Step 1: Receiving Details &amp; Inbound Source
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Choose how inbound goods arrived at the warehouse receiving bay.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 font-mono">
                Step 1 of 4
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-5">
            {/* Source Mode Toggle Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setSourceType('PO')}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer',
                  sourceType === 'PO'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/25 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                )}
              >
                <div
                  className={cn(
                    'p-2.5 rounded-lg shrink-0 mt-0.5',
                    sourceType === 'PO' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Create from Purchase Order (PO)</span>
                    {sourceType === 'PO' && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Receive shipments against an approved supplier PO. Line items and expected quantities load automatically.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSourceType('MANUAL')}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer',
                  sourceType === 'MANUAL'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/25 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                )}
              >
                <div
                  className={cn(
                    'p-2.5 rounded-lg shrink-0 mt-0.5',
                    sourceType === 'MANUAL' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Create Manually (One by One)</span>
                    {sourceType === 'MANUAL' && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Direct warehouse intake without a PO. Add received products and physical quantities one-by-one with automatic barcodes.
                  </p>
                </div>
              </button>
            </div>

            {/* Inbound Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {sourceType === 'PO' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>
                      Select Approved Purchase Order <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Auto-populates supplier &amp; order lines
                    </span>
                  </label>
                  <Select value={selectedPoId} onValueChange={handleSelectPO}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose Purchase Order (e.g. PO-2026-0891)" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_PURCHASE_ORDERS.map((po) => (
                        <SelectItem key={po.id} value={po.id} className="text-xs">
                          <span className="font-mono font-semibold">{po.poNumber}</span> · {po.supplierName} ({po.items.length} lines)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPoId && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Purchase Order items and unit barcodes populated into the line items list.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Supplier Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Type or select supplier..."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="h-9 text-xs"
                />
                {supplierName === '' && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {SUPPLIERS.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSupplierName(s.name)}
                        className="text-[11px] px-2 py-0.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Warehouse Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Receiving Warehouse <span className="text-red-500">*</span>
                </label>
                <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l.value} value={l.value} className="text-xs">
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Note / Ref */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">
                  Delivery Note / Invoice Reference (Optional)
                </label>
                <Input
                  placeholder="e.g. DN-89211 / INV-2026-908"
                  value={deliveryNoteRef}
                  onChange={(e) => setDeliveryNoteRef(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Receiving Remarks */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">
                  Receiving Bay Remarks &amp; Logistics Notes (Optional)
                </label>
                <Textarea
                  placeholder="Driver name, vehicle number, unloading bay notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Next: Count received products and physical units.
              </span>
              <Button
                type="button"
                onClick={() => {
                  if (!supplierName.trim()) {
                    toast.error('Supplier name is required before continuing');
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="gap-2 text-xs font-semibold h-9"
              >
                Continue to Product Counts
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── STEP 2: PRODUCT INTAKE & PHYSICAL COUNTS (ONE BY ONE) ── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={cn('space-y-6', currentStep !== 2 && 'hidden')}>
        {/* Manual Intake Bar */}
        {sourceType === 'MANUAL' && (
          <Card className="border-primary/30 bg-primary/5/30 shadow-2xs">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4 text-primary" />
                    Add Product One by One
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Select product from warehouse catalogue, specify received &amp; damaged quantity, and add to GRN list.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductPicker(true)}
                  className="text-xs font-semibold h-7 text-primary border-primary/30"
                >
                  <Search className="h-3 w-3 mr-1" />
                  Catalogue Picker
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Select Product</label>
                  <Select value={manualProductId} onValueChange={(val) => setManualProductId(val)}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Choose product by SKU or name..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_PRODUCTS.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          <span className="font-mono font-semibold">{p.sku}</span> — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Intake Units</label>
                  <Input
                    type="number"
                    min="1"
                    value={manualReceivedQty}
                    onChange={(e) => setManualReceivedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-9 text-xs font-mono font-semibold text-right bg-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Damaged Qty</label>
                  <Input
                    type="number"
                    min="0"
                    value={manualDamagedQty}
                    onChange={(e) => setManualDamagedQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className={cn(
                      'h-9 text-xs font-mono text-right bg-white',
                      manualDamagedQty > 0 && 'border-rose-400 text-rose-600 font-semibold'
                    )}
                  />
                </div>

                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    onClick={handleAddManualProduct}
                    className="w-full h-9 text-xs font-bold gap-1.5 shadow-xs"
                  >
                    <PlusCircle className="h-4 w-4" />
                    + Add to GRN
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line Items Table Card */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  Physical Line Items &amp; Counts
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {items.length} product line(s) · {totalReceivedUnits} received units ·{' '}
                  <span className="font-semibold text-primary">{barcodeSummary.generatedBarcodes} unit barcodes</span>
                  {barcodeSummary.confirmedUnits > 0 && (
                    <span className="text-emerald-700 font-semibold ml-1">
                      ({barcodeSummary.confirmedUnits} stickers confirmed)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductPicker(true)}
                  className="gap-1.5 text-xs font-semibold h-8"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-primary" />
                  + Add Product
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Modal / Catalogue Search Product Picker */}
            {showProductPicker && (
              <div className="mb-4 p-4 border-2 border-dashed border-primary/30 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Select Product from Master Catalogue
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowProductPicker(false);
                      setProductSearch('');
                    }}
                    className="h-7 text-xs text-slate-400 hover:text-slate-700"
                  >
                    Close
                  </Button>
                </div>
                <Input
                  placeholder="Search by product name, SKU or barcode..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-9 text-xs bg-white"
                  autoFocus
                />
                <div className="max-h-52 overflow-y-auto divide-y border rounded-lg bg-white">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">No products found</div>
                  ) : (
                    filteredProducts.map((p) => {
                      const alreadyAdded = items.some((i) => i.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addProduct(p.id, 1)}
                          className={cn(
                            'w-full text-left p-2.5 flex items-center justify-between transition-colors text-xs',
                            alreadyAdded ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'hover:bg-primary/5 cursor-pointer'
                          )}
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              SKU: {p.sku} {p.barcode && `· Barcode: ${p.barcode}`}
                            </p>
                          </div>
                          {alreadyAdded ? (
                            <Badge variant="outline" className="text-[10px]">
                              Already Added
                            </Badge>
                          ) : (
                            <span className="text-primary font-semibold text-xs flex items-center gap-1">
                              + Select
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Line Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                <Package className="h-10 w-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-slate-700">No products added to this GRN yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {sourceType === 'PO'
                      ? 'Select an approved Purchase Order above, or add products manually.'
                      : 'Use the intake bar above or "+ Add Product" to add products one by one.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10.5px]">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Product</th>
                      <th className="py-2.5 px-3 text-right">Expected Qty</th>
                      <th className="py-2.5 px-3 text-right">Received Qty</th>
                      <th className="py-2.5 px-3 text-right">Damaged Qty</th>
                      <th className="py-2.5 px-3 text-right">Good Units</th>
                      {!isStockKeeper && (
                        <>
                          <th className="py-2.5 px-3 text-right">Unit Cost (LKR)</th>
                          <th className="py-2.5 px-3 text-right">Line Value</th>
                        </>
                      )}
                      <th className="py-2.5 px-3 text-center">Unit Barcodes</th>
                      <th className="py-2.5 px-2 text-center w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const goodQty = item.receivedQuantity - item.damagedQuantity;
                      const barcodesCount = item.unitRecords?.length || 0;
                      const isAffixed = item.barcodesConfirmed === true;

                      return (
                        <tr key={item._tempId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 max-w-[220px]">
                            <p className="font-semibold text-slate-900 truncate" title={item.productNameSnapshot}>
                              {item.productNameSnapshot}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{item.skuSnapshot}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              min="0"
                              value={item.expectedQuantity}
                              onChange={(e) =>
                                updateItem(
                                  item._tempId,
                                  'expectedQuantity',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="text-right w-20 h-8 font-mono text-xs ml-auto"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              min="0"
                              value={item.receivedQuantity}
                              onChange={(e) =>
                                updateItem(
                                  item._tempId,
                                  'receivedQuantity',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="text-right w-20 h-8 font-mono text-xs font-semibold ml-auto"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              min="0"
                              value={item.damagedQuantity}
                              onChange={(e) =>
                                updateItem(
                                  item._tempId,
                                  'damagedQuantity',
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className={cn(
                                'text-right w-20 h-8 font-mono text-xs ml-auto',
                                item.damagedQuantity > 0 && 'border-rose-400 text-rose-600 font-semibold'
                              )}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            <span className={goodQty < 0 ? 'text-rose-600' : 'text-slate-800'}>
                              {goodQty}
                            </span>
                          </td>

                          {!isStockKeeper && (
                            <>
                              <td className="py-2.5 px-3">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.unitCost}
                                  onChange={(e) =>
                                    updateItem(
                                      item._tempId,
                                      'unitCost',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="text-right w-24 h-8 font-mono text-xs ml-auto"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                {formatCurrency(item.lineValue)}
                              </td>
                            </>
                          )}

                          {/* Unit Barcodes & Labeling Column */}
                          <td className="py-2.5 px-3 text-center">
                            {barcodesCount > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductFilter(item.productId);
                                    setBarcodePage(1);
                                    setCurrentStep(3);
                                  }}
                                  className="font-mono text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                  title="View paginated unit barcodes in Step 3"
                                >
                                  <Barcode className="h-3 w-3" />
                                  {barcodesCount} Barcodes
                                </button>
                                {isAffixed ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] py-0 px-1.5 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {barcodesCount}/{barcodesCount} Affixed
                                  </Badge>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    className="text-[10px] text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1 underline cursor-pointer"
                                  >
                                    <Clock className="h-3 w-3 text-amber-600" />
                                    Pending Stickers
                                  </button>
                                )}
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentStep(3)}
                                className="h-7 text-[11px] gap-1 text-primary border-primary/30"
                              >
                                <Zap className="h-3 w-3 text-amber-500" />
                                Generate
                              </Button>
                            )}
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item._tempId)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-xs text-slate-700">
                    <tr>
                      <td className="py-3 px-3">Total Reconciled</td>
                      <td className="py-3 px-3 text-right font-mono">
                        {items.reduce((s, i) => s + i.expectedQuantity, 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {totalReceivedUnits}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {totalDamagedUnits}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {totalGoodUnits}
                      </td>
                      {!isStockKeeper && (
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(totalValue)}
                        </td>
                      )}
                      <td className="py-3 px-3 text-center font-mono text-primary font-bold">
                        {barcodeSummary.generatedBarcodes} barcodes
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="gap-1.5 text-xs h-9"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Details
              </Button>
              <Button
                type="button"
                disabled={items.length === 0}
                onClick={() => setCurrentStep(3)}
                className="gap-2 text-xs font-semibold h-9"
              >
                Continue to Barcode Stickers ({barcodeSummary.totalUnits} Units)
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── STEP 3: UNIT BARCODE STICKERS STUDIO (EMBEDDED NATIVE) ── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={cn('space-y-6', currentStep !== 3 && 'hidden')}>
        <Card className="shadow-2xs border-primary/20">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-primary" />
                    Step 3: Unit Barcode Stickers Studio
                  </CardTitle>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    Physical Intake Studio
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  System-generated unit barcodes for physical labeling of each received unit in GRN{' '}
                  <span className="font-mono font-semibold text-slate-700">
                    {poNumber || deliveryNoteRef || 'GRN-INBOUND'}
                  </span>.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrintAllStickers}
                  disabled={allStickers.length === 0}
                  className="gap-1.5 text-xs font-semibold h-8 shadow-xs text-slate-700"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  Print Stickers ({allStickers.length})
                </Button>
              </div>
            </div>

            {/* KPI Tally bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Units</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {barcodeSummary.totalUnits}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">System Barcodes</span>
                <span className="text-base font-bold font-mono text-primary">
                  {barcodeSummary.generatedBarcodes}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Serialized Units</span>
                <span className="text-base font-bold font-mono text-indigo-600">
                  {barcodeSummary.serializedUnits}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center shadow-2xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Stickers Affixed</span>
                <span
                  className={cn(
                    'text-base font-bold font-mono',
                    barcodeSummary.isFullyConfirmed ? 'text-emerald-600' : 'text-amber-600'
                  )}
                >
                  {barcodeSummary.confirmedUnits} / {barcodeSummary.totalUnits}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-5">
            {/* Controls Bar: Filter by Product & Test Scanner */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/90 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700 shrink-0">Filter Product:</span>
                <Select
                  value={selectedProductFilter}
                  onValueChange={(val) => {
                    setSelectedProductFilter(val);
                    setBarcodePage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-white w-48 sm:w-60">
                    <SelectValue placeholder="All Received Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">
                      All Products ({barcodeSummary.totalUnits} units)
                    </SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item.productId} value={item.productId} className="text-xs">
                        {item.productNameSnapshot} ({item.unitRecords?.length || 0} units)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Handheld Scanner Verification Sandbox */}
              <div className="flex items-center gap-1.5">
                <Scan className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <Input
                  placeholder="Test scan sticker barcode..."
                  value={scannerTestInput}
                  onChange={(e) => setScannerTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTestScan();
                    }
                  }}
                  className="h-8 text-xs font-mono bg-white w-48 sm:w-56"
                />
                <Button size="sm" variant="outline" onClick={() => handleTestScan()} className="h-8 text-xs px-2.5">
                  Verify
                </Button>
              </div>
            </div>

            {/* Printable Barcode Stickers Sheet */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Unit Barcode Stickers Preview
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Showing {allStickers.length === 0 ? 0 : barcodeStartIndex + 1}–{barcodeEndIndex} of {allStickers.length} stickers
                    {selectedProductFilter !== 'ALL' && ' (Filtered by Product)'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Standard Thermal / Adhesive Label (50mm × 30mm)
                </span>
              </div>

              {/* Top Pagination Controls */}
              {allStickers.length > 0 && (
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg px-3 py-1">
                  <PaginationControls
                    currentPage={safeBarcodePage}
                    totalItems={totalBarcodeStickers}
                    pageSize={barcodePageSize}
                    onPageChange={setBarcodePage}
                    onPageSizeChange={(newSize) => {
                      setBarcodePageSize(newSize);
                      setBarcodePage(1);
                    }}
                    pageSizeOptions={[12, 24, 48, 96]}
                    label="stickers"
                  />
                </div>
              )}

              {allStickers.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  No unit barcode stickers found for the selected filter.
                </div>
              ) : (
                <>
                  {/* Screen View: Paginated Grid */}
                  <div
                    className={cn(
                      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
                      isPrintingStep3 ? 'hidden' : 'print:grid'
                    )}
                  >
                    {pagedBarcodeStickers.map((sticker, idx) => renderStickerCard(sticker, idx))}
                  </div>

                  {/* Print View: Full unpaginated grid for print media */}
                  {isPrintingStep3 && (
                    <div className="hidden print:grid print:grid-cols-2 gap-3">
                      {allStickers.map((sticker, idx) => renderStickerCard(sticker, idx))}
                    </div>
                  )}

                  {/* Bottom Pagination Controls if multiple pages */}
                  {totalBarcodePages > 1 && (
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg px-3 py-1 mt-3">
                      <PaginationControls
                        currentPage={safeBarcodePage}
                        totalItems={totalBarcodeStickers}
                        pageSize={barcodePageSize}
                        onPageChange={setBarcodePage}
                        onPageSizeChange={(newSize) => {
                          setBarcodePageSize(newSize);
                          setBarcodePage(1);
                        }}
                        pageSizeOptions={[12, 24, 48, 96]}
                        label="stickers"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Physical Tagging Confirmation Card ── */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-emerald-950">
                      Warehouse Physical Tagging Confirmation
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      Stock Keeper must print stickers, stick them to all {barcodeSummary.totalUnits} units, and confirm here prior to manager approval.
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] self-start sm:self-auto">
                  {barcodeSummary.confirmedUnits}/{barcodeSummary.totalUnits} Units Labeled
                </Badge>
              </div>

              <Button
                type="button"
                onClick={handleConfirmAllAffixedInStudio}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-2 font-bold h-9 text-xs shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm: All {barcodeSummary.totalUnits} Barcode Stickers Affixed in Receiving Bay
              </Button>
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(2)}
                className="gap-1.5 text-xs h-9"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Product Counts
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="gap-2 text-xs font-semibold h-9"
              >
                Continue to Review &amp; Approval
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── STEP 4: RECONCILIATION SUMMARY & MANAGER APPROVAL ───── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={cn('space-y-6', currentStep !== 4 && 'hidden')}>
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Step 4: Final Reconciliation &amp; Manager Sign-Off
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Verify physical quantities, barcode tagging compliance, and submit to the Inventory Manager for commercial approval.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 font-mono">
                Step 4 of 4
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-5">
            {/* Intake Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Source Type</span>
                <span className="font-semibold text-slate-800">
                  {sourceType === 'PO' ? `Purchase Order (${poNumber || 'PO'})` : 'Manual Intake (One by One)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier</span>
                <span className="font-semibold text-slate-800 truncate block">{supplierName || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Receiving Bay</span>
                <span className="font-semibold text-slate-800">{warehouseId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Stock Keeper</span>
                <span className="font-semibold text-slate-800">{activeUser?.name || 'Stock Keeper'}</span>
              </div>
            </div>

            {/* Reconciliation KPI Counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Received Units</span>
                <span className="text-xl font-bold font-mono text-slate-900">{totalReceivedUnits}</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-[11px] font-bold text-rose-700 uppercase block">Damaged / Rejected</span>
                <span className="text-xl font-bold font-mono text-rose-700">{totalDamagedUnits}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[11px] font-bold text-emerald-800 uppercase block">Net Good Units</span>
                <span className="text-xl font-bold font-mono text-emerald-700">{totalGoodUnits}</span>
              </div>
            </div>

            {/* Barcode Tagging Compliance Badge */}
            <div
              className={cn(
                'p-4 rounded-xl border flex items-center justify-between gap-3',
                barcodeSummary.isFullyConfirmed
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                  : 'border-amber-200 bg-amber-50/60 text-amber-950'
              )}
            >
              <div className="flex items-center gap-3">
                {barcodeSummary.isFullyConfirmed ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-xs">
                    {barcodeSummary.isFullyConfirmed
                      ? '✓ 100% Barcode Stickers Affixed & Verified'
                      : 'Physical Sticker Affixing Incomplete'}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {barcodeSummary.isFullyConfirmed
                      ? `All ${barcodeSummary.totalUnits} physical units have been tagged with unique system barcodes in the receiving bay.`
                      : `${barcodeSummary.pendingUnits} of ${barcodeSummary.totalUnits} units still need stickers printed and stuck on physical boxes.`}
                  </p>
                </div>
              </div>

              {!barcodeSummary.isFullyConfirmed && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs h-8 text-amber-800 border-amber-300 bg-white shrink-0"
                >
                  Go to Sticker Studio
                </Button>
              )}
            </div>

            {/* Items Summary Table */}
            <div className="border rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-slate-50 border-b text-[10.5px] uppercase font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Product</th>
                    <th className="py-2.5 px-3 text-right">Received</th>
                    <th className="py-2.5 px-3 text-right">Damaged</th>
                    <th className="py-2.5 px-3 text-right">Net Good</th>
                    <th className="py-2.5 px-3 text-center">Barcodes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((i) => (
                    <tr key={i._tempId}>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900 block truncate">{i.productNameSnapshot}</span>
                        <span className="font-mono text-[10px] text-slate-400">SKU: {i.skuSnapshot}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{i.receivedQuantity}</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600">{i.damagedQuantity}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                        {i.receivedQuantity - i.damagedQuantity}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-mono',
                            i.barcodesConfirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {i.unitRecords?.length || 0} Units {i.barcodesConfirmed ? '✓' : 'Pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Step 4 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(3)}
                className="gap-1.5 text-xs h-9"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Stickers Studio
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleSave('DRAFT')}
                  className="h-9 text-xs"
                >
                  {submitting ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSave('SUBMITTED')}
                  className="h-9 text-xs font-semibold shadow-xs bg-primary text-primary-foreground gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Sign & Complete Submission'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Persistent Floating Sticky Bar for Quick Navigation & Submission ── */}
      <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-600 flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="outline" className="text-[11px] bg-slate-50 font-mono">
            Step {currentStep} of 4
          </Badge>
          <span className="truncate">
            {currentStep === 1 && 'Step 1: Inbound Source & Supplier'}
            {currentStep === 2 && `Step 2: ${items.length} Product(s) · ${totalReceivedUnits} Units Counted`}
            {currentStep === 3 && `Step 3: Barcode Studio · ${barcodeSummary.confirmedUnits}/${barcodeSummary.totalUnits} Stickers Affixed`}
            {currentStep === 4 && 'Step 4: Final Sign-off & Manager Approval'}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="h-8 text-xs gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (currentStep === 1 && !supplierName.trim()) {
                  toast.error('Supplier name is required');
                  return;
                }
                if (currentStep === 2 && items.length === 0) {
                  toast.error('At least one product line is required');
                  return;
                }
                setCurrentStep((prev) => (prev + 1) as any);
              }}
              className="h-8 text-xs font-semibold gap-1"
            >
              Next Step
              <ArrowRight className="h-3 w-3" />
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => handleSave('DRAFT')}
            className="h-8 text-xs"
          >
            Draft
          </Button>

          <Button
            type="button"
            disabled={submitting}
            onClick={() => handleSave('SUBMITTED')}
            className="h-8 text-xs font-semibold shadow-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Submit for Manager Approval
          </Button>
        </div>
      </div>

      {/* ── Fallback Unit Barcode Stickers Studio Modal (for reprinting) ── */}
      {isBarcodeModalOpen && (
        <UnitBarcodeModal
          isOpen={isBarcodeModalOpen}
          onClose={() => setIsBarcodeModalOpen(false)}
          items={items}
          grnNumber={poNumber || deliveryNoteRef || 'GRN-INBOUND'}
          supplierName={supplierName}
          warehouseId={warehouseId}
          initialProductId={selectedProductFilter}
          onConfirmLabeled={(updated) => setItems(updated)}
        />
      )}

      {/* ── Physical Affixing Warning Prompt Modal ── */}
      <Dialog open={unlabeledPromptOpen} onOpenChange={setUnlabeledPromptOpen} size="md">
        <DialogContent className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Unit Barcode Stickers Not Confirmed
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Stock Keeper procedure requires all received units to have physical barcode stickers affixed before manager approval.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Pending Physical Affixing:</p>
            <p>
              {barcodeSummary.pendingUnits} of {barcodeSummary.totalUnits} unit stickers have not yet been marked as affixed in the warehouse.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setUnlabeledPromptOpen(false);
                setCurrentStep(3);
              }}
              className="text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Open Sticker Studio &amp; Print
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmAffixedAndSubmit}
              className="text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Affixed &amp; Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
