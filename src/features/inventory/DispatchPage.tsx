import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { orderService } from '../../services/orderService';
import { authService } from '../../services/authService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'sonner';

export function DispatchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const user = authService.getCurrentUser();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders({ status: ['ISSUED', 'INVOICED', 'DISPATCHED'] });
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
      case 'DISPATCHED': return 'bg-blue-500';
      case 'DELIVERED': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dispatch & Delivery</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Orders Pending Dispatch/Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No orders pending dispatch
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
                {orders.map(o => (
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
