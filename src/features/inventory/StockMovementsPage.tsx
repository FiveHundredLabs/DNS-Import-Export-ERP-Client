import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
      case 'GRN_INWARD': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'SALES_ISSUE': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TRANSFER_OUT': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'TRANSFER_IN': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'DAMAGE_WRITE_OFF': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DAMAGE_REVERSAL': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADJUSTMENT': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const movementTypes = [
    'ALL', 'GRN_INWARD', 'SALES_ISSUE', 'TRANSFER_OUT', 
    'TRANSFER_IN', 'DAMAGE_WRITE_OFF', 'DAMAGE_REVERSAL', 'ADJUSTMENT'
  ];

  return (
    <div className="w-full space-y-6">
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
              <Select
                value={typeFilter}
                onValueChange={(val) => setTypeFilter(val)}
              >
                <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <SelectValue placeholder="Movement Type" />
                </SelectTrigger>
                <SelectContent>
                  {movementTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'ALL' ? 'All Types' : t.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        <Badge
                          variant="outline"
                          className={`${getMovementColor(m.movementType ?? m.type)} text-[10px] font-mono font-semibold uppercase tracking-wider rounded-md px-2.5 py-0.5`}
                        >
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
