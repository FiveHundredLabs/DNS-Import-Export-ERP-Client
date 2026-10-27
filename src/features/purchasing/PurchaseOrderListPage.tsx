import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { PurchaseOrderStatusBadge } from './components/PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Printer,
  Clock,
  CheckCircle2,
  Send,
  FileText,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { PurchaseOrderStatus } from '../../types/purchasing';

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') as PurchaseOrderStatus | null;

  const { purchaseOrders, loading, submitPO, deletePO } = usePurchaseOrders();
  const { suppliers } = useFinanceLedger();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'ALL'>(
    initialStatus || 'ALL'
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (statusFilter !== 'ALL' && po.status !== statusFilter) return false;
      if (selectedSupplierId !== 'ALL' && po.supplierId !== selectedSupplierId) return false;
      if (!search.trim()) return true;

      const q = search.toLowerCase();
      return (
        po.poNumber.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        po.supplierCode.toLowerCase().includes(q) ||
        po.createdByName?.toLowerCase().includes(q) ||
        po.items.some(
          (item) =>
            item.productName.toLowerCase().includes(q) ||
            item.productCode.toLowerCase().includes(q)
        )
      );
    });
  }, [purchaseOrders, search, statusFilter, selectedSupplierId]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const metrics = useMemo(() => {
    return {
      all: purchaseOrders.length,
      draft: purchaseOrders.filter((p) => p.status === 'DRAFT').length,
      pending: purchaseOrders.filter((p) => p.status === 'PENDING_APPROVAL').length,
      approved: purchaseOrders.filter((p) => p.status === 'APPROVED').length,
      sent: purchaseOrders.filter((p) => p.status === 'SENT_TO_SUPPLIER').length,
      rejected: purchaseOrders.filter((p) => p.status === 'REJECTED').length,
    };
  }, [purchaseOrders]);

  const handleSubmitDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await submitPO(id);
  };

  const handleDeleteDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this draft Purchase Order?')) {
      await deletePO(id);
    }
  };

  if (loading && purchaseOrders.length === 0) {
    return (
      <div className="space-y-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Purchase Orders
            </h1>
            <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 text-xs">
              Procurement Lifecycle
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage procurement requests, internal approvals, vendor dispatches, and print A4 documents.
          </p>
        </div>

        <Button
          onClick={() => navigate('/purchasing/orders/new')}
          className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Purchase Order</span>
        </Button>
      </div>

      {/* Metric Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { id: 'ALL', label: 'All Orders', count: metrics.all, icon: ShoppingCart },
          { id: 'DRAFT', label: 'Drafts', count: metrics.draft, icon: FileText },
          { id: 'PENDING_APPROVAL', label: 'Pending Approval', count: metrics.pending, icon: Clock },
          { id: 'APPROVED', label: 'Approved', count: metrics.approved, icon: CheckCircle2 },
          { id: 'SENT_TO_SUPPLIER', label: 'Sent to Vendor', count: metrics.sent, icon: Send },
          { id: 'REJECTED', label: 'Rejected', count: metrics.rejected, icon: Filter },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id as any);
                setPage(1);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                  {tab.label}
                </span>
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div className="text-xl font-bold mt-1 font-mono tabular-nums">{tab.count}</div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search PO#, supplier, product code, name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Supplier Dropdown Filter */}
          <select
            value={selectedSupplierId}
            onChange={(e) => {
              setSelectedSupplierId(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs rounded-md border border-slate-200 bg-white px-3 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="ALL">All Suppliers</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">PO Number</th>
                  <th className="py-3 px-4 font-semibold">Supplier</th>
                  <th className="py-3 px-4 font-semibold">Order Date</th>
                  <th className="py-3 px-4 font-semibold">Delivery Due</th>
                  <th className="py-3 px-4 text-center font-semibold">Items</th>
                  <th className="py-3 px-4 text-right font-semibold">Grand Total</th>
                  <th className="py-3 px-4 text-center font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No Purchase Orders found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/purchasing/orders/${po.id}`)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-[200px] truncate">
                        <div>{po.supplierName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{po.supplierCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {formatDate(po.orderDate)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDate(po.expectedDeliveryDate)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {po.items.length}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(po.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <PurchaseOrderStatusBadge status={po.status} />
                      </td>
                      <td
                        className="py-3 px-4 text-right space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/purchasing/orders/${po.id}`)}
                          className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900"
                          title="View PO Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/purchasing/orders/${po.id}/print`)}
                          className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900"
                          title="Print / View A4 Purchase Order"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>

                        {(po.status === 'DRAFT' || po.status === 'REJECTED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/purchasing/orders/${po.id}/edit`)}
                            className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900"
                            title="Edit Purchase Order"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {po.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleSubmitDraft(e, po.id)}
                              className="h-7 text-[11px] px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                              title="Submit for Approval"
                            >
                              Submit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteDraft(e, po.id)}
                              className="h-7 text-xs px-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-200 text-xs text-slate-600">
              <div>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredOrders.length)} of {filteredOrders.length}{' '}
                orders
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
