import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { UnitBarcodeModal } from '../../components/inventory/UnitBarcodeModal';
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { PaginationControls } from '../../components/common/PaginationControls';
import { UnitBarcodeRecord, GRN, GRNItem, ElectricalProductCategory } from '../../types/inventory';
import { toast } from 'sonner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GRNStockManagerVerificationPanel } from './components/GRNStockManagerVerificationPanel';
import { PrintableGRN } from './PrintableGRN';
import { cn } from '../../utils/cn';
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
  Building2,
  FileText,
  Calendar,
  Truck,
  Hash,
  Boxes,
  Zap,
  Cable,
  Cpu,
  Layers,
  FileCheck2,
  Check,
  XCircle,
  Download,
  ExternalLink,
  Paperclip,
  UserCheck,
  PackageCheck,
  ClipboardList,
  AlertOctagon,
  FileSpreadsheet,
  HelpCircle,
  Eye,
  Info,
  DollarSign,
  Send,
  Lock,
} from 'lucide-react';

// Inline Paginated Barcode Registry for Line Items
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
    <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3 my-2">
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
                    <td className="py-1.5 px-3 text-slate-500 font-medium font-sans">
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

interface GRNDetailPageProps {
  backUrl?: string;
  backTitle?: string;
}

export function GRNDetailPage({ backUrl, backTitle }: GRNDetailPageProps = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { grnService } = useGRN();
  const { user } = useAuth();

  const isPurchasingRoute = location.pathname.startsWith('/purchasing/grn');
  const resolvedBackPath = backUrl || (isPurchasingRoute ? '/purchasing/grn' : '/inventory/grn');
  const resolvedBackTitle = backTitle || (isPurchasingRoute ? 'Back to Goods Received Notes' : 'Back to Inward GRN Registry');

  const [grn, setGrn] = useState<GRN | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<string>('ALL');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Active workspace tab: 'items' | 'inspection' | 'logistics' | 'attachments'
  const [activeTab, setActiveTab] = useState<'items' | 'inspection' | 'logistics' | 'attachments'>('items');

  // Product category filter for the items table
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'GENERAL_ELECTRICAL' | 'SERIAL_TRACKED' | 'WIRES_CABLES' | 'DAMAGED'>('ALL');

  const fetchGRN = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await grnService.getGRNById(id);
      if (!data) {
        setError('GRN record not found');
      } else {
        setGrn(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading GRN');
    } finally {
      setLoading(false);
    }
  }, [id, grnService]);

  useEffect(() => {
    fetchGRN();
  }, [fetchGRN]);

  // Ensure all GRN items have unitRecords populated and categorical classifications
  const preparedItems = useMemo(() => {
    if (!grn?.items) return [];
    const itemsWithRecords = unitBarcodeService.generateAllForGRN(
      grn.items,
      grn.grnNumber || grn.id || 'GRN-2025-001'
    );

    return itemsWithRecords.map((item: any) => {
      // Automatic category inference for imported electrical items
      let category: ElectricalProductCategory = item.category || 'GENERAL_ELECTRICAL';
      const name = (item.productNameSnapshot || '').toLowerCase();
      const sku = (item.skuSnapshot || '').toLowerCase();

      if (
        name.includes('cable') ||
        name.includes('wire') ||
        name.includes('flex') ||
        name.includes('cord') ||
        name.includes('twin') ||
        sku.includes('cbl') ||
        sku.includes('wir')
      ) {
        category = 'WIRES_CABLES';
      } else if (
        item.serialNumbers?.length > 0 ||
        item.unitRecords?.some((r: any) => !!r.serialNumber) ||
        name.includes('inverter') ||
        name.includes('solar') ||
        name.includes('motor') ||
        name.includes('drill') ||
        name.includes('generator') ||
        name.includes('chainsaw') ||
        name.includes('breaker') && name.includes('mccb')
      ) {
        category = 'SERIAL_TRACKED';
      }

      // Quantity calculations
      const orderedQty = item.expectedQuantity ?? item.orderedQuantity ?? item.receivedQuantity ?? 0;
      const prevQty = item.previouslyReceivedQuantity ?? 0;
      const currentRecvQty = item.receivedQuantity ?? 0;
      const damagedQty = item.damagedQuantity ?? 0;
      const rejectedQty = item.rejectedQuantity ?? 0;
      const acceptedQty = item.acceptedQuantity ?? Math.max(0, currentRecvQty - damagedQty - rejectedQty);
      const unitCost = item.unitCostSnapshot ?? item.unitCost ?? 0;
      const lineTotal = acceptedQty * unitCost;

      // Inferred Cable Specs if applicable
      const cableSpecs = item.cableSpecs || (category === 'WIRES_CABLES' ? {
        coreCount: name.includes('4c') ? '4 Core' : name.includes('3c') ? '3 Core' : 'Single Core',
        conductorSize: name.includes('2.5') ? '2.5 mm²' : name.includes('4.0') ? '4.0 mm²' : name.includes('1.5') ? '1.5 mm²' : '16 mm²',
        voltageGrade: '600/1000V Cu/PVC',
        lengthPerRoll: 100,
        drumNumber: `DRUM-${(grn.grnNumber || '2025').slice(-3)}-01`,
      } : undefined);

      // Inferred Batch Number
      const batchNumber = item.batchNumber || `BAT-${(grn.grnNumber || '2025').replace(/[^0-9]/g, '')}-${item.productId?.slice(-2) || '01'}`;

      // Inferred Supplier Item Code
      const supplierItemCode = item.supplierItemCode || `SUP-${(item.skuSnapshot || 'SKU').replace('DNS-', '')}`;

      return {
        ...item,
        category,
        expectedQuantity: orderedQty,
        previouslyReceivedQuantity: prevQty,
        receivedQuantity: currentRecvQty,
        acceptedQuantity: acceptedQty,
        damagedQuantity: damagedQty,
        rejectedQuantity: rejectedQty,
        unitCostSnapshot: unitCost,
        lineValue: lineTotal,
        cableSpecs,
        batchNumber,
        supplierItemCode,
      };
    });
  }, [grn]);

  // Aggregate KPI Calculations
  const metrics = useMemo(() => {
    let totalOrdered = 0;
    let totalPrevReceived = 0;
    let totalCurrentReceived = 0;
    let totalAccepted = 0;
    let totalDamaged = 0;
    let totalRejected = 0;
    let totalValue = 0;

    preparedItems.forEach((item: any) => {
      totalOrdered += item.expectedQuantity;
      totalPrevReceived += item.previouslyReceivedQuantity;
      totalCurrentReceived += item.receivedQuantity;
      totalAccepted += item.acceptedQuantity;
      totalDamaged += item.damagedQuantity;
      totalRejected += item.rejectedQuantity;
      totalValue += item.lineValue;
    });

    const remainingPO = Math.max(0, totalOrdered - totalPrevReceived - totalAccepted);

    return {
      totalOrdered,
      totalPrevReceived,
      totalCurrentReceived,
      totalAccepted,
      totalDamaged,
      totalRejected,
      remainingPO,
      totalValue,
    };
  }, [preparedItems]);

  // Category Filtered Items
  const filteredItems = useMemo(() => {
    if (categoryFilter === 'ALL') return preparedItems;
    if (categoryFilter === 'DAMAGED') {
      return preparedItems.filter((i: any) => (i.damagedQuantity || 0) > 0 || (i.rejectedQuantity || 0) > 0);
    }
    return preparedItems.filter((i: any) => i.category === categoryFilter);
  }, [preparedItems, categoryFilter]);

  const toggleExpandRow = (productId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleApprove = async () => {
    if (!id || !user) return;
    try {
      await grnService.approveGRN(id, user.id, user.name || 'Finance Officer', user.role);
      toast.success('Goods Received Note approved by Finance and posted to inventory.');
      fetchGRN();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve GRN');
    }
  };

  const handleReject = async () => {
    if (!id || !user) return;
    if (!comment || comment.length < 3) {
      toast.error('Rejection requires a documented reason (minimum 3 characters)');
      return;
    }
    try {
      await grnService.rejectGRN(id, user.id, comment);
      toast.error('GRN rejected and returned for inspection resolution.');
      fetchGRN();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject GRN');
    }
  };

  const handleStockManagerApprove = async (remarks?: string) => {
    if (!id || !user) return;
    try {
      await grnService.verifyAndApproveGRN(id, { id: user.id, name: user.name, role: user.role }, remarks);
      toast.success('GRN physical verification approved! Forwarded to Finance for approval.');
      fetchGRN();
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify GRN');
    }
  };

  const handleStockManagerReject = async (reason: string) => {
    if (!id || !user) return;
    try {
      await grnService.rejectGRNVerification(id, { id: user.id, name: user.name, role: user.role }, reason);
      toast.error('GRN verification rejected. Shipment returned to Stock Keeper for inspection resolution.');
      fetchGRN();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject GRN');
    }
  };

  const hasDamagedStock = useMemo(() => {
    return grn?.items?.some((i) => (i.damagedQuantity || 0) > 0) ?? false;
  }, [grn]);

  const isStockKeeper = user?.role === 'STOCK_KEEPER';
  const isStockManager = user?.role === 'STOCK_MANAGER';
  const isFinanceRole = ['FINANCE_OFFICER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN', 'MANAGER'].includes(user?.role || '');
  const isManagementApprover = ['DIRECTOR', 'MANAGER', 'FINANCE_MANAGER', 'FINANCE_OFFICER'].includes(user?.role || '');

  if (loading) {
    return (
      <div className="w-full space-y-5 p-6">
        <Skeleton className="h-10 w-96 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !grn) {
    return (
      <div className="p-12 text-center space-y-4 max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 mt-8 shadow-sm">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Goods Received Note Unavailable</h2>
        <p className="text-sm text-slate-500">{error || 'Unable to locate the requested GRN manifest.'}</p>
        <Button onClick={() => navigate(resolvedBackPath)} className="mt-2">
          {resolvedBackTitle}
        </Button>
      </div>
    );
  }

  // Fallbacks for header metadata
  const supplierAddress = grn.supplierAddress || 'Bay 1, Colombo Port Logistics Corridor, Colombo 13, Sri Lanka';
  const supplierContact = grn.supplierContact || '+94 11 234 5678 / sales@schneider.lk';
  const supplierInvoice = grn.supplierInvoiceNumber || 'INV-2025-8841';
  const supplierDN = grn.supplierDeliveryNoteNumber || 'DN-LOG-99214';
  const poDate = grn.poDate || '15 May 2025';
  const expectedDate = grn.expectedDeliveryDate || formatDate(grn.receivedDate || grn.createdAt);
  const locationBay = grn.receivingLocationBay || `${grn.warehouseId || 'WH-MAIN'} (Receiving Bay 01)`;
  const receivedBy = grn.receivedByName || grn.receivedById || 'Nimal Perera (Warehouse Lead)';
  const verifiedBy = grn.verifiedByName || grn.verifiedById || 'Sunil Weerasinghe (Quality Inspector)';
  const approvedBy = grn.approvedByName || grn.approvedById || 'Anura De Silva (Logistics Director)';
  const refNumber = grn.referenceNumber || `DNS-INW-${(grn.grnNumber || grn.id).replace(/[^0-9]/g, '')}`;

  // Quality Inspection object
  const inspection = grn.inspection || {
    status: metrics.totalDamaged > 0 ? 'PASSED_WITH_EXCEPTION' : 'PASSED',
    inspectorName: verifiedBy,
    inspectedAt: formatDate(grn.receivedDate || grn.createdAt),
    packagingCondition: metrics.totalDamaged > 0 ? 'DAMAGED' : 'INTACT',
    visualInspectionPassed: true,
    specVerificationPassed: true,
    notes: metrics.totalDamaged > 0
      ? 'Transit impact identified on outer packaging carton. Damaged units segregated into Quarantine Bay.'
      : 'All physical units verified against original bill of lading, catalog specifications, and voltage requirements.',
    damageDetails: metrics.totalDamaged > 0
      ? `${metrics.totalDamaged} units suffered corner casing crack during container de-stuffing. Held in quarantine.`
      : 'No visible transit or physical damage detected.',
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP COMMAND BAR & AUDIT TRAIL */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(resolvedBackPath)}
            className="text-slate-600 hover:text-slate-900 -ml-2 text-xs font-semibold gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{resolvedBackTitle}</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">Ref: {refNumber}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(grn.grnNumber || grn.id);
                toast.success('GRN Number copied to clipboard');
              }}
              className="h-7 text-xs gap-1 px-2 text-slate-600"
            >
              <Copy className="h-3 w-3" />
              Copy GRN #
            </Button>
          </div>
        </div>

        {/* Director Executive Oversight Read-Only Notice */}
        {user?.role === 'DIRECTOR' && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 px-4 flex items-center justify-between text-xs text-indigo-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Director Executive Oversight (Read-Only View):</strong> Inward warehouse manifests, barcode serialization logs, and receiving documentation are displayed in read-only inspection mode.
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-indigo-700 hidden sm:inline">
              Read-Only View
            </span>
          </div>
        )}

        {/* Title, Status & Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
                    GRN Number: {grn.grnNumber || grn.id}
                  </h1>
                  <StatusBadge status={grn.status} />
                  {user?.role === 'DIRECTOR' && (
                    <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-300 font-mono">
                      READ-ONLY VIEW
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300 font-medium">
                    PO: {grn.purchaseOrderNumber || grn.poNumber || 'PO-2025-001'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial Inward Receiving Manifest • Electrical Import Inspection &amp; Physical Serial Registry
                </p>
              </div>
            </div>
          </div>

          {/* Action Button Suite */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Official Print A4 Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="gap-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border-slate-300 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print GRN (A4)</span>
            </Button>

            {/* Unit Barcodes Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const stickersPath = isPurchasingRoute
                  ? `/purchasing/grn/${id}/stickers`
                  : `/inventory/grn/${id}/stickers`;
                navigate(stickersPath);
              }}
              className="gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5 shadow-2xs"
            >
              <Barcode className="h-3.5 w-3.5" />
              <span>Unit Stickers ({metrics.totalAccepted})</span>
            </Button>

            {/* Approval Workflow Actions */}
            {/* 1. STOCK MANAGER WORKFLOW: Verifies and forwards to Finance; NEVER posts directly to Inventory */}
            {isStockManager && grn.status === 'PENDING_STOCK_MANAGER_APPROVAL' && (
              <>
                <ConfirmButton
                  variant="default"
                  size="sm"
                  dialogVariant="success"
                  confirmTitle="Approve Physical Inbound Verification"
                  confirmMessage={`Confirm physical verification of ${grn.grnNumber || grn.id}? This will approve physical receipt and forward the GRN to Finance for approval. It will NOT be posted to Inventory until Finance approves.`}
                  confirmText="Approve & Forward to Finance"
                  onConfirm={() => handleStockManagerApprove(comment || 'Physical quantities & barcode compliance verified by Stock Manager. Forwarded to Finance AP.')}
                  className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve GRN
                </ConfirmButton>
                <ConfirmButton
                  variant="outline"
                  size="sm"
                  dialogVariant="destructive"
                  confirmTitle="Reject Physical Inbound Verification"
                  confirmMessage={`Are you sure you want to reject ${grn.grnNumber || grn.id}? The shipment will be marked rejected and returned to the Stock Keeper for resolution.`}
                  confirmText="Reject GRN"
                  onConfirm={() => handleStockManagerReject(comment || 'Physical stock verification rejected by Stock Manager.')}
                  className="gap-1.5 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject GRN
                </ConfirmButton>
              </>
            )}

            {/* If Stock Manager is viewing a GRN that has already been approved and forwarded to Finance */}
            {isStockManager && (grn.status === 'SUBMITTED' || grn.status === 'COSTED') && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold select-none">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>Forwarded to Finance for Approval</span>
              </div>
            )}

            {/* 2. FINANCE / MANAGEMENT WORKFLOW: Only Finance approves and posts to Inventory */}
            {!isStockManager && isManagementApprover && (grn.status === 'SUBMITTED' || grn.status === 'COSTED') && (
              <>
                <ConfirmButton
                  variant="default"
                  size="sm"
                  dialogVariant="success"
                  confirmTitle="Finance Approval & Inventory Post"
                  confirmMessage={`Confirm Finance sign-off and approval of ${grn.grnNumber || grn.id}? This will officially approve the GRN and post physical inventory to warehouse balances.`}
                  confirmText="Approve & Post"
                  onConfirm={handleApprove}
                  className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve GRN
                </ConfirmButton>
                <ConfirmButton
                  variant="outline"
                  size="sm"
                  dialogVariant="destructive"
                  confirmTitle="Reject Goods Received Note"
                  confirmMessage={`Are you sure you want to reject ${grn.grnNumber || grn.id}? The shipment will be marked rejected and returned for inspection resolution.`}
                  confirmText="Reject GRN"
                  onConfirm={handleReject}
                  className="gap-1.5 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject GRN
                </ConfirmButton>
              </>
            )}

            {/* If GRN is already approved and posted to inventory */}
            {grn.status === 'APPROVED' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold select-none">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Approved by Finance • Posted to Inventory</span>
              </div>
            )}

            {/* Finance Costing Redirect */}
            {isFinanceRole && (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate(`/finance/ap/bills/new?grnId=${grn.id}`)}
                className="gap-1.5 text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Cost in Finance (AP)
              </Button>
            )}

            {/* Damaged Stock Debit Note Redirect */}
            {hasDamagedStock && isFinanceRole && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/finance/ap/debit-notes?grnId=${grn.id}`)}
                className="gap-1.5 text-xs font-semibold border-rose-300 text-rose-700 hover:bg-rose-50 shadow-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Return Damaged Stock (Debit Note)
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Lifecycle Stepper */}
        <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-4 shrink-0 font-medium">
            <span className={cn('flex items-center gap-1.5', grn.status ? 'text-emerald-700 font-semibold' : 'text-slate-400')}>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              1. PO Issued
            </span>
            <span className="text-slate-300">→</span>
            <span className={cn('flex items-center gap-1.5', grn.status ? 'text-emerald-700 font-semibold' : 'text-slate-400')}>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              2. Warehouse Intake
            </span>
            <span className="text-slate-300">→</span>
            <span className={cn('flex items-center gap-1.5', inspection.status.startsWith('PASSED') ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold')}>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              3. Quality Inspection ({inspection.status.replace(/_/g, ' ')})
            </span>
            <span className="text-slate-300">→</span>
            <span className={cn('flex items-center gap-1.5', grn.status === 'APPROVED' || grn.status === 'COSTED' ? 'text-emerald-700 font-semibold' : 'text-slate-400')}>
              {grn.status === 'APPROVED' || grn.status === 'COSTED' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Clock className="h-3.5 w-3.5" />}
              4. Manager Approval
            </span>
            <span className="text-slate-300">→</span>
            <span className={cn('flex items-center gap-1.5', grn.status === 'COSTED' ? 'text-emerald-700 font-semibold' : 'text-slate-400')}>
              {grn.status === 'COSTED' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <DollarSign className="h-3.5 w-3.5" />}
              5. Landed Cost in AP
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* Stock Manager Verification Workspace (UI Reference Standard) */}
      <GRNStockManagerVerificationPanel
        grn={grn}
        currentUser={user}
        onApprove={handleStockManagerApprove}
        onReject={handleStockManagerReject}
      />

      {/* 2. EXECUTIVE GRN QUANTITY & VALUATION SUMMARY (KPI GRID) */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ordered (PO)</p>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{metrics.totalOrdered.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400">PO Contract Qty</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Prev Received</p>
          <p className="text-lg font-bold text-slate-700 mt-1 font-mono">{metrics.totalPrevReceived.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400">Prior Shipments</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Recv</p>
          <p className="text-lg font-bold text-blue-700 mt-1 font-mono">{metrics.totalCurrentReceived.toLocaleString()}</p>
          <span className="text-[10px] text-blue-600 font-medium">Physical Intake</span>
        </div>

        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Accepted</p>
          <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">{metrics.totalAccepted.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Good Stock In</span>
        </div>

        <div className={cn('p-3 rounded-xl border shadow-2xs', metrics.totalDamaged > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200')}>
          <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Damaged</p>
          <p className="text-lg font-bold text-amber-700 mt-1 font-mono">{metrics.totalDamaged.toLocaleString()}</p>
          <span className="text-[10px] text-amber-700 font-medium">Transit Damage</span>
        </div>

        <div className={cn('p-3 rounded-xl border shadow-2xs', metrics.totalRejected > 0 ? 'bg-rose-50/70 border-rose-300' : 'bg-white border-slate-200')}>
          <p className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Rejected</p>
          <p className="text-lg font-bold text-rose-700 mt-1 font-mono">{metrics.totalRejected.toLocaleString()}</p>
          <span className="text-[10px] text-rose-700 font-medium">QC Spec Fail</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Remaining PO</p>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{metrics.remainingPO.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400">Balance Pending</span>
        </div>

        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-900 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">GRN Landed Value</p>
          <p className="text-base font-bold text-emerald-400 mt-1 font-mono truncate">{formatCurrency(metrics.totalValue)}</p>
          <span className="text-[9.5px] text-slate-400">Accepted Net Total</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 3. MASTER HEADER & SUPPLIER SPECIFICATION CARDS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: GRN Inbound Document & Location Details */}
        <Card className="shadow-2xs border-slate-200">
          <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold text-slate-800">
                Inbound Receiving Manifest
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] bg-white font-mono">
              Bay Code: {grn.warehouseId || 'WH-MAIN'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">GRN Intake Number</span>
              <span className="font-bold font-mono text-slate-900 text-[13px]">{grn.grnNumber || grn.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Received Date &amp; Time</span>
              <span className="font-semibold text-slate-800">{formatDate(grn.receivedDate || grn.createdAt)} 10:30 AM</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Lifecycle Status</span>
              <StatusBadge status={grn.status} />
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Linked Purchase Order</span>
              <Link to="/purchasing/orders" className="font-mono text-primary font-semibold hover:underline flex items-center gap-1">
                {grn.purchaseOrderNumber || grn.poNumber || 'PO-2025-001'}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Supplier Invoice #</span>
              <span className="font-mono font-medium text-slate-800">{supplierInvoice}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Delivery Note / Waybill #</span>
              <span className="font-mono font-medium text-slate-800">{supplierDN}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Receiving Warehouse</span>
              <span className="font-medium text-slate-800">{locationBay}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Received &amp; Counted By</span>
              <span className="font-medium text-slate-800">{receivedBy}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Physical Barcode State</span>
              {grn.barcodesConfirmed ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Affixed to Units
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Affixing
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Supplier & Purchase Order Profile */}
        <Card className="shadow-2xs border-slate-200">
          <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold text-slate-800">
                Supplier &amp; Procurement Details
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] bg-white font-mono">
              Vendor ID: {grn.supplierId || 'SUP-001'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="col-span-2">
              <span className="text-slate-400 block text-[11px]">Supplier / Vendor Corporate Name</span>
              <span className="font-bold text-slate-900 text-[13px]">{grn.supplierName || 'Schneider Electric Lanka (Pvt) Ltd'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Country of Origin</span>
              <span className="font-semibold text-slate-800">Singapore / France</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[11px]">Supplier Facility Address</span>
              <span className="text-slate-700">{supplierAddress}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Vendor Contact</span>
              <span className="text-slate-700">{supplierContact}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">PO Contract Date</span>
              <span className="text-slate-800 font-medium">{poDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Expected Delivery Date</span>
              <span className="text-slate-800 font-medium">{expectedDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Payment Terms</span>
              <span className="text-slate-800 font-medium">LC at Sight (60 Days)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 4. TABBED WORKSPACE: ITEMS, QUALITY INSPECTION, SIGN-OFFS & ATTACHMENTS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Navigation Tabs Header */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={cn(
              'flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
              activeTab === 'items'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            )}
          >
            <Boxes className="h-4 w-4" />
            <span>Received Items &amp; Quantity Verification ({preparedItems.length})</span>
          </button>

          
        </div>

        {/* ── TAB 1: RECEIVED ITEMS & QUANTITY VERIFICATION ── */}
        {activeTab === 'items' && (
          <Card className="shadow-2xs border-slate-200">
            <CardHeader className="py-3 px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 border-b border-slate-100">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Physical Intake Verification Table
                </CardTitle>
                <CardDescription className="text-xs">
                  Line-item quantities, batch allocation, and serialized barcode tracking. Click any row arrow to inspect unit barcodes.
                </CardDescription>
              </div>

              {/* Product Classification Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant={categoryFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('ALL')}
                  className="h-7 text-[11px] px-2.5 rounded-lg"
                >
                  All ({preparedItems.length})
                </Button>
                
                {metrics.totalDamaged > 0 && (
                  <Button
                    size="sm"
                    variant={categoryFilter === 'DAMAGED' ? 'destructive' : 'outline'}
                    onClick={() => setCategoryFilter('DAMAGED')}
                    className="h-7 text-[11px] px-2.5 rounded-lg gap-1 text-rose-700 border-rose-300"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Damaged / QC ({metrics.totalDamaged})
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[1050px] w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                      <TableHead className="w-10 px-2 text-center"></TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 w-36 min-w-[130px]">Item Code / SKU</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 min-w-[200px] max-w-sm">Description &amp; Product Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 w-28 min-w-[100px]">Supplier Code</TableHead>
                      <TableHead className="text-center text-xs font-bold text-slate-700 w-16 min-w-[55px]">UOM</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-700 w-20 min-w-[70px] px-2">PO Qty</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-700 w-20 min-w-[70px] px-2">Prev</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-700 bg-blue-50/50 w-20 min-w-[75px] px-2">Recv Qty</TableHead>
                      <TableHead className="text-right text-xs font-bold text-emerald-800 bg-emerald-50/40 w-20 min-w-[75px] px-2">Accepted</TableHead>
                      <TableHead className="text-right text-xs font-bold text-amber-800 bg-amber-50/40 w-20 min-w-[75px] px-2">Damaged</TableHead>
                      <TableHead className="text-right text-xs font-bold text-rose-800 bg-rose-50/40 w-20 min-w-[75px] px-2">Rejected</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-700 w-28 min-w-[95px] px-2">Unit Cost</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-900 w-32 min-w-[110px] px-2">Total (LKR)</TableHead>
                      <TableHead className="text-center text-xs font-bold text-slate-700 w-32 min-w-[110px] px-2">Track &amp; Stickers</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="divide-y divide-slate-100 text-xs">
                    {filteredItems.map((item: any, idx: number) => {
                      const isExpanded = !!expandedRows[item.productId];
                      const hasDamages = (item.damagedQuantity || 0) > 0;
                      const hasRejections = (item.rejectedQuantity || 0) > 0;

                      return (
                        <React.Fragment key={item.productId || idx}>
                          <TableRow className={cn('hover:bg-slate-50/80 transition-colors', isExpanded && 'bg-slate-50/90')}>
                            {/* Expand toggle */}
                            <TableCell className="px-2 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandRow(item.productId)}
                                className="p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 transition-colors"
                                title={isExpanded ? 'Collapse barcodes' : 'Expand barcodes'}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </TableCell>

                            {/* Item SKU & Batch */}
                            <TableCell className="font-mono font-semibold text-slate-900">
                              <div>{item.skuSnapshot || item.productId}</div>
                              <span className="text-[10px] font-normal text-slate-500 font-mono">
                                Batch: {item.batchNumber}
                              </span>
                            </TableCell>

                            {/* Description & Category Tag */}
                            <TableCell className="max-w-xs">
                              <div className="font-semibold text-slate-900 truncate">
                                {item.productNameSnapshot || 'Electrical Product'}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {item.category === 'SERIAL_TRACKED' ? (
                                  <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] py-0 px-1.5 gap-1">
                                    <Cpu className="h-2.5 w-2.5" /> Serial-Tracked Unit
                                  </Badge>
                                ) : item.category === 'WIRES_CABLES' ? (
                                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] py-0 px-1.5 gap-1">
                                    <Cable className="h-2.5 w-2.5" /> {item.cableSpecs?.coreCount || 'Cable Drum'}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] py-0 px-1.5 gap-1">
                                    <Zap className="h-2.5 w-2.5" /> General Electrical
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Supplier Code */}
                            <TableCell className="font-mono text-slate-600">
                              {item.supplierItemCode}
                            </TableCell>

                            {/* UOM */}
                            <TableCell className="text-center font-bold text-slate-700 font-mono">
                              {item.uom || (item.category === 'WIRES_CABLES' ? 'MTR' : 'PCS')}
                            </TableCell>

                            {/* PO Ordered Qty */}
                            <TableCell className="text-right font-mono text-slate-600">
                              {item.expectedQuantity.toLocaleString()}
                            </TableCell>

                            {/* Previously Received */}
                            <TableCell className="text-right font-mono text-slate-500">
                              {item.previouslyReceivedQuantity.toLocaleString()}
                            </TableCell>

                            {/* Current Received Qty */}
                            <TableCell className="text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                              {item.receivedQuantity.toLocaleString()}
                            </TableCell>

                            {/* Accepted Qty */}
                            <TableCell className="text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                              {item.acceptedQuantity.toLocaleString()}
                            </TableCell>

                            {/* Damaged Qty */}
                            <TableCell className={cn('text-right font-mono font-semibold', hasDamages ? 'text-amber-700 bg-amber-50/30 font-bold' : 'text-slate-400')}>
                              {item.damagedQuantity}
                            </TableCell>

                            {/* Rejected Qty */}
                            <TableCell className={cn('text-right font-mono font-semibold', hasRejections ? 'text-rose-700 bg-rose-50/30 font-bold' : 'text-slate-400')}>
                              {item.rejectedQuantity}
                            </TableCell>

                            {/* Unit Cost */}
                            <TableCell className="text-right font-mono text-slate-700">
                              {formatCurrency(item.unitCostSnapshot)}
                            </TableCell>

                            {/* Total Line Amount */}
                            <TableCell className="text-right font-mono font-bold text-slate-900">
                              {formatCurrency(item.lineValue)}
                            </TableCell>

                            {/* Unit Barcode Action */}
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProductForModal(item.productId);
                                  setIsBarcodeModalOpen(true);
                                }}
                                className="h-6 text-[11px] px-2 text-primary hover:bg-primary/5 font-semibold gap-1 border-primary/30"
                              >
                                <Barcode className="h-3 w-3" />
                                {item.unitRecords?.length || item.acceptedQuantity} Labels
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Barcode Registry / Cable Spec Panel */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/70 border-b border-slate-200">
                              <TableCell colSpan={14} className="p-3">
                                {item.category === 'WIRES_CABLES' && (
                                  <div className="mb-3 p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                      <span className="text-amber-700 block font-semibold">Cable Specification:</span>
                                      <span className="text-amber-900 font-bold">{item.cableSpecs?.coreCount} x {item.cableSpecs?.conductorSize}</span>
                                    </div>
                                    <div>
                                      <span className="text-amber-700 block font-semibold">Voltage &amp; Insulation:</span>
                                      <span className="text-amber-900">{item.cableSpecs?.voltageGrade}</span>
                                    </div>
                                    <div>
                                      <span className="text-amber-700 block font-semibold">Assigned Drum / Roll #:</span>
                                      <span className="text-amber-900 font-mono font-bold">{item.cableSpecs?.drumNumber}</span>
                                    </div>
                                    <div>
                                      <span className="text-amber-700 block font-semibold">Standard Pack Length:</span>
                                      <span className="text-amber-900 font-mono">{item.cableSpecs?.lengthPerRoll} Meters/Roll</span>
                                    </div>
                                  </div>
                                )}

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
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* 5. MODALS & PRINT DIALOGS */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* Printable Official GRN A4 Dialog */}
      {isPrintModalOpen && (
        <PrintableGRN
          grn={grn}
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
        />
      )}

      {/* Unit Barcode & Sticker Printing Studio Modal */}
      {isBarcodeModalOpen && (
        <UnitBarcodeModal
          open={isBarcodeModalOpen}
          onOpenChange={setIsBarcodeModalOpen}
          items={preparedItems}
          grnNumber={grn.grnNumber || grn.id}
          selectedProductId={selectedProductForModal}
          onConfirmAll={async () => {
            if (id) {
              await grnService.confirmBarcodes(id, user?.id || 'admin');
              setGrn((prev) => (prev ? { ...prev, barcodesConfirmed: true } : prev));
              toast.success('All unit barcode stickers marked as printed and physically affixed.');
            }
          }}
        />
      )}
    </div>
  );
}
