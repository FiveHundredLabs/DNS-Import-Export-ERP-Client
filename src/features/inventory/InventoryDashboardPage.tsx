import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInventory } from '../../hooks/useInventory';
import { useGRN } from '../../hooks/useGRN';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { StatCard } from '../../components/common/StatCard';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { calculateAvailableForSale } from '../../rules/inventoryRules';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  Truck,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
  Store,
  PlusCircle,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

// ─── Global Styled Stock Level Progress Bar ───────────────────────────────────
function StockBar({ available, reserved }: { available: number; reserved: number }) {
  const total = Math.max(available + reserved, 1);
  const availPct = Math.min(Math.round((available / total) * 100), 100);

  const getGradient = () => {
    if (available <= 0) return 'bg-gradient-to-r from-rose-500 to-red-500';
    if (available < 10) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    return 'bg-gradient-to-r from-emerald-500 to-teal-500';
  };

  return (
    <div className="flex items-center gap-2.5 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getGradient()}`}
          style={{ width: `${availPct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-medium text-slate-600 whitespace-nowrap min-w-16 text-right">
        {available} avail.
      </span>
    </div>
  );
}

// ─── Movement Activity ─────────────────────────────────────────────────────────
const MOVEMENT_LABELS: Record<string, { label: string; cls: string }> = {
  GRN_INWARD:       { label: 'GRN Inward',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SALES_ISSUE:      { label: 'Sales Issue',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  TRANSFER_OUT:     { label: 'Transfer Out',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  TRANSFER_IN:      { label: 'Transfer In',      cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  DAMAGE_WRITE_OFF: { label: 'Damage Write-Off', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  DAMAGE_REVERSAL:  { label: 'Damage Reversal',  cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  ADJUSTMENT:       { label: 'Adjustment',       cls: 'bg-slate-100 text-slate-700 border-slate-300' },
};

const QUICK_LINKS = [
  {
    label: 'Goods Receipt Notes',
    description: 'Receive and approve inbound stock',
    to: '/inventory/grn',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    label: 'Stock Balance',
    description: 'View live inventory levels',
    to: '/inventory/stock',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    label: 'Stock Movements',
    description: 'Immutable audit ledger',
    to: '/inventory/movements',
    color: 'from-purple-500 to-violet-600',
  },
  {
    label: 'Order Picking',
    description: 'Issue stock for approved orders',
    to: '/inventory/picking',
    color: 'from-amber-500 to-orange-600',
  },
  {
    label: 'Dispatch & Delivery',
    description: 'Manage outbound shipments',
    to: '/inventory/dispatch',
    color: 'from-rose-500 to-red-600',
  },
  {
    label: 'Serial Numbers',
    description: 'Unit-wise serialization & bins',
    to: '/inventory/serial-numbers',
    color: 'from-slate-700 to-slate-900',
  },
  {
    label: 'Damaged Stock & RMA',
    description: 'Quarantine, supplier returns & repairs',
    to: '/inventory/damaged-stock',
    color: 'from-rose-500 to-red-600',
  },
];

export function InventoryDashboardPage() {
  const navigate = useNavigate();
  const { stockBalances, movements, loading } = useInventory();
  const { grns, loading: grnsLoading } = useGRN();

  // ── Computed KPIs ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const balancesWithProduct = (stockBalances ?? []).map((b: any) => {
      const product = MOCK_PRODUCTS.find(p => p.id === b.productId);
      const availableForSale = calculateAvailableForSale(b) ?? 0;
      return { ...b, availableForSale, productName: product?.name ?? b.productId };
    });

    const totalLines = balancesWithProduct.length;
    const lowStockLines = balancesWithProduct.filter((b: any) => b.availableForSale > 0 && b.availableForSale < 10);
    const outOfStockLines = balancesWithProduct.filter((b: any) => b.availableForSale <= 0);
    const damagedUnits = balancesWithProduct.reduce((s: number, b: any) => s + (b.damagedQuantity ?? 0), 0);

    const pendingGRNs = (grns ?? []).filter(g => g.status === 'SUBMITTED').length;
    const draftGRNs   = (grns ?? []).filter(g => g.status === 'DRAFT').length;

    // Stock value estimation (available * avg cost from mock products)
    const stockValue = balancesWithProduct.reduce((sum: number, b: any) => {
      const product = MOCK_PRODUCTS.find(p => p.id === b.productId);
      return sum + (b.availableForSale * (product?.pricing?.costPrice ?? 0));
    }, 0);

    // Recent movements (last 8)
    const recentMovements = [...(movements ?? [])]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return {
      totalLines,
      lowStockLines,
      outOfStockLines,
      damagedUnits,
      pendingGRNs,
      draftGRNs,
      stockValue,
      recentMovements,
      balancesWithProduct,
    };
  }, [stockBalances, movements, grns]);

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; value: number; qty: number }> = {};
    kpis.balancesWithProduct.forEach((b: any) => {
      const product = MOCK_PRODUCTS.find(p => p.id === b.productId);
      const cat = product?.categoryName ?? 'Other';
      if (!map[cat]) map[cat] = { name: cat, value: 0, qty: 0 };
      map[cat].value += b.availableForSale * (product?.pricing?.costPrice ?? 0);
      map[cat].qty   += b.availableForSale;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [kpis.balancesWithProduct]);

  const getGRNStatusChipClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COSTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SUBMITTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Inventory Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Warehouse &amp; showroom stock overview — real-time balances, movements, and GRN tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/inventory/grn/new')}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            New GRN
          </Button>
        </div>
      </div>

      {/* ── Global KPI Cards Strip ─────────────────────────────────────── */}
      {loading || grnsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Stock Lines"
            value={kpis.totalLines}
            subtitle={`Est. value: ${formatCurrency(kpis.stockValue)}`}
            icon={Package}
            variant="blue"
            badge="Catalog SKUs"
            onClick={() => navigate('/inventory/stock')}
          />
          <StatCard
            title="Low Stock Alerts"
            value={kpis.lowStockLines.length}
            subtitle={
              kpis.outOfStockLines.length > 0
                ? `${kpis.outOfStockLines.length} out of stock items`
                : 'All other catalog lines healthy'
            }
            icon={AlertTriangle}
            variant={kpis.lowStockLines.length > 0 ? 'amber' : 'emerald'}
            badge={kpis.lowStockLines.length > 0 ? 'Reorder Needed' : 'Adequate'}
            onClick={() => navigate('/inventory/stock')}
          />
          <StatCard
            title="Pending GRN Approvals"
            value={kpis.pendingGRNs}
            subtitle={`${kpis.draftGRNs} draft${kpis.draftGRNs !== 1 ? 's' : ''} in progress`}
            icon={ClipboardList}
            variant={kpis.pendingGRNs > 0 ? 'indigo' : 'emerald'}
            badge={kpis.pendingGRNs > 0 ? `${kpis.pendingGRNs} In Queue` : 'Up to date'}
            onClick={() => navigate('/inventory/grn')}
          />
          <StatCard
            title="Damaged Units"
            value={kpis.damagedUnits}
            subtitle="Across warehouse & showroom"
            icon={Truck}
            variant={kpis.damagedUnits > 0 ? 'rose' : 'emerald'}
            badge={kpis.damagedUnits > 0 ? 'Quarantined' : 'Zero Defect'}
            onClick={() => navigate('/inventory/damaged-stock')}
          />
        </div>
      )}

      {/* ── Main Grid: Stock Alerts + Recent Activity ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Low / Out-of-Stock Products */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Stock Level Overview
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live availability &amp; allocation status across warehouse bays
                  </p>
                </div>
                <Link to="/inventory/stock">
                  <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 font-semibold gap-1">
                    <span>View all</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </div>
              ) : kpis.balancesWithProduct.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-sm">No stock balances found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="text-xs font-semibold">Product</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Location</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Reserved</TableHead>
                      <TableHead className="w-56 text-xs font-semibold">Availability</TableHead>
                      <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.balancesWithProduct.slice(0, 10).map((b: any) => {
                      let status = {
                        label: 'In Stock',
                        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      };
                      if (b.availableForSale <= 0) {
                        status = {
                          label: 'Out of Stock',
                          cls: 'bg-rose-50 text-rose-700 border-rose-200',
                        };
                      } else if (b.availableForSale < 10) {
                        status = {
                          label: 'Low Stock',
                          cls: 'bg-amber-50 text-amber-700 border-amber-200',
                        };
                      }

                      return (
                        <TableRow key={b.id} className="hover:bg-slate-50/60 transition-colors">
                          <TableCell className="font-medium text-xs text-slate-900">
                            {b.productName}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-700">
                              {b.locationType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-slate-500">
                            {b.reservedQuantity}
                          </TableCell>
                          <TableCell>
                            <StockBar available={b.availableForSale} reserved={b.reservedQuantity} />
                          </TableCell>
                          <TableCell className="text-center">
                            {/* Status Chip Styled exactly as Global Specification */}
                            <Badge
                              variant="outline"
                              className={`${status.cls} text-[10px] font-mono font-semibold uppercase tracking-wider rounded-md px-2.5 py-0.5`}
                            >
                              {status.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Category Stock Value Breakdown with Global Progress Bars */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Stock Value by Category
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Distribution of capital and inventory depth across merchandise categories
                  </p>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono bg-slate-50">
                  {categoryBreakdown.length} Categories
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : categoryBreakdown.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No inventory category data</p>
              ) : (
                (() => {
                  const maxVal = Math.max(...categoryBreakdown.map(c => c.value), 1);
                  const gradientBars = [
                    'bg-gradient-to-r from-blue-500 to-sky-500',
                    'bg-gradient-to-r from-emerald-500 to-teal-500',
                    'bg-gradient-to-r from-indigo-500 to-purple-500',
                    'bg-gradient-to-r from-amber-500 to-orange-500',
                    'bg-gradient-to-r from-rose-500 to-pink-500',
                    'bg-gradient-to-r from-cyan-500 to-blue-500',
                  ];
                  return categoryBreakdown.map((cat, idx) => {
                    const pct = Math.min(Math.round((cat.value / maxVal) * 100), 100);
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs items-center">
                          <span className="font-semibold text-slate-800 truncate max-w-[55%]">
                            {cat.name}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            <strong className="text-slate-800">{cat.qty}</strong> units · {formatCurrency(cat.value)}
                          </span>
                        </div>
                        {/* Global Progress Bar */}
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${gradientBars[idx % gradientBars.length]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Recent GRNs + Recent Movements */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Recent GRNs
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Latest warehouse inward receipts
                  </p>
                </div>
                <Link to="/inventory/grn">
                  <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 font-semibold gap-1">
                    <span>All GRNs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {grnsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : (grns ?? []).length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No GRNs recorded</p>
              ) : (
                [...(grns ?? [])]
                  .sort((a, b) => new Date(b.submittedAt ?? b.approvedAt ?? '').getTime() - new Date(a.submittedAt ?? a.approvedAt ?? '').getTime())
                  .slice(0, 5)
                  .map(grn => {
                    const totalValue = grn.items?.reduce((s: number, item: any) =>
                      s + (item.unitCostSnapshot ?? 0) * ((item.receivedQuantity ?? 0) - (item.damagedQuantity ?? 0)), 0) ?? 0;
                    return (
                      <Link key={grn.id} to={`/inventory/grn/${grn.id}`}>
                        <div className="p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono font-bold text-xs text-slate-900 truncate">{grn.id}</p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{grn.supplierName}</p>
                            </div>
                            {/* Status Chip Styled as Global Specification */}
                            <Badge
                              variant="outline"
                              className={`${getGRNStatusChipClass(grn.status)} text-[10px] font-mono font-semibold uppercase tracking-wider rounded-md px-2.5 py-0.5 shrink-0`}
                            >
                              {grn.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                            <span>{grn.items?.length ?? 0} line items</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(totalValue)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
              )}
              <Link to="/inventory/grn/new" className="block pt-1">
                <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5 text-primary" />
                  <span>Create New GRN</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Stock Movements */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Recent Movements
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable audit transactions
                  </p>
                </div>
                <Link to="/inventory/movements">
                  <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 font-semibold gap-1">
                    <span>All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
                </div>
              ) : kpis.recentMovements.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No recent movements</p>
              ) : (
                kpis.recentMovements.map((m: any) => {
                  const product = MOCK_PRODUCTS.find(p => p.id === m.productId);
                  const meta = MOVEMENT_LABELS[m.movementType] ?? MOVEMENT_LABELS[m.type] ?? {
                    label: m.movementType ?? m.type,
                    cls: 'bg-slate-100 text-slate-700 border-slate-300',
                  };
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2.5 py-2 border-b border-slate-100 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {product?.name ?? m.productId}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`${meta.cls} text-[9px] font-mono font-semibold uppercase tracking-wider rounded-md px-1.5 py-0.2`}
                          >
                            {meta.label}
                          </Badge>
                          <span className="text-[11px] font-mono font-bold text-slate-800">
                            ×{m.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatDate(m.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Quick Links Grid ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Quick Navigation Hub</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map(link => (
            <Link key={link.to} to={link.to}>
              <div className="group relative rounded-2xl overflow-hidden border border-slate-200/90 hover:shadow-md transition-all h-28">
                <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                <div className="relative h-full flex flex-col justify-end p-3.5">
                  <p className="text-white font-bold text-xs leading-tight">{link.label}</p>
                  <p className="text-white/80 text-[10px] mt-0.5 leading-tight">{link.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
