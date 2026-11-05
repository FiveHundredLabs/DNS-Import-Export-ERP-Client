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
  const isDirector = role === 'DIRECTOR';
  const isManager = role === 'MANAGER';

  // ─── Summary KPI Metrics & Visual Data ──────────────────────────────────────
  const stats = useMemo(() => {
    const list = grns || [];
    const totalGRNs = list.length;
    const approvedGRNs = list.filter((g) => g.status === 'APPROVED' || g.status === 'COSTED').length;
    const submittedGRNs = list.filter((g) => g.status === 'SUBMITTED').length;
    const pendingVerificationGRNs = list.filter((g) => g.status === 'PENDING_STOCK_MANAGER_APPROVAL').length;
    const draftGRNs = list.filter((g) => g.status === 'DRAFT').length;
    const rejectedGRNs = list.filter((g) => g.status === 'REJECTED' || g.status === 'STOCK_MANAGER_REJECTED').length;

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
      pendingVerificationGRNs,
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
        if (filter === 'Pending Verification') {
          if (g.status !== 'PENDING_STOCK_MANAGER_APPROVAL') return false;
        } else if (filter === 'Rejected') {
          if (g.status !== 'REJECTED' && g.status !== 'STOCK_MANAGER_REJECTED') return false;
        } else if (filter !== 'All' && g.status !== filter.toUpperCase()) {
          return false;
        }
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
          isDirector ? (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-mono py-1 px-3">
              Read-Only View
            </Badge>
          ) : isStockKeeper || isManager || role === 'STOCK_MANAGER' ? (
            <Button
              size="sm"
              onClick={() => navigate('/inventory/grn/new')}
              className="gap-1.5 text-xs font-semibold shadow-xs h-9 px-4"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New GRN Intake</span>
            </Button>
          ) : null
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
                { label: 'Pending Verification', count: stats.pendingVerificationGRNs },
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
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredGRNs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm p-4">
              <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              No GRN records found
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Hidden on md+) */}
              <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
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
                    <div
                      key={g.id}
                      onClick={() => navigate(`/inventory/grn/${g.id}`)}
                      className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-xs text-primary">{g.grnNumber || g.id}</span>
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">{g.supplierName || 'Unknown Supplier'}</p>
                        </div>
                        {getStatusBadge(g.status)}
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 bg-slate-50 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Lines</span>
                          <span className="font-bold text-slate-700">{g.items?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Units</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {totalReceived}
                            {totalDamaged > 0 && <span className="text-rose-600 text-[10px]"> ({totalDamaged}d)</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Date</span>
                          <span className="font-medium text-slate-700 text-[11px]">
                            {g.submittedAt ? formatDate(g.submittedAt) : g.createdAt ? formatDate(g.createdAt) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {!isStockKeeper && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="text-slate-500 text-[11px]">Landed Value</span>
                          <span className="font-bold font-mono text-slate-900">{formatCurrency(totalValue)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto [scrollbar-width:thin]">
                <Table className="min-w-[760px] w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="text-xs font-semibold w-36">GRN Number</TableHead>
                      <TableHead className="text-xs font-semibold min-w-[200px]">Supplier Name</TableHead>
                      <TableHead className="text-xs font-semibold w-28">Date</TableHead>
                      <TableHead className="text-right text-xs font-semibold w-24">Product Lines</TableHead>
                      {isStockKeeper ? (
                        <TableHead className="text-right text-xs font-semibold w-40">Received Units (Damaged)</TableHead>
                      ) : (
                        <TableHead className="text-right text-xs font-semibold w-36">Total Value</TableHead>
                      )}
                      <TableHead className="text-center text-xs font-semibold w-28">Status</TableHead>
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
                            {g.grnNumber || g.id}
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  </div>
);
}
