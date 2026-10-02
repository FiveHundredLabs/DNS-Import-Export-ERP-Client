import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { inventoryService } from '../../services/InventoryService';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatDate } from '../../utils/formatters';
import { toast } from 'sonner';

export function TransferListPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form State
  const [source, setSource] = useState('WAREHOUSE');
  const [target, setTarget] = useState('SHOWROOM');
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const movements = await inventoryService.getStockMovements();
      // Derive transfers from TRANSFER_OUT movements
      const transferRecords = movements.filter((m: any) => m.movementType === 'TRANSFER_OUT' || m.type === 'TRANSFER_OUT').map((m: any) => ({
        id: m.id,
        fromLocation: m.sourceLocation || m.fromLocationId || 'WAREHOUSE',
        toLocation: m.targetLocation || m.toLocationId || 'SHOWROOM', // To location might be on the corresponding TRANSFER_IN, assuming SHOWROOM
        itemsCount: 1,
        status: 'COMPLETED',
        createdAt: m.timestamp
      }));
      setTransfers(transferRecords);
    } catch (err: any) {
      toast.error('Failed to load transfers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  // Close dropdown when clicking outside the dropdown container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExecuteTransfer = async () => {
    if (!productId) {
      toast.error('Please select a product ID');
      return;
    }
    if (source === target) {
      toast.error('Source and target locations must be different');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (!user) return;

    try {
      setProcessing(true);
      await inventoryService.executeTransfer(source, target, productId, qty, user);
      toast.success('Stock transferred successfully');
      setIsModalOpen(false);
      setProductId('');
      setProductSearch('');
      setQuantity('');
      fetchTransfers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute transfer');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock Transfers</h1>
        <Button onClick={() => setIsModalOpen(true)}>New Transfer</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No transfers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer Number</TableHead>
                  <TableHead>From Location</TableHead>
                  <TableHead>To Location</TableHead>
                  <TableHead className="text-right">Items Count</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.id}</TableCell>
                    <TableCell>{t.fromLocation}</TableCell>
                    <TableCell>{t.toLocation}</TableCell>
                    <TableCell className="text-right">{t.itemsCount}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-500 text-white border-0">{t.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Source</label>
              <select 
                value={source} 
                onChange={e => setSource(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="WAREHOUSE">Warehouse</option>
                <option value="SHOWROOM">Showroom</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Target</label>
              <select 
                value={target} 
                onChange={e => setTarget(e.target.value)}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="WAREHOUSE">Warehouse</option>
                <option value="SHOWROOM">Showroom</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label className="text-right text-sm font-medium pt-2">Product</label>
              <div className="col-span-3 relative" ref={dropdownRef}>
                <Input
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setProductId('');
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search product name or SKU..."
                  autoComplete="off"
                />
                {productId && !showDropdown && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: <span className="font-medium text-foreground">{productSearch}</span>
                  </p>
                )}
                {showDropdown && productSearch && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-md max-h-48 overflow-y-auto">
                    {MOCK_PRODUCTS.filter(p =>
                      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                      p.sku.toLowerCase().includes(productSearch.toLowerCase())
                    ).length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No products found</div>
                    ) : (
                      MOCK_PRODUCTS.filter(p =>
                        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        p.sku.toLowerCase().includes(productSearch.toLowerCase())
                      ).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onMouseDown={e => {
                            e.preventDefault();
                            setProductId(p.id);
                            setProductSearch(`${p.name} (${p.sku})`);
                            setShowDropdown(false);
                          }}
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{p.sku}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Quantity</label>
              <Input 
                type="number"
                min="1"
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setProductSearch(''); setProductId(''); setQuantity(''); }}>Cancel</Button>
            <Button onClick={handleExecuteTransfer} disabled={processing}>
              {processing ? 'Transferring...' : 'Execute Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
