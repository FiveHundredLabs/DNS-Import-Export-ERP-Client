import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PlusCircle, ShieldCheck } from 'lucide-react';

export function GRNListPage() {
  const { grns, loading } = useGRN();
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const isStockKeeper = role === 'STOCK_KEEPER';

  const filteredGRNs =
    grns?.filter((g) => {
      if (filter !== 'All' && g.status !== filter.toUpperCase()) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!g.id.toLowerCase().includes(s) && !g.supplierName?.toLowerCase().includes(s))
          return false;
      }
      return true;
    }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-500 hover:bg-slate-600';
      case 'SUBMITTED':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'APPROVED':
        return 'bg-green-600 hover:bg-green-700';
      case 'COSTED':
        return 'bg-sky-600 hover:bg-sky-700';
      case 'REJECTED':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
            {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Goods Received Notes (GRN)
            </h1>
            {isStockKeeper && (
              <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Stock Keeper Intake
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Inbound warehouse intake receipts, physical quantity counting, and unit serialization logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* ── GRN Table Card ── */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">GRN Records</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              {['All', 'Draft', 'Submitted', 'Approved', 'Rejected'].map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="text-xs h-8"
                >
                  {f}
                </Button>
              ))}
            </div>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search GRN number or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredGRNs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
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
                        <Badge className={`${getStatusColor(g.status)} text-white border-0 text-xs`}>
                          {g.status}
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
    </div>
  );
}
