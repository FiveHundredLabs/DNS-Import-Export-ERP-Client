import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { useGRN } from '../../hooks/useGRN';
import { formatCurrency, formatDate } from '../../utils/formatters';

export function GRNListPage() {
  const { grns, loading } = useGRN();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredGRNs = grns?.filter(g => {
    if (filter !== 'All' && g.status !== filter.toUpperCase()) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!g.id.toLowerCase().includes(s) && !g.supplierName?.toLowerCase().includes(s)) return false;
    }
    return true;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-500 hover:bg-slate-600';
      case 'SUBMITTED': return 'bg-primary-light hover:bg-primary';
      case 'APPROVED': return 'bg-green-500 hover:bg-green-600';
      case 'REJECTED': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">GRN List</h1>
        <Button onClick={() => navigate('/inventory/grn/new')}>New GRN</Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>GRN Records</CardTitle>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
            <div className="flex gap-2">
              {['All', 'Draft', 'Submitted', 'Approved', 'Rejected'].map(f => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search GRN number or supplier..."
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
          ) : filteredGRNs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No GRN records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items Count</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGRNs.map((g: any) => {
                  const totalValue = g.items?.reduce((acc: number, item: any) => acc + (item.unitCost * item.receivedQuantity), 0) || 0;
                  return (
                    <TableRow
                      key={g.id}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors focus:outline-hidden focus:bg-slate-50"
                      tabIndex={0}
                      onClick={() => navigate(`/inventory/grn/${g.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/inventory/grn/${g.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium text-primary hover:underline">{g.id}</TableCell>
                      <TableCell>{g.supplierName || 'Unknown Supplier'}</TableCell>
                      <TableCell>{g.submittedAt ? formatDate(g.submittedAt) : (g.createdAt ? formatDate(g.createdAt) : 'N/A')}</TableCell>
                      <TableCell className="text-right">{g.items?.length || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalValue)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${getStatusColor(g.status)} text-white border-0`}>{g.status}</Badge>
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
