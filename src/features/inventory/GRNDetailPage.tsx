import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'sonner';

export function GRNDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { grnService } = useGRN();
  
  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchGRN = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await grnService.getGRNById(id);
        if (!data) {
          setError('GRN not found');
        } else {
          setGrn(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGRN();
  }, [id, grnService]);

  const handleApprove = async () => {
    if (comment.length < 3) {
      toast.error('Comment must be at least 3 characters long');
      return;
    }
    if (!id || !user) return;
    try {
      await grnService.approveGRN(id, user.id, user.name);
      toast.success('GRN approved successfully');
      navigate('/inventory/grn');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve GRN');
    }
  };

  const handleReject = async () => {
    if (comment.length < 3) {
      toast.error('Reason must be at least 3 characters long');
      return;
    }
    if (!id || !user) return;
    try {
      await grnService.rejectGRN(id, comment, user.id, user.name);
      toast.success('GRN rejected successfully');
      navigate('/inventory/grn');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject GRN');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-500';
      case 'SUBMITTED': return 'bg-primary-light';
      case 'APPROVED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="p-6 text-center text-red-500">
        <h2 className="text-xl font-bold">Error Loading GRN</h2>
        <p>{error}</p>
        <Button onClick={() => navigate('/inventory/grn')} className="mt-4">Back to List</Button>
      </div>
    );
  }

  const totalValue = grn.items?.reduce((acc: number, item: any) => acc + ((item.unitCostSnapshot ?? item.unitCost ?? 0) * (item.receivedQuantity - (item.damagedQuantity || 0))), 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">GRN Number: {grn.grnNumber || grn.id}</h1>
          <Badge className={`${getStatusColor(grn.status)} text-white border-0`}>{grn.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {grn.status === 'APPROVED' && (
            <Button
              onClick={() => navigate(`/finance/ap/bills/new?grnId=${grn.id}`)}
              className="bg-primary hover:bg-primary-hover text-white text-xs"
            >
              Cost in Finance (Create Vendor Bill)
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory/grn')}>
            Back to List
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GRN Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Supplier Name</div>
              <div className="font-medium">{grn.supplierName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Warehouse</div>
              <div className="font-medium">{grn.warehouseId || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Submitted By</div>
              <div className="font-medium">{grn.submittedByName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Submitted At</div>
              <div className="font-medium">{grn.submittedAt ? formatDate(grn.submittedAt) : 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Expected Qty</TableHead>
                <TableHead className="text-right">Received Qty</TableHead>
                <TableHead className="text-right">Damaged Qty</TableHead>
                <TableHead className="text-right">Good Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Line Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.items?.map((item: any, idx: number) => {
                const product = MOCK_PRODUCTS.find(p => p.id === item.productId);
                const goodQty = item.receivedQuantity - (item.damagedQuantity || 0);
                const unitCost = item.unitCostSnapshot ?? item.unitCost ?? 0;
                const lineValue = goodQty * unitCost;
                return (
                  <TableRow key={idx}>
                    <TableCell>{product?.name || item.productId}</TableCell>
                    <TableCell>{product?.sku || 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.expectedQuantity}</TableCell>
                    <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                    <TableCell className="text-right">{item.damagedQuantity || 0}</TableCell>
                    <TableCell className="text-right">{goodQty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(unitCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(lineValue)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-4 text-lg font-bold">
            Total Value: {formatCurrency(totalValue)}
          </div>
        </CardContent>
      </Card>

      {grn.status === 'SUBMITTED' && user?.role === 'MANAGER' && (
        <Card className="border-primary-border bg-primary-light">
          <CardHeader>
            <CardTitle className="text-blue-800">Manager Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter approval or rejection comment (min 3 chars)..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="bg-white"
            />
            <div className="flex gap-4">
              <Button onClick={handleApprove} variant="default" className="bg-green-600 hover:bg-green-700">Approve</Button>
              <Button onClick={handleReject} variant="destructive">Reject</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
