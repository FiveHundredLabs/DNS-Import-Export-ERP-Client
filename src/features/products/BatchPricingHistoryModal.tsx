import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useProductBatchPricing } from '../../api/products/products.hooks';
import { useAuth } from '../../hooks/useAuth';
import { BatchPriceUpdateModal } from './BatchPriceUpdateModal';
import {
  Layers,
  TrendingUp,
  PackageCheck,
  AlertCircle,
  Archive,
  PauseCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

interface BatchPricingHistoryModalProps {
  productId: string;
  productName: string;
  sku: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchPricingHistoryModal({
  productId,
  productName,
  sku,
  open,
  onOpenChange,
}: BatchPricingHistoryModalProps) {
  const { role, hasPermission } = useAuth();
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  const canUpdatePrices =
    (role === 'DIRECTOR' || role === 'MANAGER') &&
    (hasPermission('products:update') || hasPermission('products:edit') || hasPermission('products:price_approval'));

  const { data, isLoading, refetch } = useProductBatchPricing(productId, open);

  const batches = data?.batches ?? [];
  const summary = data?.summary;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                    {productName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-mono mt-0.5">
                    SKU: {sku} • Batch Pricing &amp; Stock Lifecycle
                  </DialogDescription>
                </div>
              </div>

              {canUpdatePrices && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setUpdateModalOpen(true)}
                  disabled={!summary || summary.eligibleForPriceUpdate === 0}
                  className="shrink-0 self-start sm:self-auto"
                >
                  <TrendingUp className="h-4 w-4 mr-1.5" />
                  Update Selling Price
                </Button>
              )}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading batch pricing history...</span>
            </div>
          ) : (
            <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
              {/* Summary KPIs */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                      Total Available Stock
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold font-mono text-slate-900">
                        {summary.totalAvailableQty}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">units</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                      Active / Hold Batches
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold font-mono text-emerald-700">
                        {summary.activeBatches} Act
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-base font-bold font-mono text-amber-700">
                        {summary.holdBatches} Hld
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                      Latest Batch Cost
                    </span>
                    <div className="text-base font-bold font-mono text-slate-900 mt-1">
                      {summary.latestCostPrice !== null ? formatCurrency(summary.latestCostPrice) : '—'}
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 block">
                      Latest Selling Price
                    </span>
                    <div className="text-base font-bold font-mono text-indigo-950 mt-1">
                      {summary.latestSellingPrice !== null ? formatCurrency(summary.latestSellingPrice) : '—'}
                    </div>
                  </div>
                </div>
              )}

              {/* Batches Table */}
              {batches.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <Archive className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    No Batches Received Yet
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Pricing and inventory batches are automatically created when Goods Received Notes (GRN) are accepted into the central warehouse.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200/90 rounded-xl overflow-hidden flex-1 overflow-y-auto [scrollbar-width:thin]">
                  <Table className="w-full text-xs">
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="min-w-[140px]">Batch #</TableHead>
                        <TableHead className="min-w-[130px]">GRN Reference</TableHead>
                        <TableHead className="text-center w-24">Status</TableHead>
                        <TableHead className="text-center w-28">Available / Init</TableHead>
                        <TableHead className="text-right w-28">Unit Cost</TableHead>
                        <TableHead className="text-right w-32 font-bold">Selling Price</TableHead>
                        <TableHead className="text-right w-24">Floor %</TableHead>
                        <TableHead className="text-center w-28">Received Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.map((b) => {
                        const isDepleted = b.status === 'DEPLETED';
                        const isHold = b.status === 'HOLD';
                        const badgeVariant = isDepleted
                          ? 'secondary'
                          : isHold
                          ? 'outline'
                          : 'success';

                        return (
                          <TableRow
                            key={b.id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isDepleted ? 'opacity-60 bg-slate-50/40' : ''
                            }`}
                          >
                            <TableCell>
                              <div className="font-mono font-bold text-slate-900">
                                {b.batchNumber}
                              </div>
                              {b.supplierName && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                  {b.supplierName}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-slate-700 font-medium">
                                {b.grnNumber}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="h-2.5 w-2.5" />
                                {formatDate(b.grnDate)}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={badgeVariant} className="text-[10px]">
                                {b.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono">
                              <span className="font-bold text-slate-900">
                                {b.availableQuantity}
                              </span>
                              <span className="text-slate-400 text-[10px]"> / {b.initialQuantity}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-600">
                              {formatCurrency(b.unitCost)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900">
                              {formatCurrency(b.sellingPrice)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-600">
                              {b.minFloorPricePercentage}%
                            </TableCell>
                            <TableCell className="text-center text-[11px] text-slate-500 font-mono">
                              {formatDate(b.receivedDate)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Selling Price Update Modal */}
      {updateModalOpen && (
        <BatchPriceUpdateModal
          productId={productId}
          productName={productName}
          sku={sku}
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </>
  );
}
