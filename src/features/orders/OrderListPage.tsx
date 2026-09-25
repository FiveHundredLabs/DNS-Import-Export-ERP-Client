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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { formatCurrency, formatDate } from '../../utils/formatters';
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
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
            className="text-xs gap-1.5 border-primary-border text-primary-text hover:bg-primary-light"
          >
            <Activity className="h-3.5 w-3.5 text-primary" />
            Pipeline Tracking
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/orders/new')}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New Sales Order
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Filtered</span>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">{total} Orders</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active order portfolio</div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700">Pending Approval</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-600">{pendingApprovalsCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {specialOrdersCount} require special approval
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-sky-700">In Fulfillment</span>
            <Truck className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-xl font-bold text-primary">{inFulfillmentCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Picking, Invoiced, or Dispatched</div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Active Order Value</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 font-mono">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Excludes cancelled</div>
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
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={filters.customerId || ''}
                  onChange={(e) => handleCustomerFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Customers</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
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
                  className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 text-xs ${
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
            <div className="overflow-x-auto">
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
                    <TableHead className="text-right w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs font-semibold text-slate-900">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="hover:underline text-primary text-left"
                        >
                          {order.orderNumber}
                        </button>
                        {order.quotationNumber && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Quote: {order.quotationNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-slate-900">
                          {order.customerNameSnapshot}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {order.customerCodeSnapshot}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-600">
                        {order.salesRepNameSnapshot}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {order.requestedCreditDays} Days Credit
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <OrderStatusBadge
                          status={order.status}
                          isSpecialApproval={order.isSpecialApproval}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                          title="View Order Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
