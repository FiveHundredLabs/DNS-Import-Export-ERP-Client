import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGRN } from '../../hooks/useGRN';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Boxes,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  AlertTriangle,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';

export function PurchasingGRNListPage() {
  const navigate = useNavigate();
  const { grns, loading } = useGRN();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const suppliersList = useMemo(() => {
    const map = new Map<string, string>();
    grns?.forEach((g) => {
      if (g.supplierId && g.supplierName) {
        map.set(g.supplierId, g.supplierName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [grns]);

  const filteredGRNs = useMemo(() => {
    return (
      grns?.filter((g) => {
        if (statusFilter !== 'ALL' && g.status !== statusFilter) return false;
        if (selectedSupplier !== 'ALL' && g.supplierId !== selectedSupplier) return false;
        if (!search.trim()) return true;

        const q = search.toLowerCase();
        return (
          g.id.toLowerCase().includes(q) ||
          g.grnNumber?.toLowerCase().includes(q) ||
          g.supplierName?.toLowerCase().includes(q) ||
          (g as any).purchaseOrderNumber?.toLowerCase().includes(q) ||
          g.items?.some(
            (i: any) =>
              i.productNameSnapshot?.toLowerCase().includes(q) ||
              i.skuSnapshot?.toLowerCase().includes(q)
          )
        );
      }) || []
    );
  }, [grns, search, statusFilter, selectedSupplier]);

  const totalPages = Math.ceil(filteredGRNs.length / pageSize) || 1;
  const paginatedGRNs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGRNs.slice(start, start + pageSize);
  }, [filteredGRNs, page, pageSize]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COSTED':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px]">
            Approved & Verified
          </Badge>
        );
      case 'SUBMITTED':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px]">
            Pending Finance Review
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-mono text-[10px]">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  if (loading && (!grns || grns.length === 0)) {
    return (
      <div className="space-y-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Read-Only Notice */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Goods Received Notes (GRN)
            </h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-xs font-mono">
              READ-ONLY VIEW
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Warehouse inward inspection records, delivery fulfillment audits, and receiving verification.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Stock Keeper & Finance operational domain</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search GRN#, PO reference, vendor, product code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Supplier Filter */}
          <select
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs rounded-md border border-slate-200 bg-white px-3 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="ALL">All Suppliers</option>
            {suppliersList.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'ALL' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRN Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">GRN Number</th>
                  <th className="py-3 px-4 font-semibold">Supplier</th>
                  <th className="py-3 px-4 font-semibold">Warehouse / Location</th>
                  <th className="py-3 px-4 text-center font-semibold">Accepted Units</th>
                  <th className="py-3 px-4 text-right font-semibold">Total Value</th>
                  <th className="py-3 px-4 text-center font-semibold">Verification Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedGRNs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No Goods Received Notes found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedGRNs.map((grn) => {
                    const totalAccepted =
                      grn.items?.reduce(
                        (sum: number, item: any) =>
                          sum + (item.receivedQuantity - (item.damagedQuantity || 0)),
                        0
                      ) || 0;

                    const totalValue =
                      grn.totalValue ||
                      grn.items?.reduce(
                        (sum: number, item: any) =>
                          sum +
                          (item.receivedQuantity - (item.damagedQuantity || 0)) *
                            (item.unitCostSnapshot || 0),
                        0
                      ) ||
                      0;

                    return (
                      <tr
                        key={grn.id}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        onClick={() => navigate(`/purchasing/grn/${grn.id}`)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {grn.grnNumber || grn.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-[200px] truncate">
                          {grn.supplierName}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {grn.warehouseId || 'WH-MAIN'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-slate-900">
                          {totalAccepted}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(grn.status)}
                        </td>
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/purchasing/grn/${grn.id}`)}
                            className="h-7 text-xs px-2.5 gap-1 text-slate-600 hover:text-slate-900"
                            title="Inspect Goods Received details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-200 text-xs text-slate-600">
              <div>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredGRNs.length)} of {filteredGRNs.length}{' '}
                records
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
