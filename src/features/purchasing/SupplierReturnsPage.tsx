import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supplierReturnService } from '../../services/SupplierReturnService';
import { SupplierReturn, SupplierReturnStatus, SupplierReturnReason } from '../../types/purchasing';
import { Supplier } from '../finance/api/types';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { apService } from '../finance/services/apService';
import { cn } from '../../utils/cn';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  Boxes,
  ArrowLeft,
  Search,
  Barcode,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export interface BarcodeUnit {
  barcode: string;
  serialNumber?: string;
  isDamaged?: boolean;
  unitIndex: number;
}

export interface GRNReturnProductLine {
  productId: string;
  productCode: string;
  productName: string;
  receivedQuantity: number;
  damagedQuantity: number;
  unitCost: number;
  reason?: string;
  selectedBarcodes: string[];
  allBarcodes: BarcodeUnit[];
}

export function SupplierReturnsPage() {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const isPurchasingRole = role === 'PURCHASING_OFFICER' || role === 'PURCHASING_MANAGER';

  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'CREATE'>('REGISTRY');
  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierReturnStatus | 'ALL'>('ALL');

  // Form State for New Supplier Return
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [selectedGRNId, setSelectedGRNId] = useState<string>('');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [reasonCategory, setReasonCategory] = useState<SupplierReturnReason>('DEFECTIVE_DAMAGED');
  const [reasonDescription, setReasonDescription] = useState<string>(
    'Defective or damaged items returned to supplier for credit debit note'
  );
  const [warehouseId, setWarehouseId] = useState<string>('WH-MAIN');
  const [productLines, setProductLines] = useState<GRNReturnProductLine[]>([]);
  const [barcodeSearchQuery, setBarcodeSearchQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const canApprove =
    currentUser.role === 'DIRECTOR' ||
    currentUser.role === 'MANAGER';

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await supplierReturnService.getReturns();
      setReturns(data);
    } catch (err) {
      console.error('Failed to load supplier returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  // Available GRNs from AP/Inventory registry
  const availableGRNs = useMemo(() => {
    return apService.getAvailableGRNs();
  }, []);

  // Distinct suppliers extracted from available GRNs with their GRN count
  const suppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; grnCount: number }>();
    availableGRNs.forEach((g) => {
      const id = g.supplierId || 'sup-001';
      const name = g.supplierName || 'Primary Supplier';
      const existing = map.get(id);
      if (existing) {
        existing.grnCount++;
      } else {
        map.set(id, { id, name, grnCount: 1 });
      }
    });
    return Array.from(map.values());
  }, [availableGRNs]);

  // GRNs filtered by supplier selection (if filtered)
  const displayedGRNs = useMemo(() => {
    if (selectedSupplierFilter === 'ALL') return availableGRNs;
    return availableGRNs.filter((g) => g.supplierId === selectedSupplierFilter);
  }, [availableGRNs, selectedSupplierFilter]);

  // All GRNs available from the currently selected supplier
  const currentSupplierGRNs = useMemo(() => {
    const currentId = selectedSupplier?.id || (selectedSupplierFilter !== 'ALL' ? selectedSupplierFilter : null);
    if (!currentId) return [];
    return availableGRNs.filter(
      (g) => g.supplierId === currentId || (selectedSupplier && g.supplierName.toLowerCase() === selectedSupplier.name.toLowerCase())
    );
  }, [availableGRNs, selectedSupplier, selectedSupplierFilter]);

  // Helper to construct barcode units for a GRN line item
  const buildBarcodesForItem = (item: any, grnNumber: string): BarcodeUnit[] => {
    const cleanSku = (item.skuSnapshot || 'ITEM')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 10);
    const grnSuffix = (grnNumber || 'GRN')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(-4)
      .toUpperCase() || 'WH1';
    const damagedQty = item.damagedQuantity || 0;
    const goodQty = Math.max(0, item.receivedQuantity - damagedQty);

    const units: BarcodeUnit[] = [];

    // Use existing unitRecords if available on the item
    if (item.unitRecords && item.unitRecords.length > 0) {
      item.unitRecords.forEach((r: any, idx: number) => {
        units.push({
          barcode: r.unitBarcode,
          serialNumber: r.serialNumber,
          isDamaged: idx >= goodQty || (damagedQty > 0 && idx < damagedQty),
          unitIndex: r.unitIndex || idx + 1,
        });
      });
      return units;
    }

    // Otherwise generate standard unit barcodes
    for (let i = 1; i <= item.receivedQuantity; i++) {
      const seq = String(i).padStart(3, '0');
      const barcode = `DNS-${cleanSku}-${grnSuffix}-${seq}`;
      const serialNumber = item.serialNumbers && item.serialNumbers[i - 1]
        ? item.serialNumbers[i - 1]
        : undefined;
      const isDamaged = i <= damagedQty;
      units.push({
        barcode,
        serialNumber,
        isDamaged,
        unitIndex: i,
      });
    }

    return units;
  };

  // Handle selecting a GRN: Automatically populates PO, Supplier, Warehouse, and Products
  const handleGRNSelect = (grnId: string) => {
    setSelectedGRNId(grnId);
    const grn = availableGRNs.find((g) => g.id === grnId);
    if (!grn) {
      setProductLines([]);
      setSelectedPoNumber('');
      setSelectedSupplier(null);
      return;
    }

    // Auto-select PO from the GRN
    const autoPoNumber = grn.purchaseOrderNumber || (grn as any).poNumber || 'PO-2025-001';
    setSelectedPoNumber(autoPoNumber);

    // Auto-select Supplier from the GRN
    setSelectedSupplier({
      id: grn.supplierId || 'sup-001',
      name: grn.supplierName || 'Primary Supplier',
      code: (grn as any).supplierCode || 'SUP-001',
      email: '',
      phone: '',
      address: (grn as any).supplierAddress || '',
      status: 'ACTIVE',
    } as any);

    if (grn.supplierId) {
      setSelectedSupplierFilter(grn.supplierId);
    }

    // Auto-select Warehouse
    if (grn.warehouseId) {
      setWarehouseId(grn.warehouseId);
    }

    // Populate all products from this GRN with unit barcodes
    const lines: GRNReturnProductLine[] = (grn.items || []).map((item) => {
      const barcodes = buildBarcodesForItem(item, grn.grnNumber || grn.id);
      const damagedQty = item.damagedQuantity || 0;

      // Auto-preselect damaged barcodes if present
      const preselectedBarcodes = barcodes
        .filter((b) => b.isDamaged)
        .map((b) => b.barcode);

      return {
        productId: item.productId,
        productCode: item.skuSnapshot || 'DNS-SKU',
        productName: item.productNameSnapshot || 'Product',
        receivedQuantity: item.receivedQuantity || 1,
        damagedQuantity: damagedQty,
        unitCost: item.unitCostSnapshot || 2800,
        reason: damagedQty > 0 ? 'Transit/intake damage recorded on GRN inspection' : '',
        selectedBarcodes: preselectedBarcodes,
        allBarcodes: barcodes,
      };
    });

    setProductLines(lines);
  };

  // Handle Supplier filter change
  const handleSupplierFilterChange = (supId: string) => {
    setSelectedSupplierFilter(supId);
    if (supId === 'ALL') return;
    const grnsForSupplier = availableGRNs.filter((g) => g.supplierId === supId);
    if (grnsForSupplier.length > 0) {
      handleGRNSelect(grnsForSupplier[0].id);
    }
  };

  // Barcode toggle handler for a specific product line
  const handleToggleBarcode = (lineIndex: number, barcode: string) => {
    setProductLines((prev) => {
      const next = [...prev];
      const line = { ...next[lineIndex] };
      const exists = line.selectedBarcodes.includes(barcode);
      if (exists) {
        line.selectedBarcodes = line.selectedBarcodes.filter((b) => b !== barcode);
      } else {
        line.selectedBarcodes = [...line.selectedBarcodes, barcode];
      }
      next[lineIndex] = line;
      return next;
    });
  };

  // Quick action: Select only damaged barcodes for a product
  const handleSelectDamagedOnly = (lineIndex: number) => {
    setProductLines((prev) => {
      const next = [...prev];
      const line = { ...next[lineIndex] };
      const damaged = line.allBarcodes.filter((b) => b.isDamaged).map((b) => b.barcode);
      line.selectedBarcodes = damaged;
      next[lineIndex] = line;
      return next;
    });
    toast.success(`Selected damaged barcodes for ${productLines[lineIndex]?.productName}`);
  };

  // Quick action: Select all barcodes for a product
  const handleSelectAllBarcodes = (lineIndex: number) => {
    setProductLines((prev) => {
      const next = [...prev];
      const line = { ...next[lineIndex] };
      line.selectedBarcodes = line.allBarcodes.map((b) => b.barcode);
      next[lineIndex] = line;
      return next;
    });
  };

  // Quick action: Clear barcodes for a product
  const handleClearBarcodes = (lineIndex: number) => {
    setProductLines((prev) => {
      const next = [...prev];
      const line = { ...next[lineIndex] };
      line.selectedBarcodes = [];
      next[lineIndex] = line;
      return next;
    });
  };

  // Quick action: Quick return 1 unit (select first barcode)
  const handleSelectFirstUnit = (lineIndex: number) => {
    setProductLines((prev) => {
      const next = [...prev];
      const line = { ...next[lineIndex] };
      if (line.allBarcodes.length > 0) {
        line.selectedBarcodes = [line.allBarcodes[0].barcode];
      }
      next[lineIndex] = line;
      return next;
    });
  };

  // Update line reason note
  const handleUpdateLineReason = (lineIndex: number, reason: string) => {
    setProductLines((prev) => {
      const next = [...prev];
      next[lineIndex] = { ...next[lineIndex], reason };
      return next;
    });
  };

  // Filter products by searched barcode or serial #
  const searchedProductLines = useMemo(() => {
    const q = barcodeSearchQuery.trim().toLowerCase();
    if (!q) return productLines;

    return productLines.filter((prod) => {
      const matchesBarcodeOrSerial = prod.allBarcodes.some(
        (b) =>
          b.barcode.toLowerCase().includes(q) ||
          (b.serialNumber && b.serialNumber.toLowerCase().includes(q))
      );
      const matchesProductInfo =
        prod.productName.toLowerCase().includes(q) ||
        prod.productCode.toLowerCase().includes(q);
      return matchesBarcodeOrSerial || matchesProductInfo;
    });
  }, [productLines, barcodeSearchQuery]);

  // Check if searched barcode belongs to another GRN
  const otherGRNMatch = useMemo(() => {
    const q = barcodeSearchQuery.trim().toLowerCase();
    if (!q || q.length < 3) return null;

    // Check if matched in active GRN
    const inCurrent = productLines.some((p) =>
      p.allBarcodes.some(
        (b) =>
          b.barcode.toLowerCase().includes(q) ||
          (b.serialNumber && b.serialNumber.toLowerCase().includes(q))
      )
    );
    if (inCurrent) return null;

    // Search across other available GRNs
    for (const otherGRN of availableGRNs) {
      if (otherGRN.id === selectedGRNId) continue;
      for (const item of otherGRN.items || []) {
        const barcodes = buildBarcodesForItem(item, otherGRN.grnNumber || otherGRN.id);
        const match = barcodes.find(
          (b) =>
            b.barcode.toLowerCase().includes(q) ||
            (b.serialNumber && b.serialNumber.toLowerCase().includes(q))
        );
        if (match) {
          return {
            grn: otherGRN,
            productName: item.productNameSnapshot,
            barcode: match.barcode,
            serialNumber: match.serialNumber,
          };
        }
      }
    }
    return null;
  }, [barcodeSearchQuery, productLines, availableGRNs, selectedGRNId]);

  // Handle Enter on Barcode Search: auto-selects barcode
  const handleBarcodeSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = barcodeSearchQuery.trim().toLowerCase();
      if (!q) return;

      for (let i = 0; i < productLines.length; i++) {
        const prod = productLines[i];
        const match = prod.allBarcodes.find(
          (b) =>
            b.barcode.toLowerCase() === q ||
            (b.serialNumber && b.serialNumber.toLowerCase() === q)
        );
        if (match) {
          if (!prod.selectedBarcodes.includes(match.barcode)) {
            handleToggleBarcode(i, match.barcode);
            toast.success(`Selected unit ${match.barcode} for ${prod.productName}`);
          } else {
            toast.info(`Unit ${match.barcode} is already selected for return.`);
          }
          return;
        }
      }

      if (otherGRNMatch) {
        toast.info(
          `Barcode found in ${otherGRNMatch.grn.grnNumber}. Click "Switch to ${otherGRNMatch.grn.grnNumber}" to select it.`
        );
      } else {
        toast.error(`Barcode "${barcodeSearchQuery}" not found in current GRN.`);
      }
    }
  };

  // Active returned items: lines that have at least 1 barcode selected
  const activeReturnLines = useMemo(() => {
    return productLines.filter((l) => l.selectedBarcodes.length > 0);
  }, [productLines]);

  const totalReturnUnits = useMemo(() => {
    return activeReturnLines.reduce((sum, it) => sum + it.selectedBarcodes.length, 0);
  }, [activeReturnLines]);

  const totalReturnAmount = useMemo(() => {
    return activeReturnLines.reduce(
      (sum, it) => sum + it.selectedBarcodes.length * (it.unitCost || 0),
      0
    );
  }, [activeReturnLines]);

  // Submit return
  const handleSubmitReturn = async (autoApprove: boolean) => {
    if (!selectedGRNId) {
      toast.error('Please select a Goods Received Note (GRN) to return from.');
      return;
    }

    if (activeReturnLines.length === 0) {
      toast.error('Please select at least one product barcode to return.');
      return;
    }

    try {
      setSubmitting(true);
      const grn = availableGRNs.find((g) => g.id === selectedGRNId);

      const items = activeReturnLines.map((l) => {
        const selectedUnits = l.allBarcodes.filter((b) => l.selectedBarcodes.includes(b.barcode));
        const serials = selectedUnits.map((u) => u.serialNumber).filter(Boolean) as string[];

        return {
          productId: l.productId,
          productCode: l.productCode,
          productName: l.productName,
          returnedQuantity: l.selectedBarcodes.length,
          unitCost: l.unitCost,
          reason: l.reason || reasonDescription.trim(),
          barcode: l.selectedBarcodes[0],
          selectedBarcodes: l.selectedBarcodes,
          serialNumbers: serials,
        };
      });

      const ret = await supplierReturnService.createReturn(
        {
          supplierId: selectedSupplier?.id || grn?.supplierId || 'sup-001',
          supplierName: selectedSupplier?.name || grn?.supplierName || 'Supplier',
          supplierCode: selectedSupplier?.code || (grn as any)?.supplierCode,
          originalPoNumber: selectedPoNumber || grn?.purchaseOrderNumber || (grn as any)?.poNumber,
          grnId: selectedGRNId,
          grnNumber: grn?.grnNumber || selectedGRNId,
          reasonCategory,
          reasonDescription: reasonDescription.trim(),
          warehouseId,
          items,
          autoApprove,
        },
        currentUser
      );

      if (ret.status === 'APPROVED') {
        toast.success(
          `Supplier Return ${ret.returnNumber} approved! Linked AP Debit Note ${ret.linkedDebitNoteNumber} created with GL Impact: Dr 2010 A/P, Cr 1100 Inventory.`
        );
      } else {
        toast.success(
          `Supplier Return ${ret.returnNumber} submitted for Purchasing Manager approval.`
        );
      }

      await loadReturns();
      setActiveTab('REGISTRY');
      setProductLines([]);
      setSelectedGRNId('');
      setSelectedPoNumber('');
      setSelectedSupplier(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create supplier return');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReturn = async (returnId: string) => {
    try {
      const updated = await supplierReturnService.approveReturn(returnId, currentUser);
      toast.success(
        `Supplier Return ${updated.returnNumber} approved! Linked AP Debit Note ${updated.linkedDebitNoteNumber} generated in Finance.`
      );
      await loadReturns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve return');
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.linkedDebitNoteNumber &&
          r.linkedDebitNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [returns, searchQuery, statusFilter]);

  const selectedGRN = availableGRNs.find((g) => g.id === selectedGRNId);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* HEADER: Clean, un-cluttered header without confusing tabs */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <PageHeader
        title={activeTab === 'CREATE' ? 'New Supplier Return' : 'Supplier Returns & Vendor RMA'}
        breadcrumbs={
          activeTab === 'CREATE'
            ? [
                { label: 'Purchasing', href: '/purchasing' },
                { label: 'Supplier Returns', onClick: () => setActiveTab('REGISTRY') },
                { label: 'New Return' },
              ]
            : [
                { label: 'Purchasing', href: '/purchasing' },
                { label: 'Supplier Returns' },
              ]
        }
        onBack={activeTab === 'CREATE' ? () => setActiveTab('REGISTRY') : () => navigate('/purchasing')}
        backLabel={activeTab === 'CREATE' ? 'Returns List' : 'Purchasing'}
        actions={
          activeTab === 'CREATE' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('REGISTRY')}
              className="text-xs font-semibold gap-1.5 text-slate-700 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Returns</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                if (!selectedGRNId && availableGRNs.length > 0) {
                  handleGRNSelect(availableGRNs[0].id);
                }
                setActiveTab('CREATE');
              }}
              className="text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Supplier Return</span>
            </Button>
          )
        }
      />

      {/* Integration Banner (BR-08) */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-950 uppercase tracking-wide">
              Automated AP Debit Note &amp; GL Ledger Linkage (BR-08)
            </h3>
            <p className="text-blue-800 leading-relaxed mt-0.5">
              Approving a Supplier Return automatically posts an Accounts Payable Debit Note in Finance, debits A/P (2010), credits Inventory (1100), and records unit serial numbers.
            </p>
          </div>
        </div>
        {!isPurchasingRole && (
          <Link to="/finance/ap/debit-notes" className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold bg-white text-blue-800 border-blue-300 hover:bg-blue-100 gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Finance Debit Notes</span>
            </Button>
          </Link>
        )}
      </div>

      {activeTab === 'CREATE' ? (
        /* ───────────────────────────────────────────────────────────────────────── */
        /* CREATE VIEW: Select GRN -> PO Auto Selected -> Products & Barcodes Listed */
        /* ───────────────────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* 1. SELECT GRN & AUTO-LINKED PO/SUPPLIER */}
          <Card className="shadow-2xs border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  1. Inward GRN Manifest &amp; Automatic PO Linkage
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Supplier Filter & GRN Dropdown Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier Filter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Supplier Filter
                    </label>
                    {selectedSupplier && (
                      <span className="text-[11px] text-primary font-mono font-semibold">
                        {currentSupplierGRNs.length} GRN{currentSupplierGRNs.length !== 1 ? 's' : ''} available
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedSupplierFilter}
                    onChange={(e) => handleSupplierFilterChange(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white shadow-2xs font-medium"
                  >
                    <option value="ALL">-- All Suppliers ({suppliers.length}) --</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.grnCount} GRN{sup.grnCount !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* GRN Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Select Goods Received Note (GRN) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedGRNId}
                    onChange={(e) => handleGRNSelect(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white font-mono shadow-2xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">-- Choose a GRN to return products from --</option>
                    {displayedGRNs.map((g) => {
                      const po = g.purchaseOrderNumber || (g as any).poNumber || 'N/A';
                      const damagedTotal = (g.items || []).reduce(
                        (acc, it) => acc + (it.damagedQuantity || 0),
                        0
                      );
                      return (
                        <option key={g.id} value={g.id}>
                          {g.grnNumber || g.id} — {g.supplierName} (PO: {po}) — {g.items?.length || 0} Products {damagedTotal > 0 ? `• [${damagedTotal} Damaged Units]` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Multiple GRNs from same supplier switcher (PM requirement) */}
              {selectedSupplier && currentSupplierGRNs.length > 1 && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                      <Layers className="h-4 w-4 text-amber-700 shrink-0" />
                      <span>{selectedSupplier.name} has {currentSupplierGRNs.length} GRNs on record:</span>
                    </div>
                    <span className="text-[11px] text-amber-800 font-medium">
                      Click to switch between this supplier's GRNs:
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentSupplierGRNs.map((g) => {
                      const isActive = g.id === selectedGRNId;
                      const po = g.purchaseOrderNumber || (g as any).poNumber || 'N/A';
                      const damagedCount = (g.items || []).reduce(
                        (acc, it) => acc + (it.damagedQuantity || 0),
                        0
                      );
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => handleGRNSelect(g.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition-all cursor-pointer',
                            isActive
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/40'
                              : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300'
                          )}
                        >
                          <span>{g.grnNumber || g.id}</span>
                          <span
                            className={cn(
                              'text-[10px] font-sans font-normal',
                              isActive ? 'text-amber-100' : 'text-slate-400'
                            )}
                          >
                            (PO: {po})
                          </span>
                          {damagedCount > 0 && (
                            <span
                              className={cn(
                                'text-[9px] px-1 py-0.2 rounded font-bold',
                                isActive ? 'bg-amber-800 text-white' : 'bg-rose-100 text-rose-700'
                              )}
                            >
                              {damagedCount} damaged
                            </span>
                          )}
                          {isActive && <Check className="h-3.5 w-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Auto-Linked Metadata Strip */}
              {selectedGRN && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
                      Linked GRN
                    </p>
                    <div className="text-xs font-mono font-bold text-primary mt-1 flex items-center gap-1.5">
                      {selectedGRN.grnNumber || selectedGRN.id}
                      <Badge variant="outline" className="text-[9px] bg-white text-emerald-700 border-emerald-300">
                        Intake Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <p className="text-[10.5px] uppercase font-bold text-emerald-800 tracking-wider">
                      Purchase Order #
                    </p>
                    <div className="text-xs font-mono font-bold text-emerald-950 mt-1 flex items-center gap-1.5">
                      {selectedPoNumber || 'Auto-Linked'}
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
                      Supplier
                    </p>
                    <p className="text-xs font-semibold text-slate-900 mt-1 truncate" title={selectedSupplier?.name}>
                      {selectedSupplier?.name || selectedGRN.supplierName}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
                      Quarantine Bay / Warehouse
                    </p>
                    <p className="text-xs font-mono font-semibold text-slate-800 mt-1">
                      {warehouseId} (Quarantine)
                    </p>
                  </div>
                </div>
              )}

              {/* Return Classification Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Return Reason Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value as SupplierReturnReason)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                  >
                    <option value="DEFECTIVE_DAMAGED">Defective / Damaged in Transit</option>
                    <option value="QUALITY_REJECTION">Failed Quality Inspection</option>
                    <option value="SPECIFICATION_MISMATCH">Specification Mismatch</option>
                    <option value="EXCESS_DELIVERY">Excess Delivery over PO</option>
                    <option value="INCORRECT_ITEM">Incorrect SKU Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Return Explanation Memo
                  </label>
                  <Input
                    value={reasonDescription}
                    onChange={(e) => setReasonDescription(e.target.value)}
                    placeholder="Documented reason for returning stock..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. PRODUCTS & UNIT BARCODE SELECTION (WITH DEDICATED BARCODE SEARCH) */}
          <Card className="shadow-2xs border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-primary" />
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    2. Select Products &amp; Unit Barcodes to Return
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Search product by barcode or click barcode chips to select which units are being sent back.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Dedicated Barcode Search Input */}
              {selectedGRNId && (
                <div className="space-y-2">
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      placeholder="Search product by unit barcode (e.g. DNS-MCB32A-0001-001) or serial # — Press Enter to select..."
                      value={barcodeSearchQuery}
                      onChange={(e) => setBarcodeSearchQuery(e.target.value)}
                      onKeyDown={handleBarcodeSearchKeyDown}
                      className="pl-9 pr-9 h-10 text-xs bg-white border-slate-300 focus:border-primary shadow-2xs font-mono"
                    />
                    {barcodeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBarcodeSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {barcodeSearchQuery && (
                    <div className="flex items-center justify-between text-[11.5px] px-1">
                      <span className="text-slate-600 font-medium">
                        Showing products matching barcode <strong className="font-mono text-primary font-bold">"{barcodeSearchQuery}"</strong> ({searchedProductLines.length} product{searchedProductLines.length !== 1 ? 's' : ''} found)
                      </span>
                      <button
                        type="button"
                        onClick={() => setBarcodeSearchQuery('')}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Clear search
                      </button>
                    </div>
                  )}

                  {otherGRNMatch && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-900">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>
                          Barcode <strong className="font-mono font-bold">{otherGRNMatch.barcode}</strong> ({otherGRNMatch.productName}) was found in <strong className="font-mono">{otherGRNMatch.grn.grnNumber}</strong> (PO: {otherGRNMatch.grn.purchaseOrderNumber || (otherGRNMatch.grn as any).poNumber}).
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          handleGRNSelect(otherGRNMatch.grn.id);
                          toast.success(`Switched to ${otherGRNMatch.grn.grnNumber} for barcode ${otherGRNMatch.barcode}`);
                        }}
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0"
                      >
                        Switch to {otherGRNMatch.grn.grnNumber}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!selectedGRNId ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <Boxes className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No GRN Selected</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Select a Goods Received Note above to inspect its incoming products and unit barcodes.
                  </p>
                </div>
              ) : searchedProductLines.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <Barcode className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">No products match barcode "{barcodeSearchQuery}".</p>
                  <p className="text-[11px] text-slate-400">
                    Try another barcode or serial number, or clear the search to view all products in this GRN.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBarcodeSearchQuery('')}
                    className="h-7 text-xs mt-2"
                  >
                    View All Products
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchedProductLines.map((prod) => {
                    const originalIndex = productLines.findIndex((p) => p.productId === prod.productId);
                    const isAnySelected = prod.selectedBarcodes.length > 0;
                    const lineTotal = prod.selectedBarcodes.length * prod.unitCost;

                    return (
                      <div
                        key={prod.productId}
                        className={cn(
                          'rounded-xl border transition-all p-4 space-y-3.5',
                          isAnySelected
                            ? 'border-primary/40 bg-primary/2 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                      >
                        {/* Product Header & Pricing Summary */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {prod.productCode}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 sm:text-sm">
                                {prod.productName}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                              <span>Received: <strong>{prod.receivedQuantity} units</strong></span>
                              <span>•</span>
                              <span>Unit Cost: <strong className="font-mono">{formatCurrency(prod.unitCost)}</strong></span>
                              {prod.damagedQuantity > 0 && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 font-bold gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {prod.damagedQuantity} Damaged in Intake
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Line Total & Selection Quick Actions */}
                          <div className="flex items-center gap-3 self-end lg:self-center">
                            <div className="text-right">
                              <span className="text-[10.5px] uppercase font-bold text-slate-400 block">
                                Line Credit Total
                              </span>
                              <span className="text-sm font-extrabold font-mono text-primary">
                                {formatCurrency(lineTotal)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                              {prod.damagedQuantity > 0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSelectDamagedOnly(originalIndex)}
                                  className="h-7 text-[11px] px-2 font-semibold text-rose-700 border-rose-200 bg-rose-50/50 hover:bg-rose-100"
                                >
                                  Select Damaged ({prod.damagedQuantity})
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectFirstUnit(originalIndex)}
                                className="h-7 text-[11px] px-2 text-slate-700"
                              >
                                +1 Unit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectAllBarcodes(originalIndex)}
                                className="h-7 text-[11px] px-2 text-slate-700"
                              >
                                Select All ({prod.allBarcodes.length})
                              </Button>
                              {isAnySelected && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleClearBarcodes(originalIndex)}
                                  className="h-7 text-[11px] px-2 text-slate-400 hover:text-slate-700"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Barcode Units Selector Studio */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Barcode className="h-3.5 w-3.5 text-slate-400" />
                              <span className="font-bold text-slate-700 text-[11.5px]">
                                Unit Barcodes
                              </span>
                              <Badge
                                variant={isAnySelected ? 'default' : 'outline'}
                                className={cn(
                                  'text-[10px] font-mono',
                                  isAnySelected ? 'bg-primary text-white' : 'text-slate-500'
                                )}
                              >
                                {prod.selectedBarcodes.length} of {prod.allBarcodes.length} Selected
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Click a barcode pill to toggle return inclusion
                            </span>
                          </div>

                          {/* Scrollable Barcode Chips Grid */}
                          <div className="max-h-48 overflow-y-auto p-2 bg-slate-50/80 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {prod.allBarcodes.map((unit) => {
                              const isSelected = prod.selectedBarcodes.includes(unit.barcode);
                              const matchesSearch =
                                Boolean(barcodeSearchQuery.trim()) &&
                                (unit.barcode.toLowerCase().includes(barcodeSearchQuery.trim().toLowerCase()) ||
                                  Boolean(unit.serialNumber?.toLowerCase().includes(barcodeSearchQuery.trim().toLowerCase())));

                              return (
                                <button
                                  key={unit.barcode}
                                  type="button"
                                  onClick={() => handleToggleBarcode(originalIndex, unit.barcode)}
                                  className={cn(
                                    'flex items-center justify-between p-2 rounded-md text-left transition-all border text-xs cursor-pointer',
                                    isSelected
                                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs'
                                      : matchesSearch
                                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold ring-1 ring-amber-400'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                  )}
                                >
                                  <div className="truncate pr-1">
                                    <span className="font-mono text-[11px] block truncate">
                                      {unit.barcode}
                                    </span>
                                    {unit.serialNumber && (
                                      <span className="font-mono text-[10px] text-slate-400 block truncate">
                                        SN: {unit.serialNumber}
                                      </span>
                                    )}
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1">
                                    {unit.isDamaged && (
                                      <span
                                        className="h-2 w-2 rounded-full bg-rose-500"
                                        title="Marked as damaged on intake"
                                      />
                                    )}
                                    {isSelected ? (
                                      <Check className="h-3.5 w-3.5 text-primary" />
                                    ) : (
                                      <div className="h-3.5 w-3.5 rounded border border-slate-300" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Defect Note for Line */}
                        {isAnySelected && (
                          <div className="pt-2">
                            <Input
                              value={prod.reason || ''}
                              onChange={(e) => handleUpdateLineReason(originalIndex, e.target.value)}
                              placeholder={`Specific defect reason for ${prod.productName}...`}
                              className="h-7 text-xs bg-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. RETURN SUMMARY & DOUBLE-ENTRY IMPACT */}
          <Card className="shadow-2xs border-slate-200 bg-slate-50/70">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Accounts Payable &amp; General Ledger Impact (BR-08):
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10.5px] bg-white text-slate-700">
                    Dr 2010 Accounts Payable (Reduces Liability)
                  </Badge>
                  <span className="text-slate-400">•</span>
                  <Badge variant="outline" className="font-mono text-[10.5px] bg-white text-slate-700">
                    Cr 1100 / 1030 Inventory (Removes Stock)
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    {activeReturnLines.length} Products • {totalReturnUnits} Units Selected
                  </span>
                  <span className="text-lg font-extrabold font-mono text-primary tabular-nums">
                    {formatCurrency(totalReturnAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. ACTION BUTTONS */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('REGISTRY')}
              disabled={submitting}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Returns List</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSubmitReturn(false)}
                disabled={submitting || activeReturnLines.length === 0}
                className="font-medium"
              >
                Submit for Approval
              </Button>
              {canApprove && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSubmitReturn(true)}
                  disabled={submitting || activeReturnLines.length === 0}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Approve &amp; Generate AP Debit Note</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────────────────── */
        /* REGISTRY TAB: Returns Registry List                                       */
        /* ───────────────────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Return #, Supplier, Debit Note #, or Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs h-9 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved (Debit Note Linked)</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Returns Table */}
          <Card className="shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading supplier returns...</div>
            ) : filteredReturns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RotateCcw className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">No supplier returns on record.</p>
                <p className="text-[11px] text-slate-400">
                  Click "New Supplier Return" above to record a vendor return merchandise authorization.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums min-w-[850px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Return #</th>
                      <th className="py-3 px-4 text-left font-semibold">Supplier</th>
                      <th className="py-3 px-3 text-left font-semibold">Linked PO / GRN</th>
                      <th className="py-3 px-3 text-left font-semibold">Returned Units</th>
                      <th className="py-3 px-3 text-left font-semibold">Reason Category</th>
                      <th className="py-3 px-3 text-right font-semibold">Total Credit</th>
                      <th className="py-3 px-3 text-center font-semibold">Status</th>
                      <th className="py-3 px-3 text-left font-semibold">Finance Debit Note</th>
                      <th className="py-3 px-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReturns.map((ret, retIdx) => (
                      <tr key={`${ret.id}-${retIdx}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {ret.returnNumber}
                          <span className="block text-[10.5px] font-normal text-slate-400 font-sans">
                            {formatDate(ret.returnDate)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{ret.supplierName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {ret.supplierCode || 'Vendor'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {ret.originalPoNumber && (
                            <span className="block text-slate-800 font-semibold">PO: {ret.originalPoNumber}</span>
                          )}
                          {ret.grnNumber && (
                            <Link
                              to={`/purchasing/grn/${ret.grnId || ret.grnNumber}`}
                              className="text-primary hover:underline block"
                            >
                              GRN: {ret.grnNumber}
                            </Link>
                          )}
                          {!ret.originalPoNumber && !ret.grnNumber && (
                            <span className="text-slate-400">Manual Return</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800">
                            {ret.items?.reduce((s, it) => s + (it.returnedQuantity || 0), 0) || 0} units
                          </span>
                          <span className="block text-[10.5px] text-slate-500 truncate max-w-[160px]">
                            {ret.items?.map((it) => it.productName).join(', ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {ret.reasonCategory.replace('_', ' ')}
                          </Badge>
                          <span
                            className="block text-[10.5px] text-slate-500 truncate max-w-[180px] mt-0.5"
                            title={ret.reasonDescription}
                          >
                            {ret.reasonDescription}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(ret.totalAmount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              ret.status === 'APPROVED'
                                ? 'success'
                                : ret.status === 'REJECTED'
                                ? 'destructive'
                                : 'warning'
                            }
                            className="text-[10px] px-2 py-0.5 font-bold"
                          >
                            {ret.status === 'APPROVED'
                              ? 'APPROVED'
                              : ret.status === 'PENDING_APPROVAL'
                              ? 'PENDING APPROVAL'
                              : 'REJECTED'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          {ret.linkedDebitNoteNumber ? (
                            isPurchasingRole ? (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                {ret.linkedDebitNoteNumber}
                              </span>
                            ) : (
                              <Link
                                to={`/finance/ap/debit-notes`}
                                className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              >
                                <span>{ret.linkedDebitNoteNumber}</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Pending approval</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {ret.status === 'PENDING_APPROVAL' && canApprove ? (
                            <ConfirmButton
                              size="sm"
                              confirmVariant="success"
                              confirmTitle="Approve Supplier Return"
                              confirmMessage={`Approve supplier return ${ret.returnNumber}? This will authorize returning goods to supplier and generate AP Debit Note.`}
                              confirmText="Approve Return"
                              onConfirm={() => handleApproveReturn(ret.id)}
                              className="h-7 px-2.5 text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg"
                            >
                              Approve
                            </ConfirmButton>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {ret.approvedByName ? `By ${ret.approvedByName.split(' ')[0]}` : '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default SupplierReturnsPage;
