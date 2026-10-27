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
import { UnitBarcodeModal } from '../../components/inventory/UnitBarcodeModal';
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { toast } from 'sonner';
import { Barcode, Printer, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export function GRNDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { grnService } = useGRN();

  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

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
      case 'DRAFT':
        return 'bg-slate-500';
      case 'SUBMITTED':
        return 'bg-amber-500';
      case 'APPROVED':
        return 'bg-emerald-600';
      case 'REJECTED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
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
        <Button onClick={() => navigate('/inventory/grn')} className="mt-4">
          Back to List
        </Button>
      </div>
    );
  }

  const totalValue =
    grn.items?.reduce(
      (acc: number, item: any) =>
        acc +
        (item.unitCostSnapshot ?? item.unitCost ?? 0) *
          (item.receivedQuantity - (item.damagedQuantity || 0)),
      0
    ) || 0;

  const isStockKeeper = user?.role === 'STOCK_KEEPER';
  const hasDamagedStock = grn.items?.some((i: any) => (i.damagedQuantity || 0) > 0);
  const totalUnits =
    grn.items?.reduce(
      (acc: number, item: any) => acc + (item.receivedQuantity - (item.damagedQuantity || 0)),
      0
    ) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">GRN Number: {grn.grnNumber || grn.id}</h1>
          <Badge className={`${getStatusColor(grn.status)} text-white border-0`}>{grn.status}</Badge>
          {grn.sourceType && (
            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
              Source: {grn.sourceType === 'PO' ? `PO (${grn.poNumber || 'Ref'})` : 'Manual Intake'}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Barcodes Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBarcodeModalOpen(true)}
            className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5"
          >
            <Printer className="h-3.5 w-3.5" />
            Unit Barcodes &amp; Stickers ({totalUnits})
          </Button>

          {grn.status === 'APPROVED' && !isStockKeeper && (
            <Button
              onClick={() => navigate(`/finance/ap/bills/new?grnId=${grn.id}`)}
              className="bg-primary hover:bg-primary-hover text-white text-xs"
            >
              Cost in Finance (Create Vendor Bill)
            </Button>
          )}
          {hasDamagedStock && !isStockKeeper && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/finance/ap/debit-notes?grnId=${grn.id}`)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
            >
              Return Damaged Stock (Debit Note)
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
              <div className="font-medium text-slate-900">{grn.supplierName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Receiving Warehouse</div>
              <div className="font-medium text-slate-900">{grn.warehouseId || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">PO Reference</div>
              <div className="font-medium font-mono text-primary">
                {grn.poNumber || (grn.sourceType === 'PO' ? 'PO Linked' : 'Manual Receipt')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Physical Tagging Status</div>
              <div>
                {grn.barcodesConfirmed ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 text-xs">
                    ✓ All Units Labeled
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">
                    Pending Physical Affixing
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Line Items &amp; Barcode Sets</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsBarcodeModalOpen(true)}
            className="text-xs text-primary gap-1 font-semibold"
          >
            <Barcode className="h-3.5 w-3.5" />
            View Barcode Stickers
          </Button>
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
                <TableHead className="text-center">Unit Barcodes</TableHead>
                {!isStockKeeper && <TableHead className="text-right">Unit Cost</TableHead>}
                {!isStockKeeper && <TableHead className="text-right">Line Value</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.items?.map((item: any, idx: number) => {
                const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
                const goodQty = item.receivedQuantity - (item.damagedQuantity || 0);
                const unitCost = item.unitCostSnapshot ?? item.unitCost ?? 0;
                const lineValue = goodQty * unitCost;
                const barcodesCount = item.unitRecords?.length || item.unitBarcodes?.length || goodQty;

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product?.name || item.productNameSnapshot || item.productId}</TableCell>
                    <TableCell className="font-mono text-xs">{product?.sku || item.skuSnapshot || 'N/A'}</TableCell>
                    <TableCell className="text-right font-mono">{item.expectedQuantity}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{item.receivedQuantity}</TableCell>
                    <TableCell className="text-right font-mono text-rose-600">{item.damagedQuantity || 0}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900">{goodQty}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBarcodeModalOpen(true)}
                        className="h-7 text-[11px] gap-1 font-mono text-primary"
                      >
                        <Barcode className="h-3 w-3" />
                        {barcodesCount} Unit Barcodes
                      </Button>
                    </TableCell>
                    {!isStockKeeper && (
                      <TableCell className="text-right font-mono">{formatCurrency(unitCost)}</TableCell>
                    )}
                    {!isStockKeeper && (
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(lineValue)}</TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-4 text-base font-bold text-slate-900">
            {isStockKeeper
              ? `Total Accepted Units: ${totalUnits}`
              : `Total Value: ${formatCurrency(totalValue)}`}
          </div>
        </CardContent>
      </Card>

      {/* ── Manager Approval Section ── */}
      {grn.status === 'SUBMITTED' && user?.role === 'MANAGER' && (
        <Card className="border-primary-border bg-primary-light">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-900">Manager Approval &amp; Inward Release</CardTitle>
              <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Physical Labeling Verified
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white/80 border border-blue-200 rounded-lg text-xs text-blue-950 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Stock Keeper has verified physical intake and affixed system-generated barcode stickers to all {totalUnits} received units in the warehouse.
              </span>
            </div>

            <Textarea
              placeholder="Enter approval or rejection comment (min 3 chars)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-white"
            />
            <div className="flex gap-4">
              <Button onClick={handleApprove} variant="default" className="bg-green-600 hover:bg-green-700">
                Approve &amp; Update Inventory
              </Button>
              <Button onClick={handleReject} variant="destructive">
                Reject GRN
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Unit Barcode Stickers Modal ── */}
      {isBarcodeModalOpen && (
        <UnitBarcodeModal
          isOpen={isBarcodeModalOpen}
          onClose={() => setIsBarcodeModalOpen(false)}
          items={grn.items || []}
          grnNumber={grn.grnNumber || grn.id}
          supplierName={grn.supplierName || 'Supplier'}
          warehouseId={grn.warehouseId || 'WH-MAIN'}
          onConfirmLabeled={() => {
            setIsBarcodeModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
