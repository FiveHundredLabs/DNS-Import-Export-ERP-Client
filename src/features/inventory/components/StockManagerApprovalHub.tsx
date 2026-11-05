import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { PageHeader } from '../../../components/common/PageHeader';
import { TableLoadingSkeleton } from '../../../components/common/LoadingSkeleton';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { grnService } from '../../../services/GRNService';
import { deliveryNoteService } from '../../../services/DeliveryNoteService';
import { GRN, GRNItem } from '../../../types/inventory';
import { DeliveryNote } from '../../../types/deliveryNote';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import {
  Warehouse,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Barcode,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Package,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Building,
  UserCheck,
  ExternalLink,
  Check,
  X,
  SlidersHorizontal,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';

export const StockManagerApprovalHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, role } = useAuth();

  const activeTabParam = searchParams.get('tab') as 'grn' | 'delivery-notes' | 'history' | null;
  const [activeTab, setActiveTab] = useState<'grn' | 'delivery-notes' | 'history'>(
    activeTabParam || 'grn'
  );

  // Data states
  const [loading, setLoading] = useState(true);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);

  // Selection states
  const [selectedGrnId, setSelectedGrnId] = useState<string | null>(searchParams.get('grnId') || null);
  const [selectedDnId, setSelectedDnId] = useState<string | null>(searchParams.get('dnId') || null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [grnStatusFilter, setGrnStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'REJECTED'>('ALL');
  const [dnStatusFilter, setDnStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>('ALL');

  // Decision panel state
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Expandable product line cards in left panel
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const userObj = useMemo(() => {
    return (
      currentUser || {
        id: 'usr-sm-01',
        name: 'Bandara Lead',
        role: 'STOCK_MANAGER',
      }
    );
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allGrns, allDns] = await Promise.all([
        grnService.getAll(),
        deliveryNoteService.getAll(),
      ]);
      setGrns(allGrns);
      setDeliveryNotes(allDns);

      // Auto-select first pending GRN if none selected
      if (!selectedGrnId) {
        const firstPendingGrn = allGrns.find(
          (g) => g.status === 'PENDING_STOCK_MANAGER_APPROVAL'
        );
        if (firstPendingGrn) {
          setSelectedGrnId(firstPendingGrn.id);
          setGrnStatusFilter('PENDING');
        } else if (allGrns.length > 0) {
          setSelectedGrnId(allGrns[0].id);
          setGrnStatusFilter('ALL');
        }
      }

      // Auto-select first pending DN if none selected
      if (!selectedDnId) {
        const firstPendingDn = allDns.find(
          (d) => d.status === 'REJECTION_PENDING_APPROVAL'
        );
        if (firstPendingDn) {
          setSelectedDnId(firstPendingDn.id);
          setDnStatusFilter('PENDING');
        } else if (allDns.length > 0) {
          setSelectedDnId(allDns[0].id);
          setDnStatusFilter('ALL');
        }
      }
    } catch (err: any) {
      toast.error('Failed to load approval queues: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tab: 'grn' | 'delivery-notes' | 'history') => {
    setActiveTab(tab);
    setRemarks('');
    setSearchParams({ tab });
  };

  // Pending counts
  const pendingGRNCount = useMemo(
    () => grns.filter((g) => g.status === 'PENDING_STOCK_MANAGER_APPROVAL').length,
    [grns]
  );
  const pendingRejectionCount = useMemo(
    () => deliveryNotes.filter((d) => d.status === 'REJECTION_PENDING_APPROVAL').length,
    [deliveryNotes]
  );

  // Filtered GRN list
  const filteredGrns = useMemo(() => {
    return grns.filter((g) => {
      if (grnStatusFilter === 'PENDING' && g.status !== 'PENDING_STOCK_MANAGER_APPROVAL') return false;
      if (grnStatusFilter === 'SUBMITTED' && g.status !== 'SUBMITTED' && g.status !== 'COSTED' && g.status !== 'APPROVED') return false;
      if (grnStatusFilter === 'REJECTED' && g.status !== 'STOCK_MANAGER_REJECTED' && g.status !== 'REJECTED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = g.grnNumber.toLowerCase().includes(q);
        const matchesSup = g.supplierName.toLowerCase().includes(q);
        const matchesPo = (g.purchaseOrderNumber || g.poNumber || '').toLowerCase().includes(q);
        if (!matchesRef && !matchesSup && !matchesPo) return false;
      }
      return true;
    });
  }, [grns, grnStatusFilter, searchQuery]);

  // Filtered DN list
  const filteredDns = useMemo(() => {
    return deliveryNotes.filter((d) => {
      if (dnStatusFilter === 'PENDING' && d.status !== 'REJECTION_PENDING_APPROVAL') return false;
      if (dnStatusFilter === 'APPROVED' && d.status !== 'REJECTION_APPROVED') return false;
      if (dnStatusFilter === 'DECLINED' && d.status !== 'REJECTION_DECLINED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDn = d.deliveryNoteNumber.toLowerCase().includes(q);
        const matchesCust = d.customerName.toLowerCase().includes(q);
        const matchesDriver = d.driverName.toLowerCase().includes(q);
        if (!matchesDn && !matchesCust && !matchesDriver) return false;
      }
      return true;
    });
  }, [deliveryNotes, dnStatusFilter, searchQuery]);

  // Active GRN selection
  const activeGrn = useMemo(
    () => grns.find((g) => g.id === selectedGrnId) || filteredGrns[0] || grns[0] || null,
    [grns, selectedGrnId, filteredGrns]
  );

  // Active DN selection
  const activeDn = useMemo(
    () => deliveryNotes.find((d) => d.id === selectedDnId) || filteredDns[0] || deliveryNotes[0] || null,
    [deliveryNotes, selectedDnId, filteredDns]
  );

  // Expand/collapse product cards in left panel
  const toggleProductExpand = (id: string) => {
    setExpandedProductIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAllProducts = (grn: GRN) => {
    const all: Record<string, boolean> = {};
    (grn.items || []).forEach((i) => {
      all[i.id || i.productId] = true;
    });
    setExpandedProductIds(all);
  };

  const collapseAllProducts = () => {
    setExpandedProductIds({});
  };

  // Actions for GRN
  const handleApproveGRN = async () => {
    if (!activeGrn) return;
    try {
      setIsSubmitting(true);
      await grnService.verifyAndApproveGRN(
        activeGrn.id,
        userObj as any,
        remarks || 'Physical stock, quantities and barcodes verified by Stock Manager. Forwarded to Finance AP.'
      );
      toast.success(`GRN ${activeGrn.grnNumber} verified and forwarded to Finance approval!`);
      setRemarks('');
      await loadData();
    } catch (err: any) {
      toast.error('Failed to approve GRN: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectGRN = async () => {
    if (!activeGrn || !rejectReason.trim()) return;
    try {
      setIsSubmitting(true);
      await grnService.rejectGRNVerification(activeGrn.id, userObj as any, rejectReason.trim());
      toast.warning(`GRN ${activeGrn.grnNumber} rejected and returned to Stock Keeper.`);
      setRejectModalOpen(false);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      toast.error('Failed to reject GRN: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions for Delivery Note Customer Rejection
  const handleApproveRejection = async () => {
    if (!activeDn) return;
    try {
      setIsSubmitting(true);
      await deliveryNoteService.approveRejection(
        activeDn.id,
        userObj as any,
        remarks || 'Customer returned units verified by Stock Manager and quarantined.'
      );
      toast.success(
        `Customer rejection for Delivery Note ${activeDn.deliveryNoteNumber} approved into Quarantine Bay!`
      );
      setRemarks('');
      await loadData();
    } catch (err: any) {
      toast.error('Failed to approve rejection: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineRejection = async () => {
    if (!activeDn) return;
    try {
      setIsSubmitting(true);
      await deliveryNoteService.declineRejection(
        activeDn.id,
        userObj as any,
        remarks || 'Customer rejection claim declined. Re-inspection required.'
      );
      toast.warning(`Customer rejection claim for ${activeDn.deliveryNoteNumber} declined.`);
      setRemarks('');
      await loadData();
    } catch (err: any) {
      toast.error('Failed to decline rejection: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics for active GRN
  const activeGrnMetrics = useMemo(() => {
    if (!activeGrn) return { totalExpected: 0, totalReceived: 0, totalDamaged: 0, totalAccepted: 0 };
    let totalExpected = 0;
    let totalReceived = 0;
    let totalDamaged = 0;
    let totalAccepted = 0;
    (activeGrn.items || []).forEach((item) => {
      totalExpected += item.expectedQuantity || 0;
      totalReceived += item.receivedQuantity || 0;
      totalDamaged += item.damagedQuantity || 0;
      totalAccepted +=
        item.acceptedQuantity ??
        Math.max(0, (item.receivedQuantity || 0) - (item.damagedQuantity || 0));
    });
    return { totalExpected, totalReceived, totalDamaged, totalAccepted };
  }, [activeGrn]);

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Stock Manager Verification & Approvals Hub"
        subtitle="Independent physical stock verification for inbound warehouse goods receipts (prior to Finance landed costing) and customer delivery note rejections."
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-800 border border-amber-300 text-xs font-semibold select-none">
            <Warehouse className="h-3.5 w-3.5 text-amber-700" />
            <span>Warehouse Approval Engine • Stock Manager</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Queues</span>
            </Button>
          </div>
        }
      />

      {/* Main Approval Category Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => handleTabChange('grn')}
          className={cn(
            'flex items-center gap-2 pb-3 text-xs font-bold transition-colors relative border-b-2',
            activeTab === 'grn'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Warehouse className="h-4 w-4" />
          <span>Inbound Goods Receipts (GRN)</span>
          {pendingGRNCount > 0 ? (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0 font-bold animate-pulse">
              {pendingGRNCount} Pending
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              0
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('delivery-notes')}
          className={cn(
            'flex items-center gap-2 pb-3 text-xs font-bold transition-colors relative border-b-2',
            activeTab === 'delivery-notes'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Truck className="h-4 w-4" />
          <span>Delivery Note Customer Rejections</span>
          {pendingRejectionCount > 0 ? (
            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] px-1.5 py-0 font-bold animate-pulse">
              {pendingRejectionCount} Awaiting
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              0
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('history')}
          className={cn(
            'flex items-center gap-2 pb-3 text-xs font-bold transition-colors relative border-b-2',
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          )}
        >
          <Clock className="h-4 w-4" />
          <span>Verification Audit Log &amp; History</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: GRN PHYSICAL INTAKE VERIFICATIONS (SPLIT LAYOUT)               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'grn' && (
        <div className="space-y-4">
          {/* GRN Queue Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">GRN Queue:</span>
              <div className="flex gap-1">
                {(['PENDING', 'SUBMITTED', 'REJECTED', 'ALL'] as const).map((st) => (
                  <Button
                    key={st}
                    variant={grnStatusFilter === st ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGrnStatusFilter(st)}
                    className={cn(
                      'h-7 text-xs px-2.5',
                      grnStatusFilter === st
                        ? 'bg-primary text-white font-bold'
                        : 'bg-white text-slate-600'
                    )}
                  >
                    {st === 'PENDING' && `Pending Verification (${pendingGRNCount})`}
                    {st === 'SUBMITTED' && 'Verified / Forwarded'}
                    {st === 'REJECTED' && 'Rejected'}
                    {st === 'ALL' && 'All GRNs'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick GRN selector dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden md:inline">Selected Inbound GRN:</span>
              <select
                value={selectedGrnId || ''}
                onChange={(e) => setSelectedGrnId(e.target.value)}
                className="h-8 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md px-2 min-w-[220px]"
              >
                {filteredGrns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.grnNumber} • {g.supplierName} ({g.status.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <TableLoadingSkeleton />
          ) : !activeGrn ? (
            <Card className="p-12 text-center border-dashed border-slate-200">
              <Warehouse className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Inbound GRNs Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are no goods receipts matching the selected filter.
              </p>
            </Card>
          ) : (
            /* Split 2-Column Layout matching Reference Screenshot */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* LEFT-SIDE INFORMATION PANEL (7 cols)                           */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-slate-200 shadow-2xs overflow-hidden">
                  {/* Left Card Header */}
                  <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-primary" />
                        <span>Warehouse Goods Receipt (Read-Only Physical Intake)</span>
                      </CardTitle>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Inbound warehouse goods receipt submitted by Stock Keeper.
                      </p>
                    </div>

                    {activeGrn.status === 'PENDING_STOCK_MANAGER_APPROVAL' && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px] animate-pulse">
                        AWAITING VERIFICATION
                      </Badge>
                    )}
                    {(activeGrn.status === 'SUBMITTED' || activeGrn.status === 'COSTED' || activeGrn.status === 'APPROVED') && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                        VERIFIED &amp; FORWARDED
                      </Badge>
                    )}
                    {activeGrn.status === 'STOCK_MANAGER_REJECTED' && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                        REJECTED BY STOCK MANAGER
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Supplier Name */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Supplier Name
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {activeGrn.supplierName}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          GRN Reference
                        </span>
                        <span className="font-mono font-bold text-slate-900">{activeGrn.grnNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Received Warehouse
                        </span>
                        <span className="font-semibold text-slate-800">
                          {activeGrn.warehouseId || 'WH-MAIN'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Received Date
                        </span>
                        <span className="font-medium text-slate-700">
                          {formatDate(activeGrn.receivedDate || activeGrn.submittedAt || new Date().toISOString())}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Linked PO #
                        </span>
                        <span className="font-mono font-semibold text-primary">
                          {activeGrn.purchaseOrderNumber || activeGrn.poNumber || 'PO-2026-DEFAULT'}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Received &amp; Created By
                        </span>
                        <span className="font-semibold text-slate-800">
                          {activeGrn.receivedByName || 'Stock Keeper (Amal Perera)'}
                        </span>
                      </div>
                    </div>

                    {/* Summary KPI Pills (Matching Reference Image) */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-white border border-slate-200 p-2.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                          Product Lines
                        </span>
                        <span className="font-mono font-black text-slate-900 text-base">
                          {activeGrn.items.length}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 p-2.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                          Received Units
                        </span>
                        <span className="font-mono font-black text-slate-900 text-base">
                          {activeGrnMetrics.totalReceived}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'rounded-xl p-2.5 shadow-2xs border',
                          activeGrnMetrics.totalDamaged > 0
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-white border-slate-200'
                        )}
                      >
                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase block tracking-wider',
                            activeGrnMetrics.totalDamaged > 0 ? 'text-rose-600' : 'text-slate-400'
                          )}
                        >
                          Damaged Units
                        </span>
                        <span
                          className={cn(
                            'font-mono font-black text-base',
                            activeGrnMetrics.totalDamaged > 0 ? 'text-rose-700' : 'text-slate-800'
                          )}
                        >
                          {activeGrnMetrics.totalDamaged}
                        </span>
                      </div>
                    </div>

                    {/* Verified Physical Inbound Quantities List */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-primary" />
                          <span>Verified Physical Inbound Quantities: ({activeGrn.items.length})</span>
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => expandAllProducts(activeGrn)}
                            className="text-[11px] text-primary hover:underline font-semibold"
                          >
                            Expand All
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={collapseAllProducts}
                            className="text-[11px] text-slate-500 hover:underline"
                          >
                            Collapse All
                          </button>
                        </div>
                      </div>

                      {/* Line Item Cards */}
                      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                        {activeGrn.items.map((item, idx) => {
                          const isExpanded = !!expandedProductIds[item.id || item.productId];
                          const barcodes =
                            item.unitBarcodes ||
                            (item.unitRecords ? item.unitRecords.map((r) => r.barcode) : []);

                          return (
                            <div
                              key={item.id || idx}
                              className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-2 shadow-2xs transition-all hover:border-slate-300"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                                    <span>{item.productName}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 font-mono">
                                    <span>SKU: {item.sku}</span>
                                    {item.unitCost && <span>• LKR {item.unitCost.toLocaleString()} /unit</span>}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="font-mono font-bold text-slate-900 text-xs">
                                    {item.receivedQuantity} {item.uom || 'units'}
                                  </div>
                                  {item.damagedQuantity > 0 && (
                                    <Badge variant="destructive" className="text-[9.5px] py-0 px-1 font-semibold">
                                      Damaged: {item.damagedQuantity}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Drawer toggle */}
                              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => toggleProductExpand(item.id || item.productId)}
                                  className="text-primary hover:underline font-medium flex items-center gap-1"
                                >
                                  <Barcode className="h-3 w-3" />
                                  <span>{isExpanded ? 'Hide Barcode & Details' : 'Show Barcode & Details'}</span>
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {barcodes.length} Barcodes Assigned
                                </span>
                              </div>

                              {/* Drawer Content */}
                              {isExpanded && (
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] space-y-2">
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                                      Allocated Unit Barcodes ({barcodes.length}):
                                    </span>
                                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                      {barcodes.length === 0 ? (
                                        <span className="text-slate-400 italic">No individual barcodes recorded.</span>
                                      ) : (
                                        barcodes.map((bc, bIdx) => (
                                          <span
                                            key={bIdx}
                                            className="font-mono text-[9.5px] bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                                          >
                                            {bc}
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  {item.damagedQuantity > 0 && item.damagedReason && (
                                    <div className="text-rose-700 bg-rose-50/80 p-1.5 rounded border border-rose-200">
                                      <strong>Damaged Assessment:</strong> {item.damagedReason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* RIGHT-SIDE STOCK MANAGER DECISION & APPROVAL PANEL (5 cols)    */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-slate-200 shadow-2xs overflow-hidden">
                  <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Stock Manager Verification Decision</span>
                    </CardTitle>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Verify physical warehouse goods receipt before unlocking Finance landed costing.
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Status Alert */}
                    {activeGrn.status === 'PENDING_STOCK_MANAGER_APPROVAL' ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-950">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Action Required: Stock Manager Verification</span>
                        </div>
                        <p className="text-[11.5px] text-amber-800 leading-relaxed">
                          This GRN was submitted by Stock Keeper <strong>{activeGrn.receivedByName || 'Amal Perera'}</strong>.
                          Finance cannot process vendor bills or landed costs until you physically verify the stock.
                        </p>
                      </div>
                    ) : (activeGrn.status === 'SUBMITTED' || activeGrn.status === 'COSTED' || activeGrn.status === 'APPROVED') ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Verified by Stock Manager</span>
                        </div>
                        <p className="text-[11.5px] text-emerald-800">
                          Approved by <strong>{activeGrn.stockManagerApproval?.approvedByName || activeGrn.verifiedByName || 'Stock Manager'}</strong>.
                          Forwarded to Finance Accounts Payable for landed costing and posting.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-rose-950">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Rejected by Stock Manager</span>
                        </div>
                        <p className="text-[11.5px] text-rose-800">
                          Reason: "{activeGrn.stockManagerApproval?.rejectionReason || activeGrn.rejectedReason || 'Physical intake discrepancies.'}"
                        </p>
                      </div>
                    )}

                    {/* Verification Checklist */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-xs space-y-2">
                      <span className="font-bold text-slate-800 uppercase text-[10.5px] block">
                        Physical Intake Checklist:
                      </span>
                      <div className="space-y-1.5 text-[11.5px] text-slate-700">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Physical quantities match packing list &amp; PO</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Damaged units correctly logged ({activeGrnMetrics.totalDamaged} units)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Barcodes and serial numbers inspected</span>
                        </div>
                      </div>
                    </div>

                    {/* Remarks Input */}
                    {activeGrn.status === 'PENDING_STOCK_MANAGER_APPROVAL' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Stock Manager Verification Notes / Remarks:
                        </label>
                        <Textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="e.g. Physical count and barcodes verified. Inbound goods accepted for Finance landed costing..."
                          rows={3}
                          className="text-xs"
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    {activeGrn.status === 'PENDING_STOCK_MANAGER_APPROVAL' ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <Button
                          size="sm"
                          onClick={handleApproveGRN}
                          disabled={isSubmitting}
                          className="w-full gap-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs py-2"
                        >
                          <Check className="h-4 w-4" />
                          <span>Verify &amp; Forward to Finance AP</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectModalOpen(true)}
                          disabled={isSubmitting}
                          className="w-full gap-2 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
                        >
                          <X className="h-4 w-4" />
                          <span>Reject Physical Intake</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/inventory/grn/${activeGrn.id}`)}
                          className="text-xs gap-1.5 w-full"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Inspect Full GRN Document</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DELIVERY NOTE REJECTED ITEMS APPROVALS                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'delivery-notes' && (
        <div className="space-y-4">
          {/* DN Queue Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">Rejections Queue:</span>
              <div className="flex gap-1">
                {(['PENDING', 'APPROVED', 'DECLINED', 'ALL'] as const).map((st) => (
                  <Button
                    key={st}
                    variant={dnStatusFilter === st ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDnStatusFilter(st)}
                    className={cn(
                      'h-7 text-xs px-2.5',
                      dnStatusFilter === st
                        ? 'bg-primary text-white font-bold'
                        : 'bg-white text-slate-600'
                    )}
                  >
                    {st === 'PENDING' && `Pending Approval (${pendingRejectionCount})`}
                    {st === 'APPROVED' && 'Approved (Quarantined)'}
                    {st === 'DECLINED' && 'Declined'}
                    {st === 'ALL' && 'All Rejections'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick DN selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden md:inline">Selected Delivery Note:</span>
              <select
                value={selectedDnId || ''}
                onChange={(e) => setSelectedDnId(e.target.value)}
                className="h-8 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md px-2 min-w-[220px]"
              >
                {filteredDns.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.deliveryNoteNumber} • {d.customerName} ({d.totalRejectedUnits} Rej)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <TableLoadingSkeleton />
          ) : !activeDn ? (
            <Card className="p-12 text-center border-dashed border-slate-200">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Delivery Note Rejections Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are no customer rejections matching the selected filter.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Panel: Delivery Note & Rejected Units */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-slate-200 shadow-2xs overflow-hidden">
                  <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span>Delivery Note Customer Rejection (Physical Return)</span>
                      </CardTitle>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Scanned unit barcodes returned by customer during field delivery.
                      </p>
                    </div>

                    {activeDn.status === 'REJECTION_PENDING_APPROVAL' && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px] animate-pulse">
                        AWAITING STOCK MANAGER
                      </Badge>
                    )}
                    {activeDn.status === 'REJECTION_APPROVED' && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-[10px]">
                        APPROVED (QUARANTINED)
                      </Badge>
                    )}
                    {activeDn.status === 'REJECTION_DECLINED' && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                        REJECTION DECLINED
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Consignee */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Customer / Consignee
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        {activeDn.customerName}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Delivery Note #
                        </span>
                        <span className="font-mono font-bold text-slate-900">{activeDn.deliveryNoteNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Invoice Reference
                        </span>
                        <span className="font-mono font-semibold text-slate-800">
                          {activeDn.invoiceNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Driver &amp; Vehicle
                        </span>
                        <span className="font-semibold text-slate-800">
                          {activeDn.driverName} ({activeDn.vehicleNumber})
                        </span>
                      </div>
                    </div>

                    {/* Summary KPI Strip */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-white border border-slate-200 p-2.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                          Dispatched Units
                        </span>
                        <span className="font-mono font-black text-slate-900 text-base">
                          {activeDn.totalDispatchedUnits}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white border border-slate-200 p-2.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block tracking-wider">
                          Accepted Units
                        </span>
                        <span className="font-mono font-black text-emerald-700 text-base">
                          {activeDn.totalAcceptedUnits}
                        </span>
                      </div>
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-rose-600 uppercase block tracking-wider">
                          Rejected Units
                        </span>
                        <span className="font-mono font-black text-rose-700 text-base">
                          {activeDn.totalRejectedUnits}
                        </span>
                      </div>
                    </div>

                    {/* Rejected Units Breakdown (Detailed Barcodes & Reasons) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-800 block">
                        Rejected Units Breakdown ({activeDn.totalRejectedUnits} Units Scanned):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto">
                        {(activeDn.rejectedUnitsDetail && activeDn.rejectedUnitsDetail.length > 0
                          ? activeDn.rejectedUnitsDetail
                          : activeDn.items.flatMap((item) =>
                              (item.rejectedUnitBarcodes || []).map((bc) => ({
                                productId: item.productId,
                                productName: item.productName,
                                sku: item.sku,
                                barcode: bc,
                                reason: item.rejectionReason || 'DAMAGED',
                                notes: item.rejectionNotes,
                              }))
                            )
                        ).map((rej, rIdx) => (
                          <div
                            key={rIdx}
                            className="bg-white p-3 rounded-xl border border-rose-200/90 text-xs shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-900 gap-1">
                              <span className="truncate max-w-[170px]" title={rej.productName}>
                                {rej.productName}
                              </span>
                              <Badge variant="destructive" className="text-[9.5px] py-0 px-1 uppercase font-semibold">
                                {rej.reason}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                              <span>SKU: {rej.sku}</span>
                              <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                {rej.barcode}
                              </span>
                            </div>
                            {rej.notes && (
                              <p className="text-[10px] text-slate-600 italic">
                                "{rej.notes}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Panel: Rejection Decision */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-slate-200 shadow-2xs overflow-hidden">
                  <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-4 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <span>Stock Manager Rejection Authorization</span>
                    </CardTitle>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Authorize physical intake of returned items into Quarantine Bay.
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {activeDn.status === 'REJECTION_PENDING_APPROVAL' ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-950">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Action Required: Stock Manager Approval</span>
                        </div>
                        <p className="text-[11.5px] text-amber-800 leading-relaxed">
                          Field delivery driver and Stock Keeper scanned <strong>{activeDn.totalRejectedUnits} rejected units</strong>.
                          Approving will log returned barcodes directly into the Quarantine Bay.
                        </p>
                      </div>
                    ) : activeDn.status === 'REJECTION_APPROVED' ? (
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-purple-950">
                          <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                          <span>Rejection Approved into Quarantine</span>
                        </div>
                        <p className="text-[11.5px] text-purple-800">
                          Authorized by <strong>{activeDn.rejectionApprovedBy || 'Stock Manager'}</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-rose-950">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Rejection Claim Declined</span>
                        </div>
                        <p className="text-[11.5px] text-rose-800">
                          Remarks: "{activeDn.rejectionApprovalRemarks || 'Disputed customer return.'}"
                        </p>
                      </div>
                    )}

                    {activeDn.status === 'REJECTION_PENDING_APPROVAL' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Stock Manager Remarks:
                          </label>
                          <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="e.g. Returned physical units inspected. Moving to Quarantine Bay..."
                            rows={3}
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <Button
                            size="sm"
                            onClick={handleApproveRejection}
                            disabled={isSubmitting}
                            className="w-full gap-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs py-2"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Approve Rejection to Quarantine</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeclineRejection}
                            disabled={isSubmitting}
                            className="w-full gap-2 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
                          >
                            <X className="h-4 w-4" />
                            <span>Decline Rejection Claim</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: VERIFICATION AUDIT LOG & HISTORY                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Stock Manager Verification Audit Log</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {grns
                .filter((g) => g.stockManagerApproval?.status)
                .map((g) => (
                  <div key={g.id} className="p-4 hover:bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Warehouse className="h-3.5 w-3.5 text-primary" />
                        <span>GRN {g.grnNumber}</span>
                        <span className="text-slate-400 font-normal">• {g.supplierName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Decision: <strong>{g.stockManagerApproval?.status}</strong> by{' '}
                        {g.stockManagerApproval?.approvedByName || g.stockManagerApproval?.rejectedByName} on{' '}
                        {formatDate(g.stockManagerApproval?.approvedAt || g.stockManagerApproval?.rejectedAt || '')}
                      </div>
                      {g.stockManagerApproval?.remarks && (
                        <p className="text-[11px] text-slate-600 italic mt-0.5">
                          "{g.stockManagerApproval.remarks}"
                        </p>
                      )}
                    </div>
                    <Badge
                      className={
                        g.stockManagerApproval?.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }
                    >
                      {g.stockManagerApproval?.status}
                    </Badge>
                  </div>
                ))}

              {deliveryNotes
                .filter((d) => d.rejectionApprovedBy || d.status === 'REJECTION_DECLINED')
                .map((d) => (
                  <div key={d.id} className="p-4 hover:bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-primary" />
                        <span>Delivery Note {d.deliveryNoteNumber}</span>
                        <span className="text-slate-400 font-normal">• {d.customerName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Customer Rejection: <strong>{d.totalRejectedUnits} units</strong> • Decision:{' '}
                        <strong>{d.status}</strong> by {d.rejectionApprovedBy || 'Stock Manager'}
                      </div>
                      {d.rejectionApprovalRemarks && (
                        <p className="text-[11px] text-slate-600 italic mt-0.5">
                          "{d.rejectionApprovalRemarks}"
                        </p>
                      )}
                    </div>
                    <Badge
                      className={
                        d.status === 'REJECTION_APPROVED'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }
                    >
                      {d.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject GRN Reason Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <span>Reject GRN Physical Intake</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a clear reason for rejecting the physical intake. The GRN will be returned to the Stock Keeper and will not reach Finance.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Document discrepancies, physical damage, missing serials or invalid barcodes..."
            rows={4}
            className="text-xs"
          />

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRejectGRN}
              disabled={isSubmitting || rejectReason.trim().length < 3}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Confirm Rejection</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
};

