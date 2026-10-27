import { useState, useEffect, useMemo } from 'react';
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
import { toast } from 'sonner';
import {
  Barcode,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Lock,
  ArrowLeft,
  AlertTriangle,
  Boxes,
  Package,
  Calendar,
  FileText,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export function GRNDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { grnService } = useGRN();
  const { user } = useAuth();

  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

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

  const isStockKeeper = user?.role === 'STOCK_KEEPER';

  const totalExpected = useMemo(() => {
    return grn?.items?.reduce((sum: number, i: any) => sum + (i.expectedQuantity || 0), 0) || 0;
  }, [grn]);

  const totalReceived = useMemo(() => {
    return grn?.items?.reduce((sum: number, i: any) => sum + (i.receivedQuantity || 0), 0) || 0;
  }, [grn]);

  const totalDamaged = useMemo(() => {
    return grn?.items?.reduce((sum: number, i: any) => sum + (i.damagedQuantity || 0), 0) || 0;
  }, [grn]);

  const totalGood = Math.max(0, totalReceived - totalDamaged);

  const totalValue = useMemo(() => {
    return (
      grn?.items?.reduce(
        (acc: number, item: any) =>
          acc +
          (item.unitCostSnapshot ?? item.unitCost ?? 0) *
            ((item.receivedQuantity || 0) - (item.damagedQuantity || 0)),
        0
      ) || 0
    );
  }, [grn]);

  const hasDamagedStock = totalDamaged > 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-xs">
            Approved &amp; Verified
          </Badge>
        );
      case 'COSTED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-xs">
            Costed
          </Badge>
        );
      case 'PRICED':
        return (
          <Badge className="bg-indigo-50 text-indigo-800 border-indigo-300 font-mono text-xs">
            Priced &amp; Released
          </Badge>
        );
      case 'SUBMITTED':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-300 font-mono text-xs">
            Pending Finance Review
          </Badge>
        );
      case 'DRAFT':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-xs">
            Draft Intake
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-mono text-xs">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-xs">
            {status}
          </Badge>
        );
    }
  };

  // Determine active workflow step
  const getWorkflowStep = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 1;
      case 'SUBMITTED':
        return 2;
      case 'APPROVED':
        return 3;
      case 'COSTED':
        return 4;
      case 'PRICED':
        return 5;
      default:
        return 1;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="p-10 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Error Loading GRN</h2>
        <p className="text-sm text-slate-500">{error || 'Unable to locate GRN record.'}</p>
        <Button onClick={() => navigate('/inventory/grn')} className="mt-2">
          Back to GRN List
        </Button>
      </div>
    );
  }

  const currentStep = getWorkflowStep(grn.status);

  return (
    <div className="p-6 space-y-6">
      {/* ── Finance & Warehouse Read-Only Inspection Mode Banner ── */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Warehouse Inward Verification &amp; Read-Only Audit View:</strong> Stock Keepers inspect physical counts, verify packaging, and apply unit barcode stickers. Unit costing, supplier ledger entries, and vendor bills are securely managed in Finance.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="bg-slate-800 text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
            PHYSICAL AUDIT SECURE
          </Badge>
          <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-mono">
            READ-ONLY VIEW
          </Badge>
        </div>
      </div>

      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/inventory/grn')}
            className="text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>GRN List</span>
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                GRN Number: {grn.grnNumber || grn.id}
              </h1>
              {getStatusBadge(grn.status)}
              {grn.sourceType && (
                <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                  Source: {grn.sourceType === 'PO' ? `PO (${grn.poNumber || 'Ref'})` : 'Manual Intake'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Inward delivery inspection • Physical barcode serialization record
            </p>
          </div>
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
            Unit Barcodes &amp; Stickers ({totalGood})
          </Button>

          {/* Finance-only action buttons */}
          {(grn.status === 'APPROVED' || grn.status === 'SUBMITTED') && !isStockKeeper && (
            <Button
              onClick={() => navigate(`/finance/ap/bills/new?grnId=${grn.id}`)}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
            >
              Cost in Finance (Create Vendor Bill)
            </Button>
          )}
          {hasDamagedStock && !isStockKeeper && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/finance/ap/debit-notes?grnId=${grn.id}`)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
            >
              Return Damaged Stock (Debit Note)
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Summary</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => navigate('/inventory/grn')}>
            Back to List
          </Button>
        </div>
      </div>

      {/* ── Status Workflow Lifecycle Tracker (Finance-Side Style) ── */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Boxes className="h-4 w-4 text-primary" />
              <span>Inward Intake Workflow Status Tracker</span>
            </CardTitle>
            <span className="text-[11px] font-mono text-slate-500">
              Stage {currentStep} of 4
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Step 1: Draft Intake */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                currentStep >= 1
                  ? 'border-blue-200 bg-blue-50/40 text-blue-900'
                  : 'border-slate-200 bg-slate-50/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono">
                    1
                  </span>
                  Physical Draft
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-[11px] text-slate-600">
                Goods offloaded at dock &amp; physical counts entered.
              </p>
            </div>

            {/* Step 2: Dock Submission */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                currentStep >= 2
                  ? 'border-amber-200 bg-amber-50/40 text-amber-900'
                  : 'border-slate-200 bg-slate-50/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-mono">
                    2
                  </span>
                  Dock Submission
                </span>
                {currentStep >= 2 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Barcodes labeled; submitted for inspection.
              </p>
            </div>

            {/* Step 3: Manager / Finance Approval */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                currentStep >= 3
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                  : 'border-slate-200 bg-slate-50/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono">
                    3
                  </span>
                  Manager Approval
                </span>
                {currentStep >= 3 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Stock verified &amp; released into live inventory.
              </p>
            </div>

            {/* Step 4: Commercial Costing & AP Bill */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                currentStep >= 4
                  ? 'border-purple-200 bg-purple-50/40 text-purple-900'
                  : 'border-slate-200 bg-slate-50/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-mono">
                    4
                  </span>
                  Finance Costing
                </span>
                {currentStep >= 4 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                Landed costs apportioned &amp; vendor bill posted.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Metrics Bar (Global Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Expected Units
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {totalExpected}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">PO Delivery Quota</span>
        </div>

        <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Delivered Qty
          </span>
          <span className="text-2xl font-bold font-mono text-blue-900 mt-1 block">
            {totalReceived}
          </span>
          <span className="text-[10px] text-blue-600 mt-0.5 block">Dock Intake Count</span>
        </div>

        <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
            Damaged / Quarantined
          </span>
          <span className="text-2xl font-bold font-mono text-rose-900 mt-1 block">
            {totalDamaged}
          </span>
          <span className="text-[10px] text-rose-600 mt-0.5 block">Transit Discrepancy</span>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-center shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Accepted Good Stock
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-900 mt-1 block">
            {totalGood}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Stocked in WH</span>
        </div>
      </div>

      {/* ── Meta Details Cards (Dual Card View) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Supplier & Purchase Reference */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>GRN Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier Name</span>
              <span className="font-bold text-slate-900 text-sm">{grn.supplierName || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Supplier Code</span>
                <span className="font-medium text-slate-700 font-mono">{grn.supplierId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">PO Reference</span>
                <span className="font-semibold font-mono text-primary">
                  {grn.poNumber || (grn.sourceType === 'PO' ? 'PO Linked' : 'Manual Receipt')}
                </span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Receiving Date</span>
              <span className="font-medium text-slate-700">
                {grn.receivingDate
                  ? formatDate(grn.receivingDate)
                  : grn.submittedAt
                  ? formatDate(grn.submittedAt)
                  : grn.createdAt
                  ? formatDate(grn.createdAt)
                  : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Warehouse Dock & Receiving Audit */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Receiving Dock &amp; Approval Audit</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Receiving Warehouse</span>
                <span className="font-semibold text-slate-800 font-mono">{grn.warehouseId || 'WH-MAIN'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Received By</span>
                <span className="font-semibold text-slate-800">{grn.receivedById || 'Stock Keeper Desk'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Finance / Manager Approval</span>
                <span className="font-semibold text-slate-800">
                  {grn.approvedById ? 'Verified & Approved' : 'Pending Review'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Physical Tagging Status</span>
                <div>
                  {grn.barcodesConfirmed ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                      ✓ All Units Labeled
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">
                      Pending Physical Affixing
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {grn.approvedAt && (
              <div className="pt-1 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Approval Timestamp</span>
                <span className="font-medium text-slate-700 font-mono">{formatDate(grn.approvedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Line Items & Barcode Sets Table ── */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Line Items &amp; Barcode Sets ({grn.items?.length || 0})
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical verification counts and unit-wise serial barcode assignments
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsBarcodeModalOpen(true)}
            className="text-xs text-primary gap-1 font-semibold hover:bg-primary/5"
          >
            <Barcode className="h-3.5 w-3.5" />
            View Barcode Stickers
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="text-xs font-semibold">Product Name</TableHead>
                <TableHead className="text-xs font-semibold">SKU</TableHead>
                <TableHead className="text-right text-xs font-semibold">Expected Qty</TableHead>
                <TableHead className="text-right text-xs font-semibold">Received Qty</TableHead>
                <TableHead className="text-right text-xs font-semibold">Damaged Qty</TableHead>
                <TableHead className="text-right text-xs font-semibold">Good Qty</TableHead>
                <TableHead className="text-center text-xs font-semibold">Unit Barcodes</TableHead>
                {!isStockKeeper && <TableHead className="text-right text-xs font-semibold">Unit Cost</TableHead>}
                {!isStockKeeper && <TableHead className="text-right text-xs font-semibold">Line Value</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.items?.map((item: any, idx: number) => {
                const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
                const goodQty = (item.receivedQuantity || 0) - (item.damagedQuantity || 0);
                const unitCost = item.unitCostSnapshot ?? item.unitCost ?? 0;
                const lineValue = goodQty * unitCost;
                const barcodesCount = item.unitRecords?.length || item.unitBarcodes?.length || goodQty;

                return (
                  <TableRow key={idx} className="hover:bg-slate-50/60">
                    <TableCell className="font-medium text-xs text-slate-900">
                      {product?.name || item.productNameSnapshot || item.productId}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {product?.sku || item.skuSnapshot || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{item.expectedQuantity}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-blue-900">
                      {item.receivedQuantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-rose-600 font-semibold">
                      {item.damagedQuantity || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                      {goodQty}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBarcodeModalOpen(true)}
                        className="h-7 text-[11px] gap-1 font-mono text-primary border-primary/20 hover:bg-primary/5"
                      >
                        <Barcode className="h-3 w-3" />
                        {barcodesCount} Unit Barcodes
                      </Button>
                    </TableCell>
                    {!isStockKeeper && (
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(unitCost)}</TableCell>
                    )}
                    {!isStockKeeper && (
                      <TableCell className="text-right font-mono text-xs font-semibold text-slate-900">
                        {formatCurrency(lineValue)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Table Footer Summary Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              {isStockKeeper
                ? 'Stock Keeper physical audit view. Commercial unit valuation (LKR) is securely managed in Finance.'
                : 'Commercial stock receipt valuation.'}
            </span>
            <div className="text-sm font-bold text-slate-900 mt-2 sm:mt-0">
              {isStockKeeper
                ? `Total Accepted Units: ${totalGood}`
                : `Total Value: ${formatCurrency(totalValue)}`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Manager Approval Section ── */}
      {grn.status === 'SUBMITTED' && user?.role === 'MANAGER' && (
        <Card className="border-primary-border bg-primary-light/40 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-primary-text font-bold">
                Manager Approval &amp; Inward Release
              </CardTitle>
              <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Physical Labeling Verified
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white/90 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Stock Keeper has verified physical intake and affixed system-generated barcode stickers to all {totalGood} accepted units in the warehouse.
              </span>
            </div>

            <Textarea
              placeholder="Enter approval or rejection comment (min 3 chars)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-white"
            />
            <div className="flex gap-3">
              <Button onClick={handleApprove} variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Approve &amp; Update Inventory
              </Button>
              <Button onClick={handleReject} variant="destructive" className="font-semibold">
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
