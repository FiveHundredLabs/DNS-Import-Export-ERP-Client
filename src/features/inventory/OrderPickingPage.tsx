import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { orderService } from '../../services/orderService';
import { inventoryService } from '../../services/inventoryService';
import { authService } from '../../services/authService';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { toast } from 'sonner';

export function OrderPickingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [pickQuantities, setPickQuantities] = useState<Record<string, number>>({});
  const [processing, setProcessing] = useState(false);

  const user = authService.getCurrentUser();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrders({ status: ['APPROVED', 'PICKING'] });
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

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    const initialQtys: Record<string, number> = {};
    order.items?.forEach((item: any, idx: number) => {
      const max = item.approvedQuantity - (item.issuedQuantity || 0);
      initialQtys[idx] = max > 0 ? max : 0;
    });
    setPickQuantities(initialQtys);
  };

  const handleQtyChange = (idx: number, value: string, max: number) => {
    const val = parseInt(value, 10);
    if (isNaN(val) || val < 0) {
      setPickQuantities(prev => ({ ...prev, [idx]: 0 }));
      return;
    }
    setPickQuantities(prev => ({ ...prev, [idx]: Math.min(val, max) }));
  };

  const handleConfirmIssue = async () => {
    if (!selectedOrder || !user) return;
    try {
      setProcessing(true);
      const pickedItems: any[] = [];
      const locationId = 'WAREHOUSE'; // Default location for picking

      for (let i = 0; i < (selectedOrder.items?.length || 0); i++) {
        const item = selectedOrder.items[i];
        const qtyToPick = pickQuantities[i] || 0;
        
        if (qtyToPick > 0) {
          await inventoryService.recordIssue(item.productId, locationId, qtyToPick, selectedOrder.id, user);
          pickedItems.push({ productId: item.productId, quantity: qtyToPick });
        }
      }

      if (pickedItems.length > 0) {
        await orderService.updateFulfillmentStatus(selectedOrder.id, pickedItems, user);
        toast.success('Stock issued successfully');
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error('No items selected for picking');
      }
    } catch (err: any) {
      toast.error('Failed to issue stock: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Order Picking</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-[calc(100vh-200px)] overflow-y-auto">
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No orders pending picking
              </div>
            ) : (
              orders.map(o => (
                <div 
                  key={o.id} 
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedOrder?.id === o.id ? 'border-blue-500 bg-primary-light' : 'hover:bg-slate-50'}`}
                  onClick={() => handleSelectOrder(o)}
                >
                  <div className="font-bold">{o.id}</div>
                  <div className="text-sm">{o.customerName || 'Unknown Customer'}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                    <span>{o.status}</span>
                    <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          {selectedOrder ? (
            <>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Picking Slip: {selectedOrder.id}</CardTitle>
                    <div className="text-muted-foreground mt-1">Customer: {selectedOrder.customerName || 'N/A'}</div>
                  </div>
                  <Button 
                    onClick={handleConfirmIssue} 
                    disabled={processing}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    {processing ? 'Processing...' : 'Confirm Issue'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Appr. Qty</TableHead>
                      <TableHead className="text-right">Issued</TableHead>
                      <TableHead className="text-right w-32">Qty to Pick</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, idx: number) => {
                      const product = MOCK_PRODUCTS.find(p => p.id === item.productId);
                      const approved = item.approvedQuantity || item.quantity;
                      const issued = item.issuedQuantity || 0;
                      const maxToPick = Math.max(0, approved - issued);
                      const currentPick = pickQuantities[idx] || 0;
                      const remaining = approved - issued - currentPick;

                      return (
                        <TableRow key={idx}>
                          <TableCell>{product?.name || item.productId}</TableCell>
                          <TableCell>{product?.sku || '-'}</TableCell>
                          <TableCell className="text-right">{approved}</TableCell>
                          <TableCell className="text-right">{issued}</TableCell>
                          <TableCell className="text-right">
                            <Input 
                              type="number" 
                              min="0" 
                              max={maxToPick}
                              value={currentPick.toString()}
                              onChange={(e) => handleQtyChange(idx, e.target.value, maxToPick)}
                              disabled={maxToPick === 0 || processing}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {remaining}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          ) : (
            <div className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Picking Slip</CardTitle>
              </CardHeader>
              <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground">
                Select an order from the list to view picking slip
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
