import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../hooks/useAuth';
import { OrderStatus } from '../../types/order';
import { Customer } from '../../types/customer';
import { customerService } from '../../services/CustomerService';
import { OrderStatusBadge } from './OrderStatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import {
  ShoppingCart,
  Plus,
  Search,
  ArrowUpDown,
  Eye,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Building2,
  Truck,
  Activity,
  Calendar,
  X,
  ChevronRight,
} from 'lucide-react';

const STATUS_FILTERS: Array<{ label: string; value: OrderStatus | 'ALL' }> = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Special Approval', value: 'SPECIAL_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Picking', value: 'PICKING' },
  { label: 'Issued', value: 'ISSUED' },
  { label: 'Invoiced', value: 'INVOICED' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function OrderListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const initialCustomerId = searchParams.get('customerId') || undefined;

  const {
    orders,
    loading,
    error,
    filters,
    setFilters,
    total,
    totalPages,
  } = useOrders(
    initialCustomerId
      ? { page: 1, pageSize: 20, status: 'ALL', sortByDate: 'desc', customerId: initialCustomerId }
      : undefined
  );

  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await customerService.listCustomers(
          currentUser.role === 'SALES_REP'
            ? { assignedRepId: currentUser.id, pageSize: 100 }
            : { pageSize: 100 }
        );
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to load customers for filter', err);
      }
    }
    loadCustomers();
  }, [currentUser]);

  const handleSearchChange = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleCustomerFilter = (custId: string) => {
    setFilters({ ...filters, customerId: custId ? custId : undefined, page: 1 });
  };

  const handleStatusFilter = (status: OrderStatus | 'ALL') => {
    setFilters({ ...filters, status, page: 1 });
  };

  const handleSpecialApprovalFilter = (isSpecial: boolean | undefined) => {
    setFilters({ ...filters, isSpecialApproval: isSpecial, page: 1 });
  };

  const handleToggleSort = () => {
    const nextSort = filters.sortByDate === 'asc' ? 'desc' : 'asc';
    setFilters({ ...filters, sortByDate: nextSort });
  };

  // Metrics summary
  const pendingApprovalsCount = orders.filter(
    (o) => o.status === 'PENDING_APPROVAL' || o.status === 'SPECIAL_APPROVAL'
  ).length;
  const specialOrdersCount = orders.filter((o) => o.isSpecialApproval).length;
  const inFulfillmentCount = orders.filter((o) =>
    ['APPROVED', 'PICKING', 'PARTIALLY_ISSUED', 'ISSUED', 'INVOICED', 'DISPATCHED'].includes(o.status)
  ).length;
  const totalValue = orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalAmount : 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Sales Orders & Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standard vs Special Sales Orders, commercial credit limits, and fulfillment state machine.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/orders/tracking')}
            className="gap-1.5 border-primary-border text-primary-text hover:bg-primary-light"
          >
            <Activity className="h-3.5 w-3.5 text-primary" />
            Pipeline Tracking
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/orders/new')}
            className="bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New Sales Order
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[13px] font-medium text-slate-600 truncate">Total Filtered</span>
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900 truncate">{total} Orders</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">Active order portfolio</div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[13px] font-medium text-amber-700 truncate">Pending Approval</span>
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <div className="mt-2 text-xl font-semibold tabular-nums text-amber-600 truncate">{pendingApprovalsCount}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {specialOrdersCount} require special approval
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[13px] font-medium text-sky-700 truncate">In Fulfillment</span>
            <Truck className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="mt-2 text-xl font-semibold tabular-nums text-primary truncate">{inFulfillmentCount}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">Picking, Invoiced, or Dispatched</div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-emerald-700 truncate">Active Order Value</span>
            <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2 min-w-0">
            <AmountDisplay amount={totalValue} className="text-emerald-600 font-mono" />
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">Excludes cancelled</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order #, customer code, or name..."
                value={filters.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Customer Filter */}
            <div className="w-full md:w-64">
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                <Select
                  value={filters.customerId || '__all__'}
                  onValueChange={(val) => handleCustomerFilter(val === '__all__' ? '' : val)}
                >
                  <SelectTrigger className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-white">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value || undefined, page: 1 })
                  }
                  className="pl-8 text-xs h-9 w-36"
                  title="Filter orders from date"
                  aria-label="From Date"
                />
              </div>
              <span className="text-xs text-slate-400">to</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value || undefined, page: 1 })
                  }
                  className="pl-8 text-xs h-9 w-36"
                  title="Filter orders to date"
                  aria-label="To Date"
                />
              </div>
              {(filters.startDate || filters.endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFilters({ ...filters, startDate: undefined, endDate: undefined, page: 1 })
                  }
                  className="h-9 px-2 text-xs text-slate-500 hover:text-rose-600"
                  title="Clear Date Filter"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Special Approval Filter Toggle */}
            <div className="flex items-center gap-1.5">
              <Button
                variant={filters.isSpecialApproval ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  handleSpecialApprovalFilter(filters.isSpecialApproval ? undefined : true)
                }
                className={
                  filters.isSpecialApproval
                    ? 'bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5'
                    : 'text-xs gap-1.5 text-slate-700'
                }
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Special Approval Only
              </Button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-3">
            {STATUS_FILTERS.map((tab) => {
              const isActive = (filters.status || 'ALL') === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 text-xs ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-slate-200">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Sales Order Registry
          </CardTitle>
          <div className="text-xs text-slate-500">
            Showing {orders.length} of {total} orders
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading enterprise sales orders...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-500">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-semibold text-slate-700 text-sm">No Sales Orders Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No orders match your filter criteria. Create a new sales order or convert from an approved quotation.
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/orders/new')}
                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs mt-2"
              >
                Create First Order
              </Button>
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Visible on small screens, hidden on md+) */}
              <div className="block md:hidden p-3 space-y-3">
                {orders.map((order) => {
                  const itemCount = order.items?.length || 0;
                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      {/* Top Row: Order # + Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {order.orderNumber}
                          </span>
                          {order.quotationNumber && (
                            <span className="text-[10.5px] text-slate-400 font-mono">
                              Quote: {order.quotationNumber}
                            </span>
                          )}
                        </div>
                        <OrderStatusBadge
                          status={order.status}
                          isSpecialApproval={order.isSpecialApproval}
                        />
                      </div>

                      {/* Customer Name & Code */}
                      <div className="mt-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {order.customerNameSnapshot}
                        </h4>
                        <span className="font-mono text-[11px] text-slate-400">
                          {order.customerCodeSnapshot}
                        </span>
                      </div>

                      {/* Middle: Items Count & Total Amount */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
                          <span className="mx-1 text-slate-300">•</span>
                          <span>{order.requestedCreditDays}d Credit</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </div>

                      {/* Bottom Footer: Date & Rep */}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{formatDate(order.createdAt)}</span>
                        <span className="flex items-center text-primary font-semibold gap-0.5">
                          View Order <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. Desktop Full Table View (Hidden on mobile, block on md+) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">
                        <button
                          onClick={handleToggleSort}
                          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-primary text-xs"
                        >
                          Order #
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden lg:table-cell">Sales Rep</TableHead>
                      <TableHead className="hidden md:table-cell text-center">Credit Terms</TableHead>
                      <TableHead className="text-right">Order Amount</TableHead>
                      <TableHead className="text-center">Status / Approval</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors focus:outline-hidden focus:bg-slate-50 group"
                        tabIndex={0}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/orders/${order.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-mono text-[13px] font-semibold text-slate-900">
                          <span className="text-primary hover:underline">
                            {order.orderNumber}
                          </span>
                          {order.quotationNumber && (
                            <div className="text-xs text-slate-400 font-normal mt-0.5">
                              Quote: {order.quotationNumber}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-[13px] text-slate-600">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[13px] text-slate-900">
                            {order.customerNameSnapshot}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {order.customerCodeSnapshot}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-[13px] text-slate-600">
                          {order.salesRepNameSnapshot}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {order.requestedCreditDays} Days Credit
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13.5px] font-semibold text-slate-900">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <OrderStatusBadge
                            status={order.status}
                            isSpecialApproval={order.isSpecialApproval}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 text-xs">
              <span className="text-slate-500">
                Page {filters.page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                  className="text-xs h-7"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                  className="text-xs h-7"
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
