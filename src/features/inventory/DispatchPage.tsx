import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { orderService } from '../../services/OrderService';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'sonner';
import { DeliveryNoteModal } from './DeliveryNoteModal';
import { Printer, Truck } from 'lucide-react';

export function DispatchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrderForDeliveryNote, setSelectedOrderForDeliveryNote] = useState<any | null>(null);
  const [deliveryNoteModalOpen, setDeliveryNoteModalOpen] = useState(false);

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
      case 'ISSUED': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INVOICED': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'DISPATCHED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-bold">Dispatch &amp; Delivery</h1>

      <Card>
        <CardHeader>
          <CardTitle>Orders Pending Dispatch/Delivery</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 items-end">
            <div className="flex flex-col gap-1 w-full sm:w-48">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val)}
              >
                <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {['ALL', 'ISSUED', 'INVOICED', 'DISPATCHED', 'DELIVERED'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'ALL' ? 'All Statuses' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <>
              {/* Mobile Cards View (< md) */}
              <div className="block md:hidden divide-y divide-border/60">
                {filteredOrders.map(o => (
                  <div key={o.id} className="p-4 space-y-3 bg-card hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-primary block">{o.id}</span>
                        <p className="font-semibold text-sm text-foreground truncate mt-0.5">{o.customerName || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(o.createdAt)}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(o.status)} text-[10px] font-mono font-semibold uppercase tracking-wider rounded-md px-2 py-0.5 shrink-0`}
                      >
                        {o.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-lg">
                      <span className="text-muted-foreground font-medium">Order Total:</span>
                      <span className="font-mono font-bold text-sm text-foreground">{formatCurrency(o.totalAmount || 0)}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrderForDeliveryNote(o);
                          setDeliveryNoteModalOpen(true);
                        }}
                        className="h-8 text-xs gap-1 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex-1"
                        title="Print 3-Ply Delivery Note (Customer, Accounts, Stores copies)"
                      >
                        <Printer className="h-3.5 w-3.5 text-primary" />
                        <span>3-Ply Note</span>
                      </Button>

                      {(o.status === 'ISSUED' || o.status === 'INVOICED') && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrderForDeliveryNote(o);
                            setDeliveryNoteModalOpen(true);
                          }}
                          disabled={processingId === o.id}
                          className="h-8 text-xs bg-primary hover:bg-primary-hover text-white gap-1 flex-1"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Dispatch</span>
                        </Button>
                      )}

                      {o.status === 'DISPATCHED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 flex-1"
                          onClick={() => handleAction(o.id, 'DELIVERED')}
                          disabled={processingId === o.id}
                        >
                          Confirm Delivery
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto [scrollbar-width:thin]">
                <Table className="min-w-[800px] w-full text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Order Number</TableHead>
                      <TableHead className="min-w-[180px]">Customer Name</TableHead>
                      <TableHead className="w-28">Order Date</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-28 text-center">Status</TableHead>
                      <TableHead className="w-44 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(o => (
                      <TableRow key={o.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium font-mono text-xs">{o.id}</TableCell>
                        <TableCell className="font-semibold text-foreground truncate max-w-[220px]">{o.customerName || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">{formatCurrency(o.totalAmount || 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(o.status)} text-[10px] font-mono font-semibold uppercase tracking-wider rounded-md px-2.5 py-0.5`}
                          >
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOrderForDeliveryNote(o);
                                setDeliveryNoteModalOpen(true);
                              }}
                              className="h-7 text-xs gap-1 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 px-2"
                              title="Print 3-Ply Delivery Note (Customer, Accounts, Stores copies)"
                            >
                              <Printer className="h-3 w-3 text-primary" />
                              <span>3-Ply Note</span>
                            </Button>

                            {(o.status === 'ISSUED' || o.status === 'INVOICED') && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedOrderForDeliveryNote(o);
                                  setDeliveryNoteModalOpen(true);
                                }}
                                disabled={processingId === o.id}
                                className="h-7 text-xs bg-primary hover:bg-primary-hover text-white gap-1 px-2.5"
                              >
                                <Truck className="h-3 w-3" />
                                <span>Dispatch</span>
                              </Button>
                            )}

                            {o.status === 'DISPATCHED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 px-2"
                                onClick={() => handleAction(o.id, 'DELIVERED')}
                                disabled={processingId === o.id}
                              >
                                Confirm Delivery
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 3-Ply Delivery Note & Driver Logistics Modal */}
      {selectedOrderForDeliveryNote && (
        <DeliveryNoteModal
          open={deliveryNoteModalOpen}
          onOpenChange={setDeliveryNoteModalOpen}
          order={selectedOrderForDeliveryNote}
          onConfirmDispatch={
            selectedOrderForDeliveryNote.status === 'ISSUED' || selectedOrderForDeliveryNote.status === 'INVOICED'
              ? async () => {
                  await handleAction(selectedOrderForDeliveryNote.id, 'DISPATCHED');
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
