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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { StatCard } from '../../components/common/StatCard';
import { PageHeader } from '../../components/common/PageHeader';
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
  const { stockBalances, loading } = useInventory();
  const { user, role } = useAuth();
  const isStockStaff =
    role === 'STOCK_KEEPER' ||
    role === 'STOCK_MANAGER' ||
    user?.role === 'STOCK_KEEPER' ||
    user?.role === 'STOCK_MANAGER';
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  useEffect(() => {
    orderService.getOrders().then(setOrders).catch(console.error);
  }, []);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);

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
    navigate('/inventory/stock-adjustments', { state: { productId: row.productId, balanceId: row.id } });
  };

  const getStatusInfo = (avail: number) => {
    if (avail <= 0) return { label: 'Out of Stock', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (avail < 10) return { label: 'Low Stock', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'In Stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const handleExportCSV = () => {
    const headers = isStockStaff
      ? ['SKU', 'Product Name', 'Category', 'Available Stock', 'Reserved (Allocated)', 'Dispatched', 'Delivered', 'Rejected (Damage)', 'Est. Value']
      : ['SKU', 'Product Name', 'Category', 'Location', 'Available Stock', 'Reserved (Allocated)', 'Dispatched', 'Delivered', 'Rejected (Damage)', 'Est. Value'];
    const rows = filteredBalances.map(b => isStockStaff ? [
      b.sku,
      b.productName,
      b.category,
      b.availableForSale,
      b.reservedQuantity,
      b.dispatchedQuantity,
      b.deliveredQuantity,
      b.damagedQuantity,
      (b.availableForSale * b.costPrice).toFixed(2),
    ] : [
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
    <div className="w-full space-y-6">
      <PageHeader
        title="Stock Balance"
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stock Balance' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredBalances.length}</span> of {enrichedBalances.length} stock lines
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              Export CSV
            </Button>
          </div>
        }
      />

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
            icon={DollarSign}
            variant="blue"
            badge="Valuation"
          />
          <StatCard
            title="Out of Stock"
            value={outCount}
            icon={AlertTriangle}
            variant={outCount > 0 ? 'rose' : 'emerald'}
            badge={outCount > 0 ? 'Stockout Alert' : 'Healthy'}
          />
          <StatCard
            title="Low Stock Lines"
            value={lowCount}
            icon={AlertTriangle}
            variant={lowCount > 0 ? 'amber' : 'emerald'}
            badge={lowCount > 0 ? 'Low Buffer' : 'Balanced'}
          />
          <StatCard
            title="Damaged Units"
            value={totalDmg}
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
              {!isStockStaff && (
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
              )}

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
            <>
              {/* Mobile Card View (< md) */}
              <div className="block md:hidden divide-y divide-border/60">
                {filteredBalances.map((b) => {
                  const { label } = getStatusInfo(b.availableForSale);
                  const estValue = b.availableForSale * b.costPrice;
                  return (
                    <div key={b.id} className="p-4 space-y-3 bg-card hover:bg-muted/10 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{b.productName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-muted-foreground">{b.sku}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{b.category}</span>
                          </div>
                        </div>
                        <InventoryStatusBadge status={label} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Available</span>
                          <span className="text-sm font-bold text-emerald-700 font-mono">{b.availableForSale}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Hold</span>
                          <span className="text-xs font-semibold text-blue-700 font-mono">{b.reservedQuantity}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Dispatched</span>
                          <span className="text-xs font-semibold text-indigo-700 font-mono">{b.dispatchedQuantity}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Delivered</span>
                          <span className="text-xs font-semibold text-teal-700 font-mono">{b.deliveredQuantity}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Damaged</span>
                          <span className="text-xs font-semibold text-rose-600 font-mono">{b.damagedQuantity}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[10px] text-muted-foreground block font-medium uppercase">Est. Value</span>
                          <span className="text-xs font-bold text-foreground font-mono">{formatCurrency(estValue)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {!isStockStaff ? (
                          <Badge variant="outline" className="text-[11px] font-normal">
                            Loc: {b.locationType}
                          </Badge>
                        ) : <span />}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-3"
                          onClick={() => handleOpenAdjust(b)}
                        >
                          Request Adjustment
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto [scrollbar-width:thin]">
                <Table className="min-w-[980px] w-full text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">SKU</TableHead>
                      <TableHead className="min-w-[180px]">Product Name</TableHead>
                      <TableHead className="w-28">Category</TableHead>
                      {!isStockStaff && <TableHead className="w-24 text-center">Location</TableHead>}
                      <TableHead className="w-20 text-right font-medium text-slate-700">Physical Stock</TableHead>
                      <TableHead className="w-24 text-right font-semibold text-blue-700">Reserved</TableHead>
                      <TableHead className="w-24 text-right font-bold text-emerald-700">Available Stock</TableHead>
                      <TableHead className="w-24 text-right font-semibold text-indigo-700">Dispatched</TableHead>
                      <TableHead className="w-24 text-right font-semibold text-teal-700">Delivered</TableHead>
                      <TableHead className="w-24 text-right font-semibold text-rose-600">Damaged</TableHead>
                      <TableHead className="w-28 text-right font-semibold">Est. Value</TableHead>
                      <TableHead className="w-24 text-center">Status</TableHead>
                      <TableHead className="w-20 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBalances.map(b => {
                      const { label, cls } = getStatusInfo(b.availableForSale);
                      const estValue = b.availableForSale * b.costPrice;
                      return (
                        <TableRow key={b.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-semibold">{b.sku}</TableCell>
                          <TableCell className="font-medium">
                            <p className="truncate max-w-[220px] font-semibold text-foreground">{b.productName}</p>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{b.category}</TableCell>
                          {!isStockStaff && (
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[11px] px-1.5 py-0">{b.locationType}</Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-right font-mono font-medium text-slate-700 text-xs">{b.physicalStock}</TableCell>
                          <TableCell className="text-right font-mono">
                            {b.reservedQuantity > 0 ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] py-0 px-1.5 font-mono">
                                {b.reservedQuantity}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 font-mono text-sm">{b.availableForSale}</TableCell>

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
                          <TableCell className="text-right text-xs font-mono font-medium">{formatCurrency(estValue)}</TableCell>
                          <TableCell className="text-center">
                            <InventoryStatusBadge status={label} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              onClick={() => handleOpenAdjust(b)}
                            >
                              Request Adjustment
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
