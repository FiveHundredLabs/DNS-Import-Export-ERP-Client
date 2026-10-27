import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { useGRN } from '../../hooks/useGRN';
import { PurchaseOrderStatusBadge } from './components/PurchaseOrderStatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  TrendingUp,
  FilePlus,
  Store,
  Boxes,
  BarChart3,
  ArrowRight,
  AlertCircle,
  Package,
} from 'lucide-react';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';

export function PurchasingDashboard() {
  const navigate = useNavigate();
  const { purchaseOrders, loading } = usePurchaseOrders();
  const { suppliers } = useFinanceLedger();
  const { grns } = useGRN();

  const metrics = useMemo(() => {
    const totalCount = purchaseOrders.length;
    const pendingApproval = purchaseOrders.filter((po) => po.status === 'PENDING_APPROVAL');
    const approved = purchaseOrders.filter((po) => po.status === 'APPROVED');
    const sent = purchaseOrders.filter((po) => po.status === 'SENT_TO_SUPPLIER');
    const drafts = purchaseOrders.filter((po) => po.status === 'DRAFT');

    const totalSpend = purchaseOrders
      .filter((po) => po.status !== 'REJECTED' && po.status !== 'CANCELLED')
      .reduce((sum, po) => sum + (po.grandTotal || 0), 0);

    const pendingDeliveries = purchaseOrders.filter(
      (po) => po.status === 'SENT_TO_SUPPLIER' || po.status === 'PARTIALLY_RECEIVED'
    );

    return {
      totalCount,
      pendingApprovalCount: pendingApproval.length,
      approvedCount: approved.length,
      sentCount: sent.length,
      draftsCount: drafts.length,
      totalSpend,
      pendingDeliveriesCount: pendingDeliveries.length,
      activeSuppliersCount: suppliers.filter((s) => s.status === 'ACTIVE').length,
    };
  }, [purchaseOrders, suppliers]);

  const recentPOs = useMemo(() => {
    return [...purchaseOrders].slice(0, 5);
  }, [purchaseOrders]);

  const pendingApprovals = useMemo(() => {
    return purchaseOrders.filter((po) => po.status === 'PENDING_APPROVAL');
  }, [purchaseOrders]);

  if (loading) {
    return (
      <div className="space-y-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Purchasing & Procurement Dashboard
            </h1>
            <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 text-xs font-mono">
              ROLE: PURCHASING_OFFICER
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Supplier procurement, Purchase Order generation, approval tracking, and receiving inspection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/purchasing/orders/new')}
            className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
          >
            <FilePlus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Procurement Value
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
                  {formatCurrency(metrics.totalSpend)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Across <span className="font-semibold text-slate-700">{metrics.totalCount}</span> total purchase orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Pending Internal Approval
                </p>
                <p className="text-2xl font-bold text-amber-900 mt-1 font-mono tabular-nums">
                  {metrics.pendingApprovalCount}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Awaiting Manager / Director authorization
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Approved & Dispatched
                </p>
                <p className="text-2xl font-bold text-emerald-900 mt-1 font-mono tabular-nums">
                  {metrics.approvedCount + metrics.sentCount}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              <span className="font-semibold text-slate-700">{metrics.sentCount}</span> currently sent to suppliers
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Active Suppliers
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1 font-mono tabular-nums">
                  {metrics.activeSuppliersCount}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Store className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              <span className="font-semibold text-slate-700">{grns.length}</span> Goods Received Notes on file
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => navigate('/purchasing/orders')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs text-center transition-all group"
        >
          <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 mt-2">Purchase Orders</span>
          <span className="text-[10px] text-slate-500">{purchaseOrders.length} Records</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/purchasing/suppliers')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs text-center transition-all group"
        >
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 mt-2">Suppliers</span>
          <span className="text-[10px] text-slate-500">{suppliers.length} Registered</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/purchasing/grn')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs text-center transition-all group"
        >
          <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 mt-2">GRNs (Read-Only)</span>
          <span className="text-[10px] text-slate-500">{grns.length} Received</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/purchasing/reports')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs text-center transition-all group"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 mt-2">Reports Hub</span>
          <span className="text-[10px] text-slate-500">Analytics & Exports</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/purchasing/orders?status=PENDING_APPROVAL')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs text-center transition-all group"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Clock className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 mt-2">Pending Approvals</span>
          <span className="text-[10px] text-slate-500">{metrics.pendingApprovalCount} Waiting</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/purchasing/returns')}
          className="flex flex-col items-center justify-center p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs text-center transition-all group relative overflow-hidden"
        >
          <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Truck className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 mt-2">Purchase Returns</span>
          <span className="text-[9px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded mt-0.5">
            Under Dev
          </span>
        </button>
      </div>

      {/* Two Column Layout: Pending Approvals & Recent POs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Purchase Orders */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Recent Purchase Orders
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest procurement transactions and order status transitions
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/purchasing/orders')}
                className="gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">PO Number</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Order Date</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPOs.map((po) => (
                      <tr
                        key={po.id}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => navigate(`/purchasing/orders/${po.id}`)}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {po.poNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-[180px] truncate">
                          {po.supplierName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {formatDate(po.orderDate)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(po.grandTotal, po.currency)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <PurchaseOrderStatusBadge status={po.status} />
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/purchasing/orders/${po.id}`)}
                            className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals & Delivery Schedule */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pending Internal Approvals Queue */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Pending Approvals
                </CardTitle>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px]">
                {pendingApprovals.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500/70 mb-2" />
                  All submitted POs have been authorized.
                </div>
              ) : (
                pendingApprovals.map((po) => (
                  <div
                    key={po.id}
                    onClick={() => navigate(`/purchasing/orders/${po.id}`)}
                    className="p-3 bg-amber-50/40 hover:bg-amber-50/80 rounded-lg border border-amber-200/70 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">{po.poNumber}</span>
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {formatCurrency(po.grandTotal)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{po.supplierName}</p>
                    <div className="flex items-center justify-between text-[10px] text-amber-800 pt-1">
                      <span>Initiated by: {po.createdByName?.split(' ')[0]}</span>
                      <span className="font-medium">Manager Review</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Supplier Directory Quick Glance */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Key Suppliers
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/purchasing/suppliers')}
                className="h-6 text-[11px] text-blue-600 px-1.5"
              >
                Directory
              </Button>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {suppliers.slice(0, 4).map((sup) => (
                <div
                  key={sup.id}
                  onClick={() => navigate('/purchasing/suppliers')}
                  className="p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">{sup.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{sup.code} • {sup.paymentTerms}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      sup.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                        : 'bg-slate-100 text-slate-500 text-[10px]'
                    }
                  >
                    {sup.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
