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
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { PaginationControls } from '../../components/common/PaginationControls';
import { UnitBarcodeRecord } from '../../types/inventory';
import { toast } from 'sonner';
import {
  Barcode,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

function ItemInlineBarcodes({
  item,
  grnNumber,
  onOpenModal,
}: {
  item: any;
  grnNumber: string;
  onOpenModal: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const records: UnitBarcodeRecord[] = item.unitRecords || [];
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedRecords = records.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied barcode: ${code}`);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3 my-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Barcode className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold text-xs text-slate-800">
            {item.productNameSnapshot || item.productId} — Unit Barcode Registry
          </span>
          <Badge variant="outline" className="text-[10px] bg-white font-mono border-slate-300">
            {total} Total Units
          </Badge>
          <Badge
            className={
              item.barcodesConfirmed
                ? 'bg-emerald-100 text-emerald-800 border-0 text-[10px]'
                : 'bg-amber-100 text-amber-800 border-0 text-[10px]'
            }
          >
            {item.barcodesConfirmed ? 'All Stickers Affixed' : 'Stickers Pending'}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenModal}
          className="h-7 text-xs gap-1 text-primary hover:bg-primary/5 self-start sm:self-auto shadow-2xs font-semibold"
        >
          <Printer className="h-3.5 w-3.5" />
          Open Studio / Print Stickers
        </Button>
      </div>

      {total === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">No unit barcodes generated for this item.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2 px-3 text-left w-24">Unit #</th>
                  <th className="py-2 px-3 text-left">System Barcode (Code-128)</th>
                  <th className="py-2 px-3 text-left">Unit Serial Number</th>
                  <th className="py-2 px-3 text-center w-36">Physical Tag Status</th>
                  <th className="py-2 px-2 text-right w-16">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {pagedRecords.map((r) => (
                  <tr key={r.unitBarcode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-1.5 px-3 text-slate-500 font-medium">
                      Unit {r.unitIndex}/{total}
                    </td>
                    <td className="py-1.5 px-3 font-bold text-slate-900 tracking-wider">
                      {r.unitBarcode}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600">
                      {r.serialNumber ? (
                        <span className="text-indigo-700 font-semibold">{r.serialNumber}</span>
                      ) : (
                        <span className="text-slate-400 italic font-sans text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {r.status === 'LABELED' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] py-0 px-2 gap-1 font-sans">
                          <CheckCircle2 className="h-3 w-3" /> Affixed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 px-2 gap-1 font-sans"
                        >
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(r.unitBarcode)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                        title="Copy barcode"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={safePage}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            label="units"
            compact
          />
        </>
      )}
    </div>
  );
}

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
  const [selectedProductForModal, setSelectedProductForModal] = useState<string>('ALL');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

  // Ensure all GRN items have unitRecords populated
  const preparedItems = useMemo(() => {
    if (!grn?.items) return [];
    return unitBarcodeService.generateAllForGRN(
      grn.items,
      grn.grnNumber || grn.id || 'GRN-2025-001'
    );
  }, [grn]);

  const totalGood = useMemo(() => {
    return preparedItems.reduce(
      (sum, item) => sum + Math.max(0, (item.receivedQuantity || 0) - (item.damagedQuantity || 0)),
      0
    );
  }, [preparedItems]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>;
      case 'SUBMITTED':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Submitted</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = async () => {
    if (!id || !user) return;
    try {
      await grnService.approveGRN(id, user.id, comment);
      toast.success('GRN approved successfully');
      navigate('/inventory/grn');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve GRN');
    }
  };

  const handleReject = async () => {
    if (!id || !user) return;
    if (!comment || comment.length < 3) {
      toast.error('Rejection requires a comment (min 3 chars)');
      return;
    }
    try {
      await grnService.rejectGRN(id, user.id, comment);
      toast.success('GRN rejected');
      navigate('/inventory/grn');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject GRN');
    }
  };

  const toggleExpandRow = (productId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const getStatusColor = (status: string) => {
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
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
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

  const totalValue =
    preparedItems?.reduce(
      (acc: number, item: any) =>
        acc +
        (item.unitCostSnapshot ?? item.unitCost ?? 0) *
          (item.receivedQuantity - (item.damagedQuantity || 0)),
      0
    ) || 0;

  const isStockKeeper = user?.role === 'STOCK_KEEPER';
  const isFinanceRole = ['FINANCE_OFFICER', 'FINANCE_MANAGER', 'ADMIN'].includes(user?.role || '');
  const hasDamagedStock = preparedItems?.some((i: any) => (i.damagedQuantity || 0) > 0);
  const totalUnits =
    preparedItems?.reduce(
      (acc: number, item: any) => acc + (item.receivedQuantity - (item.damagedQuantity || 0)),
      0
    ) || 0;

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
              <span>GRN Details</span> • Inward delivery inspection • Physical barcode serialization record
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Barcodes Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedProductForModal('ALL');
              setIsBarcodeModalOpen(true);
            }}
            className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5"
          >
            <Printer className="h-3.5 w-3.5" />
            Unit Barcodes &amp; Stickers ({totalGood})
          </Button>

          {isFinanceRole && (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/finance/ap/bills/new?grnId=${grn.id}`)}
              className="gap-1.5 text-xs font-semibold"
            >
              Cost in Finance
            </Button>
          )}

          {isFinanceRole && hasDamagedStock && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/finance/ap/debit-notes?grnId=${grn.id}`)}
              className="gap-1.5 text-xs font-semibold text-amber-800 border-amber-300 hover:bg-amber-50"
            >
              Return Damaged Stock (Debit Note)
            </Button>
          )}

          <Button variant="outline" onClick={() => navigate('/inventory/grn')}>
            Back to List
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm text-slate-500">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-base">{grn.supplierName || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm text-slate-500">Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-base">{grn.warehouseId || 'WH-MAIN'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm text-slate-500">Received Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-base">{formatDate(grn.receivedDate || grn.createdAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm text-slate-500">Physical Labeling Status</CardTitle>
          </CardHeader>
          <CardContent>
            {grn.barcodesConfirmed ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 w-fit font-medium">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> All Stickers Affixed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 w-fit font-medium">
                <Clock className="h-3 w-3 text-amber-600" /> Pending Affixing
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {hasDamagedStock && (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-4 flex items-center justify-between text-xs text-rose-800">
            <span>
              <strong>Warehouse Quarantine Alert:</strong> One or more items received with damaged stock. Damaged quantities are excluded from accepted inventory.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory/stock?status=DAMAGED')}
              className="text-xs h-7 border-rose-300 text-rose-800 hover:bg-rose-100 shrink-0"
            >
              View Quarantine Bay
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Line Items Table ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Line Items &amp; Barcode Sets</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &quot;Unit Barcodes&quot; or the arrow on any line to expand its paginated barcode registry.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedProductForModal('ALL');
              setIsBarcodeModalOpen(true);
            }}
            className="gap-1.5 text-xs text-primary border-primary/30"
          >
            <Barcode className="h-3.5 w-3.5" />
            View All Barcode Stickers
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
              {preparedItems?.map((item: any, idx: number) => {
                const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
                const goodQty = (item.receivedQuantity || 0) - (item.damagedQuantity || 0);
                const unitCost = item.unitCostSnapshot ?? item.unitCost ?? 0;
                const lineValue = goodQty * unitCost;
                const barcodesCount = item.unitRecords?.length || item.unitBarcodes?.length || goodQty;
                const isExpanded = !!expandedRows[item.productId];

                return (
                  <TableRowGroup key={item.productId || idx}>
                    <TableRow className={isExpanded ? 'bg-slate-50/70 border-b-0' : undefined}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(item.productId)}
                            className="p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
                            title={isExpanded ? 'Collapse barcodes' : 'Expand barcodes'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span>{product?.name || item.productNameSnapshot || item.productId}</span>
                        </div>
                      </TableCell>
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
                          onClick={() => {
                            setSelectedProductForModal(item.productId);
                            setIsBarcodeModalOpen(true);
                          }}
                          className="h-7 text-[11px] gap-1 font-mono text-primary hover:bg-primary/5"
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

                    {/* Inline Paginated Barcodes Row */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-t-0">
                        <TableCell colSpan={isStockKeeper ? 7 : 9} className="p-2 sm:p-4">
                          <ItemInlineBarcodes
                            item={item}
                            grnNumber={grn.grnNumber || grn.id}
                            onOpenModal={() => {
                              setSelectedProductForModal(item.productId);
                              setIsBarcodeModalOpen(true);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableRowGroup>
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
          items={preparedItems}
          grnNumber={grn.grnNumber || grn.id}
          supplierName={grn.supplierName || 'Supplier'}
          warehouseId={grn.warehouseId || 'WH-MAIN'}
          initialProductId={selectedProductForModal}
          onConfirmLabeled={(updatedItems) => {
            setGrn((prev: any) => ({ ...prev, items: updatedItems, barcodesConfirmed: true }));
            setIsBarcodeModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// React fragment wrapper helper for table rows
function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
