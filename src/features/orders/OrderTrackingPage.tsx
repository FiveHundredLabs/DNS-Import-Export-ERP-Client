import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { OrderStatus, SalesOrder } from '../../types/order';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { OrderStatusBadge } from './OrderStatusBadge';
import {
  Activity,
  Search,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  FileCheck,
  Package,
  Eye,
  AlertCircle,
  XCircle,
} from 'lucide-react';

const PIPELINE_STEPS = [
  { key: 'CREATED', label: 'Order Created', icon: Package },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { key: 'INVOICED', label: 'Invoiced', icon: FileCheck },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

function getPipelineStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'DRAFT':
    case 'SUBMITTED':
    case 'PENDING_APPROVAL':
    case 'SPECIAL_APPROVAL':
      return 0; // Created
    case 'APPROVED':
    case 'PICKING':
    case 'PARTIALLY_ISSUED':
    case 'ISSUED':
      return 1; // Approved / in fulfillment
    case 'INVOICED':
      return 2; // Invoiced
    case 'DISPATCHED':
      return 3; // Dispatched
    case 'DELIVERED':
      return 4; // Delivered
    case 'REJECTED':
    case 'CANCELLED':
      return -1; // Aborted
    default:
      return 0;
  }
}

export function OrderTrackingPage() {
  const navigate = useNavigate();
  const { orders, loading, error, filters, setFilters } = useOrders({
    page: 1,
    pageSize: 50,
    status: 'ALL',
    sortByDate: 'desc',
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(term) ||
      o.customerNameSnapshot.toLowerCase().includes(term) ||
      o.customerCodeSnapshot.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sales Orders
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            Sales Rep Dedicated Order Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline progression: Order Created → Approved → Invoiced → Dispatched → Delivered.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search orders or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading order pipeline tracking...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-500">{error}</div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Activity className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-700 text-sm">No Active Orders in Pipeline</h3>
          <p className="text-xs text-slate-500">Create an order to begin tracking pipeline progress.</p>
          <Button
            size="sm"
            onClick={() => navigate('/orders/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs mt-2"
          >
            Create Sales Order
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const stepIndex = getPipelineStepIndex(order.status);
            const isAborted = stepIndex === -1;

            return (
              <Card
                key={order.id}
                className="overflow-hidden border border-slate-200 hover:shadow-sm transition-shadow"
              >
                <CardHeader className="bg-slate-50/70 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge
                        status={order.status}
                        isSpecialApproval={order.isSpecialApproval}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Customer: <strong className="text-slate-800">{order.customerNameSnapshot}</strong> ({order.customerCodeSnapshot})
                      <span className="mx-2">•</span>
                      Date: {formatDate(order.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Value</div>
                      <div className="font-mono font-bold text-sm text-indigo-700">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="text-xs h-8 gap-1"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      View
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6">
                  {isAborted ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>
                        Order halted: {order.status === 'REJECTED' ? 'Rejected' : 'Cancelled'}.{' '}
                        {order.rejectionReason || order.cancellationReason || ''}
                      </span>
                    </div>
                  ) : (
                    <div>
                      {/* Responsive 5-Step Pipeline Tracker */}
                      <div className="relative">
                        {/* Connecting bar */}
                        <div className="hidden sm:block absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 z-0">
                          <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{
                              width: `${(stepIndex / (PIPELINE_STEPS.length - 1)) * 100}%`,
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                          {PIPELINE_STEPS.map((step, idx) => {
                            const isDone = idx < stepIndex;
                            const isCurrent = idx === stepIndex;
                            const isUpcoming = idx > stepIndex;
                            const Icon = step.icon;

                            return (
                              <div
                                key={step.key}
                                className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center"
                              >
                                <div
                                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all shadow-xs ${
                                    isDone
                                      ? 'bg-emerald-600 text-white'
                                      : isCurrent
                                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                                  }`}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <Icon className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <div
                                    className={`text-xs font-semibold ${
                                      isCurrent
                                        ? 'text-indigo-700'
                                        : isDone
                                        ? 'text-slate-800'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {step.label}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {isDone && 'Completed'}
                                    {isCurrent && (
                                      <span className="font-semibold text-indigo-600">
                                        Current Stage
                                      </span>
                                    )}
                                    {isUpcoming && 'Pending'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Items snapshot summary */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                        <div>
                          Items: <span className="font-medium text-slate-700">{order.items.length} line items</span>
                          {' '}({order.items.reduce((s, i) => s + i.orderedQuantity, 0)} units total)
                        </div>
                        <div>
                          Delivery to:{' '}
                          <span className="font-medium text-slate-700">{order.deliveryAddress}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
