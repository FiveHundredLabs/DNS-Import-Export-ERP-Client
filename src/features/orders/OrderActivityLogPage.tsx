import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { orderService } from '../../services/OrderService';
import { orderActivityService, UserActivityItem } from '../../services/OrderActivityService';
import { SalesOrder } from '../../types/order';
import { OrderActivityTimeline } from './OrderActivityTimeline';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Activity,
  ArrowLeft,
  Search,
  ShoppingCart,
  ChevronRight,
  Clock,
  CheckCircle2,
  Filter,
  Eye,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Banknote,
  Send,
  UserCheck,
  TrendingUp,
  FileText,
  AlertCircle,
  Truck,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function OrderActivityLogPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  // Mode: Default to 'user-activity' (user's comprehensive monthly activity log)
  // unless an explicit order id was requested in the URL.
  const [viewMode, setViewMode] = useState<'user-activity' | 'order-lifecycle'>(
    id ? 'order-lifecycle' : 'user-activity'
  );

  // Time filter: 'LAST_30_DAYS' (default: last month), 'LAST_7_DAYS', 'ALL'
  const [timeRange, setTimeRange] = useState<'LAST_30_DAYS' | 'LAST_7_DAYS' | 'ALL'>('LAST_30_DAYS');
  // Category filter: 'ALL', 'ORDER', 'PAYMENT', 'QUOTATION', 'APPROVAL'
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ORDER' | 'PAYMENT' | 'QUOTATION' | 'APPROVAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. User Activity State
  const [userActivities, setUserActivities] = useState<UserActivityItem[]>([]);
  const [loadingUserActivities, setLoadingUserActivities] = useState(true);

  // 2. Order Inspector State (for specific order inspection)
  const { orders, loading: loadingOrders, error: orderError } = useOrders({
    page: 1,
    pageSize: 50,
    status: 'ALL',
    sortByDate: 'desc',
    salesRepId: role === 'SALES_REP' ? currentUser.id : undefined,
  });

  const queryOrderId = id || searchParams.get('orderId');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(queryOrderId || null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  // Load user's comprehensive activity log
  useEffect(() => {
    let isMounted = true;
    async function loadActivities() {
      setLoadingUserActivities(true);
      try {
        const data = await orderActivityService.getUserActivityLog(currentUser.id, role);
        if (isMounted) {
          setUserActivities(data);
        }
      } catch (err) {
        console.error('Failed to load user activity log', err);
      } finally {
        if (isMounted) setLoadingUserActivities(false);
      }
    }
    loadActivities();
    return () => {
      isMounted = false;
    };
  }, [currentUser.id, role]);

  // Sync selected order for order lifecycle mode
  useEffect(() => {
    if (orders.length > 0) {
      const targetId = queryOrderId || selectedOrderId || orders[0].id;
      const match = orders.find((o) => o.id === targetId) || orders[0];
      setSelectedOrderId(match.id);
      setSelectedOrder(match);
    }
  }, [orders, queryOrderId]);

  // Select order for deep inspection
  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setSearchParams({ orderId });
    try {
      const fresh = await orderService.getOrderById(orderId, {
        userId: currentUser.id,
        role: currentUser.role,
        areaId: currentUser.areaId,
      });
      if (fresh) setSelectedOrder(fresh);
    } catch {
      const found = orders.find((o) => o.id === orderId);
      if (found) setSelectedOrder(found);
    }
  };

  // Filter user activities based on time range, category, and search query
  const filteredActivities = useMemo(() => {
    if (userActivities.length === 0) return [];

    // Calculate anchor reference date:
    // If timestamps are from mock dataset (e.g. Feb 2025), anchor to the newest activity in the set.
    // If real items exist closer to today, anchor to Date.now().
    const maxItemTime = Math.max(...userActivities.map((a) => new Date(a.timestamp).getTime()));
    const now = Date.now();
    // If newest item is older than 60 days from now, use maxItemTime as the reference anchor.
    const anchorTime = now - maxItemTime > 60 * 24 * 60 * 60 * 1000 ? maxItemTime : now;

    let timeFiltered = userActivities;
    if (timeRange === 'LAST_30_DAYS') {
      const thirtyDaysMs = 31 * 24 * 60 * 60 * 1000;
      timeFiltered = userActivities.filter(
        (a) => new Date(a.timestamp).getTime() >= anchorTime - thirtyDaysMs
      );
    } else if (timeRange === 'LAST_7_DAYS') {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      timeFiltered = userActivities.filter(
        (a) => new Date(a.timestamp).getTime() >= anchorTime - sevenDaysMs
      );
    }

    // Category filter
    let catFiltered = timeFiltered;
    if (categoryFilter !== 'ALL') {
      catFiltered = catFiltered.filter((a) => a.category === categoryFilter);
    }

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      catFiltered = catFiltered.filter(
        (a) =>
          a.referenceNumber.toLowerCase().includes(q) ||
          a.customerName.toLowerCase().includes(q) ||
          (a.customerCode && a.customerCode.toLowerCase().includes(q)) ||
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    return catFiltered;
  }, [userActivities, timeRange, categoryFilter, searchTerm]);

  // Aggregate Metrics over current filtered set
  const metrics = useMemo(() => {
    let orderCount = 0;
    let orderTotal = 0;
    let paymentCount = 0;
    let paymentTotal = 0;
    let quoteCount = 0;
    let quoteTotal = 0;

    filteredActivities.forEach((act) => {
      if (act.category === 'ORDER' && act.action === 'ORDER_CREATED') {
        orderCount++;
        orderTotal += act.amount || 0;
      } else if (act.category === 'PAYMENT') {
        paymentCount++;
        paymentTotal += act.amount || 0;
      } else if (act.category === 'QUOTATION') {
        quoteCount++;
        quoteTotal += act.amount || 0;
      }
    });

    return {
      totalEvents: filteredActivities.length,
      orderCount,
      orderTotal,
      paymentCount,
      paymentTotal,
      quoteCount,
      quoteTotal,
    };
  }, [filteredActivities]);

  return (
    <div className="space-y-4 w-full pb-24 md:pb-10 max-w-5xl mx-auto px-2 sm:px-4">
      {/* 1. Header with Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-1 font-medium cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 border border-teal-200/60 flex items-center justify-center shrink-0 shadow-2xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  User Activity Log
                </h1>
                <Badge variant="outline" className="text-[10.5px] bg-teal-50 text-teal-800 border-teal-200">
                  Last Month Active
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.name} ({role.replace('_', ' ')}) • Complete 30-day timeline across orders, collections &amp; quotes.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('user-activity')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
              viewMode === 'user-activity'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Activity className="h-3.5 w-3.5 text-teal-600" />
            My Activity (Last Month)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('order-lifecycle')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
              viewMode === 'order-lifecycle'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Clock className="h-3.5 w-3.5 text-primary" />
            Order Inspector
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: USER ACTIVITY LOG (LAST MONTH) */}
      {/* ========================================================================= */}
      {viewMode === 'user-activity' ? (
        <div className="space-y-4">
          {/* Summary KPI Cards (Responsive 4-grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Actions</span>
                <Activity className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {metrics.totalEvents}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">In selected period</div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Orders Placed</span>
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {metrics.orderCount}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                {formatCurrency(metrics.orderTotal)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Payments Collected</span>
                <Banknote className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {metrics.paymentCount}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                {formatCurrency(metrics.paymentTotal)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Quotations Sent</span>
                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                {metrics.quoteCount}
              </div>
              <div className="text-[11px] text-amber-700 font-medium truncate mt-0.5">
                {formatCurrency(metrics.quoteTotal)}
              </div>
            </div>
          </div>

          {/* Filter Bar (Date Period + Category Tabs + Search Bar) */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-white">
            <CardContent className="p-3 sm:p-4 space-y-3">
              {/* Row 1: Search & Period Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search by customer, order #, receipt #, quote #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs h-9 w-full bg-slate-50/70"
                  />
                </div>

                {/* Date range picker pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setTimeRange('LAST_30_DAYS')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                      timeRange === 'LAST_30_DAYS'
                        ? 'bg-white text-primary shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Last Month (30d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeRange('LAST_7_DAYS')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                      timeRange === 'LAST_7_DAYS'
                        ? 'bg-white text-primary shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeRange('ALL')}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                      timeRange === 'ALL'
                        ? 'bg-white text-primary shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    All History
                  </button>
                </div>
              </div>

              {/* Row 2: Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Category:
                </span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors',
                    categoryFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  All ({userActivities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ORDER')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1',
                    categoryFilter === 'ORDER'
                      ? 'bg-primary text-white'
                      : 'bg-primary-light/60 text-primary hover:bg-primary-light'
                  )}
                >
                  <ShoppingCart className="h-3 w-3" />
                  Orders
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('PAYMENT')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1',
                    categoryFilter === 'PAYMENT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  )}
                >
                  <Banknote className="h-3 w-3" />
                  Collections
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('QUOTATION')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1',
                    categoryFilter === 'QUOTATION'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  )}
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  Quotations
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('APPROVAL')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors flex items-center gap-1',
                    categoryFilter === 'APPROVAL'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approvals
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Stream List */}
          {loadingUserActivities ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              Loading user activity log for {currentUser.name}...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
              <Activity className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-700 text-sm">No Activity Events Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No logged actions match the selected period or filters. Try selecting "All History" or clear search.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTimeRange('ALL');
                  setCategoryFilter('ALL');
                  setSearchTerm('');
                }}
                className="text-xs"
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act) => {
                const isOrder = act.category === 'ORDER';
                const isPayment = act.category === 'PAYMENT';
                const isQuote = act.category === 'QUOTATION';
                const isApproval = act.category === 'APPROVAL';

                return (
                  <div
                    key={act.id}
                    onClick={() => navigate(act.link)}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all shadow-2xs cursor-pointer active:scale-[0.995] space-y-2.5"
                  >
                    {/* Header Row: Category Badge + Reference + Time */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs',
                            isOrder && 'bg-primary-light text-primary',
                            isPayment && 'bg-emerald-50 text-emerald-600',
                            isQuote && 'bg-amber-50 text-amber-600',
                            isApproval && 'bg-purple-50 text-purple-600'
                          )}
                        >
                          {isOrder && <ShoppingCart className="h-3.5 w-3.5" />}
                          {isPayment && <Banknote className="h-3.5 w-3.5" />}
                          {isQuote && <FileSpreadsheet className="h-3.5 w-3.5" />}
                          {isApproval && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {act.referenceNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {act.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant={
                            act.statusBadge.variant === 'success'
                              ? 'success'
                              : act.statusBadge.variant === 'warning'
                              ? 'warning'
                              : act.statusBadge.variant === 'destructive'
                              ? 'destructive'
                              : 'default'
                          }
                          className="text-[10px] px-2"
                        >
                          {act.statusBadge.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Middle: Customer Details & Description */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{act.customerName}</span>
                        {act.customerCode && (
                          <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                            ({act.customerCode})
                          </span>
                        )}
                        <p className="text-[11.5px] text-slate-500 mt-0.5">{act.description}</p>
                      </div>

                      {act.amount !== undefined && (
                        <div className="text-right sm:self-center shrink-0">
                          <span className="text-xs text-slate-400 block sm:hidden">Amount:</span>
                          <span className="text-sm font-bold text-slate-900 tabular-nums">
                            {formatCurrency(act.amount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Row: Timestamp & Link */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(act.timestamp)}</span>
                        <span className="mx-1">•</span>
                        <span>{act.actorName}</span>
                      </div>

                      <div className="flex items-center text-primary font-semibold hover:underline gap-0.5">
                        <span>View Details</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW MODE 2: ORDER LIFECYCLE INSPECTOR */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Order Selector Strip */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" />
                Select Sales Order to Inspect Timeline
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {orders.length} orders in territory
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {orders.map((o) => {
                const isSelected = selectedOrderId === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => handleSelectOrder(o.id)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-left transition-all shrink-0 border active:scale-95 cursor-pointer',
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-mono font-bold text-xs', isSelected ? 'text-white' : 'text-slate-900')}>
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
                    <div className={cn('text-[10.5px] truncate max-w-[160px] mt-0.5', isSelected ? 'text-white/80' : 'text-slate-500')}>
                      {o.customerNameSnapshot}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Order Timeline Component */}
          {loadingOrders ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
              Loading order history...
            </div>
          ) : orderError ? (
            <div className="p-8 text-center text-xs text-rose-500 bg-rose-50 rounded-xl border border-rose-200">
              {orderError}
            </div>
          ) : !selectedOrder ? (
            <Card className="p-12 text-center space-y-3">
              <Activity className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-700 text-sm">No Order Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select one of the sales orders above to view its technical multi-role fulfillment timeline.
              </p>
            </Card>
          ) : (
            <OrderActivityTimeline
              order={selectedOrder}
              onOrderUpdated={(updated) => setSelectedOrder(updated)}
            />
          )}
        </div>
      )}
    </div>
  );
}
