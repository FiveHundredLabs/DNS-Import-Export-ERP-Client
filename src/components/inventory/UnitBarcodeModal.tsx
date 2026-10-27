import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarcodeVisual } from '../common/BarcodeVisual';
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
}

export function UnitBarcodeModal({
  isOpen,
  onClose,
  items,
  grnNumber,
  supplierName,
  warehouseId,
  onConfirmLabeled,
}: UnitBarcodeModalProps) {
  // Ensure all items have unitRecords populated
  const preparedItems = useMemo(() => {
    return unitBarcodeService.generateAllForGRN(items, grnNumber || 'GRN-NEW');
  }, [items, grnNumber]);

  const [activeItems, setActiveItems] = useState<any[]>(preparedItems);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [scannerTestInput, setScannerTestInput] = useState<string>('');
  const [verifiedBarcode, setVerifiedBarcode] = useState<string | null>(null);

  // Keep activeItems synced when preparedItems change
  React.useEffect(() => {
    setActiveItems(preparedItems);
  }, [preparedItems]);

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

  // Handle printing stickers via window.print()
  const handlePrintStickers = () => {
    if (allStickers.length === 0) {
      toast.error('No stickers to print');
      return;
    }
    toast.info(`Preparing print job for ${allStickers.length} barcode stickers...`);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Test scan a printed barcode
  const handleTestScan = (codeToTest?: string) => {
    const val = (codeToTest || scannerTestInput).trim();
    if (!val) return;
    setScannerTestInput(val);

    const found = allStickers.find(
      (s) =>
        s.record.unitBarcode.toLowerCase() === val.toLowerCase() ||
        (s.record.serialNumber && s.record.serialNumber.toLowerCase() === val.toLowerCase())
    );

    if (found) {
      setVerifiedBarcode(found.record.unitBarcode);
      toast.success(
        `✓ Verified: Unit ${found.unitIndex} of ${found.productName} (${found.record.unitBarcode})`
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

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintStickers}
                className="gap-1.5 text-xs font-semibold h-8 shadow-xs"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                Print Stickers ({allStickers.length})
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
              <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Unit Barcode Stickers Preview ({allStickers.length} stickers)
              </span>
              <span className="text-[11px] text-slate-400">
                Standard Thermal / Adhesive Label (50mm × 30mm)
              </span>
            </div>

            {allStickers.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No unit barcode stickers found for the selected filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2">
                {allStickers.map((sticker, idx) => {
                  const isVerified = verifiedBarcode === sticker.record.unitBarcode;
                  const isAffixed = sticker.record.status === 'LABELED';

                  return (
                    <div
                      key={idx}
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
                            {sticker.sku}
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
                          {grnNumber} · {warehouseId}
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
                })}
              </div>
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
