import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../../components/ui/table';
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
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [grnStatusFilter, setGrnStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'REJECTED'>('ALL');
  const [dnStatusFilter, setDnStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>('ALL');

  // Decision panel state
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  // Filtered GRN list - Show ONLY GRNs that are pending approval
  const filteredGrns = useMemo(() => {
    return grns.filter((g) => {
      const isPending =
        g.status === 'PENDING_STOCK_MANAGER_APPROVAL' ||
        g.stockManagerApproval?.status === 'PENDING';
      if (!isPending) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = g.grnNumber.toLowerCase().includes(q);
        const matchesSup = g.supplierName.toLowerCase().includes(q);
        const matchesPo = (g.purchaseOrderNumber || g.poNumber || '').toLowerCase().includes(q);
        const matchesWh = (g.warehouseId || '').toLowerCase().includes(q);
        if (!matchesRef && !matchesSup && !matchesPo && !matchesWh) return false;
      }
      return true;
    });
  }, [grns, searchQuery]);

  // Pending and Rejected Distribution Notes list
  const pendingAndRejectedDns = useMemo(() => {
    return deliveryNotes.filter((d) => {
      const isRejectionRelevant =
        d.status === 'REJECTION_PENDING_APPROVAL' ||
        d.status === 'REJECTION_APPROVED' ||
        d.status === 'REJECTION_DECLINED' ||
        (d.totalRejectedUnits && d.totalRejectedUnits > 0);
      if (!isRejectionRelevant) return false;

      if (dnStatusFilter !== 'ALL') {
        if (dnStatusFilter === 'PENDING' && d.status !== 'REJECTION_PENDING_APPROVAL') return false;
        if (dnStatusFilter === 'APPROVED' && d.status !== 'REJECTION_APPROVED') return false;
        if (dnStatusFilter === 'DECLINED' && d.status !== 'REJECTION_DECLINED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDn = d.deliveryNoteNumber.toLowerCase().includes(q);
        const matchesCust = d.customerName.toLowerCase().includes(q);
        const matchesDriver = (d.driverName || '').toLowerCase().includes(q);
        if (!matchesDn && !matchesCust && !matchesDriver) return false;
      }
      return true;
    });
  }, [deliveryNotes, searchQuery, dnStatusFilter]);

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
          {/* GRN Queue Bar - Showing ONLY GRNs that are pending approval */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">GRN Queue:</span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold px-2.5 py-1 text-xs">
                Pending Approval ({filteredGrns.length})
              </Badge>
              <span className="text-2xs text-slate-400 font-medium hidden sm:inline">
                (Showing only inbound receipts awaiting Stock Manager verification)
              </span>
            </div>

            
          </div>

          {loading ? (
            <TableLoadingSkeleton />
          ) : filteredGrns.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-slate-200 bg-white">
              <Warehouse className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No GRNs Pending Approval</h3>
              <p className="text-xs text-slate-500 mt-1">
                All inbound goods receipts have been verified and forwarded to Finance.
              </p>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-2xs overflow-hidden bg-white mb-4">
                <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-3.5 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                        <Warehouse className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Inbound Goods Receipts Pending Approval</span>
                          <Badge variant="outline" className="text-2xs font-mono font-semibold bg-white text-amber-800 border-amber-300">
                            {filteredGrns.length} Pending
                          </Badge>
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Click any pending GRN to open its full physical verification document with serialization, barcode audit, and approval controls.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase tracking-wider">
                        <TableRow>
                          <TableHead className="w-36 py-2.5 px-3">GRN Reference #</TableHead>
                          <TableHead className="py-2.5 px-3">Supplier Name</TableHead>
                          <TableHead className="py-2.5 px-3">Linked PO #</TableHead>
                          <TableHead className="py-2.5 px-3">Warehouse &amp; Date</TableHead>
                          <TableHead className="py-2.5 px-3">Submitted By</TableHead>
                          <TableHead className="py-2.5 px-3 text-center">Lines &amp; Units</TableHead>
                          <TableHead className="py-2.5 px-3 text-center">Damaged</TableHead>
                          <TableHead className="py-2.5 px-3 text-center">Status</TableHead>
                          <TableHead className="py-2.5 px-3 text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100 font-sans">
                        {filteredGrns.map((g) => {
                          const totalDamaged = (g.items || []).reduce((sum, item) => sum + (item.damagedQuantity || 0), 0);
                          const totalReceived = (g.items || []).reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
                          return (
                            <TableRow
                              key={g.id}
                              onClick={() => navigate(`/inventory/grn/${g.id}`)}
                              className="cursor-pointer hover:bg-amber-50/50 transition-colors"
                            >
                              <TableCell className="py-3 px-3 font-mono font-bold text-primary">
                                <div className="flex items-center gap-1.5">
                                  <Warehouse className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span>{g.grnNumber}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-3 font-bold text-slate-900">
                                {g.supplierName}
                              </TableCell>
                              <TableCell className="py-3 px-3 font-mono text-slate-700">
                                {g.purchaseOrderNumber || g.poNumber || 'PO-2025-001'}
                              </TableCell>
                              <TableCell className="py-3 px-3 text-slate-600">
                                <div>{g.warehouseId || 'WH-MAIN'}</div>
                                <div className="text-[10.5px] text-slate-400 font-mono">
                                  {formatDate(g.receivedDate || g.submittedAt || new Date().toISOString())}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-3 text-slate-700">
                                {g.receivedByName || 'Stock Keeper (Amal Perera)'}
                              </TableCell>
                              <TableCell className="py-3 px-3 text-center font-mono font-semibold">
                                {g.items?.length || 0} lines • {totalReceived} units
                              </TableCell>
                              <TableCell className="py-3 px-3 text-center font-mono">
                                {totalDamaged > 0 ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-2xs font-bold">
                                    {totalDamaged} Damaged
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 font-normal">0 Damaged</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-3 text-center">
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold py-0.5 px-2">
                                  PENDING APPROVAL
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-3 text-right">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/inventory/grn/${g.id}`);
                                  }}
                                  className="h-7 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary-hover text-white shadow-2xs"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Inspect Full GRN Document</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DELIVERY NOTE REJECTED ITEMS APPROVALS                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'delivery-notes' && (
        <div className="space-y-4">
          {loading ? (
            <TableLoadingSkeleton />
          ) : pendingAndRejectedDns.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-slate-200 bg-white">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Delivery Note Rejections Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are no customer rejections matching the selected filter.
              </p>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-2xs overflow-hidden bg-white mb-4">
              <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-3.5 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Pending &amp; Rejected Distribution Notes</span>
                        <Badge variant="outline" className="text-2xs font-mono font-semibold bg-white text-slate-700">
                          {pendingAndRejectedDns.length} Total
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Click any Delivery Note to open its detailed page with full unit serialization, customer return audit, and quarantine decision controls.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold mr-2">
                      {pendingRejectionCount} Awaiting Authorization
                    </Badge>
                    {(['ALL', 'PENDING', 'APPROVED', 'DECLINED'] as const).map((st) => (
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
                        {st === 'ALL' && 'All Rejections'}
                        {st === 'PENDING' && `Pending (${pendingRejectionCount})`}
                        {st === 'APPROVED' && 'Approved'}
                        {st === 'DECLINED' && 'Declined'}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase tracking-wider">
                      <TableRow>
                        <TableHead className="w-36 py-2.5 px-3">Note Number</TableHead>
                        <TableHead className="py-2.5 px-3">Customer / Consignee</TableHead>
                        <TableHead className="py-2.5 px-3">Driver &amp; Vehicle</TableHead>
                        <TableHead className="py-2.5 px-3 text-center">Dispatched</TableHead>
                        <TableHead className="py-2.5 px-3 text-center">Accepted</TableHead>
                        <TableHead className="py-2.5 px-3 text-center">Rejected Units</TableHead>
                        <TableHead className="py-2.5 px-3 text-center">Status</TableHead>
                        <TableHead className="py-2.5 px-3 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 font-sans">
                      {pendingAndRejectedDns.map((dn) => (
                        <TableRow
                          key={dn.id}
                          onClick={() => navigate(`/inventory/delivery-notes/${dn.id}`)}
                          className="cursor-pointer transition-colors hover:bg-slate-50/80"
                        >
                          <TableCell className="py-3 px-3 font-mono font-bold text-primary">
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>{dn.deliveryNoteNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 font-semibold text-slate-800">
                            {dn.customerName}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-slate-600">
                            {dn.driverName || 'Samantha Perera (CP GA-3321)'}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center font-mono">
                            {dn.totalDispatchedUnits}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center font-mono text-emerald-700 font-semibold">
                            {dn.totalAcceptedUnits}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center font-mono text-rose-700 font-bold">
                            {dn.totalRejectedUnits}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center">
                            {dn.status === 'REJECTION_PENDING_APPROVAL' && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold py-0.5 px-2">
                                AWAITING APPROVAL
                              </Badge>
                            )}
                            {dn.status === 'REJECTION_APPROVED' && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-semibold py-0.5 px-2">
                                APPROVED (QUARANTINED)
                              </Badge>
                            )}
                            {dn.status === 'REJECTION_DECLINED' && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-semibold py-0.5 px-2">
                                DECLINED
                              </Badge>
                            )}
                            {!['REJECTION_PENDING_APPROVAL', 'REJECTION_APPROVED', 'REJECTION_DECLINED'].includes(dn.status) && (
                              <Badge variant="outline" className="text-[10px]">
                                {dn.status.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/inventory/delivery-notes/${dn.id}`);
                              }}
                              className={cn(
                                'h-7 text-xs font-semibold gap-1.5 shadow-2xs',
                                dn.status === 'REJECTION_PENDING_APPROVAL'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-primary hover:bg-primary-hover text-white'
                              )}
                            >
                              {dn.status === 'REJECTION_PENDING_APPROVAL' ? (
                                <>
                                  <ShieldCheck className="h-3 w-3" />
                                  <span>Review &amp; Authorize</span>
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Inspect Delivery Note</span>
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
};

