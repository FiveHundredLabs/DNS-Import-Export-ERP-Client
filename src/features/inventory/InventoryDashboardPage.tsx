import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInventory } from '../../hooks/useInventory';
import { useGRN } from '../../hooks/useGRN';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { calculateAvailableForSale } from '../../rules/inventoryRules';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AmountDisplay } from '../../components/common/AmountDisplay';

// ─── Mini Icon Components ────────────────────────────────────────────────────
function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-4.5A3.375 3.375 0 0017.625 9h-1.5a1.125 1.125 0 00-1.125 1.125v9.75m-9-4.5H15" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'default' | 'danger' | 'warning' | 'success';
  icon: React.ReactNode;
  to?: string;
}

function KpiCard({ title, value, subtitle, accent = 'default', icon, to }: KpiCardProps) {
  const accentClasses = {
    default: 'bg-blue-50 text-blue-600 border-blue-100',
    danger: 'bg-red-50 text-red-600 border-red-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    success: 'bg-green-50 text-green-600 border-green-100',
  };

  const valueClasses = {
    default: 'text-foreground',
    danger: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
  };

  const isCurrency =
    typeof value === 'string' &&
    (/^(LKR|Rs\.?|\$)\s*[\d,]+/i.test(value.trim()) || value.includes('LKR'));

  const content = (
    <Card className={`hover:shadow-md transition-shadow min-w-0 overflow-hidden ${to ? 'cursor-pointer' : ''}`}>
      <CardContent className="p-5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            {isCurrency ? (
              <div className="mt-1 min-w-0">
                <AmountDisplay amount={value} className={`font-bold ${valueClasses[accent]}`} />
              </div>
            ) : (
              <p className={`text-2xl sm:text-3xl font-bold mt-1 tabular-nums [overflow-wrap:anywhere] break-words ${valueClasses[accent]}`}>{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
          </div>
          <div className={`flex-shrink-0 ml-3 p-2.5 rounded-lg border ${accentClasses[accent]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

// ─── Stock Level Bar ──────────────────────────────────────────────────────────
function StockBar({ available, reserved }: { available: number; reserved: number }) {
  const total = Math.max(available + reserved, 1);
  const availPct = Math.min((available / total) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            available <= 0 ? 'bg-red-500' : available < 10 ? 'bg-amber-400' : 'bg-green-500'
          }`}
          style={{ width: `${availPct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{available} avail.</span>
    </div>
  );
}

// ─── Movement Activity ─────────────────────────────────────────────────────────
const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  GRN_INWARD:       { label: 'GRN Inward',       color: 'bg-green-500' },
  SALES_ISSUE:      { label: 'Sales Issue',       color: 'bg-blue-500' },
  TRANSFER_OUT:     { label: 'Transfer Out',      color: 'bg-orange-500' },
  TRANSFER_IN:      { label: 'Transfer In',       color: 'bg-cyan-500' },
  DAMAGE_WRITE_OFF: { label: 'Damage Write-Off',  color: 'bg-red-500' },
  DAMAGE_REVERSAL:  { label: 'Damage Reversal',   color: 'bg-purple-500' },
  ADJUSTMENT:       { label: 'Adjustment',        color: 'bg-slate-500' },
};

const QUICK_LINKS = [
  {
    label: 'Goods Receipt Notes',
    description: 'Receive and approve inbound stock',
    to: '/inventory/grn',
    color: 'from-green-500 to-emerald-600',
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
    color: 'from-red-500 to-rose-600',
  },
];

export function InventoryDashboardPage() {
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

    // Recent movements (last 5)
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

  return (
    <div className="p-6 space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Warehouse &amp; showroom stock overview — real-time balances, movements, and GRNs.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to="/inventory/grn/new">
            <Button variant="default" size="sm">+ New GRN</Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      {loading || grnsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Stock Lines"
            value={kpis.totalLines}
            subtitle={`Est. value: ${formatCurrency(kpis.stockValue)}`}
            accent="default"
            to="/inventory/stock"
            icon={<PackageIcon className="w-5 h-5" />}
          />
          <KpiCard
            title="Low Stock Alerts"
            value={kpis.lowStockLines.length}
            subtitle={
              kpis.outOfStockLines.length > 0
                ? `${kpis.outOfStockLines.length} out of stock`
                : 'All other items healthy'
            }
            accent={kpis.lowStockLines.length > 0 ? 'warning' : 'success'}
            to="/inventory/stock"
            icon={<AlertIcon className="w-5 h-5" />}
          />
          <KpiCard
            title="Pending GRN Approvals"
            value={kpis.pendingGRNs}
            subtitle={`${kpis.draftGRNs} draft${kpis.draftGRNs !== 1 ? 's' : ''} in progress`}
            accent={kpis.pendingGRNs > 0 ? 'danger' : 'default'}
            to="/inventory/grn"
            icon={<ClipboardIcon className="w-5 h-5" />}
          />
          <KpiCard
            title="Damaged Units"
            value={kpis.damagedUnits}
            subtitle="Across all locations"
            accent={kpis.damagedUnits > 0 ? 'warning' : 'success'}
            icon={<TruckIcon className="w-5 h-5" />}
          />
        </div>
      )}

      {/* ── Main Grid: Stock Alerts + Recent Activity ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Low / Out-of-Stock Products */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Stock Level Overview</CardTitle>
                <Link to="/inventory/stock">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    View all <ArrowRightIcon className="w-4 h-4 ml-1 inline" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : kpis.balancesWithProduct.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No stock balances found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="w-48">Availability</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpis.balancesWithProduct.slice(0, 10).map((b: any) => {
                      let status = { label: 'In Stock', cls: 'bg-green-500' };
                      if (b.availableForSale <= 0) status = { label: 'Out of Stock', cls: 'bg-red-500' };
                      else if (b.availableForSale < 10) status = { label: 'Low Stock', cls: 'bg-amber-500' };

                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            <p className="font-medium text-sm leading-tight">{b.productName}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{b.locationType}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{b.reservedQuantity}</TableCell>
                          <TableCell>
                            <StockBar available={b.availableForSale} reserved={b.reservedQuantity} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${status.cls} text-white border-0 text-xs`}>{status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Category Stock Value Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stock Value by Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : categoryBreakdown.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const maxVal = Math.max(...categoryBreakdown.map(c => c.value), 1);
                    return categoryBreakdown.map((cat, idx) => {
                      const pct = (cat.value / maxVal) * 100;
                      const barColors = [
                        'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
                        'bg-cyan-500', 'bg-rose-500',
                      ];
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate max-w-[55%]">{cat.name}</span>
                            <span className="text-muted-foreground">
                              {cat.qty} units · {formatCurrency(cat.value)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColors[idx % barColors.length]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Recent GRNs + Recent Movements */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent GRNs</CardTitle>
                <Link to="/inventory/grn">
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                    All GRNs <ArrowRightIcon className="w-3 h-3 ml-1 inline" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {grnsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (grns ?? []).length === 0 ? (
                <p className="text-center py-6 text-muted-foreground text-sm">No GRNs found</p>
              ) : (
                [...(grns ?? [])]
                  .sort((a, b) => new Date(b.submittedAt ?? b.approvedAt ?? '').getTime() - new Date(a.submittedAt ?? a.approvedAt ?? '').getTime())
                  .slice(0, 5)
                  .map(grn => {
                    const statusColors: Record<string, string> = {
                      DRAFT:     'bg-slate-500',
                      SUBMITTED: 'bg-amber-500',
                      APPROVED:  'bg-green-500',
                      REJECTED:  'bg-red-500',
                    };
                    const totalValue = grn.items?.reduce((s: number, item: any) =>
                      s + (item.unitCostSnapshot ?? 0) * ((item.receivedQuantity ?? 0) - (item.damagedQuantity ?? 0)), 0) ?? 0;
                    return (
                      <Link key={grn.id} to={`/inventory/grn/${grn.id}`}>
                        <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{grn.id}</p>
                              <p className="text-xs text-muted-foreground truncate">{grn.supplierName}</p>
                            </div>
                            <Badge className={`${statusColors[grn.status] ?? 'bg-gray-500'} text-white border-0 text-xs flex-shrink-0`}>
                              {grn.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                            <span>{grn.items?.length ?? 0} items</span>
                            <span>{formatCurrency(totalValue)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
              )}
              <Link to="/inventory/grn/new">
                <Button variant="outline" size="sm" className="w-full mt-1">
                  + Create New GRN
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Stock Movements */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Movements</CardTitle>
                <Link to="/inventory/movements">
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
                    All <ArrowRightIcon className="w-3 h-3 ml-1 inline" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : kpis.recentMovements.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">No movements yet</p>
              ) : (
                kpis.recentMovements.map((m: any) => {
                  const product = MOCK_PRODUCTS.find(p => p.id === m.productId);
                  const meta = MOVEMENT_LABELS[m.movementType] ?? MOVEMENT_LABELS[m.type] ?? { label: m.movementType ?? m.type, color: 'bg-gray-500' };
                  return (
                    <div key={m.id} className="flex items-start gap-2.5 py-1.5 border-b last:border-0">
                      <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${meta.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{product?.name ?? m.productId}</p>
                        <div className="flex justify-between items-center mt-0.5">
                          <span className="text-xs text-muted-foreground">{meta.label}</span>
                          <span className="text-xs font-medium">×{m.quantity}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
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
        <h2 className="text-lg font-semibold mb-3">Quick Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map(link => (
            <Link key={link.to} to={link.to}>
              <div className="group relative rounded-xl overflow-hidden border hover:shadow-lg transition-all h-28">
                <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                <div className="relative h-full flex flex-col justify-end p-3">
                  <p className="text-white font-semibold text-sm leading-tight">{link.label}</p>
                  <p className="text-white/75 text-xs mt-0.5 leading-tight">{link.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
