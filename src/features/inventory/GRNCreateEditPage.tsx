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
import { serialNumberService } from '../../services/SerialNumberService';
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
  ScanLine,
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

export const checkProductRequiresSerial = (item: {
  productId: string;
  skuSnapshot?: string;
  productNameSnapshot?: string;
}): boolean => {
  const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId || p.sku === item.skuSnapshot);
  if (prod?.requiresSerialNumber !== undefined) {
    return prod.requiresSerialNumber;
  }
  const text = `${item.skuSnapshot || ''} ${item.productNameSnapshot || ''} ${prod?.name || ''} ${prod?.sku || ''}`.toLowerCase();
  return text.includes('chainsaw') || text.includes('inverter') || text.includes('solar') || text.includes('generator');
};

export function GRNCreateEditPage() {
  const navigate = useNavigate();
  const { grnService } = useGRN();
  const { user, currentUser } = useAuth();

  // Stepper state: 1: Inbound Details, 2: Product Counts, 3: Serial Numbers, 4: Barcode Stickers, 5: Review & Sign-Off
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 3 Serial Numbers state
  const [bulkPasteOpen, setBulkPasteOpen] = useState<Record<string, boolean>>({});
  const [bulkPasteText, setBulkPasteText] = useState<Record<string, string>>({});
  const [scanInputs, setScanInputs] = useState<Record<string, string>>({});

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

  // Serial Number step calculations
  const serializedItems = useMemo(() => {
    return items.filter((item) => {
      const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
      return goodQty > 0 && checkProductRequiresSerial(item);
    });
  }, [items]);

  const totalSerialsRequired = useMemo(() => {
    return serializedItems.reduce((acc, item) => {
      return acc + Math.max(0, item.receivedQuantity - item.damagedQuantity);
    }, 0);
  }, [serializedItems]);

  const totalSerialsEntered = useMemo(() => {
    return serializedItems.reduce((acc, item) => {
      const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
      const valid = (item.serialNumbers || []).slice(0, goodQty).filter((s) => s && s.trim().length > 0);
      return acc + valid.length;
    }, 0);
  }, [serializedItems]);

  // Real-time duplicate serial tracking across all items in GRN and existing DB records
  const serialDuplicateStats = useMemo(() => {
    const counts = new Map<string, number>();
    const intraDuplicates = new Set<string>();
    const dbDuplicates = new Set<string>();

    items.forEach((item) => {
      const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
      (item.serialNumbers || []).slice(0, goodQty).forEach((sn) => {
        const clean = sn ? sn.trim() : '';
        if (clean) {
          const upper = clean.toUpperCase();
          const current = counts.get(upper) || 0;
          counts.set(upper, current + 1);
          if (current >= 1) {
            intraDuplicates.add(upper);
          }
          if (serialNumberService.isSerialRegistered(clean)) {
            dbDuplicates.add(upper);
          }
        }
      });
    });

    const hasAnyDuplicate = intraDuplicates.size > 0 || dbDuplicates.size > 0;
    return {
      counts,
      intraDuplicates,
      dbDuplicates,
      hasAnyDuplicate,
      totalDuplicates: intraDuplicates.size + dbDuplicates.size,
    };
  }, [items]);

  const isSerialStepComplete =
    (totalSerialsRequired === 0 || totalSerialsEntered === totalSerialsRequired) &&
    !serialDuplicateStats.hasAnyDuplicate;

  // Handlers for individual serial numbers
  const handleUpdateItemSerial = (tempId: string, index: number, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._tempId !== tempId) return item;
        const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
        const serials = [...(item.serialNumbers || [])];
        while (serials.length < goodQty) serials.push('');
        serials[index] = value;

        // Sync with unitRecords so Step 4 Barcode Stickers immediately displays SN
        const unitRecords = (item.unitRecords || []).map((rec, rIdx) => {
          if (rIdx === index) {
            return { ...rec, serialNumber: value.trim() || undefined };
          }
          return rec;
        });

        return {
          ...item,
          serialNumbers: serials,
          unitRecords,
        };
      })
    );
  };

  const handleApplyBulkSerials = (tempId: string) => {
    const text = bulkPasteText[tempId] || '';
    const lines = text
      .split(/[\n,\r\t;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error('No serial numbers found in paste box');
      return;
    }

    // Collect serials from other items in this GRN
    const otherSerials = new Set<string>();
    items.forEach((it) => {
      if (it._tempId !== tempId) {
        (it.serialNumbers || []).forEach((s) => {
          if (s && s.trim()) otherSerials.add(s.trim().toUpperCase());
        });
      }
    });

    const uniqueLines: string[] = [];
    const duplicates: string[] = [];
    const seenInBulk = new Set<string>();

    lines.forEach((line) => {
      const upper = line.toUpperCase();
      if (seenInBulk.has(upper) || otherSerials.has(upper) || serialNumberService.isSerialRegistered(line)) {
        duplicates.push(line);
      } else {
        seenInBulk.add(upper);
        uniqueLines.push(line);
      }
    });

    if (duplicates.length > 0) {
      toast.error(
        `Rejected ${duplicates.length} duplicate serial(s): ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}. All serials must be unique.`
      );
    }

    if (uniqueLines.length === 0) {
      toast.warning('No unique serial numbers to apply.');
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item._tempId !== tempId) return item;
        const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
        const existing = [...(item.serialNumbers || [])];
        while (existing.length < goodQty) existing.push('');

        for (let i = 0; i < goodQty && i < uniqueLines.length; i++) {
          existing[i] = uniqueLines[i];
        }

        const unitRecords = (item.unitRecords || []).map((rec, rIdx) => ({
          ...rec,
          serialNumber: existing[rIdx]?.trim() || undefined,
        }));

        return {
          ...item,
          serialNumbers: existing,
          unitRecords,
        };
      })
    );

    setBulkPasteOpen((prev) => ({ ...prev, [tempId]: false }));
    setBulkPasteText((prev) => ({ ...prev, [tempId]: '' }));
    toast.success(`Imported ${uniqueLines.length} unique serial number(s)`);
  };

  const handleAutoGenerateSerials = (tempId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._tempId !== tempId) return item;
        const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
        const prefix = item.skuSnapshot
          ? item.skuSnapshot.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()
          : 'SN';
        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const serials: string[] = [];

        for (let i = 1; i <= goodQty; i++) {
          serials.push(`${prefix}-${year}-${rand}-${String(i).padStart(3, '0')}`);
        }

        const unitRecords = (item.unitRecords || []).map((rec, rIdx) => ({
          ...rec,
          serialNumber: serials[rIdx],
        }));

        return {
          ...item,
          serialNumbers: serials,
          unitRecords,
        };
      })
    );
    toast.success('Generated sequential serial numbers');
  };

  const handleScanNextSerial = (tempId: string) => {
    const scanVal = (scanInputs[tempId] || '').trim();
    if (!scanVal) return;

    const target = items.find((i) => i._tempId === tempId);
    if (!target) return;
    const goodQty = Math.max(0, target.receivedQuantity - target.damagedQuantity);
    const currentSerials = target.serialNumbers || [];

    let firstEmptyIndex = -1;
    for (let i = 0; i < goodQty; i++) {
      if (!currentSerials[i] || !currentSerials[i].trim()) {
        firstEmptyIndex = i;
        break;
      }
    }

    if (firstEmptyIndex === -1) {
      toast.info('All units already have serial numbers entered.');
      setScanInputs((prev) => ({ ...prev, [tempId]: '' }));
      return;
    }

    const upperScan = scanVal.toUpperCase();
    const alreadyInGRN = items.some((it) =>
      (it.serialNumbers || []).some((s) => s && s.trim().toUpperCase() === upperScan)
    );
    if (alreadyInGRN) {
      toast.error(`Duplicate Serial Rejected: "${scanVal}" is already entered for another unit in this GRN.`);
      return;
    }
    if (serialNumberService.isSerialRegistered(scanVal)) {
      toast.error(`Duplicate Serial Rejected: "${scanVal}" is already registered in warehouse stock.`);
      return;
    }
    handleUpdateItemSerial(tempId, firstEmptyIndex, scanVal);
    setScanInputs((prev) => ({ ...prev, [tempId]: '' }));
    toast.success(`Scanned serial for Unit ${firstEmptyIndex + 1}: ${scanVal}`);
  };

  const handleClearSerials = (tempId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._tempId !== tempId) return item;
        const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
        const unitRecords = (item.unitRecords || []).map((rec) => ({
          ...rec,
          serialNumber: undefined,
        }));
        return {
          ...item,
          serialNumbers: new Array(goodQty).fill(''),
          unitRecords,
        };
      })
    );
    toast.info('Cleared serial numbers');
  };

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

  // Step 4 Print Scope State: 'ALL' (bulk), 'PRODUCT' (product-wise), or 'UNIT' (individual unit)
  const [step4PrintScope, setStep4PrintScope] = useState<{
    mode: 'ALL' | 'PRODUCT' | 'UNIT';
    productId?: string;
    productName?: string;
    unitBarcode?: string;
  } | null>(null);

  const stickersToPrintInStep4 = useMemo(() => {
    if (!step4PrintScope || step4PrintScope.mode === 'ALL') {
      return allStickers;
    }
    if (step4PrintScope.mode === 'UNIT') {
      return allStickers.filter((s) => s.record.unitBarcode === step4PrintScope.unitBarcode);
    }
    if (step4PrintScope.mode === 'PRODUCT') {
      return allStickers.filter((s) => s.productId === step4PrintScope.productId);
    }
    return allStickers;
  }, [allStickers, step4PrintScope]);

  // Bulk print all stickers
  const handlePrintBulk = () => {
    if (allStickers.length === 0) {
      toast.error('No barcode stickers available to print');
      return;
    }
    setStep4PrintScope({ mode: 'ALL' });
    setIsPrintingStep3(true);
    toast.info(`Preparing bulk print for all ${allStickers.length} barcode stickers...`);
    setTimeout(() => {
      window.print();
      setIsPrintingStep3(false);
      setStep4PrintScope(null);
    }, 250);
  };

  // Product-wise print
  const handlePrintProduct = (productId: string, productName: string) => {
    const pStickers = allStickers.filter((s) => s.productId === productId);
    if (pStickers.length === 0) {
      toast.error(`No stickers found for ${productName}`);
      return;
    }
    setStep4PrintScope({ mode: 'PRODUCT', productId, productName });
    setIsPrintingStep3(true);
    toast.info(`Preparing product-wise print for ${productName} (${pStickers.length} units)...`);
    setTimeout(() => {
      window.print();
      setIsPrintingStep3(false);
      setStep4PrintScope(null);
    }, 250);
  };

  // Individual unit sticker print
  const handlePrintSingleUnit = (unitBarcode: string, unitIndex: number, productName: string) => {
    setStep4PrintScope({ mode: 'UNIT', unitBarcode });
    setIsPrintingStep3(true);
    toast.info(`Preparing single unit sticker print: Unit #${unitIndex} (${productName})...`);
    setTimeout(() => {
      window.print();
      setIsPrintingStep3(false);
      setStep4PrintScope(null);
    }, 250);
  };

  const handlePrintAllStickers = handlePrintBulk;

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

        {/* SVG Barcode Visual + Serial Number Directly Below */}
        <div className="py-2 px-1 flex flex-col items-center justify-center bg-slate-50/50 rounded my-1.5 overflow-hidden">
          <BarcodeVisual
            value={sticker.record.unitBarcode}
            width={180}
            height={40}
            showText={false}
            serialNumber={sticker.record.serialNumber}
          />
          <span className="font-mono font-bold text-[11px] text-slate-800 tracking-wider mt-1 truncate max-w-full text-center">
            {sticker.record.unitBarcode}
          </span>
          {sticker.record.serialNumber && (
            <div className="mt-1 flex items-center justify-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded font-mono text-[10px] font-bold text-indigo-900 tracking-wider">
              <Hash className="h-3 w-3 text-indigo-600 shrink-0" />
              <span>SN: {sticker.record.serialNumber}</span>
            </div>
          )}
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

        {/* Sticker Actions: Individual Unit Print & Physical Affix Status */}
        <div className="mt-2 pt-1 border-t border-dashed border-slate-100 flex items-center justify-between text-[10px]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePrintSingleUnit(sticker.record.unitBarcode, sticker.unitIndex, sticker.productName);
            }}
            className="h-6 px-2 text-[10px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 gap-1 rounded print:hidden"
            title="Print individual unit barcode sticker"
          >
            <Printer className="h-3 w-3" />
            Print Unit
          </Button>
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
    if (!selectedPoId && !poNumber) {
      return 'An approved Purchase Order is required to generate a Goods Received Note (BR-01).';
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

    if (serialDuplicateStats.hasAnyDuplicate) {
      return 'Duplicate serial numbers detected! Each unit serial number must be unique across all products and existing stock.';
    }

    // Validate serial numbers for serialized products
    for (const item of items) {
      if (checkProductRequiresSerial(item)) {
        const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
        const enteredCount = (item.serialNumbers || []).slice(0, goodQty).filter((s) => s && s.trim()).length;
        if (enteredCount < goodQty) {
          return `Please enter all ${goodQty} serial numbers for "${item.productNameSnapshot}" (${enteredCount}/${goodQty} entered).`;
        }
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
        sourceType: 'PO',
        poId: selectedPoId,
        poNumber: poNumber,
        purchaseOrderId: selectedPoId,
        purchaseOrderNumber: poNumber,
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

      // Register serial numbers with SerialNumberService
      for (const item of grnItems) {
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          const validSerials = item.serialNumbers.map((s) => s?.trim()).filter(Boolean);
          if (validSerials.length > 0) {
            serialNumberService.registerBatch({
              productId: item.productId,
              locationId: warehouseId,
              locationName: warehouseId === 'WH-MAIN' ? 'Central Distribution Hub' : warehouseId,
              grnId,
              grnNumber: generatedGrnNumber,
              receivedBy: activeUser.name,
              serialNumbers: validSerials as string[],
            });
          }
        }
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

  // Stepper definition metadata (5-step workflow)
  const STEPS = [
    {
      step: 1 as const,
      title: 'Inbound Details',
      subtitle: poNumber || 'Select Approved PO',
      icon: Truck,
      isComplete: Boolean(supplierName.trim() && warehouseId && (selectedPoId || poNumber)),
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
      title: 'Serial Numbers',
      subtitle:
        totalSerialsRequired > 0
          ? `${totalSerialsEntered}/${totalSerialsRequired} recorded`
          : 'None required',
      icon: Hash,
      isComplete: isSerialStepComplete,
    },
    {
      step: 4 as const,
      title: 'Barcode Stickers',
      subtitle: `${barcodeSummary.generatedBarcodes} barcodes · ${barcodeSummary.confirmedUnits}/${barcodeSummary.totalUnits} affixed`,
      icon: Barcode,
      isComplete: barcodeSummary.isFullyConfirmed,
    },
    {
      step: 5 as const,
      title: 'Review & Approval',
      subtitle: 'Manager sign-off ready',
      icon: FileCheck,
      isComplete: false,
    },
  ];

  return (
    <div className="w-full space-y-6">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
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
            {/* Mandatory PO Intake Banner (BR-01 Enforcement) */}
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-3.5 shadow-2xs">
              <div className="p-2.5 rounded-lg bg-primary text-primary-foreground shrink-0 mt-0.5">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-sm text-slate-900">
                    Purchase Order Receiving (Mandatory Linkage)
                  </span>
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-semibold">
                    BR-01 Enforced
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  In compliance with inventory governance rules, all Goods Received Notes must originate from an approved Purchase Order. Unlinked or manual intake is disabled to guarantee procurement auditability.
                </p>
              </div>
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
                  {selectedPoId === '' && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Quick select:</span>
                      {MOCK_PURCHASE_ORDERS.slice(0, 4).map((po) => (
                        <button
                          key={po.id}
                          type="button"
                          onClick={() => handleSelectPO(po.id)}
                          className="text-[11px] px-2 py-0.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-700 transition-colors font-mono bg-white"
                        >
                          {po.poNumber}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedPoId && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Purchase Order items and unit barcodes populated into the line items list.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Supplier Name */}
              <div className="space-y-1.5 sm:col-span-2">
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
                Continue to Serial Numbers ({totalSerialsRequired > 0 ? `${totalSerialsRequired} Units` : 'Step 3'})
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── STEP 3: MANUFACTURER SERIAL NUMBERS INTAKE ───────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={cn('space-y-6', currentStep !== 3 && 'hidden')}>
        <Card className="shadow-2xs border-primary/20">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-indigo-600" />
                    Step 3: Manufacturer Serial Numbers Intake
                  </CardTitle>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                    Serialization Control
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Record individual manufacturer serial numbers for serialized items (e.g. chainsaws, solar inverters, generators). Unit stickers in Step 4 will embed these serial numbers.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-mono px-2.5 py-1',
                    isSerialStepComplete
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  )}
                >
                  {totalSerialsRequired > 0
                    ? `${totalSerialsEntered} / ${totalSerialsRequired} Serial Numbers Recorded`
                    : 'No Serial Tracking Required'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-6">
            {serializedItems.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Hash className="h-6 w-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800">
                    No Serialized Products in this Inbound
                  </h4>
                  <p className="text-xs text-slate-500">
                    None of the {items.length} product line(s) in this GRN require individual manufacturer serial numbers. You can proceed directly to unit barcode stickers.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="gap-2 text-xs font-semibold h-9 mt-2"
                >
                  Continue to Barcode Stickers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {serializedItems.map((item) => {
                  const goodQty = Math.max(0, item.receivedQuantity - item.damagedQuantity);
                  const currentSerials = item.serialNumbers || [];
                  const validCount = currentSerials.slice(0, goodQty).filter((s) => s && s.trim()).length;
                  const isItemComplete = validCount >= goodQty;
                  const isBulkOpen = Boolean(bulkPasteOpen[item._tempId]);

                  return (
                    <Card
                      key={item._tempId}
                      className={cn(
                        'border transition-all overflow-hidden',
                        isItemComplete ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white shadow-2xs'
                      )}
                    >
                      {/* Product Header */}
                      <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">
                              {item.productNameSnapshot}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono bg-white text-slate-600">
                              SKU: {item.skuSnapshot}
                            </Badge>
                            <Badge
                              className={cn(
                                'text-[10px] font-semibold',
                                isItemComplete
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {validCount} of {goodQty} Recorded
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {goodQty} good units to intake · {item.damagedQuantity > 0 ? `${item.damagedQuantity} damaged (excluded)` : '0 damaged'}
                          </p>
                        </div>

                        {/* Quick action toolbar for this product */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setBulkPasteOpen((prev) => ({
                                ...prev,
                                [item._tempId]: !prev[item._tempId],
                              }))
                            }
                            className="text-xs h-8 gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            {isBulkOpen ? 'Close Paste Box' : 'Bulk Paste'}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAutoGenerateSerials(item._tempId)}
                            className="text-xs h-8 gap-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                            Auto-Fill
                          </Button>

                          {validCount > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClearSerials(item._tempId)}
                              className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-4">
                        {/* Rapid Scanner Input */}
                        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-2.5">
                          <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs shrink-0">
                            <ScanLine className="h-4 w-4 text-indigo-600" />
                            Rapid Scan Input:
                          </div>
                          <div className="flex-1 w-full flex items-center gap-2">
                            <Input
                              type="text"
                              value={scanInputs[item._tempId] || ''}
                              onChange={(e) =>
                                setScanInputs((prev) => ({ ...prev, [item._tempId]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleScanNextSerial(item._tempId);
                                }
                              }}
                              placeholder={`Scan next serial barcode for ${item.productNameSnapshot}...`}
                              className="h-8 text-xs font-mono bg-white"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleScanNextSerial(item._tempId)}
                              className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* Bulk Paste Drawer */}
                        {isBulkOpen && (
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                Bulk Paste Serial Numbers (one per line or comma-separated)
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Expecting up to {goodQty} serials
                              </span>
                            </div>
                            <Textarea
                              rows={4}
                              value={bulkPasteText[item._tempId] || ''}
                              onChange={(e) =>
                                setBulkPasteText((prev) => ({
                                  ...prev,
                                  [item._tempId]: e.target.value,
                                }))
                              }
                              placeholder="SN-10001&#10;SN-10002&#10;SN-10003..."
                              className="font-mono text-xs bg-white"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setBulkPasteOpen((prev) => ({ ...prev, [item._tempId]: false }))
                                }
                                className="h-7 text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleApplyBulkSerials(item._tempId)}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                              >
                                Apply to {goodQty} Units
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Grid of Individual Unit Inputs (e.g. 20 Units) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                            <span>Individual Unit Serial Number Assignment ({goodQty} Units):</span>
                            <span className="font-mono text-[11px]">
                              {validCount} of {goodQty} completed
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                            {Array.from({ length: goodQty }).map((_, unitIdx) => {
                              const val = (item.serialNumbers || [])[unitIdx] || '';
                              const cleanVal = val.trim();
                              const hasVal = Boolean(cleanVal);
                              const upperVal = cleanVal.toUpperCase();
                              const isIntraDup = hasVal && (serialDuplicateStats.counts.get(upperVal) || 0) > 1;
                              const isDbDup = hasVal && serialDuplicateStats.dbDuplicates.has(upperVal);
                              const isDuplicate = isIntraDup || isDbDup;

                              return (
                                <div
                                  key={unitIdx}
                                  className={cn(
                                    'p-2 rounded-lg border text-left transition-all',
                                    isDuplicate
                                      ? 'bg-rose-50/70 border-rose-400 ring-1 ring-rose-400/40 text-rose-950'
                                      : hasVal
                                      ? 'bg-emerald-50/40 border-emerald-200'
                                      : 'bg-white border-slate-200 focus-within:border-indigo-400'
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      Unit #{unitIdx + 1}
                                    </span>
                                    {isDuplicate ? (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-100 px-1 py-0.5 rounded border border-rose-200">
                                        <AlertTriangle className="h-2.5 w-2.5 text-rose-600" />
                                        Duplicate
                                      </span>
                                    ) : hasVal ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <span className="text-[9px] text-amber-600 font-medium">Required</span>
                                    )}
                                  </div>
                                  <Input
                                    type="text"
                                    value={val}
                                    onChange={(e) =>
                                      handleUpdateItemSerial(item._tempId, unitIdx, e.target.value)
                                    }
                                    placeholder={`SN #${unitIdx + 1}`}
                                    className={cn(
                                      'h-7 text-[11px] font-mono px-2',
                                      isDuplicate
                                        ? 'bg-white border-rose-400 text-rose-900 font-bold focus:border-rose-500 focus:ring-rose-300'
                                        : hasVal
                                        ? 'bg-white border-emerald-300 font-bold text-emerald-950'
                                        : 'bg-slate-50 border-slate-200'
                                    )}
                                  />
                                  {isDuplicate && (
                                    <span className="text-[9px] text-rose-600 font-semibold block mt-1 leading-tight">
                                      {isDbDup ? 'Already in warehouse stock!' : 'Duplicate serial! Must be unique.'}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

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
                onClick={() => {
                  if (serialDuplicateStats.hasAnyDuplicate) {
                    toast.error(
                      'Duplicate serial numbers detected! Each unit serial number must be unique before proceeding.'
                    );
                    return;
                  }
                  if (!isSerialStepComplete) {
                    toast.error(
                      `Please enter all ${totalSerialsRequired} serial numbers before proceeding (${totalSerialsEntered}/${totalSerialsRequired} entered)`
                    );
                    return;
                  }
                  setCurrentStep(4);
                }}
                className="gap-2 text-xs font-semibold h-9 bg-primary text-primary-foreground"
              >
                Continue to Barcode Stickers Studio
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── STEP 4: UNIT BARCODE STICKERS STUDIO (EMBEDDED NATIVE) ── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={cn('space-y-6', currentStep !== 4 && 'hidden')}>
        <Card className="shadow-2xs border-primary/20">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Barcode className="h-5 w-5 text-primary" />
                    Step 4: Unit Barcode Stickers Studio
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

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {selectedProductFilter !== 'ALL' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prod = items.find((i) => i.productId === selectedProductFilter);
                      handlePrintProduct(selectedProductFilter, prod?.productNameSnapshot || 'Product');
                    }}
                    className="gap-1.5 text-xs font-semibold h-8 border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80 shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5 text-indigo-600" />
                    Print Product ({allStickers.length})
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrintBulk}
                  disabled={allStickers.length === 0}
                  className="gap-1.5 text-xs font-semibold h-8 shadow-xs text-slate-800"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  Print All ({barcodeSummary.totalUnits})
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

                {selectedProductFilter !== 'ALL' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prod = items.find((i) => i.productId === selectedProductFilter);
                      handlePrintProduct(selectedProductFilter, prod?.productNameSnapshot || 'Product');
                    }}
                    className="h-8 text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Product ({allStickers.length})
                  </Button>
                )}
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

                  {/* Print View: Filtered stickers matching active print job (Bulk, Product, or Unit) */}
                  {isPrintingStep3 && (
                    <div className="hidden print:grid print:grid-cols-2 gap-3">
                      {stickersToPrintInStep4.map((sticker, idx) => renderStickerCard(sticker, idx))}
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
                Back to Serial Numbers
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStep(5)}
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
      {/* ── STEP 5: RECONCILIATION SUMMARY & MANAGER APPROVAL ───── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={cn('space-y-6', currentStep !== 5 && 'hidden')}>
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Step 5: Final Reconciliation &amp; Manager Sign-Off
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Verify physical quantities, serial numbers, barcode tagging compliance, and submit to the Inventory Manager for commercial approval.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50 font-mono">
                Step 5 of 5
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
                    <th className="py-2.5 px-3 text-center">Serial Numbers</th>
                    <th className="py-2.5 px-3 text-center">Barcodes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((i) => {
                    const isSerialized = checkProductRequiresSerial(i);
                    const goodCount = Math.max(0, i.receivedQuantity - i.damagedQuantity);
                    const serialCount = (i.serialNumbers || []).slice(0, goodCount).filter((s) => s && s.trim()).length;

                    return (
                      <tr key={i._tempId}>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-900 block truncate">{i.productNameSnapshot}</span>
                          <span className="font-mono text-[10px] text-slate-400">SKU: {i.skuSnapshot}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{i.receivedQuantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">{i.damagedQuantity}</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                          {goodCount}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isSerialized ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-mono',
                                serialCount >= goodCount
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              )}
                            >
                              <Hash className="h-3 w-3 mr-0.5 inline text-indigo-500" />
                              {serialCount}/{goodCount} Serials
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Not Required</span>
                          )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Step 5 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(4)}
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
            Step {currentStep} of 5
          </Badge>
          <span className="truncate">
            {currentStep === 1 && 'Step 1: Inbound Source & Supplier'}
            {currentStep === 2 && `Step 2: ${items.length} Product(s) · ${totalReceivedUnits} Units Counted`}
            {currentStep === 3 && `Step 3: Serial Numbers · ${totalSerialsEntered}/${totalSerialsRequired} Recorded`}
            {currentStep === 4 && `Step 4: Barcode Studio · ${barcodeSummary.confirmedUnits}/${barcodeSummary.totalUnits} Stickers Affixed`}
            {currentStep === 5 && 'Step 5: Final Sign-off & Manager Approval'}
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

          {currentStep < 5 ? (
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
                if (currentStep === 3) {
                  if (serialDuplicateStats.hasAnyDuplicate) {
                    toast.error(
                      'Duplicate serial numbers detected! Each unit serial number must be unique before proceeding.'
                    );
                    return;
                  }
                  if (!isSerialStepComplete) {
                    toast.error(
                      `Please enter all ${totalSerialsRequired} serial numbers before proceeding (${totalSerialsEntered}/${totalSerialsRequired} entered)`
                    );
                    return;
                  }
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
                setCurrentStep(4);
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
