import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { formatCurrency } from '../../../utils/formatters';
import { batchInventoryService } from '../../../services/BatchInventoryService';
import { priceHistoryService } from '../../../services/PriceHistoryService';
import { productService } from '../../../services/ProductService';
import { MOCK_PRODUCTS } from '../../../mock/mockProducts';
import { VendorBillLineItem } from '../services/apService';
import { GRN } from '../../../types/inventory';
import {
  Tag,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';

export interface FinancePricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  grn: GRN | null;
  items: VendorBillLineItem[];
  onComplete: () => void;
}

interface ProductPricingDecision {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  landedUnitCost: number;
  currentSellingPrice: number;
  proposedSellingPrice: number;
  strategy: 'PRESERVE_BATCH' | 'STANDARDIZE_UNIFORM';
}

export function FinancePricingModal({
  isOpen,
  onClose,
  grn,
  items,
  onComplete,
}: FinancePricingModalProps) {
  const [decisions, setDecisions] = useState<Record<string, ProductPricingDecision>>({});
  const [isApplying, setIsApplying] = useState(false);

  // Initialize decisions when modal opens with items
  useEffect(() => {
    if (!isOpen || !items || items.length === 0) return;

    const initial: Record<string, ProductPricingDecision> = {};
    items.forEach((item) => {
      const prodMaster = MOCK_PRODUCTS.find((p) => p.id === item.productId || p.sku === item.sku);
      const landed = item.landedUnitCost || item.unitCost || 0;
      const currentPrice = prodMaster?.pricing?.currentSellingPrice || Math.round(landed * 1.35);

      initial[item.productId] = {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.receivedQuantity,
        landedUnitCost: landed,
        currentSellingPrice: currentPrice,
        proposedSellingPrice: currentPrice,
        strategy: 'PRESERVE_BATCH',
      };
    });

    setDecisions(initial);
  }, [isOpen, items]);

  const updateDecision = (productId: string, updates: Partial<ProductPricingDecision>) => {
    setDecisions((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        ...updates,
      },
    }));
  };

  const handleApplyPricing = async () => {
    try {
      setIsApplying(true);
      const decisionList = Object.values(decisions);
      const batchDate = grn?.submittedAt ? grn.submittedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const batchSeq = String(Math.floor(10 + Math.random() * 90));

      for (const d of decisionList) {
        const batchNum = `LOT-${new Date().getFullYear()}-${batchSeq}-${d.sku.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;

        if (d.strategy === 'STANDARDIZE_UNIFORM') {
          // Strategy 2: Update all existing unsold active batches for this product
          batchInventoryService.standardizeProductBatchPrices(
            d.productId,
            d.proposedSellingPrice,
            'Finance Manager',
            `Post-Costing Standardized Price for GRN ${grn?.grnNumber || ''}`
          );

          // Update Product Master catalog currentSellingPrice
          try {
            await productService.updateProduct(d.productId, {
              pricing: {
                costPrice: d.landedUnitCost,
                currentSellingPrice: d.proposedSellingPrice,
                minimumSellingPrice: Math.round(d.proposedSellingPrice * 0.85),
                maxDiscountPercentage: 15,
                taxRatePercentage: 18,
              },
            });
          } catch {
            // ignore mock update errors
          }

          // Create the new inbound StockBatch with the standardized selling price
          batchInventoryService.createBatch({
            batchNumber: batchNum,
            productId: d.productId,
            productName: d.productName,
            sku: d.sku,
            grnId: grn?.id,
            grnNumber: grn?.grnNumber,
            warehouseId: grn?.warehouseId || 'WH-MAIN',
            receivedDate: batchDate,
            initialQuantity: d.quantity,
            availableQuantity: d.quantity,
            unitCost: d.landedUnitCost,
            sellingPrice: d.proposedSellingPrice,
            status: 'ACTIVE',
          });
        } else {
          // Strategy 1: Create the new inbound StockBatch with assigned selling price
          batchInventoryService.createBatch({
            batchNumber: batchNum,
            productId: d.productId,
            productName: d.productName,
            sku: d.sku,
            grnId: grn?.id,
            grnNumber: grn?.grnNumber,
            warehouseId: grn?.warehouseId || 'WH-MAIN',
            receivedDate: batchDate,
            initialQuantity: d.quantity,
            availableQuantity: d.quantity,
            unitCost: d.landedUnitCost,
            sellingPrice: d.proposedSellingPrice,
            status: 'ACTIVE',
          });

          // Strategy 1: Preserve existing batches; record history for incoming lot
          priceHistoryService.recordPriceChange({
            productId: d.productId,
            productName: d.productName,
            sku: d.sku,
            batchNumber: batchNum,
            oldPrice: d.currentSellingPrice,
            newPrice: d.proposedSellingPrice,
            strategy: 'PRESERVE_BATCH',
            changeReason: `GRN Post-Costing: Strategy 1 applied to incoming batch ${batchNum} only`,
            changedBy: 'Finance Manager',
            affectedBatchCount: 1,
          });
        }
      }

      toast.success(
        `Selling price strategies applied successfully across ${decisionList.length} product line(s)!`
      );
      onComplete();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply pricing strategy');
    } finally {
      setIsApplying(false);
    }
  };

  const decisionList = Object.values(decisions);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} maxWidth="max-w-4xl">
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-light text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                GRN Post-Costing Price Assignment
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Vendor Bill posted for GRN <strong>{grn?.grnNumber}</strong>. Select the commercial selling price strategy for each received product lot.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {decisionList.map((d) => {
            const existingBatches = batchInventoryService.getActiveBatches(d.productId);
            const sellingPrice = Number(d.proposedSellingPrice) || 0;
            const landedCost = Number(d.landedUnitCost) || 0;
            const grossMarginAmount = sellingPrice - landedCost;
            const grossMarginPct =
              sellingPrice > 0 ? (grossMarginAmount / sellingPrice) * 100 : 0;

            const isHealthyMargin = grossMarginPct >= 20;
            const isWarningMargin = grossMarginPct > 0 && grossMarginPct < 20;
            const isNegativeMargin = grossMarginPct <= 0;

            return (
              <Card key={d.productId} className="p-4 border-slate-200 bg-slate-50/50 space-y-3">
                {/* Product Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{d.productName}</h4>
                      <Badge variant="outline" className="text-[10px] font-mono bg-white">
                        {d.sku}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Inbound Quantity: <strong className="text-slate-800">{d.quantity} units</strong></span>
                      <span>•</span>
                      <span>
                        True Landed Unit Cost:{' '}
                        <strong className="text-slate-900 font-mono">
                          {formatCurrency(d.landedUnitCost)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Live Gross Margin Preview Badge */}
                  <div
                    className={`px-3 py-2 rounded-lg border text-right tabular-nums ${
                      isHealthyMargin
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : isWarningMargin
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                      Live Gross Margin
                    </span>
                    <div className="flex items-center justify-end gap-1.5 font-bold text-sm">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{grossMarginPct.toFixed(1)}%</span>
                      <span className="text-xs font-normal opacity-75">
                        ({formatCurrency(grossMarginAmount)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strategy Selection Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Strategy 1: Preserve Batch Prices */}
                  <div
                    onClick={() => updateDecision(d.productId, { strategy: 'PRESERVE_BATCH' })}
                    className={`cursor-pointer rounded-xl p-3 border text-xs transition-all ${
                      d.strategy === 'PRESERVE_BATCH'
                        ? 'border-primary bg-primary-light/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        <span>Strategy 1: Preserve Existing Batch Prices</span>
                      </div>
                      {d.strategy === 'PRESERVE_BATCH' && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                      Assigns this selling price exclusively to incoming batch ({d.quantity} units). Existing stock lots retain their independent prices.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Active batches in stock: {existingBatches.length} batch(es)
                    </div>
                  </div>

                  {/* Strategy 2: Standardize Under One Price */}
                  <div
                    onClick={() => updateDecision(d.productId, { strategy: 'STANDARDIZE_UNIFORM' })}
                    className={`cursor-pointer rounded-xl p-3 border text-xs transition-all ${
                      d.strategy === 'STANDARDIZE_UNIFORM'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Strategy 2: Standardize Under One Price</span>
                      </div>
                      {d.strategy === 'STANDARDIZE_UNIFORM' && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                      Harmonizes all unsold inventory under this single uniform price. Will update existing unsold lots.
                    </p>
                    <div className="mt-2 text-[10px] text-indigo-700 font-semibold">
                      Will update {existingBatches.length} existing unsold batch(es)
                    </div>
                  </div>
                </div>

                {/* Selling Price Input and Details */}
                <div className="bg-white rounded-lg p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <label className="font-semibold text-slate-700 whitespace-nowrap">
                      Assigned Selling Price (LKR):
                    </label>
                    <Input
                      type="number"
                      min={d.landedUnitCost}
                      step={50}
                      value={d.proposedSellingPrice}
                      onChange={(e) =>
                        updateDecision(d.productId, {
                          proposedSellingPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-36 h-8 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="text-slate-500 text-[11.5px] flex items-center gap-2">
                    <span>Baseline Catalog Price:</span>
                    <strong className="text-slate-800 font-mono">
                      {formatCurrency(d.currentSellingPrice)}
                    </strong>
                  </div>
                </div>

                {/* Strategy 2 Preview: Affected Batches Table */}
                {d.strategy === 'STANDARDIZE_UNIFORM' && existingBatches.length > 0 && (
                  <div className="rounded-lg bg-indigo-50/60 border border-indigo-200 p-2.5 text-xs space-y-2">
                    <div className="flex items-center justify-between font-semibold text-indigo-900 text-[11px] uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Boxes className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Preview: Affected Unsold Batches ({existingBatches.length})</span>
                      </div>
                      <span className="text-indigo-700 font-normal">
                        Total Unsold Units:{' '}
                        <strong>
                          {existingBatches.reduce((sum, b) => sum + b.availableQuantity, 0)}
                        </strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {existingBatches.map((b) => (
                        <div
                          key={b.id}
                          className="bg-white p-2 rounded border border-indigo-100 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-slate-800 block">
                              {b.batchNumber}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              Warehouse: {b.warehouseId} • Qty: {b.availableQuantity}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 line-through text-[10px] block font-mono">
                              {formatCurrency(b.sellingPrice)}
                            </span>
                            <span className="text-indigo-900 font-bold font-mono text-xs flex items-center justify-end gap-1">
                              <ArrowRight className="h-3 w-3 text-indigo-500" />
                              {formatCurrency(d.proposedSellingPrice)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isApplying}>
            Skip / Keep Defaults
          </Button>
          <Button
            size="sm"
            onClick={handleApplyPricing}
            disabled={isApplying || decisionList.length === 0}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm & Apply Selling Price Strategy</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
