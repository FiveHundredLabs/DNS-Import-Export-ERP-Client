import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { useInventory } from '../../hooks/useInventory';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatDate } from '../../utils/formatters';

export function StockMovementsPage() {
  const { movements, loading } = useInventory();
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredMovements = useMemo(() => {
    return (movements || []).filter((m: any) => {
      const mType = m.movementType ?? m.type;
      if (typeFilter !== 'ALL' && mType !== typeFilter) return false;
      
      const mDate = new Date(m.timestamp);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (mDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (mDate > toDate) return false;
      }
      return true;
    }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [movements, typeFilter, dateFrom, dateTo]);

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'GRN_INWARD': return 'bg-green-500';
      case 'SALES_ISSUE': return 'bg-primary-light';
      case 'TRANSFER_OUT': return 'bg-orange-500';
      case 'TRANSFER_IN': return 'bg-cyan-500';
      case 'DAMAGE_WRITE_OFF': return 'bg-red-500';
      case 'DAMAGE_REVERSAL': return 'bg-purple-500';
      case 'ADJUSTMENT': return 'bg-slate-500';
      default: return 'bg-gray-500';
    }
  };

  const movementTypes = [
    'ALL', 'GRN_INWARD', 'SALES_ISSUE', 'TRANSFER_OUT', 
    'TRANSFER_IN', 'DAMAGE_WRITE_OFF', 'DAMAGE_REVERSAL', 'ADJUSTMENT'
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock Movements</h1>
        <p className="text-sm text-muted-foreground mt-1 text-amber-600 font-medium">
          Note: Stock movements are immutable audit records.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4 items-end">
            <div className="flex flex-col gap-1 w-full sm:w-48">
              <label className="text-sm font-medium">Movement Type</label>
              <select 
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {movementTypes.map(t => (
                  <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-40">
              <label className="text-sm font-medium">From Date</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-40">
              <label className="text-sm font-medium">To Date</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No stock movements found matching criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m: any) => {
                  const product = MOCK_PRODUCTS.find(p => p.id === m.productId);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(m.timestamp)}</TableCell>
                    <TableCell>
                        <Badge className={`${getMovementColor(m.movementType ?? m.type)} text-white border-0`}>
                          {(m.movementType ?? m.type)?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{product?.name || m.productId}</TableCell>
                      <TableCell>{m.fromLocationId || '-'}</TableCell>
                      <TableCell>{m.toLocationId || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                      <TableCell>{m.referenceId || m.referenceDocument || '-'}</TableCell>
                      <TableCell>{m.performedByName || '-'}</TableCell>
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
