import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { useInventory } from '../../hooks/useInventory';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { calculateAvailableForSale } from '../../rules/inventoryRules';

export function StockBalancePage() {
  const { stockBalances, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const enrichedBalances = stockBalances?.map((b: any) => {
    const product = MOCK_PRODUCTS.find(p => p.id === b.productId);
    const availableForSale = calculateAvailableForSale(b) || 0;
    return {
      ...b,
      productName: product?.name || b.productId,
      sku: product?.sku || 'N/A',
      category: product?.category || 'N/A',
      warehouseQuantity: b.locationType === 'WAREHOUSE' ? (b.availableQuantity || 0) : (b.warehouseQuantity || 0),
      showroomQuantity: b.locationType === 'SHOWROOM' ? (b.availableQuantity || 0) : (b.showroomQuantity || 0),
      damagedQuantity: b.damagedQuantity || 0,
      availableForSale,
    };
  }) || [];

  const filteredBalances = enrichedBalances.filter((b: any) => {
    if (lowStockOnly && b.availableForSale >= 10) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!b.sku.toLowerCase().includes(s) && !b.productName.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stock Balance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4 items-center justify-between">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search SKU or Product Name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={e => setLowStockOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Low Stock Only</span>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No stock balances found matching criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Warehouse Qty</TableHead>
                  <TableHead className="text-right">Showroom Qty</TableHead>
                  <TableHead className="text-right">Damaged Qty</TableHead>
                  <TableHead className="text-right">Available for Sale</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((b: any) => {
                  let statusLabel = 'In Stock';
                  let statusColor = 'bg-green-500';
                  
                  if (b.availableForSale <= 0) {
                    statusLabel = 'Out of Stock';
                    statusColor = 'bg-red-500';
                  } else if (b.availableForSale < 10) {
                    statusLabel = 'Low Stock';
                    statusColor = 'bg-amber-500';
                  }

                  return (
                    <TableRow key={b.productId}>
                      <TableCell className="font-medium">{b.sku}</TableCell>
                      <TableCell>{b.productName}</TableCell>
                      <TableCell>{b.category}</TableCell>
                      <TableCell className="text-right">{b.warehouseQuantity}</TableCell>
                      <TableCell className="text-right">{b.showroomQuantity}</TableCell>
                      <TableCell className="text-right">{b.damagedQuantity}</TableCell>
                      <TableCell className="text-right font-bold">{b.availableForSale}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${statusColor} text-white border-0`}>{statusLabel}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
