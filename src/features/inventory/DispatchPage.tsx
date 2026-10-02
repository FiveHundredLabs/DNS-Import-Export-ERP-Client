import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { orderService } from '../../services/OrderService';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'sonner';

export function DispatchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { user } = useAuth();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders({ status: ['ISSUED', 'INVOICED', 'DISPATCHED', 'DELIVERED'] });
      setOrders(data);
    } catch (err: any) {
      toast.error('Failed to load orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!o.id.toLowerCase().includes(s) && !(o.customerName || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const handleAction = async (orderId: string, nextStatus: string) => {
    if (!user) return;
    try {
      setProcessingId(orderId);
      await orderService.advanceOrderStatus(orderId, nextStatus, user);
      toast.success(`Order advanced to ${nextStatus} successfully`);
      fetchOrders();
    } catch (err: any) {
      toast.error('Failed to update order status: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED': return 'bg-purple-500';
      case 'INVOICED': return 'bg-cyan-500';
      case 'DISPATCHED': return 'bg-primary-light';
      case 'DELIVERED': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dispatch &amp; Delivery</h1>

      <Card>
        <CardHeader>
          <CardTitle>Orders Pending Dispatch/Delivery</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 items-end">
            <div className="flex flex-col gap-1 w-full sm:w-48">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {['ALL', 'ISSUED', 'INVOICED', 'DISPATCHED', 'DELIVERED'].map(s => (
                  <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search by order ID or customer name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No orders found matching criteria
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.id}</TableCell>
                    <TableCell>{o.customerName || 'N/A'}</TableCell>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(o.totalAmount || 0)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${getStatusColor(o.status)} text-white border-0`}>{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {(o.status === 'ISSUED' || o.status === 'INVOICED') && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(o.id, 'DISPATCHED')}
                          disabled={processingId === o.id}
                        >
                          Confirm Dispatch
                        </Button>
                      )}
                      {o.status === 'DISPATCHED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                          onClick={() => handleAction(o.id, 'DELIVERED')}
                          disabled={processingId === o.id}
                        >
                          Confirm Delivery
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
