import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { StatCard } from '../../components/common/StatCard';
import { PageHeader } from '../../components/common/PageHeader';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  PlusCircle,
  ShieldCheck,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Package,
  Clock,
  BarChart3,
  Activity,
  Search,
  ChevronRight,
} from 'lucide-react';

export function GRNListPage() {
  const { grns, loading } = useGRN();
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const isStockKeeper = role === 'STOCK_KEEPER';

  // ─── Summary KPI Metrics & Visual Data ──────────────────────────────────────
  const stats = useMemo(() => {
    const list = grns || [];
    const totalGRNs = list.length;
    const approvedGRNs = list.filter((g) => g.status === 'APPROVED' || g.status === 'COSTED').length;
    const submittedGRNs = list.filter((g) => g.status === 'SUBMITTED').length;
    const draftGRNs = list.filter((g) => g.status === 'DRAFT').length;
    const rejectedGRNs = list.filter((g) => g.status === 'REJECTED').length;

    let totalReceivedUnits = 0;
    let totalDamagedUnits = 0;
    let totalCostValue = 0;
    let confirmedLabeledGRNs = 0;

    list.forEach((g: any) => {
      let grnReceived = 0;
      let grnDamaged = 0;
      g.items?.forEach((item: any) => {
        const rec = item.receivedQuantity ?? 0;
        const dmg = item.damagedQuantity ?? 0;
        grnReceived += rec;
        grnDamaged += dmg;
        totalReceivedUnits += rec;
        totalDamagedUnits += dmg;
        const cost = item.unitCostSnapshot ?? item.unitCost ?? 0;
        totalCostValue += cost * (rec - dmg);
      });

      if (g.barcodesConfirmed) {
        confirmedLabeledGRNs += 1;
      }
    });

    const goodUnits = Math.max(0, totalReceivedUnits - totalDamagedUnits);
    const labelingRate = totalGRNs > 0 ? Math.round((confirmedLabeledGRNs / totalGRNs) * 100) : 100;

    // Bar chart data for status distribution
    const chartData = [
      { name: 'Approved', count: approvedGRNs, color: '#10B981', label: 'Active Stock' },
      { name: 'Submitted', count: submittedGRNs, color: '#F59E0B', label: 'Pending Review' },
      { name: 'Draft', count: draftGRNs, color: '#64748B', label: 'In Progress' },
      { name: 'Rejected', count: rejectedGRNs, color: '#F43F5E', label: 'Discrepancy' },
    ];

    return {
      totalGRNs,
      approvedGRNs,
      submittedGRNs,
      draftGRNs,
      rejectedGRNs,
      totalReceivedUnits,
      totalDamagedUnits,
      goodUnits,
      totalCostValue,
      labelingRate,
      chartData,
    };
  }, [grns]);

  // ─── Filtered GRN List ──────────────────────────────────────────────────────
  const filteredGRNs = useMemo(() => {
    return (
      grns?.filter((g) => {
        if (filter !== 'All' && g.status !== filter.toUpperCase()) return false;
        if (search.trim()) {
          const s = search.toLowerCase().trim();
          if (
            !g.id.toLowerCase().includes(s) &&
            !g.grnNumber?.toLowerCase().includes(s) &&
            !g.supplierName?.toLowerCase().includes(s)
          ) {
            return false;
          }
        }
        return true;
      }) || []
    );
  }, [grns, filter, search]);

  const getStatusBadge = (status: string) => {
    return <InventoryStatusBadge status={status} />;
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Standardized Page Header ── */}
      <PageHeader
        title="Goods Received Notes (GRN)"
        subtitle="Inbound warehouse intake receipts, physical quantity counting, and unit serialization logs."
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            {isStockKeeper && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Stock Keeper Intake
              </Badge>
            )}
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
              GRN Registry
            </Badge>
          </div>
        }
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'GRN Registry' },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => navigate('/inventory/grn/new')}
            className="gap-1.5 text-xs font-semibold shadow-xs h-9 px-4"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New GRN Intake</span>
          </Button>
        }
      />

      {/* ── Warehouse Isolation Mode Banner for Stock Keeper ── */}
      {isStockKeeper && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Warehouse Isolation Active:</strong> Stock Keepers record physical quantities received and damaged only. Commercial costing &amp; unit values are managed by Finance upon approval.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 hidden sm:inline">
            Physical Audit Mode
          </span>
        </div>
      )}

      {/* ── Global KPI Cards Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inward Receipts"
          value={stats.totalGRNs}
          icon={Boxes}
          variant="indigo"
          badge="Intake Registry"
        />

        <StatCard
          title="Verified & Approved"
          value={stats.approvedGRNs}
          icon={CheckCircle2}
          variant="emerald"
          trend={{ value: `${stats.goodUnits.toLocaleString()} units`, isPositive: true }}
          progress={stats.totalGRNs > 0 ? (stats.approvedGRNs / stats.totalGRNs) * 100 : 0}
        />

        <StatCard
          title="Pending Finance Review"
          value={stats.submittedGRNs}
          icon={Clock}
          variant="amber"
          badge={stats.submittedGRNs > 0 ? `${stats.submittedGRNs} In Queue` : 'Up to date'}
        />

        <StatCard
          title="Damaged / Quarantine"
          value={`${stats.totalDamagedUnits} Units`}
          icon={AlertTriangle}
          variant={stats.totalDamagedUnits > 0 ? 'rose' : 'blue'}
          badge={stats.totalDamagedUnits > 0 ? 'Quarantine Active' : 'Zero Defect'}
        />
      </div>

      {/* ── Global Charts & Status Breakdown Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Bar Chart for Intake Status Distribution */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span>GRN Intake Status Distribution</span>
                </CardTitle>

              </div>
              <Badge variant="outline" className="font-mono text-[11px] bg-slate-50">
                {stats.totalGRNs} Total GRNs
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-md space-y-1">
                            <p className="font-semibold">{data.name} Receipts</p>
                            <p className="text-slate-300">
                              Count: <span className="text-white font-bold">{data.count}</span>
                            </p>
                            <p className="text-slate-400 text-[10px]">{data.label}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Chart Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
              {stats.chartData.map((item) => (
                <div key={item.name} className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{item.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Operational Status Pipeline Cards */}
        <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <span>Inward Pipeline &amp; Compliance</span>
            </CardTitle>

          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {/* Status Card 1: Active In Inventory */}
            <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Active Stock Released
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  {stats.approvedGRNs} GRNs
                </span>
              </div>
              <p className="text-[11px] text-emerald-700">
                {stats.goodUnits.toLocaleString()} units stocked &amp; available for sales dispatch.
              </p>
            </div>

            {/* Status Card 2: Awaiting Finance / Manager Approval */}
            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Dock Intake Review
                </span>
                <span className="text-xs font-mono font-bold text-amber-800">
                  {stats.submittedGRNs} GRNs
                </span>
              </div>
              <p className="text-[11px] text-amber-700">
                Physical counts entered; awaiting manager sign-off &amp; finance costing.
              </p>
            </div>

            {/* Status Card 3: Physical Labeling Rate */}
            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-blue-600" />
                  Barcode Tagging Rate
                </span>
                <span className="text-xs font-mono font-bold text-blue-800">
                  {stats.labelingRate}%
                </span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${stats.labelingRate}%` }}
                />
              </div>
              <p className="text-[10px] text-blue-700">
                Inward receipts with barcode stickers verified on unit packages.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── GRN Table Card ── */}
      <Card className="border border-slate-200 shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-slate-900">GRN Records</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
            {/* Filter Tabs with Dynamic Counts */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: 'All', count: stats.totalGRNs },
                { label: 'Draft', count: stats.draftGRNs },
                { label: 'Submitted', count: stats.submittedGRNs },
                { label: 'Approved', count: stats.approvedGRNs },
                { label: 'Rejected', count: stats.rejectedGRNs },
              ].map(({ label, count }) => {
                const isActive = filter === label;
                return (
                  <Button
                    key={label}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(label)}
                    className={`text-xs h-8 gap-1.5 transition-all ${
                      isActive ? 'font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search GRN number or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredGRNs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              No GRN records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="text-xs font-semibold">GRN Number</TableHead>
                  <TableHead className="text-xs font-semibold">Supplier Name</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Product Lines</TableHead>
                  {isStockKeeper ? (
                    <TableHead className="text-right text-xs font-semibold">Received Units (Damaged)</TableHead>
                  ) : (
                    <TableHead className="text-right text-xs font-semibold">Total Value</TableHead>
                  )}
                  <TableHead className="text-center text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGRNs.map((g: any) => {
                  const totalReceived =
                    g.items?.reduce(
                      (acc: number, item: any) => acc + (item.receivedQuantity ?? 0),
                      0
                    ) || 0;
                  const totalDamaged =
                    g.items?.reduce(
                      (acc: number, item: any) => acc + (item.damagedQuantity ?? 0),
                      0
                    ) || 0;
                  const totalValue =
                    g.items?.reduce(
                      (acc: number, item: any) =>
                        acc +
                        (item.unitCostSnapshot ?? item.unitCost ?? 0) *
                          ((item.receivedQuantity ?? 0) - (item.damagedQuantity ?? 0)),
                      0
                    ) || 0;

                  return (
                    <TableRow
                      key={g.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors focus:outline-hidden focus:bg-slate-50"
                      tabIndex={0}
                      onClick={() => navigate(`/inventory/grn/${g.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/inventory/grn/${g.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-mono font-semibold text-xs text-primary hover:underline">
                        {g.id}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {g.supplierName || 'Unknown Supplier'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {g.submittedAt
                          ? formatDate(g.submittedAt)
                          : g.createdAt
                          ? formatDate(g.createdAt)
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-slate-700">
                        {g.items?.length || 0}
                      </TableCell>
                      {isStockKeeper ? (
                        <TableCell className="text-right text-xs font-mono">
                          <span className="font-bold text-slate-900">{totalReceived}</span>
                          {totalDamaged > 0 && (
                            <span className="text-rose-600 font-semibold ml-1.5">
                              ({totalDamaged} damaged)
                            </span>
                          )}
                        </TableCell>
                      ) : (
                        <TableCell className="text-right text-xs font-mono font-medium">
                          {formatCurrency(totalValue)}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        {getStatusBadge(g.status)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => navigate(`/inventory/grn/${g.id}`)}
                          className="text-slate-600 hover:text-slate-900 font-medium gap-1"
                        >
                          <span>Details</span>
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
