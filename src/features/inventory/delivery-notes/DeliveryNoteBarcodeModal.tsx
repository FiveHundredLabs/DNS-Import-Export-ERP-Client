import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { BarcodeVisual } from '../../../components/common/BarcodeVisual';
import { PaginationControls } from '../../../components/common/PaginationControls';
import { toast } from 'sonner';
import { cn } from '../../../utils/cn';
import {
  Barcode,
  Printer,
  CheckCircle2,
  Scan,
  Copy,
  Boxes,
  Truck,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export interface DeliveryNoteBarcodeItem {
  productId: string;
  productName: string;
  sku: string;
  uom?: string;
  unitBarcodes: string[];
}

export interface DeliveryNoteBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNoteNumber: string;
  invoiceNumber: string;
  customerName: string;
  items: DeliveryNoteBarcodeItem[];
  initialProductId?: string; // 'ALL' or specific productId
  initialSingleBarcode?: string; // specific barcode for one-by-one print
}

export const DeliveryNoteBarcodeModal: React.FC<DeliveryNoteBarcodeModalProps> = ({
  isOpen,
  onClose,
  deliveryNoteNumber,
  invoiceNumber,
  customerName,
  items,
  initialProductId = 'ALL',
  initialSingleBarcode,
}) => {
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>(initialProductId);
  const [singleBarcodeFilter, setSingleBarcodeFilter] = useState<string | null>(
    initialSingleBarcode || null
  );
  const [scannerTestInput, setScannerTestInput] = useState<string>('');
  const [verifiedBarcode, setVerifiedBarcode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Update filters when props change
  React.useEffect(() => {
    if (initialSingleBarcode) {
      setSingleBarcodeFilter(initialSingleBarcode);
      setSelectedProductFilter('ALL');
    } else if (initialProductId) {
      setSelectedProductFilter(initialProductId);
      setSingleBarcodeFilter(null);
    }
    setCurrentPage(1);
  }, [initialProductId, initialSingleBarcode, isOpen]);

  // Flattened sticker records
  const allStickers = useMemo(() => {
    const list: {
      productId: string;
      productName: string;
      sku: string;
      uom: string;
      unitIndex: number;
      totalUnitsForProduct: number;
      barcode: string;
    }[] = [];

    items.forEach((item) => {
      // Filter by product if not ALL
      if (selectedProductFilter !== 'ALL' && item.productId !== selectedProductFilter) {
        return;
      }

      const barcodes = item.unitBarcodes || [];
      barcodes.forEach((barcode, idx) => {
        // Filter by single barcode if specified
        if (singleBarcodeFilter && barcode !== singleBarcodeFilter) {
          return;
        }

        list.push({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          uom: item.uom || 'PCS',
          unitIndex: idx + 1,
          totalUnitsForProduct: barcodes.length,
          barcode,
        });
      });
    });

    return list;
  }, [items, selectedProductFilter, singleBarcodeFilter]);

  // Pagination slice
  const totalStickers = allStickers.length;
  const totalPages = Math.max(1, Math.ceil(totalStickers / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalStickers);
  const pagedStickers = useMemo(() => {
    return allStickers.slice(startIndex, endIndex);
  }, [allStickers, startIndex, endIndex]);

  // Handle browser printing
  const triggerPrint = (jobDescription: string) => {
    if (allStickers.length === 0) {
      toast.error('No barcode stickers to print');
      return;
    }
    toast.info(`Preparing print job: ${jobDescription}...`);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  // Bulk print all
  const handleBulkPrintAll = () => {
    setSelectedProductFilter('ALL');
    setSingleBarcodeFilter(null);
    triggerPrint(`All ${items.reduce((s, i) => s + i.unitBarcodes.length, 0)} Delivery Barcode Stickers`);
  };

  // Item-wise print
  const handlePrintCurrentItem = (productId: string) => {
    setSelectedProductFilter(productId);
    setSingleBarcodeFilter(null);
    setCurrentPage(1);
    const item = items.find((i) => i.productId === productId);
    triggerPrint(`${item?.productName || 'Item'} Barcode Stickers (${item?.unitBarcodes.length || 0} units)`);
  };

  // One-by-one print
  const handlePrintSingleBarcode = (barcode: string) => {
    setSingleBarcodeFilter(barcode);
    triggerPrint(`Single Unit Barcode Sticker: ${barcode}`);
  };

  // Reset to all
  const handleResetFilters = () => {
    setSelectedProductFilter('ALL');
    setSingleBarcodeFilter(null);
    setCurrentPage(1);
  };

  // Copy barcode to clipboard
  const handleCopyBarcode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied barcode: ${code}`);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  // Test scan a printed barcode
  const handleTestScan = (val?: string) => {
    const input = (val || scannerTestInput).trim();
    if (!input) return;
    setScannerTestInput(input);

    const foundIdx = allStickers.findIndex(
      (s) => s.barcode.toLowerCase() === input.toLowerCase()
    );

    if (foundIdx !== -1) {
      const found = allStickers[foundIdx];
      const targetPage = Math.floor(foundIdx / pageSize) + 1;
      setCurrentPage(targetPage);
      setVerifiedBarcode(found.barcode);
      toast.success(
        `✓ Verified (Page ${targetPage}): Unit ${found.unitIndex}/${found.totalUnitsForProduct} for ${found.productName} (${found.barcode})`
      );
      setScannerTestInput('');
    } else {
      setVerifiedBarcode(null);
      toast.error(`Barcode "${input}" not found in this delivery note.`);
    }
  };

  const totalAllocatedCount = items.reduce((s, i) => s + i.unitBarcodes.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-slate-200 shadow-xl">
        {/* Printable Styles for standard label thermal rolls & A4 sheets */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #delivery-note-printable-stickers,
            #delivery-note-printable-stickers * {
              visibility: visible;
            }
            #delivery-note-printable-stickers {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              padding: 10mm;
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 8mm !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
        `}</style>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Barcode className="h-5 w-5 text-primary" />
              Delivery Note Barcode Stickers (Code-128)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Code-128 physical unit barcode stickers generated for goods delivery. Affix to physical cartons before dispatch.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              onClick={handleBulkPrintAll}
              className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Bulk Print All ({totalAllocatedCount})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Context metadata banner */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-slate-700">
              Ref: <strong className="text-slate-900">{deliveryNoteNumber}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700">
              Invoice: <strong className="text-slate-900 font-mono">{invoiceNumber}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700">
              Customer: <strong className="text-slate-900">{customerName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-mono gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {totalAllocatedCount} Barcodes Ready
            </Badge>
          </div>
        </div>

        {/* Filter & Laser Test Bar */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
              Filter by Item:
            </span>
            <select
              value={singleBarcodeFilter ? 'SINGLE' : selectedProductFilter}
              onChange={(e) => {
                if (e.target.value === 'SINGLE') return;
                setSelectedProductFilter(e.target.value);
                setSingleBarcodeFilter(null);
                setCurrentPage(1);
              }}
              className="h-8 text-xs rounded-md border border-slate-200 bg-white px-2 py-0 font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Items ({totalAllocatedCount} Barcodes)</option>
              {items.map((it) => (
                <option key={it.productId} value={it.productId}>
                  {it.productName} ({it.unitBarcodes.length} units)
                </option>
              ))}
              {singleBarcodeFilter && (
                <option value="SINGLE">Single Unit: {singleBarcodeFilter}</option>
              )}
            </select>

            {singleBarcodeFilter && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetFilters}
                className="h-7 text-xs text-slate-500 hover:text-slate-900 gap-1 px-2"
              >
                <X className="h-3 w-3" />
                Clear Single Filter
              </Button>
            )}

            {selectedProductFilter !== 'ALL' && !singleBarcodeFilter && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrintCurrentItem(selectedProductFilter)}
                className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
              >
                <Printer className="h-3 w-3" />
                Print Line Barcodes ({allStickers.length})
              </Button>
            )}
          </div>

          {/* Laser Scanner Verification Station */}
          <div className="flex items-center gap-1.5 shrink-0 pl-0 md:pl-2 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0">
            <Scan className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <Input
              value={scannerTestInput}
              onChange={(e) => setScannerTestInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTestScan();
                }
              }}
              placeholder="Laser scan test..."
              className="h-8 text-xs font-mono bg-white w-40 sm:w-48"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTestScan()}
              className="h-8 text-xs px-2 shadow-2xs font-semibold"
            >
              Verify
            </Button>
          </div>
        </div>

        {/* Stickers Grid */}
        <div className="p-4 sm:p-5">
          {allStickers.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              <Barcode className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No barcode stickers match the active filter.
            </div>
          ) : (
            <div
              id="delivery-note-printable-stickers"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
            >
              {pagedStickers.map((sticker) => {
                const isVerified = verifiedBarcode === sticker.barcode;

                return (
                  <div
                    key={sticker.barcode}
                    className={cn(
                      'p-3.5 rounded-xl border bg-white shadow-2xs flex flex-col justify-between transition-all relative group',
                      isVerified
                        ? 'border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    )}
                  >
                    {/* Sticker Top Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
                          DNS DISPATCH STICKER
                        </span>
                        <h5
                          className="font-bold text-xs text-slate-900 truncate leading-snug"
                          title={sticker.productName}
                        >
                          {sticker.productName}
                        </h5>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10.5px] font-mono text-slate-600">
                            {sticker.sku}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-slate-50 text-slate-700 shrink-0 px-1.5 py-0"
                      >
                        Unit {sticker.unitIndex}/{sticker.totalUnitsForProduct}
                      </Badge>
                    </div>

                    {/* SVG Code-128 Barcode Visual */}
                    <div className="py-2.5 my-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-lg border border-slate-100/80">
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
                          {customerName}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          DN: {deliveryNoteNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 no-print">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyBarcode(sticker.barcode)}
                          title="Copy barcode"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-800"
                        >
                          {copiedCode === sticker.barcode ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintSingleBarcode(sticker.barcode)}
                          title="Print this single sticker"
                          className="h-6 text-[10.5px] px-1.5 gap-1 text-primary hover:bg-primary/5 font-semibold"
                        >
                          <Printer className="h-3 w-3" />
                          Print One
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalStickers > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 no-print">
              <PaginationControls
                currentPage={safeCurrentPage}
                totalItems={totalStickers}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[12, 24, 48, 96]}
                label="unit barcode stickers"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
