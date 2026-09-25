import React from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useGRN } from '../../hooks/useGRN';
import { useOrders } from '../../hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Link } from 'react-router-dom';

export function InventoryDashboardPage() {
  const { stockBalances } = useInventory();
  const { grns } = useGRN();
  const { orders } = useOrders();

  const totalStockLines = stockBalances.length;
  const pendingGRNs = grns.filter(g => g.status === 'SUBMITTED').length;
  const lowStockAlerts = stockBalances.filter(b => b.availableQuantity < 10).length;
  const pendingPicking = orders?.filter(o => o.status === 'APPROVED').length || 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockLines}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending GRNs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingGRNs}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {lowStockAlerts} {lowStockAlerts > 0 && <Badge variant="destructive">Alert</Badge>}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Picking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPicking}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold tracking-tight">Quick Links</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/inventory/grn">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex justify-center items-center font-medium">GRN</CardContent>
          </Card>
        </Link>
        <Link to="/inventory/stock">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex justify-center items-center font-medium">Stock Balance</CardContent>
          </Card>
        </Link>
        <Link to="/inventory/picking">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex justify-center items-center font-medium">Order Picking</CardContent>
          </Card>
        </Link>
        <Link to="/inventory/dispatch">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-6 flex justify-center items-center font-medium">Dispatch</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
