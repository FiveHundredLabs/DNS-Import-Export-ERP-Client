import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { orderService } from '../../services/OrderService';
import { SalesOrder } from '../../types/order';
import { OrderActivityTimeline } from './OrderActivityTimeline';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Activity,
  ArrowLeft,
  Search,
  ShoppingCart,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  Receipt,
  UserCheck,
  Package,
  Filter,
  Eye,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function OrderActivityLogPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  // If user is Sales Rep, only load their own orders (enforced by useOrders & repository)
  const { orders, loading, error } = useOrders({
    page: 1,
    pageSize: 50,
    status: 'ALL',
    sortByDate: 'desc',
    salesRepId: role === 'SALES_REP' ? currentUser.id : undefined,
  });

  const queryOrderId = id || searchParams.get('orderId');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(queryOrderId || null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);

  // Sync selected order whenever orders or queryOrderId change
  useEffect(() => {
    if (orders.length > 0) {
      const targetId = queryOrderId || selectedOrderId || orders[0].id;
      const match = orders.find((o) => o.id === targetId) || orders[0];
      setSelectedOrderId(match.id);
      setSelectedOrder(match);
    }
  }, [orders, queryOrderId]);

  // When order selection changes, fetch fresh details
  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setSearchParams({ orderId });
    setShowOrderDrawer(false);
    try {
      const fresh = await orderService.getOrderById(orderId, {
        userId: currentUser.id,
        role: currentUser.role,
        areaId: currentUser.areaId,
      });
      if (fresh) setSelectedOrder(fresh);
    } catch (e) {
      // fallback to array find
      const found = orders.find((o) => o.id === orderId);
      if (found) setSelectedOrder(found);
    }
  };

  const handleOrderUpdated = (updated: SalesOrder) => {
    setSelectedOrder(updated);
  };

  // Filtered orders list for selector
  const filteredOrders = orders.filter((o) => {
    if (!orderSearchTerm.trim()) return true;
    const q = orderSearchTerm.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerNameSnapshot.toLowerCase().includes(q) ||
      o.customerCodeSnapshot.toLowerCase().includes(q)
    );
  });

  // KPI Metrics
  const pendingApprovalsCount = orders.filter(
    (o) => o.status === 'PENDING_APPROVAL' || o.status === 'SPECIAL_APPROVAL'
  ).length;
  const inTransitCount = orders.filter(
    (o) => o.status === 'DISPATCHED' || o.status === 'ISSUED' || o.status === 'PICKING'
  ).length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

  return (
    <div className="space-y-4 w-full pb-16 max-w-5xl mx-auto px-1 sm:px-4">
      {/* 1. Header with Back button and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-1 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sales Orders
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Order Activity Log
              </h1>
              <p className="text-xs text-slate-500">
                {role === 'SALES_REP'
                  ? `Complete lifecycle history for orders created by ${currentUser.name}`
                  : `Territory order activity tracking & milestone audit`}
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {selectedOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/orders/${selectedOrder.id}`)}
              className="h-8 text-xs gap-1.5 text-slate-700"
            >
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              View Full Order
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate('/orders/new')}
            className="h-8 text-xs bg-primary hover:bg-primary-hover text-white gap-1 shadow-xs"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            New Order
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Pill Row (Mobile-Optimized) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Orders
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{orders.length}</div>
          <div className="text-[10px] text-slate-500 font-medium">Assigned to Rep</div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/80 border border-amber-200 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-amber-700 uppercase tracking-wider">
            Pending Approval
          </div>
          <div className="text-lg font-bold text-amber-900 mt-0.5">{pendingApprovalsCount}</div>
          <div className="text-[10px] text-amber-700 font-medium">With Area/Sales Mgr</div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-cyan-50/80 border border-cyan-200 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-cyan-700 uppercase tracking-wider">
            In Dispatch / Transit
          </div>
          <div className="text-lg font-bold text-cyan-900 mt-0.5">{inTransitCount}</div>
          <div className="text-[10px] text-cyan-700 font-medium">Dispatched &amp; Moving</div>
        </div>

        <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
          <div className="text-[10.5px] font-semibold text-emerald-700 uppercase tracking-wider">
            Delivered
          </div>
          <div className="text-lg font-bold text-emerald-900 mt-0.5">{deliveredCount}</div>
          <div className="text-[10px] text-emerald-700 font-medium">Customer Acknowledged</div>
        </div>
      </div>

      {/* 3. Mobile Order Switcher Selector Strip */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Select Order to Inspect Timeline
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Showing {filteredOrders.length} orders
          </span>
        </div>

        {/* Quick horizontal order pill picker */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {orders.map((o) => {
            const isSelected = selectedOrderId === o.id;
            return (
              <button
                key={o.id}
                onClick={() => handleSelectOrder(o.id)}
                className={cn(
                  'px-3 py-2 rounded-xl text-left transition-all shrink-0 border active:scale-95',
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'font-mono font-bold text-xs',
                      isSelected ? 'text-white' : 'text-slate-900'
                    )}
                  >
                    {o.orderNumber}
                  </span>
                  <span
                    className={cn(
                      'text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full',
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {o.status}
                  </span>
                </div>
                <div
                  className={cn(
                    'text-[10.5px] truncate max-w-[160px] mt-0.5',
                    isSelected ? 'text-white/80' : 'text-slate-500'
                  )}
                >
                  {o.customerNameSnapshot}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Timeline Display */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading order activity history...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-500 bg-rose-50 rounded-xl border border-rose-200">
          {error}
        </div>
      ) : !selectedOrder ? (
        <Card className="p-12 text-center space-y-3">
          <Activity className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-700 text-sm">No Order Selected</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Select one of your sales orders from above to view its full chronological activity log.
          </p>
        </Card>
      ) : (
        <OrderActivityTimeline
          order={selectedOrder}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </div>
  );
}
