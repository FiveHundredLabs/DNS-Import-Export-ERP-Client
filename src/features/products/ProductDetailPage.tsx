import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Product } from '../../types/product';
import { productService } from '../../services/ProductService';
import { batchInventoryService } from '../../services/BatchInventoryService';
import { priceHistoryService } from '../../services/PriceHistoryService';
import { StockBatch, ProductSellingPriceHistory } from '../../types/inventory';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowLeft,
  Package,
  Barcode,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Percent,
  Edit3,
  CheckCircle2,
  Save,
  Info,
  Boxes,
  History,
  Layers,
  Tag,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { toast } from 'sonner';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [priceHistory, setPriceHistory] = useState<ProductSellingPriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editL1, setEditL1] = useState('');
  const [editL2, setEditL2] = useState('');
  const [editL3, setEditL3] = useState('');
  const [isSavingLevels, setIsSavingLevels] = useState(false);
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);


  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await productService.getProduct(id);
        setProduct(data);
        if (data) {
          setBatches(batchInventoryService.getBatchesByProductId(data.id));
          setPriceHistory(priceHistoryService.getHistoryByProductId(data.id));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const priceRange = useMemo(() => {
    return product ? batchInventoryService.getPriceRange(product.id) : null;
  }, [product, batches]);


  if (loading) return <TableLoadingSkeleton />;
  if (!product) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Product not found.</h2>
        <Link to="/products" className="text-primary text-xs underline mt-2 block">
          Return to Product Master
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500 uppercase">SKU: {product.sku}</span>
            <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {product.status}
            </Badge>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Commercial & Pricing</TabsTrigger>
          <TabsTrigger value="batches" className="gap-1.5">
            <Boxes className="h-3.5 w-3.5" />
            <span>Stock Batches ({batches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="price-history" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            <span>Price History ({priceHistory.length})</span>
          </TabsTrigger>
          <TabsTrigger value="inventory">Location Stock</TabsTrigger>
          <TabsTrigger value="warranty">Warranty Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Specification & Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-900">{product.categoryName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Unit of Measure:</span>
                  <span className="font-semibold text-slate-900">{product.uomCode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Barcode / EAN:</span>
                  <span className="font-mono font-semibold text-slate-900">{product.barcode}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Promotional Item:</span>
                  <Badge variant={product.isPromotional ? 'warning' : 'outline'}>
                    {product.isPromotional ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Description:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                    {product.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Stock Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-primary-light/50 rounded-lg border border-primary-border/40">
                    <span className="text-primary block text-xs uppercase font-semibold">Available for Sale</span>
                    <span className="text-xl font-semibold tabular-nums text-indigo-900">{product.stockOnHand} {product.uomCode}</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                    <span className="text-rose-600 block text-xs uppercase font-semibold">Damaged / Non-Sale</span>
                    <span className="text-xl font-semibold tabular-nums text-rose-900">{product.damagedStock} {product.uomCode}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Commercial Pricing Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-xs uppercase">Cost Price</span>
                    <span className="text-base font-semibold tabular-nums text-slate-900">{formatCurrency(product.pricing.costPrice)}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-emerald-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-700 block text-xs uppercase font-semibold">
                        {priceRange?.hasMultiplePrices ? 'Active Price Range' : 'Current Selling Price'}
                      </span>
                      {priceRange && priceRange.activeBatchCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-white text-emerald-800 border-emerald-300 font-semibold"
                        >
                          {priceRange.activeBatchCount} Active {priceRange.activeBatchCount === 1 ? 'Batch' : 'Batches'}
                        </Badge>
                      )}
                    </div>
                    <span className="text-base font-semibold tabular-nums text-emerald-900 block mt-1">
                      {priceRange?.hasMultiplePrices
                        ? `${formatCurrency(priceRange.minPrice)} – ${formatCurrency(priceRange.maxPrice)}`
                        : formatCurrency(product.pricing.currentSellingPrice)}
                    </span>
                    {priceRange?.hasMultiplePrices && (
                      <span className="text-[10px] text-emerald-700 block mt-0.5">
                        Multiple active batch prices in stock
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-xs uppercase">Minimum Floor Price</span>
                    <span className="text-base font-semibold tabular-nums text-slate-800">{formatCurrency(product.pricing.minimumSellingPrice)}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-slate-500 block text-xs uppercase">Max Rep Discount</span>
                    <span className="text-base font-semibold tabular-nums text-slate-800">{product.pricing.maxDiscountPercentage}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Discount Levels Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    Structured Discount Levels (Up to 3 Levels)
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls allowed discounts dynamically by customer loyalty level (New = Level 1, Premium = Levels 1 & 2, Platinum = All 3).
                  </p>
                </div>
                {(role === 'DIRECTOR' || role === 'MANAGER') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const levels = product.discountLevels || product.pricing?.discountLevels || [];
                      setEditL1(levels[0] !== undefined ? String(levels[0]) : '');
                      setEditL2(levels[1] !== undefined ? String(levels[1]) : '');
                      setEditL3(levels[2] !== undefined ? String(levels[2]) : '');
                      setIsDiscountModalOpen(true);
                    }}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                    Configure Levels
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {(() => {
                  const levels = product.discountLevels || product.pricing?.discountLevels || [];
                  if (levels.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-900 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold">0 Discount Levels Configured</div>
                          <p className="text-amber-800 mt-0.5 text-[11px]">
                            No discount is available for this product directly. Sales representatives must request Management Approval for any discount applied to quotations or orders.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {levels.map((lvl, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">
                              Discount Level {idx + 1}
                            </span>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              Tier {idx + 1}
                            </Badge>
                          </div>
                          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                            {lvl}%
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight pt-0.5">
                            {idx === 0
                              ? 'Accessible by: New, Premium, Platinum'
                              : idx === 1
                              ? 'Accessible by: Premium, Platinum'
                              : 'Accessible by: Platinum Only'}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Stock Batches */}
        <TabsContent value="batches">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  Inbound Stock Batches & Traceability
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distinct shipment lots with individual landed costs, available quantities, and active selling prices.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {batches.length} Lot(s) Tracked
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {batches.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No stock batches recorded yet for this product. Batches are automatically registered upon GRN Vendor Bill Costing.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs tabular-nums">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Batch / Lot #</th>
                        <th className="py-2.5 px-3 text-left">Warehouse</th>
                        <th className="py-2.5 px-3 text-left">Received Date</th>
                        <th className="py-2.5 px-3 text-center">Initial Qty</th>
                        <th className="py-2.5 px-3 text-center">Available Qty</th>
                        <th className="py-2.5 px-3 text-right">Landed Cost</th>
                        <th className="py-2.5 px-4 text-right">Selling Price</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {batches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            <div>{b.batchNumber}</div>
                            {b.grnNumber && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                GRN: {b.grnNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <span className="font-semibold">{b.warehouseId}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {formatDate(b.receivedDate)}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600">
                            {b.initialQuantity} {product.uomCode}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900">
                            {b.availableQuantity} {product.uomCode}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {formatCurrency(b.unitCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                            {formatCurrency(b.sellingPrice)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge
                              variant={b.status === 'ACTIVE' ? 'success' : 'secondary'}
                              className="text-[10px] uppercase font-mono"
                            >
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Price History Timeline */}
        <TabsContent value="price-history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Historical Selling Price Events
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Traceable audit timeline of all commercial pricing strategy actions and adjustments.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {priceHistory.length} Event(s)
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {priceHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No price history events recorded yet for this product.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {priceHistory.map((h) => {
                    const diff = h.newPrice - h.oldPrice;
                    const diffPct = h.oldPrice > 0 ? (diff / h.oldPrice) * 100 : 0;

                    return (
                      <div key={h.id} className="p-4 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={h.strategy === 'STANDARDIZE_UNIFORM' ? 'purple' : 'info'}
                              className="text-[10px]"
                            >
                              {h.strategy === 'STANDARDIZE_UNIFORM'
                                ? 'Strategy 2: Standardized'
                                : 'Strategy 1: Preserve Batch'}
                            </Badge>
                            {h.batchNumber && (
                              <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10.5px]">
                                {h.batchNumber}
                              </span>
                            )}
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(h.changedAt)}
                            </span>
                          </div>

                          <p className="text-slate-800 font-medium text-xs pt-0.5">
                            {h.changeReason}
                          </p>

                          <div className="text-[11px] text-slate-500">
                            Recorded by: <strong className="text-slate-700">{h.changedBy}</strong>
                            {h.affectedBatchCount && h.affectedBatchCount > 1 && (
                              <span> • Applied to {h.affectedBatchCount} batches</span>
                            )}
                          </div>
                        </div>

                        {/* Price Change Amount */}
                        <div className="text-right sm:self-center tabular-nums bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded border sm:border-0 border-slate-100">
                          <div className="flex items-center justify-end gap-2">
                            <span className="line-through text-slate-400 font-mono">
                              {formatCurrency(h.oldPrice)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatCurrency(h.newPrice)}
                            </span>
                          </div>
                          <div className="text-[10.5px] mt-0.5 font-semibold">
                            <span className={diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Warehouse Locations</CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <div className="font-semibold text-slate-900">Main Central Warehouse (Colombo)</div>
                    <div className="text-xs text-slate-500">Rack B-14, Bay 02</div>
                  </div>
                  <span className="font-semibold tabular-nums text-slate-900">{Math.floor(product.stockOnHand * 0.8)} {product.uomCode}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <div className="font-semibold text-slate-900">Kotte Brand Showroom & Store</div>
                    <div className="text-xs text-slate-500">Showroom POS Inventory</div>
                  </div>
                  <span className="font-semibold tabular-nums text-slate-900">{Math.ceil(product.stockOnHand * 0.2)} {product.uomCode}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warranty">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Standard Manufacturer Warranty</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-slate-900">
                  {product.warrantyPeriodMonths} Months Comprehensive Warranty
                </span>
              </div>
              <p className="text-slate-500">
                Covers component defects and manufacturing faults upon valid warranty registration receipt.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Director / Manager Discount Levels Configuration Dialog */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Configure Product Discount Levels
          </DialogTitle>
          <DialogDescription>
            Configure up to 3 optional discount levels for <strong>{product.name}</strong>.
            Discount levels are automatically sorted from lowest to highest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Loyalty Discount Levels</span>
            <button
              type="button"
              onClick={() => setShowDiscountInfo(!showDiscountInfo)}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 transition-colors p-1 rounded hover:bg-indigo-50 focus:outline-none"
              title={showDiscountInfo ? 'Hide rule details' : 'Click to view loyalty rules'}
            >
              <Info className="h-3.5 w-3.5" />
              <span>{showDiscountInfo ? 'Hide Note' : 'View Note'}</span>
            </button>
          </div>

          {showDiscountInfo && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Customer Loyalty Access Rules:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                <li><strong>New Customer:</strong> Lowest available discount level only (Level 1)</li>
                <li><strong>Premium Customer:</strong> Level 1 + Level 2</li>
                <li><strong>Platinum Customer:</strong> All configured discount levels (Levels 1, 2, and 3)</li>
                <li><strong>0 Levels:</strong> No direct discount allowed (Management Approval required)</li>
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Level 1 (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 5"
                value={editL1}
                onChange={(e) => setEditL1(e.target.value)}
                className="h-9 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Level 2 (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 10"
                value={editL2}
                onChange={(e) => setEditL2(e.target.value)}
                className="h-9 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Level 3 (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 15"
                value={editL3}
                onChange={(e) => setEditL3(e.target.value)}
                className="h-9 font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Tip: Leave inputs blank to configure fewer levels (e.g. 1 or 2 levels). Leave all empty for 0 levels.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDiscountModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSavingLevels}
            onClick={async () => {
              try {
                setIsSavingLevels(true);
                const raw = [editL1, editL2, editL3]
                  .map((v) => (v.trim() !== '' ? Number(v) : null))
                  .filter((v): v is number => v !== null && !isNaN(v) && v >= 0 && v <= 100);
                const sortedLevels = Array.from(new Set(raw)).sort((a, b) => a - b);

                const updated = await productService.updateProduct(product.id, {
                  discountLevels: sortedLevels,
                  pricing: {
                    ...product.pricing,
                    discountLevels: sortedLevels,
                  },
                });
                setProduct(updated);
                setIsDiscountModalOpen(false);
                toast.success('Product discount levels updated successfully.');
              } catch (err) {
                toast.error('Failed to update discount levels.');
              } finally {
                setIsSavingLevels(false);
              }
            }}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            Save Discount Levels
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
