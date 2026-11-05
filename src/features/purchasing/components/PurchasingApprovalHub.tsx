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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { useAuth } from '../../../hooks/useAuth';
import { useApprovals } from '../../../hooks/useApprovals';
import { usePurchaseOrders } from '../../../hooks/usePurchaseOrders';
import { apService, SupplierPaymentRecord, VendorBill } from '../../finance/services/apService';
import { SupplierAdvance } from '../../finance/api/types';
import { ApprovalRequest, ApprovalActionType } from '../../../types/approval';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/purchasing';
import { formatDate, formatCurrency, formatDateTime } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import {
  ShoppingCart,
  ShieldCheck,
  CreditCard,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Eye,
  FileText,
  Building2,
  Layers,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Info,
  Calendar,
  Truck,
  Check,
  X,
  Lock,
  ExternalLink,
  DollarSign,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedPaymentRow {
  id: string;
  paymentType: 'SETTLEMENT' | 'ADVANCE';
  referenceNumber: string;
  paymentReference: string;
  paymentDate: string;
  supplierId: string;
  supplierName: string;
  bankAccount: string;
  amount: number;
  status: string;
  linkedDocumentRef: string;
  notes?: string;
  rawRecord: SupplierPaymentRecord | SupplierAdvance;
}

export const PurchasingApprovalHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, role } = useAuth();

  const activeTabParam = searchParams.get('tab') as 'po-approvals' | 'supplier-payments' | 'history' | null;
  const [activeTab, setActiveTab] = useState<'po-approvals' | 'supplier-payments' | 'history'>(
    activeTabParam || 'po-approvals'
  );

  // Default approval engine integration
  const { approvals, loading: approvalsLoading, error, refetch: refetchApprovals, executeAction } = useApprovals(role);
  const { purchaseOrders, loading: poLoading, refetch: refetchPOs } = usePurchaseOrders();

  // Supplier Payments view-only data
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payments, setPayments] = useState<SupplierPaymentRecord[]>([]);
  const [advances, setAdvances] = useState<SupplierAdvance[]>([]);
  const [bills, setBills] = useState<VendorBill[]>([]);

  // Search & Filter state for PO Approvals
  const [poSearch, setPoSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'FORWARDED' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  // Search & Filter state for Supplier Payments
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'ALL' | 'SETTLEMENT' | 'ADVANCE'>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<UnifiedPaymentRow | null>(null);
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);

  // Review & Decision Form State
  const [actionComment, setActionComment] = useState('');
  const [checklist, setChecklist] = useState({
    pricingCatalogChecked: false,
    deliveryScheduleVerified: false,
    budgetQuotaConfirmed: false,
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'APPROVE' | 'REJECT' | null;
    request: ApprovalRequest | null;
    po: PurchaseOrder | null;
  }>({
    open: false,
    type: null,
    request: null,
    po: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync tab with URL
  const handleTabChange = (tab: 'po-approvals' | 'supplier-payments' | 'history') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load view-only payments
  const loadPayments = () => {
    try {
      setPaymentsLoading(true);
      const pmts = apService.getSupplierPayments();
      const advs = apService.getSupplierAdvances();
      const allBills = apService.getAllBills();
      setPayments(pmts);
      setAdvances(advs);
      setBills(allBills);
    } catch (e) {
      console.error('Failed to load supplier payments:', e);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Filter approvals to PURCHASE_ORDER only
  const poApprovals = useMemo(() => {
    return approvals.filter((a) => a.documentType === 'PURCHASE_ORDER');
  }, [approvals]);

  // Section 1: POs Pending Purchasing Manager Approval
  const pendingPmApprovals = useMemo(() => {
    return poApprovals.filter(
      (a) => a.status === 'PENDING' && a.currentApproverRole === 'PURCHASING_MANAGER'
    );
  }, [poApprovals]);

  // Section 2: POs Pending Manager Approval (System Manager / General Manager)
  const pendingManagerApprovals = useMemo(() => {
    return poApprovals.filter(
      (a) =>
        a.status === 'PENDING' &&
        (a.currentApproverRole === 'MANAGER' ||
          a.currentApproverRole === 'SYSTEM_MANAGER' ||
          a.currentApproverRole === 'GENERAL_MANAGER')
    );
  }, [poApprovals]);

  // Search filtered lists for Section 1 and Section 2
  const filteredPendingPmApprovals = useMemo(() => {
    if (!poSearch.trim()) return pendingPmApprovals;
    const q = poSearch.toLowerCase();
    return pendingPmApprovals.filter((app) => {
      return (
        app.documentReferenceNumber.toLowerCase().includes(q) ||
        app.title.toLowerCase().includes(q) ||
        app.initiatorName.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q)
      );
    });
  }, [pendingPmApprovals, poSearch]);

  const filteredPendingManagerApprovals = useMemo(() => {
    if (!poSearch.trim()) return pendingManagerApprovals;
    const q = poSearch.toLowerCase();
    return pendingManagerApprovals.filter((app) => {
      return (
        app.documentReferenceNumber.toLowerCase().includes(q) ||
        app.title.toLowerCase().includes(q) ||
        app.initiatorName.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q)
      );
    });
  }, [pendingManagerApprovals, poSearch]);

  // Filtered PO Approvals (for general status tab filtering if selected)
  const filteredApprovals = useMemo(() => {
    return poApprovals.filter((app) => {
      // Status filtering
      if (statusFilter === 'PENDING') {
        if (app.status !== 'PENDING') return false;
      } else if (statusFilter === 'FORWARDED') {
        if (app.status !== 'ESCALATED' && !(app.status === 'PENDING' && app.currentApproverRole === 'MANAGER')) {
          return false;
        }
      } else if (statusFilter === 'APPROVED') {
        if (app.status !== 'APPROVED') return false;
      } else if (statusFilter === 'REJECTED') {
        if (app.status !== 'REJECTED') return false;
      }

      // Search filtering
      if (poSearch.trim()) {
        const q = poSearch.toLowerCase();
        const matchesRef = app.documentReferenceNumber.toLowerCase().includes(q);
        const matchesTitle = app.title.toLowerCase().includes(q);
        const matchesInit = app.initiatorName.toLowerCase().includes(q);
        const matchesDesc = app.description.toLowerCase().includes(q);
        if (!matchesRef && !matchesTitle && !matchesInit && !matchesDesc) return false;
      }
      return true;
    });
  }, [poApprovals, statusFilter, poSearch]);

  // Selected Active Approval Request and corresponding Purchase Order
  const activeApproval = useMemo(() => {
    if (selectedApprovalId) {
      const found = poApprovals.find((a) => a.id === selectedApprovalId);
      if (found) return found;
    }
    return (
      filteredPendingPmApprovals[0] ||
      filteredPendingManagerApprovals[0] ||
      pendingPmApprovals[0] ||
      pendingManagerApprovals[0] ||
      filteredApprovals[0] ||
      poApprovals[0] ||
      null
    );
  }, [
    poApprovals,
    selectedApprovalId,
    filteredPendingPmApprovals,
    filteredPendingManagerApprovals,
    pendingPmApprovals,
    pendingManagerApprovals,
    filteredApprovals,
  ]);

  const activePO = useMemo(() => {
    if (!activeApproval) return null;
    return (
      purchaseOrders.find((p) => p.id === activeApproval.documentId || p.poNumber === activeApproval.documentReferenceNumber) || null
    );
  }, [activeApproval, purchaseOrders]);

  // Unified Supplier Payments
  const unifiedPayments = useMemo<UnifiedPaymentRow[]>(() => {
    const rows: UnifiedPaymentRow[] = [];

    for (const p of payments) {
      rows.push({
        id: p.id,
        paymentType: 'SETTLEMENT',
        referenceNumber: p.paymentNumber,
        paymentReference: p.chequeNumber || p.bankReferenceNumber || p.paymentNumber,
        paymentDate: p.paymentDate,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        bankAccount: p.sourceAccountName || 'Operations Account',
        amount: p.totalPaidAmount,
        status: p.status,
        linkedDocumentRef: p.allocations.map((a) => a.vendorBillNumber).join(', ') || 'Direct AP Payment',
        notes: p.notes,
        rawRecord: p,
      });
    }

    for (const adv of advances) {
      rows.push({
        id: adv.id,
        paymentType: 'ADVANCE',
        referenceNumber: adv.advanceNumber,
        paymentReference: adv.chequeNumber || adv.bankReferenceNumber || adv.advanceNumber,
        paymentDate: adv.paymentDate,
        supplierId: adv.supplierId,
        supplierName: adv.supplierName,
        bankAccount: adv.sourceAccountName || 'Purchasing Account',
        amount: adv.amount,
        status: adv.status,
        linkedDocumentRef: adv.purchaseOrderNumber || 'Unlinked Advance',
        notes: adv.notes,
        rawRecord: adv,
      });
    }

    return rows.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, advances]);

  const filteredPayments = useMemo(() => {
    return unifiedPayments.filter((row) => {
      if (paymentTypeFilter !== 'ALL' && row.paymentType !== paymentTypeFilter) return false;
      if (paymentSearch.trim()) {
        const q = paymentSearch.toLowerCase();
        const matchesRef = row.referenceNumber.toLowerCase().includes(q);
        const matchesSup = row.supplierName.toLowerCase().includes(q);
        const matchesDoc = row.linkedDocumentRef.toLowerCase().includes(q);
        if (!matchesRef && !matchesSup && !matchesDoc) return false;
      }
      return true;
    });
  }, [unifiedPayments, paymentTypeFilter, paymentSearch]);

  // Total disbursements metric
  const paymentMetrics = useMemo(() => {
    const totalDisbursed = unifiedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const settlementsCount = unifiedPayments.filter((p) => p.paymentType === 'SETTLEMENT').length;
    const advancesCount = unifiedPayments.filter((p) => p.paymentType === 'ADVANCE').length;
    return { totalDisbursed, settlementsCount, advancesCount };
  }, [unifiedPayments]);

  // Self-approval check (Scenario B)
  const isCreator = useMemo(() => {
    if (!activeApproval) return false;
    return (
      activeApproval.initiatorId === currentUser.id ||
      (activeApproval.initiatorRole === 'PURCHASING_MANAGER' && role === 'PURCHASING_MANAGER')
    );
  }, [activeApproval, currentUser.id, role]);

  const canApprove = useMemo(() => {
    if (!activeApproval || activeApproval.status !== 'PENDING') return false;
    if (isCreator) return false; // Strict self-approval prevention

    if (role === 'DIRECTOR') return true;
    if (role === 'MANAGER' && activeApproval.currentApproverRole === 'MANAGER') return true;
    if (role === 'PURCHASING_MANAGER' && activeApproval.currentApproverRole === 'PURCHASING_MANAGER') return true;

    return false;
  }, [activeApproval, isCreator, role]);

  // Handle Approval Action (Using default approval engine)
  const handleConfirmDecision = async () => {
    if (!confirmModal.request || !confirmModal.type) return;

    if (!actionComment || actionComment.trim().length < 3) {
      toast.error('An explanatory comment of at least 3 characters is mandatory.');
      return;
    }

    if (confirmModal.type === 'APPROVE' && role === 'PURCHASING_MANAGER') {
      if (!checklist.pricingCatalogChecked || !checklist.deliveryScheduleVerified || !checklist.budgetQuotaConfirmed) {
        toast.error('Please verify all items in the pre-approval verification checklist.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const actionType: ApprovalActionType = confirmModal.type === 'APPROVE' ? 'APPROVE' : 'REJECT';
      await executeAction(
        confirmModal.request.id,
        actionType,
        currentUser.id,
        currentUser.name,
        role,
        actionComment
      );

      if (confirmModal.type === 'APPROVE') {
        if (role === 'PURCHASING_MANAGER') {
          toast.success(
            `Purchase Order ${confirmModal.request.documentReferenceNumber} verified and forwarded to the Manager (System Manager) for the next approval stage.`
          );
        } else {
          toast.success(`Purchase Order ${confirmModal.request.documentReferenceNumber} approved successfully.`);
        }
      } else {
        toast.error(`Purchase Order ${confirmModal.request.documentReferenceNumber} has been rejected.`);
      }

      setConfirmModal({ open: false, type: null, request: null, po: null });
      setActionComment('');
      setChecklist({
        pricingCatalogChecked: false,
        deliveryScheduleVerified: false,
        budgetQuotaConfirmed: false,
      });
      await refetchApprovals();
      await refetchPOs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute approval decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Purchasing Approvals & Visibility Hub"
        subtitle="Manage Purchase Order verification workflows and inspect supplier payments with role-based governance."
        badge={
          <Badge
            variant="outline"
            className="bg-primary-light text-primary border-primary-border font-mono text-xs uppercase"
          >
            ROLE: {role}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchApprovals();
                refetchPOs();
                loadPayments();
              }}
              className="gap-1.5 bg-white text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/purchasing/orders')}
              className="gap-1.5 bg-primary text-white hover:bg-primary-dark"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Purchase Orders Master</span>
            </Button>
          </div>
        }
      />

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => handleTabChange('po-approvals')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer',
            activeTab === 'po-approvals'
              ? 'border-primary text-primary bg-primary-light/30'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Purchase Order Approvals</span>
          {poApprovals.filter((a) => a.status === 'PENDING').length > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {poApprovals.filter((a) => a.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('supplier-payments')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer',
            activeTab === 'supplier-payments'
              ? 'border-primary text-primary bg-primary-light/30'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <CreditCard className="h-4 w-4" />
          <span>Supplier Payments Visibility</span>
          <Badge variant="outline" className="text-2xs bg-slate-100 text-slate-600 border-slate-300 font-mono">
            VIEW ONLY
          </Badge>
        </button>

        <button
          onClick={() => handleTabChange('history')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer',
            activeTab === 'history'
              ? 'border-primary text-primary bg-primary-light/30'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          )}
        >
          <History className="h-4 w-4" />
          <span>Approval Audit Log & History</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PURCHASE ORDER APPROVALS & VERIFICATION (Split-layout inspector)   */}
      {/* ========================================================================= */}
      {activeTab === 'po-approvals' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by PO #, supplier name, or initiator..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="pl-9 text-xs h-9 rounded-xl"
                  />
                </div>

                {/* Status Tabs */}
                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                  {(
                    [
                      { label: 'Active Queues (Pending PM & Manager)', value: 'PENDING' },
                      { label: 'Authorized / Approved', value: 'APPROVED' },
                      { label: 'Rejected', value: 'REJECTED' },
                      { label: 'All Requests', value: 'ALL' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setStatusFilter(st.value)}
                      className={cn(
                        'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs',
                        statusFilter === st.value
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TWO SECTIONS FOR PURCHASING MANAGER:
              1. POs Pending Purchasing Manager Approval
              2. POs Pending Manager Approval */}
          {statusFilter === 'PENDING' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SECTION 1: POs Pending Purchasing Manager Approval */}
              <Card className="border-slate-200 shadow-2xs bg-white">
                <CardHeader className="bg-amber-50/70 border-b border-amber-200/70 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-amber-600" />
                      <CardTitle className="text-sm font-bold text-slate-900">
                        POs Pending Purchasing Manager Approval
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 font-mono text-xs font-bold">
                      {filteredPendingPmApprovals.length} Awaiting PM
                    </Badge>
                  </div>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Stage 1: Purchase Orders submitted by Purchasing Officers awaiting Purchasing Manager verification.
                  </p>
                </CardHeader>
                <CardContent className="p-3 space-y-2 max-h-60 overflow-y-auto">
                  {filteredPendingPmApprovals.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1 opacity-70" />
                      <p className="font-semibold text-slate-600">No POs Pending Purchasing Manager Approval</p>
                      <p className="text-2xs">All submitted POs have been verified or no orders are currently in Stage 1.</p>
                    </div>
                  ) : (
                    filteredPendingPmApprovals.map((app) => {
                      const isSelected = activeApproval?.id === app.id;
                      const po = purchaseOrders.find(
                        (p) => p.id === app.documentId || p.poNumber === app.documentReferenceNumber
                      );
                      return (
                        <div
                          key={app.id}
                          onClick={() => navigate(`/purchasing/approvals/${app.id}`)}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 text-xs cursor-pointer transition-all space-y-2 shadow-2xs group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-900 text-xs group-hover:text-amber-800">
                                  {app.documentReferenceNumber}
                                </span>
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-2xs font-semibold">
                                  Pending PM Approval
                                </Badge>
                              </div>
                              <div className="text-2xs text-slate-600 truncate">
                                <span className="text-slate-400">Supplier:</span>{' '}
                                <span className="font-semibold text-slate-700">
                                  {po?.supplierName || app.description.split('for ')[1]?.split(' totaling')[0] || 'Supplier'}
                                </span>
                              </div>
                              <div className="text-2xs text-slate-500">
                                <span className="text-slate-400">Initiator:</span> {app.initiatorName}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-slate-900 text-xs">
                                {formatCurrency(po?.grandTotal || 0)}
                              </div>
                              <div className="text-2xs text-slate-400 mt-1">
                                {formatDate(app.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-2xs text-slate-500">Click to open dedicated approval page</span>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/purchasing/approvals/${app.id}`);
                              }}
                              className="h-6 text-2xs font-semibold gap-1 bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                            >
                              <span>Review &amp; Approve</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* SECTION 2: POs Pending Manager Approval */}
              <Card className="border-slate-200 shadow-2xs bg-white">
                <CardHeader className="bg-blue-50/70 border-b border-blue-200/70 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm font-bold text-slate-900">
                        POs Pending Manager Approval
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-mono text-xs font-bold">
                      {filteredPendingManagerApprovals.length} Awaiting Manager
                    </Badge>
                  </div>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Stage 2: Purchase Orders awaiting final authorization from the Manager (System Manager).
                  </p>
                </CardHeader>
                <CardContent className="p-3 space-y-2 max-h-60 overflow-y-auto">
                  {filteredPendingManagerApprovals.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      <Clock className="h-6 w-6 text-slate-300 mx-auto mb-1 opacity-70" />
                      <p className="font-semibold text-slate-600">No POs Pending Manager Approval</p>
                      <p className="text-2xs">No purchase orders are currently awaiting Manager (System Manager) authorization.</p>
                    </div>
                  ) : (
                    filteredPendingManagerApprovals.map((app) => {
                      const isSelected = activeApproval?.id === app.id;
                      const po = purchaseOrders.find(
                        (p) => p.id === app.documentId || p.poNumber === app.documentReferenceNumber
                      );
                      return (
                        <div
                          key={app.id}
                          onClick={() => navigate(`/purchasing/approvals/${app.id}`)}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-xs cursor-pointer transition-all space-y-2 shadow-2xs group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-900 text-xs group-hover:text-blue-800">
                                  {app.documentReferenceNumber}
                                </span>
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-2xs font-semibold">
                                  Awaiting Manager
                                </Badge>
                              </div>
                              <div className="text-2xs text-slate-600 truncate">
                                <span className="text-slate-400">Supplier:</span>{' '}
                                <span className="font-semibold text-slate-700">
                                  {po?.supplierName || app.description.split('for ')[1]?.split(' totaling')[0] || 'Supplier'}
                                </span>
                              </div>
                              <div className="text-2xs text-slate-500">
                                <span className="text-slate-400">Initiator:</span> {app.initiatorName}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-slate-900 text-xs">
                                {formatCurrency(po?.grandTotal || 0)}
                              </div>
                              <div className="text-2xs text-slate-400 mt-1">
                                {formatDate(app.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-2xs text-slate-500">
                              {role === 'PURCHASING_MANAGER'
                                ? 'Awaiting Manager (View-Only)'
                                : 'Awaiting Manager Authorization'}
                            </span>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/purchasing/approvals/${app.id}`);
                              }}
                              className="h-6 text-2xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                            >
                              <span>
                                {role === 'PURCHASING_MANAGER'
                                  ? 'View Details (View-Only)'
                                  : 'Review & Authorize'}
                              </span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {statusFilter !== 'PENDING' && (
            <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200/80 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Purchase Order Approval Records
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredApprovals.length} Orders
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase tracking-wider">
                      <TableRow>
                        <TableHead className="w-36 py-2.5 px-3">PO Reference</TableHead>
                        <TableHead className="py-2.5 px-3">Supplier Name</TableHead>
                        <TableHead className="py-2.5 px-3">Initiator</TableHead>
                        <TableHead className="py-2.5 px-3 text-right">Amount (LKR)</TableHead>
                        <TableHead className="py-2.5 px-3 text-center">Status</TableHead>
                        <TableHead className="py-2.5 px-3 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 font-sans">
                      {filteredApprovals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                            No purchase orders found matching this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredApprovals.map((app) => {
                          const po = purchaseOrders.find(
                            (p) => p.id === app.documentId || p.poNumber === app.documentReferenceNumber
                          );
                          return (
                            <TableRow
                              key={app.id}
                              onClick={() => navigate('/purchasing/approvals/' + app.id)}
                              className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            >
                              <TableCell className="font-mono font-bold text-primary py-3 px-3">
                                {app.documentReferenceNumber}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-800 py-3 px-3">
                                {po?.supplierName || app.description.split('for ')[1]?.split(' totaling')[0] || 'Supplier'}
                              </TableCell>
                              <TableCell className="text-slate-600 py-3 px-3">
                                {app.initiatorName}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-slate-900 py-3 px-3">
                                {formatCurrency(po?.grandTotal || 0)}
                              </TableCell>
                              <TableCell className="text-center py-3 px-3">
                                {app.status === 'APPROVED' ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-2xs font-semibold">
                                    APPROVED
                                  </Badge>
                                ) : app.status === 'REJECTED' ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-2xs font-semibold">
                                    REJECTED
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-2xs font-semibold">
                                    {app.status}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right py-3 px-3">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/purchasing/approvals/' + app.id);
                                  }}
                                  className="h-7 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary-hover text-white shadow-2xs"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Inspect Full Document</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPPLIER PAYMENTS VISIBILITY (Strict View-Only for Purchasing)     */}
      {/* ========================================================================= */}
      {activeTab === 'supplier-payments' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xs uppercase tracking-wider font-semibold text-slate-500">
                    Total Supplier Disbursements
                  </p>
                  <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {formatCurrency(paymentMetrics.totalDisbursed)}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CreditCard className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xs uppercase tracking-wider font-semibold text-slate-500">
                    Settlement Payments Recorded
                  </p>
                  <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {paymentMetrics.settlementsCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <FileText className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs bg-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xs uppercase tracking-wider font-semibold text-slate-500">
                    Supplier Advances Tracked
                  </p>
                  <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {paymentMetrics.advancesCount}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search supplier disbursements, voucher numbers, or bills..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="pl-9 text-xs h-9 rounded-xl"
                  />
                </div>

                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                  {(
                    [
                      { label: 'All Disbursements', value: 'ALL' },
                      { label: 'Direct Settlements', value: 'SETTLEMENT' },
                      { label: 'Supplier Advances', value: 'ADVANCE' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setPaymentTypeFilter(t.value)}
                      className={cn(
                        'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs',
                        paymentTypeFilter === t.value
                          ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View-Only Payments Table */}
          <Card className="border-slate-200 shadow-2xs bg-white overflow-hidden">
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="p-6">
                  <TableLoadingSkeleton />
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No supplier payments found.</p>
                  <p className="text-xs text-slate-400 mt-1">Disbursements created by Finance will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-2xs tracking-wider">
                      <tr>
                        <th className="p-3">Voucher #</th>
                        <th className="p-3">Payment Type</th>
                        <th className="p-3">Payment Date</th>
                        <th className="p-3">Supplier Name</th>
                        <th className="p-3">Source Account</th>
                        <th className="p-3 text-right">Amount Paid</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayments.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{row.referenceNumber}</td>
                          <td className="p-3">
                            {row.paymentType === 'SETTLEMENT' ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-2xs">
                                Settlement
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-2xs">
                                Advance
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{formatDate(row.paymentDate)}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{row.supplierName}</span>
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-2xs">{row.bankAccount}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-2xs">
                              {row.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(row);
                                setPaymentDetailOpen(true);
                              }}
                              className="h-7 px-2.5 text-2xs gap-1 text-slate-700"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View Details</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: APPROVAL AUDIT LOG & HISTORY                                      */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-200/80 px-5 py-4">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span>Purchase Order Approvals Audit Ledger</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-4">
              {poApprovals.flatMap((a) => a.history || []).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No approval actions recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {poApprovals.flatMap((app) =>
                    (app.history || []).map((h) => ({
                      ...h,
                      poRef: app.documentReferenceNumber,
                      poTitle: app.title,
                    }))
                  )
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((item, idx) => (
                      <div key={item.id || idx} className="py-3 flex items-start gap-4 text-xs">
                        <div className="mt-1">
                          {item.action === 'APPROVE' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : item.action === 'REJECT' ? (
                            <XCircle className="h-4 w-4 text-rose-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 font-mono">{item.poRef}</span>
                            <span className="text-2xs text-slate-400">{formatDateTime(item.timestamp)}</span>
                          </div>
                          <div className="text-slate-700 mt-0.5">
                            <span className="font-semibold">{item.actorName}</span>{' '}
                            <Badge variant="outline" className="text-2xs font-mono ml-1">
                              {item.actorRole}
                            </Badge>{' '}
                            transitioned state from <span className="font-mono">{item.fromStatus}</span> to{' '}
                            <span className="font-mono font-semibold">{item.toStatus}</span>
                          </div>
                          <p className="text-slate-600 text-2xs mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                            "{item.comment}"
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Decision Modal */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) => !open && setConfirmModal({ open: false, type: null, request: null, po: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmModal.type === 'APPROVE' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600" />
              )}
              <span>
                {confirmModal.type === 'APPROVE'
                  ? role === 'PURCHASING_MANAGER'
                    ? 'Confirm Approval & Forward to Manager (System Manager)'
                    : 'Authorize Purchase Order'
                  : 'Confirm Purchase Order Rejection'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {confirmModal.type === 'APPROVE'
                ? role === 'PURCHASING_MANAGER'
                  ? `Confirm verification of Purchase Order ${confirmModal.request?.documentReferenceNumber}? Your approval will be forwarded to the Manager (System Manager) for the next approval stage.`
                  : `You are about to authorize Purchase Order ${confirmModal.request?.documentReferenceNumber}. This decision will be permanently logged in the audit ledger.`
                : `Are you sure you want to reject Purchase Order ${confirmModal.request?.documentReferenceNumber}? This will terminate the approval workflow.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500">Your Action Comment:</span>
              <p className="font-semibold text-slate-800 mt-0.5">"{actionComment}"</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModal({ open: false, type: null, request: null, po: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDecision}
              disabled={isSubmitting}
              className={cn(
                confirmModal.type === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              )}
            >
              {isSubmitting ? 'Processing...' : confirmModal.type === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Payment View-Only Detail Dialog */}
      <Dialog open={paymentDetailOpen} onOpenChange={setPaymentDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Supplier Payment {selectedPayment?.referenceNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              View-only payment record from Accounts Payable disbursement ledger.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400 text-2xs block uppercase">Supplier</span>
                  <span className="font-bold text-slate-900">{selectedPayment.supplierName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-2xs block uppercase">Payment Date</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedPayment.paymentDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-2xs block uppercase">Disbursement Amount</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-2xs block uppercase">Disbursement Status</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-2xs">
                    {selectedPayment.status}
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block">Linked Documents / Invoice References</span>
                <span className="font-mono text-slate-800">{selectedPayment.linkedDocumentRef}</span>
              </div>

              {selectedPayment.notes && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-slate-500 font-semibold block">Disbursement Notes</span>
                  <p className="text-slate-700">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPaymentDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

