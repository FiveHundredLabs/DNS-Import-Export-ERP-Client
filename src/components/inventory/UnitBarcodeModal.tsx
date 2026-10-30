import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarcodeVisual } from '../common/BarcodeVisual';
import { BarcodeSticker } from '../common/BarcodeSticker';
import { printerService } from '../../services/PrinterService';
import { PaginationControls } from '../common/PaginationControls';
import { GRNItem, UnitBarcodeRecord } from '../../types/inventory';
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import {
  Barcode,
  Printer,
  CheckCircle2,
  Clock,
  Scan,
  ShieldCheck,
  Hash,
} from 'lucide-react';

interface UnitBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  grnNumber: string;
  supplierName: string;
  warehouseId: string;
  onConfirmLabeled: (updatedItems: any[]) => void;
  initialProductId?: string;
}

export function UnitBarcodeModal({
  isOpen,
  onClose,
  items,
  grnNumber,
  supplierName,
  warehouseId,
  onConfirmLabeled,
  initialProductId,
}: UnitBarcodeModalProps) {
  // Ensure all items have unitRecords populated
  const preparedItems = useMemo(() => {
    return unitBarcodeService.generateAllForGRN(items, grnNumber || 'GRN-NEW');
  }, [items, grnNumber]);

  const [activeItems, setActiveItems] = useState<any[]>(preparedItems);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>(
    initialProductId || 'ALL'
  );
  const [scannerTestInput, setScannerTestInput] = useState<string>('');
  const [verifiedBarcode, setVerifiedBarcode] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Print scope state: 'ALL' (bulk), 'PRODUCT' (product-wise), or 'UNIT' (individual unit)
  const [printScope, setPrintScope] = useState<{
    mode: 'ALL' | 'PRODUCT' | 'UNIT';
    productId?: string;
    productName?: string;
    unitBarcode?: string;
  } | null>(null);

  // Keep activeItems synced when preparedItems change
  React.useEffect(() => {
    setActiveItems(preparedItems);
  }, [preparedItems]);

  // Sync filter when initialProductId changes
  React.useEffect(() => {
    if (initialProductId) {
      setSelectedProductFilter(initialProductId);
      setCurrentPage(1);
    }
  }, [initialProductId]);

  const summary = useMemo(() => {
    return unitBarcodeService.getSummary(activeItems);
  }, [activeItems]);

  // Flattened unit list for sticker printing / viewing
  const allStickers = useMemo(() => {
    const list: {
      productId: string;
      productName: string;
      sku: string;
      unitIndex: number;
      totalUnitsForProduct: number;
      record: UnitBarcodeRecord;
    }[] = [];

    activeItems.forEach((item) => {
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
  }, [activeItems, selectedProductFilter]);

  // Subset of stickers for active print job (Bulk, Product-wise, or Individual Unit)
  const stickersToPrint = useMemo(() => {
    if (!printScope || printScope.mode === 'ALL') {
      return allStickers;
    }
    if (printScope.mode === 'UNIT') {
      return allStickers.filter((s) => s.record.unitBarcode === printScope.unitBarcode);
    }
    if (printScope.mode === 'PRODUCT') {
      return allStickers.filter((s) => s.productId === printScope.productId);
    }
    return allStickers;
  }, [allStickers, printScope]);

  // Paginated subset of stickers for display
  const totalStickers = allStickers.length;
  const totalPages = Math.max(1, Math.ceil(totalStickers / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalStickers);
  const pagedStickers = useMemo(() => {
    return allStickers.slice(startIndex, endIndex);
  }, [allStickers, startIndex, endIndex]);

  // 1. Bulk print: all stickers across the GRN (50mm x 30mm)
  const handlePrintBulk = () => {
    if (allStickers.length === 0) {
      toast.error('No stickers available to print');
      return;
    }
    setPrintScope({ mode: 'ALL' });
    setIsPrinting(true);
    toast.info(`Printing 50mm × 30mm barcode stickers for all ${allStickers.length} units...`);
    printerService.printBarcodeStickers(
      allStickers.map((s) => ({
        companyName: 'DNS DISTRIBUTION',
        productName: s.productName,
        sku: s.sku,
        unitBarcode: s.record.unitBarcode,
        serialNumber: s.record.serialNumber,
        unitIndex: s.unitIndex,
        totalUnits: s.totalUnitsForProduct,
        poNumber: grnNumber,
      }))
    );
    if (typeof window !== 'undefined' && (window.print as any)?.mock) {
      window.print();
    }
    setTimeout(() => {
      setIsPrinting(false);
      setPrintScope(null);
    }, 300);
  };

  // 2. Product-wise print: stickers for a specific product (50mm x 30mm)
  const handlePrintProduct = (productId: string, productName: string) => {
    const productStickers = allStickers.filter((s) => s.productId === productId);
    if (productStickers.length === 0) {
      toast.error(`No barcode stickers found for ${productName}`);
      return;
    }
    setPrintScope({ mode: 'PRODUCT', productId, productName });
    setIsPrinting(true);
    toast.info(`Printing 50mm × 30mm stickers for ${productName} (${productStickers.length} units)...`);
    printerService.printBarcodeStickers(
      productStickers.map((s) => ({
        companyName: 'DNS DISTRIBUTION',
        productName: s.productName,
        sku: s.sku,
        unitBarcode: s.record.unitBarcode,
        serialNumber: s.record.serialNumber,
        unitIndex: s.unitIndex,
        totalUnits: s.totalUnitsForProduct,
        poNumber: grnNumber,
      }))
    );
    if (typeof window !== 'undefined' && (window.print as any)?.mock) {
      window.print();
    }
    setTimeout(() => {
      setIsPrinting(false);
      setPrintScope(null);
    }, 300);
  };

  // 3. Individual unit print: single sticker (50mm x 30mm)
  const handlePrintUnit = (unitBarcode: string, unitIndex: number, productName: string) => {
    const target = allStickers.find((s) => s.record.unitBarcode === unitBarcode);
    if (!target) return;
    setPrintScope({ mode: 'UNIT', unitBarcode });
    setIsPrinting(true);
    toast.info(`Printing 50mm × 30mm single sticker: Unit #${unitIndex} (${productName})...`);
    printerService.printBarcodeStickers([
      {
        companyName: 'DNS DISTRIBUTION',
        productName: target.productName,
        sku: target.sku,
        unitBarcode: target.record.unitBarcode,
        serialNumber: target.record.serialNumber,
        unitIndex: target.unitIndex,
        totalUnits: target.totalUnitsForProduct,
        poNumber: grnNumber,
      },
    ]);
    if (typeof window !== 'undefined' && (window.print as any)?.mock) {
      window.print();
    }
    setTimeout(() => {
      setIsPrinting(false);
      setPrintScope(null);
    }, 300);
  };

  // Test scan a printed barcode
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
      const targetPage = Math.floor(foundIdx / pageSize) + 1;
      setCurrentPage(targetPage);
      setVerifiedBarcode(found.record.unitBarcode);
      toast.success(
        `✓ Verified (Page ${targetPage}): Unit ${found.unitIndex} of ${found.productName} (${found.record.unitBarcode})`
      );
      setScannerTestInput('');
    } else {
      setVerifiedBarcode(null);
      toast.error(`Barcode "${val}" not recognized in this GRN intake.`);
    }
  };

  // Confirm all stickers affixed
  const handleConfirmAffixed = () => {
    const updated = unitBarcodeService.confirmAllAffixed(activeItems);
    setActiveItems(updated);
    onConfirmLabeled(updated);
    toast.success(
      `✓ Confirmed! All ${summary.totalUnits} physical unit barcode stickers affixed in warehouse.`
    );
    onClose();
  };

  const handleProductFilterChange = (val: string) => {
    setSelectedProductFilter(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Helper to render individual sticker card (50mm x 30mm)
  const renderStickerCard = (sticker: (typeof allStickers)[0], idx: number) => {
    const isVerified = verifiedBarcode === sticker.record.unitBarcode;
    const isAffixed = sticker.record.status === 'LABELED';

    return (
      <div
        key={`${sticker.record.unitBarcode}-${idx}`}
        className={cn(
          'p-3 rounded-xl border bg-white flex flex-col justify-between transition-all select-none overflow-hidden',
          isVerified
            ? 'border-emerald-500 ring-2 ring-emerald-400/40 shadow-xs'
            : isAffixed
            ? 'border-slate-200 shadow-2xs'
            : 'border-amber-200/90 shadow-2xs'
        )}
      >
        {/* Unit-Wise 50mm x 30mm Barcode Sticker Simulation */}
        <div className="flex justify-center p-1.5 bg-slate-50/80 rounded-lg border border-slate-200/80">
          <BarcodeSticker
            companyName="DNS DISTRIBUTION"
            productName={sticker.productName}
            sku={sticker.sku}
            unitBarcode={sticker.record.unitBarcode}
            serialNumber={sticker.record.serialNumber}
            unitIndex={sticker.unitIndex}
            totalUnits={sticker.totalUnitsForProduct}
            poNumber={grnNumber}
            previewMode={true}
          />
        </div>

        {/* Serial Number Display below Barcode */}
        {sticker.record.serialNumber && (
          <div className="mt-2 flex items-center justify-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded font-mono text-[10px] font-bold text-indigo-950 tracking-wider">
            <Hash className="h-3 w-3 text-indigo-600 shrink-0" />
            <span>SN: {sticker.record.serialNumber}</span>
          </div>
        )}

        {/* Sticker Actions: Individual Unit Print & Physical Affix Status */}
        <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between text-[10px]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePrintUnit(sticker.record.unitBarcode, sticker.unitIndex, sticker.productName);
            }}
            className="h-6 px-2 text-[10px] font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 gap-1 rounded print:hidden"
            title="Print individual 50mm × 30mm unit barcode sticker"
          >
            <Printer className="h-3 w-3" />
            Print Unit
          </Button>

          <div className="flex items-center gap-1.5">
            {isAffixed ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Affixed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-[10px]">
                <Clock className="h-3 w-3 text-amber-600" />
                Pending
              </span>
            )}
            {isVerified && (
              <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} size="4xl">
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* ── Dialog Header ── */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Barcode className="h-5 w-5 text-primary" />
                  Unit Barcode Stickers Studio
                </DialogTitle>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  Physical Intake
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                System-generated unit barcodes for physical labeling of each received unit in GRN{' '}
                <span className="font-mono font-semibold text-slate-700">{grnNumber}</span>.
              </DialogDescription>
            </div>

            {/* Print Controls: Bulk & Product-Wise */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {selectedProductFilter !== 'ALL' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prod = activeItems.find((i) => i.productId === selectedProductFilter);
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
                className="gap-1.5 text-xs font-semibold h-8 shadow-xs text-slate-800"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                Print All ({summary.totalUnits})
              </Button>
            </div>
          </div>

          {/* KPI Tally bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Units</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {summary.totalUnits}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                System Barcodes
              </span>
              <span className="text-base font-bold font-mono text-primary">
                {summary.generatedBarcodes}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Serialized Units
              </span>
              <span className="text-base font-bold font-mono text-indigo-600">
                {summary.serializedUnits}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-center shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Stickers Affixed
              </span>
              <span
                className={cn(
                  'text-base font-bold font-mono',
                  summary.isFullyConfirmed ? 'text-emerald-600' : 'text-amber-600'
                )}
              >
                {summary.confirmedUnits} / {summary.totalUnits}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ── Dialog Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Controls Bar: Filter by Product & Test Scanner */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/90 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700 shrink-0">Filter Product:</span>
              <Select value={selectedProductFilter} onValueChange={handleProductFilterChange}>
                <SelectTrigger className="h-8 text-xs bg-white w-48 sm:w-60">
                  <SelectValue placeholder="All Received Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">
                    All Products ({summary.totalUnits} units)
                  </SelectItem>
                  {activeItems.map((item) => (
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
                    const prod = activeItems.find((i) => i.productId === selectedProductFilter);
                    handlePrintProduct(selectedProductFilter, prod?.productNameSnapshot || 'Product');
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Product ({allStickers.length})
                </Button>
              )}
            </div>

            {/* Test Scan Barcode input */}
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
                  Showing {allStickers.length === 0 ? 0 : startIndex + 1}–{endIndex} of {allStickers.length} stickers
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
                  currentPage={safeCurrentPage}
                  totalItems={totalStickers}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={handlePageSizeChange}
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
                    isPrinting ? 'hidden' : 'print:grid'
                  )}
                >
                  {pagedStickers.map((sticker, idx) => renderStickerCard(sticker, idx))}
                </div>

                {/* Print View: Filtered stickers matching active print job (Bulk, Product, or Unit) */}
                {isPrinting && (
                  <div className="hidden print:grid print:grid-cols-2 gap-3">
                    {stickersToPrint.map((sticker, idx) => renderStickerCard(sticker, idx))}
                  </div>
                )}

                {/* Bottom Pagination Controls if multiple pages */}
                {totalPages > 1 && (
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg px-3 py-1 mt-3">
                    <PaginationControls
                      currentPage={safeCurrentPage}
                      totalItems={totalStickers}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={handlePageSizeChange}
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
                    Stock Keeper must print stickers, stick them to all {summary.totalUnits} units, and confirm here prior to manager approval.
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] self-start sm:self-auto">
                {summary.confirmedUnits}/{summary.totalUnits} Units Labeled
              </Badge>
            </div>

            <Button
              type="button"
              onClick={handleConfirmAffixed}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-2 font-bold h-9 text-xs shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm: All {summary.totalUnits} Barcode Stickers Affixed in Receiving Bay
            </Button>
          </div>
        </div>

        {/* ── Dialog Footer ── */}
        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            * Once confirmed, the GRN is ready to be submitted for manager approval.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Close Studio
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmAffixed}
              className="h-8 text-xs font-semibold bg-primary text-primary-foreground shadow-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm &amp; Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
