import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { BarcodeSticker } from '../../components/common/BarcodeSticker';
import { grnService } from '../../services/GRNService';
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { printerService } from '../../services/PrinterService';
import { GRN, GRNItem } from '../../types/inventory';
import { ArrowLeft, Barcode, Search, Copy, Printer, Check, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';

export function GRNUnitStickersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [grn, setGrn] = useState<GRN | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter across barcodes & serials
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination for high quantities (e.g. 2,277 units) to ensure smooth 60fps scrolling
  const [pageSize, setPageSize] = useState<number>(100);
  const [displayCount, setDisplayCount] = useState<number>(100);

  // Selected product filter (if multiple products in GRN)
  const productParam = searchParams.get('product');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await grnService.getGRNById(id);
        if (!isMounted) return;
        if (!data) {
          setError('GRN record not found');
        } else {
          setGrn(data);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Error loading GRN');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Ensure all GRN line items have complete unit records and barcodes
  const preparedItems: GRNItem[] = useMemo(() => {
    if (!grn?.items) return [];
    return grn.items.map((item) => {
      return unitBarcodeService.ensureUnitDetails(item, grn.grnNumber || grn.id || 'GRN-2025-001');
    });
  }, [grn]);

  // If GRN has only 1 product, that product is selected.
  // If GRN has >1 products and a specific product is provided in URL, match that product.
  // Otherwise, default to All Products view (e.g. 2,277 total consignment units).
  const selectedProduct = useMemo(() => {
    if (!preparedItems.length) return null;
    if (preparedItems.length === 1) return preparedItems[0];
    if (productParam && productParam !== 'ALL') {
      const match = preparedItems.find(
        (it) => it.productId === productParam || it.skuSnapshot === productParam
      );
      if (match) return match;
    }
    return null;
  }, [preparedItems, productParam]);

  const isAllProductsView = preparedItems.length > 1 && (!productParam || productParam === 'ALL');

  const totalConsignmentQuantity = useMemo(() => {
    return preparedItems.reduce(
      (sum, item) => sum + (item.receivedQuantity || item.unitRecords?.length || 0),
      0
    );
  }, [preparedItems]);

  const activeProductName = useMemo(() => {
    if (isAllProductsView) {
      if (grn?.supplierName) {
        return `${grn.supplierName} - All Received Products`;
      }
      return `All Consignment Inward Products (${preparedItems.length} Products)`;
    }
    return selectedProduct?.productNameSnapshot || selectedProduct?.productId || 'Product';
  }, [isAllProductsView, grn?.supplierName, preparedItems.length, selectedProduct]);

  const activeQuantity = useMemo(() => {
    if (isAllProductsView) {
      return totalConsignmentQuantity;
    }
    return selectedProduct?.receivedQuantity || selectedProduct?.unitRecords?.length || 0;
  }, [isAllProductsView, totalConsignmentQuantity, selectedProduct]);

  const activeSku = !isAllProductsView ? selectedProduct?.skuSnapshot : null;

  // Flattened stickers for the active product (or all products if selected)
  const currentStickers = useMemo(() => {
    if (isAllProductsView) {
      return preparedItems.flatMap((item) => {
        const qty = item.receivedQuantity || item.unitRecords?.length || 0;
        return (item.unitRecords || []).map((rec, idx) => ({
          productId: item.productId,
          productName: item.productNameSnapshot || item.productId,
          sku: item.skuSnapshot || 'ITEM',
          unitIndex: rec.unitIndex || idx + 1,
          totalUnitsForProduct: qty,
          unitBarcode: rec.unitBarcode,
          serialNumber: rec.serialNumber,
          poNumber: grn?.purchaseOrderNumber || grn?.purchaseOrderId || grn?.grnNumber,
        }));
      });
    }

    if (!selectedProduct) return [];
    const qty = selectedProduct.receivedQuantity || selectedProduct.unitRecords?.length || 0;
    return (selectedProduct.unitRecords || []).map((rec, idx) => ({
      productId: selectedProduct.productId,
      productName: selectedProduct.productNameSnapshot || selectedProduct.productId,
      sku: selectedProduct.skuSnapshot || 'ITEM',
      unitIndex: rec.unitIndex || idx + 1,
      totalUnitsForProduct: qty,
      unitBarcode: rec.unitBarcode,
      serialNumber: rec.serialNumber,
      poNumber: grn?.purchaseOrderNumber || grn?.purchaseOrderId || grn?.grnNumber,
    }));
  }, [selectedProduct, preparedItems, isAllProductsView, grn]);

  // Filtered stickers based on user search query
  const filteredStickers = useMemo(() => {
    if (!searchQuery.trim()) return currentStickers;
    const q = searchQuery.toLowerCase().trim();
    return currentStickers.filter((s) => {
      return (
        String(s.unitIndex).includes(q) ||
        s.unitBarcode.toLowerCase().includes(q) ||
        (s.serialNumber && s.serialNumber.toLowerCase().includes(q)) ||
        s.productName.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q)
      );
    });
  }, [currentStickers, searchQuery]);

  // Visible stickers according to display count (prevents DOM freezing with 2,277+ SVGs)
  const visibleStickers = useMemo(() => {
    if (pageSize === -1) return filteredStickers;
    return filteredStickers.slice(0, displayCount);
  }, [filteredStickers, displayCount, pageSize]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied barcode: ${code}`);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleCopyAllBarcodes = () => {
    const list = filteredStickers.map((s) => s.unitBarcode).join('\n');
    navigator.clipboard.writeText(list);
    toast.success(`Copied ${filteredStickers.length} barcodes to clipboard!`);
  };

  const handlePrintVisibleStickers = () => {
    if (filteredStickers.length === 0) return;
    toast.info(`Preparing thermal print job for ${filteredStickers.length} stickers...`);
    printerService.printBarcodeStickers(
      filteredStickers.map((s) => ({
        companyName: 'DNS Import and Export (Pvt) Ltd',
        productName: s.productName,
        sku: s.sku,
        unitBarcode: s.unitBarcode,
        serialNumber: s.serialNumber,
        unitIndex: s.unitIndex,
        totalUnits: s.totalUnitsForProduct,
        poNumber: s.poNumber,
      }))
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 p-4 animate-pulse">
        <div className="h-9 w-24 bg-slate-200 rounded-md" />
        <div className="h-8 w-64 bg-slate-200 rounded-md mt-4" />
        <div className="h-5 w-32 bg-slate-200 rounded-md" />
        <div className="h-96 w-full bg-slate-100 rounded-xl mt-4" />
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 font-medium text-slate-700 hover:text-slate-900 border-slate-300 bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-sm font-semibold text-rose-600">{error || 'GRN not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-6.5rem)] md:h-[calc(100vh-5.5rem)] pb-2">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP HEADER: ONLY A BACK BUTTON AS REQUESTED                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 font-medium text-slate-700 hover:text-slate-900 border-slate-300 bg-white shadow-2xs hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PRODUCT NAME & QUANTITY (Directly below Back Button)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs mb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              <span>{activeProductName}</span>
              {selectedProduct?.skuSnapshot && !isAllProductsView && (
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  SKU: {selectedProduct.skuSnapshot}
                </span>
              )}
            </h1>

            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-600">Quantity:</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-sm px-2.5 py-0.5 font-bold">
                {activeQuantity.toLocaleString()} Units
              </Badge>

              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-mono">
                GRN: {grn.grnNumber || grn.id}
              </span>
              {grn.supplierName && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    Supplier: {grn.supplierName}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons (Print & Copy All) */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAllBarcodes}
              className="gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-2xs"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Copy Barcodes</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrintVisibleStickers}
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Stickers ({filteredStickers.length})</span>
            </Button>
          </div>
        </div>

        {/* Multi-product tabs (if GRN has more than 1 product) */}
        {preparedItems.length > 1 && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium text-2xs uppercase tracking-wider shrink-0 mr-1">
              Filter by Product:
            </span>
            <button
              type="button"
              onClick={() => setSearchParams({ product: 'ALL' })}
              className={cn(
                'px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border',
                isAllProductsView
                  ? 'bg-primary text-white border-primary shadow-2xs font-semibold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              )}
            >
              <Layers className="h-3 w-3" />
              <span>All Products ({totalConsignmentQuantity})</span>
            </button>
            {preparedItems.map((item) => {
              const isSelected =
                !isAllProductsView &&
                (selectedProduct?.productId === item.productId ||
                  selectedProduct?.skuSnapshot === item.skuSnapshot);
              const qty = item.receivedQuantity || item.unitRecords?.length || 0;
              return (
                <button
                  key={item.productId || item.skuSnapshot}
                  type="button"
                  onClick={() => setSearchParams({ product: item.productId })}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border',
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-2xs font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  )}
                >
                  <span className="truncate max-w-[180px]">
                    {item.productNameSnapshot || item.productId}
                  </span>
                  <span
                    className={cn(
                      'text-2xs font-mono px-1.5 py-0.2 rounded',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {qty}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FILTER & STATS BAR                                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs mb-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={`Search across ${currentStickers.length} barcodes/serials...`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayCount(pageSize === -1 ? filteredStickers.length : pageSize);
            }}
            className="pl-8 h-8 text-xs rounded-lg bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 justify-between sm:justify-end">
          <span className="font-mono text-2xs text-slate-500">
            Showing {visibleStickers.length} of {filteredStickers.length} stickers
            {filteredStickers.length !== currentStickers.length && ` (filtered from ${currentStickers.length})`}
          </span>

          <select
            value={pageSize}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPageSize(val);
              setDisplayCount(val === -1 ? filteredStickers.length : val);
            }}
            className="h-7 text-2xs px-2 rounded-md border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value={50}>50 per batch</option>
            <option value={100}>100 per batch</option>
            <option value={250}>250 per batch</option>
            <option value={-1}>All {filteredStickers.length} stickers</option>
          </select>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VERTICALLY SCROLLABLE BARCODE / UNIT STICKERS LAYOUT          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-100/70 rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-inner">
        {visibleStickers.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {visibleStickers.map((sticker) => {
                const isCopied = copiedCode === sticker.unitBarcode;
                return (
                  <div
                    key={`${sticker.productId}-${sticker.unitIndex}-${sticker.unitBarcode}`}
                    className="flex flex-col items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow relative group"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '240px 150px' }}
                  >
                    {/* Unit header tag with 1-click copy */}
                    <div className="w-full flex items-center justify-between text-2xs text-slate-500 font-mono mb-1.5 px-1">
                      <span className="font-bold text-slate-700">
                        Unit #{sticker.unitIndex}
                        {sticker.totalUnitsForProduct ? `/${sticker.totalUnitsForProduct}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(sticker.unitBarcode)}
                        className="text-slate-400 hover:text-primary transition-colors p-0.5 rounded cursor-pointer"
                        title="Copy Barcode"
                      >
                        {isCopied ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    {/* Standard 50mm x 30mm Code-128 Physical Barcode Sticker */}
                    <BarcodeSticker
                      companyName="DNS Import and Export (Pvt) Ltd"
                      productName={sticker.productName}
                      sku={sticker.sku}
                      unitBarcode={sticker.unitBarcode}
                      serialNumber={sticker.serialNumber}
                      unitIndex={sticker.unitIndex}
                      totalUnits={sticker.totalUnitsForProduct}
                      poNumber={sticker.poNumber}
                      previewMode={true}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>

            {/* Load More Button for large quantities (e.g. 2,277 stickers) */}
            {visibleStickers.length < filteredStickers.length && (
              <div className="py-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisplayCount((prev) => Math.min(prev + (pageSize > 0 ? pageSize : 100), filteredStickers.length))}
                  className="bg-white hover:bg-slate-50 border-slate-300 text-xs font-semibold shadow-2xs gap-2"
                >
                  <Barcode className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Load Next {Math.min(pageSize > 0 ? pageSize : 100, filteredStickers.length - visibleStickers.length)} Stickers
                    ({visibleStickers.length} of {filteredStickers.length} shown)
                  </span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 text-center space-y-2">
            <Barcode className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No Unit Stickers Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No stickers match "${searchQuery}". Try clearing your search.`
                : 'No unit barcode stickers have been generated for this product.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

