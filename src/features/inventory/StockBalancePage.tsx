import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { StatCard } from '../../components/common/StatCard';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../hooks/useAuth';
import { orderService } from '../../services/OrderService';
import { SalesOrder } from '../../types/order';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { calculateAvailableForSale } from '../../rules/inventoryRules';
import { formatCurrency } from '../../utils/formatters';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { exportToCSV } from '../../utils/exportUtils';
import { toast } from 'sonner';
import { DollarSign, AlertTriangle, Package, Boxes, TrendingDown, Truck, Layers, CheckCircle2 } from 'lucide-react';

type AdjustDirection = 'ADD' | 'REMOVE';

interface StockRow {
  id: string;
  productId: string;
  locationId: string;
  locationType: string;
  productName: string;
  sku: string;
  category: string;
  warehouseQuantity: number;
  showroomQuantity: number;
  damagedQuantity: number;
  reservedQuantity: number;
  dispatchedQuantity: number;
  deliveredQuantity: number;
  availableForSale: number;
  physicalStock: number;
  costPrice: number;
}

export function StockBalancePage() {
  const navigate = useNavigate();
  const { stockBalances, loading, inventoryService } = useInventory();
  const { user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  useEffect(() => {
    orderService.getOrders().then(setOrders).catch(console.error);
  }, []);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Adjustment dialog state
  const [adjustRow, setAdjustRow] = useState<StockRow | null>(null);
  const [adjDir, setAdjDir] = useState<AdjustDirection>('ADD');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjProcessing, setAdjProcessing] = useState(false);

  // Map product sales orders
  const productOrderStats = useMemo(() => {
    const map: Record<string, { reserved: number; dispatched: number; delivered: number }> = {};
    orders.forEach((ord) => {
      ord.items?.forEach((it) => {
        if (!map[it.productId]) {
          map[it.productId] = { reserved: 0, dispatched: 0, delivered: 0 };
        }
        const qty = it.approvedQuantity || it.orderedQuantity || 0;
        if (['APPROVED', 'PICKING', 'PARTIALLY_ISSUED', 'ISSUED', 'INVOICED'].includes(ord.status)) {
          map[it.productId].reserved += qty;
        } else if (ord.status === 'DISPATCHED') {
          map[it.productId].dispatched += qty;
        } else if (ord.status === 'DELIVERED') {
          map[it.productId].delivered += qty;
        }
      });
    });
    return map;
  }, [orders]);

  const enrichedBalances: StockRow[] = useMemo(() => {
    return (stockBalances ?? []).map((b: any, idx: number) => {
      const product = MOCK_PRODUCTS.find(p => p.id === b.productId);
      const availRaw = typeof b.availableQuantity === 'number' ? b.availableQuantity : 0;
      const resRaw = typeof b.reservedQuantity === 'number' ? b.reservedQuantity : 0;
      const stats = productOrderStats[b.productId] || { reserved: 0, dispatched: 0, delivered: 0 };
      const reservedQty = Math.max(resRaw, stats.reserved);
      const calculatedAvail = Math.max(0, availRaw - reservedQty);
      const availableForSale = isNaN(calculatedAvail) ? 0 : calculatedAvail;

      return {
        id: b.id || `${b.productId}-${b.locationId || idx}-${idx}`,
        productId: b.productId,
        locationId: b.locationId,
        locationType: b.locationType,
        productName: product?.name ?? b.productId,
        sku: product?.sku ?? 'N/A',
        category: product?.categoryName ?? 'N/A',
        warehouseQuantity: b.locationType === 'WAREHOUSE' ? availRaw : 0,
        showroomQuantity: b.locationType === 'SHOWROOM' ? availRaw : 0,
        damagedQuantity: b.damagedQuantity ?? 0,
        reservedQuantity: reservedQty,
        dispatchedQuantity: stats.dispatched,
        deliveredQuantity: stats.delivered,
        availableForSale,
        physicalStock: availRaw,
        costPrice: product?.pricing?.costPrice ?? 0,
      } as StockRow;
    });
  }, [stockBalances, productOrderStats]);

  const categories = useMemo(() => {
    const cats = new Set(enrichedBalances.map(b => b.category));
    return ['All', ...Array.from(cats)];
  }, [enrichedBalances]);

  const filteredBalances = useMemo(() => {
    return enrichedBalances.filter(b => {
      if (lowStockOnly && b.availableForSale >= 10) return false;
      if (categoryFilter !== 'All' && b.category !== categoryFilter) return false;
      if (locationFilter !== 'All' && b.locationType !== locationFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!b.sku.toLowerCase().includes(s) && !b.productName.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [enrichedBalances, search, categoryFilter, locationFilter, lowStockOnly]);

  // Summary KPIs
  const totalValue = useMemo(() =>
    filteredBalances.reduce((sum, b) => sum + b.availableForSale * b.costPrice, 0),
    [filteredBalances]
  );
  const outCount   = filteredBalances.filter(b => b.availableForSale <= 0).length;
  const lowCount   = filteredBalances.filter(b => b.availableForSale > 0 && b.availableForSale < 10).length;
  const totalDmg   = filteredBalances.reduce((s, b) => s + b.damagedQuantity, 0);

  const handleOpenAdjust = (row: StockRow) => {
    setAdjustRow(row);
    setAdjDir('ADD');
    setAdjQty('');
    setAdjReason('');
  };

  const handleAdjustSubmit = async () => {
    if (!adjustRow || !user) return;
    const qty = parseInt(adjQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity greater than 0');
      return;
    }
    if (!adjReason.trim() || adjReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters');
      return;
    }
    if (adjDir === 'REMOVE' && qty > adjustRow.availableForSale) {
      toast.error(`Cannot remove more than available quantity (${adjustRow.availableForSale})`);
      return;
    }
    try {
      setAdjProcessing(true);
      const qtyDiff = adjDir === 'ADD' ? qty : -qty;
      await inventoryService.adjustStock(
        adjustRow.productId,
        adjustRow.locationId,
        adjustRow.locationType,
        qtyDiff,
        adjReason.trim(),
        user.id,
        user.name
      );
      toast.success(`Stock adjusted: ${adjDir === 'ADD' ? '+' : '-'}${qty} units for ${adjustRow.productName}`);
      setAdjustRow(null);
      // Note: In a real app, refetch would refresh balances. With singleton repo, the service updates in-memory.
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to adjust stock');
    } finally {
      setAdjProcessing(false);
    }
  };

  const getStatusInfo = (avail: number) => {
    if (avail <= 0) return { label: 'Out of Stock', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (avail < 10) return { label: 'Low Stock', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'In Stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Location', 'Available Stock', 'Reserved (Allocated)', 'Dispatched', 'Delivered', 'Rejected (Damage)', 'Est. Value'];
    const rows = filteredBalances.map(b => [
      b.sku,
      b.productName,
      b.category,
      b.locationType,
      b.availableForSale,
      b.reservedQuantity,
      b.dispatchedQuantity,
      b.deliveredQuantity,
      b.damagedQuantity,
      (b.availableForSale * b.costPrice).toFixed(2),
    ]);
    exportToCSV('stock-balance-export', headers, rows);
    toast.success('CSV exported successfully');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Stock Balance</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredBalances.length}</span> of {enrichedBalances.length} stock lines
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Inventory Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2 text-xs font-medium">
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => navigate('/inventory/stock')}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
        >
          Stock Balances
        </button>
        <button
          type="button"
          onClick={() => navigate('/inventory/grn')}
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Goods Receipt (GRN)
        </button>
        <button
          type="button"
          onClick={() => navigate('/inventory/damaged-stock')}
          className="px-3 py-1.5 rounded-lg text-rose-700 hover:text-rose-800 hover:bg-rose-50 transition-colors font-medium flex items-center gap-1.5"
        >
          <span>Damaged Stock &amp; RMA</span>
          {totalDmg > 0 && (
            <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 px-1 py-0 h-4">
              {totalDmg}
            </Badge>
          )}
        </button>
      </div>

      {/* ── Summary Strips (Global Cards) ── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Est. Stock Value"
            value={formatCurrency(totalValue)}
            subtitle="Current available inventory basis"
            icon={DollarSign}
            variant="blue"
            badge="Valuation"
          />
          <StatCard
            title="Out of Stock"
            value={outCount}
            subtitle={outCount > 0 ? 'Urgent procurement required' : 'Zero depleted SKUs'}
            icon={AlertTriangle}
            variant={outCount > 0 ? 'rose' : 'emerald'}
            badge={outCount > 0 ? 'Stockout Alert' : 'Healthy'}
          />
          <StatCard
            title="Low Stock Lines"
            value={lowCount}
            subtitle={lowCount > 0 ? 'Below reorder threshold (< 10 units)' : 'Adequate safety stock'}
            icon={AlertTriangle}
            variant={lowCount > 0 ? 'amber' : 'emerald'}
            badge={lowCount > 0 ? 'Low Buffer' : 'Balanced'}
          />
          <StatCard
            title="Damaged Units"
            value={totalDmg}
            subtitle={totalDmg > 0 ? 'Quarantined for disposal or debit' : 'Zero warehouse defect'}
            icon={Boxes}
            variant={totalDmg > 0 ? 'rose' : 'emerald'}
            badge={totalDmg > 0 ? 'Quarantined' : 'Zero Defect'}
          />
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {/* Location Filter */}
              <Select
                value={locationFilter}
                onValueChange={(val) => setLocationFilter(val)}
              >
                <SelectTrigger className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-36">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Locations</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="SHOWROOM">Showroom</SelectItem>
                  <SelectItem value="TRANSIT">Transit</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val)}
              >
                <SelectTrigger className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-36">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Low Stock Toggle */}
              <label className="flex items-center gap-2 cursor-pointer px-3 h-9 border rounded-md bg-background text-sm">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => setLowStockOnly(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                Low Stock Only
              </label>
            </div>

            {/* Search */}
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search SKU or product name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-lg font-medium">No stock lines found</p>
              <p className="text-sm mt-1">Try adjusting the filters or search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Location</TableHead>
                    <TableHead className="text-right font-bold text-emerald-700">Available</TableHead>
                    <TableHead className="text-right font-semibold text-blue-700">Reserved (Order)</TableHead>
                    <TableHead className="text-right font-semibold text-indigo-700">Dispatched</TableHead>
                    <TableHead className="text-right font-semibold text-teal-700">Delivered</TableHead>
                    <TableHead className="text-right font-semibold text-rose-600">Rejected (Damage)</TableHead>
                    <TableHead className="text-right">Est. Value</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalances.map(b => {
                    const { label, cls } = getStatusInfo(b.availableForSale);
                    const estValue = b.availableForSale * b.costPrice;
                    return (
                      <TableRow key={b.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{b.sku}</TableCell>
                        <TableCell className="font-medium max-w-[200px]">
                          <p className="truncate">{b.productName}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.category}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">{b.locationType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-700 font-mono">{b.availableForSale}</TableCell>
                        <TableCell className="text-right font-mono">
                          {b.reservedQuantity > 0 ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] py-0 px-1.5 font-mono">
                              {b.reservedQuantity}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {b.dispatchedQuantity > 0 ? (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10.5px] py-0 px-1.5 font-mono">
                              {b.dispatchedQuantity}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {b.deliveredQuantity > 0 ? (
                            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10.5px] py-0 px-1.5 font-mono">
                              {b.deliveredQuantity}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {b.damagedQuantity > 0 ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] py-0 px-1 font-mono">
                              {b.damagedQuantity}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">{formatCurrency(estValue)}</TableCell>
                        <TableCell className="text-center">
                          <InventoryStatusBadge status={label} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => handleOpenAdjust(b)}
                          >
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stock Adjustment Dialog ─────────────────────────────────── */}
      <Dialog open={!!adjustRow} onOpenChange={open => { if (!open) setAdjustRow(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Stock Adjustment</DialogTitle>
          </DialogHeader>
          {adjustRow && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-semibold">{adjustRow.productName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {adjustRow.sku} · {adjustRow.locationType} · Available: <strong>{adjustRow.availableForSale}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAdjDir('ADD')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    adjDir === 'ADD'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <p className="text-lg font-bold">+</p>
                  <p className="text-sm font-medium">Add Stock</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjDir('REMOVE')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    adjDir === 'REMOVE'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <p className="text-lg font-bold">-</p>
                  <p className="text-sm font-medium">Remove Stock</p>
                </button>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={adjQty}
                  onChange={e => setAdjQty(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1.5">
                  Reason <span className="text-muted-foreground">(min 5 characters)</span>
                </label>
                <Textarea
                  placeholder="e.g. Cycle count correction, Breakage during transit, Supplier credit note..."
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  rows={3}
                />
              </div>

              <p className="text-xs text-amber-600 font-medium">
                ⚠ Manual adjustments create an immutable audit record.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustRow(null)}>Cancel</Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={adjProcessing}
              className={adjDir === 'REMOVE' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {adjProcessing ? 'Processing...' : `Confirm ${adjDir === 'ADD' ? 'Addition' : 'Removal'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
