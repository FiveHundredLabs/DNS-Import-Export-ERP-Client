import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { useAuth } from '../../hooks/useAuth';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useApprovals } from '../../hooks/useApprovals';
import { approvalService } from '../../services/ApprovalService';
import { ApprovalRequest, ApprovalActionType } from '../../types/approval';
import { PurchaseOrder } from '../../types/purchasing';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import {
  ShoppingCart,
  ArrowLeft,
  Printer,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  Building2,
  FileText,
  Truck,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  Check,
  Layers,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export const PurchaseOrderApprovalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const { purchaseOrders, loading: poLoading, refetch: refetchPOs } = usePurchaseOrders();
  const { approvals, loading: approvalsLoading, refetch: refetchApprovals } = useApprovals();

  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Mock approval checklist for Stage 1 (Purchasing Manager)
  const [checklist, setChecklist] = useState({
    pricingCatalogChecked: true,
    deliveryScheduleVerified: true,
    budgetQuotaConfirmed: true,
  });

  // Resolve PO and ApprovalRequest from id (handles approvalId, poId, or poNumber)
  const approval = useMemo(() => {
    if (!id) return null;
    return (
      approvals.find(
        (a) =>
          a.id === id ||
          a.documentId === id ||
          a.documentReferenceNumber === id
      ) || null
    );
  }, [approvals, id]);

  const po = useMemo(() => {
    if (!id) return null;
    if (approval) {
      const match = purchaseOrders.find(
        (p) => p.id === approval.documentId || p.poNumber === approval.documentReferenceNumber
      );
      if (match) return match;
    }
    return (
      purchaseOrders.find(
        (p) => p.id === id || p.poNumber === id || (approval && p.id === approval.documentId)
      ) || null
    );
  }, [purchaseOrders, approval, id]);

  // Determine approval stage
  // Stage 1: Awaiting Purchasing Manager Approval
  // Stage 2: Awaiting Manager Approval
  const isStage1 =
    approval?.status === 'PENDING' &&
    approval?.currentApproverRole === 'PURCHASING_MANAGER';

  const isStage2 =
    approval?.status === 'PENDING' &&
    (approval?.currentApproverRole === 'MANAGER' ||
      approval?.currentApproverRole === 'SYSTEM_MANAGER' ||
      approval?.currentApproverRole === 'GENERAL_MANAGER');

  const isFullyApproved = approval?.status === 'APPROVED' || po?.status === 'APPROVED';
  const isRejected = approval?.status === 'REJECTED' || po?.status === 'REJECTED';

  // Effective role check
  const isPurchasingManager = role === 'PURCHASING_MANAGER';
  const isGeneralManager = role === 'MANAGER' || role === 'DIRECTOR' || role === 'SYSTEM_MANAGER';

  // Permissions:
  // - Stage 1 approval is done by Purchasing Manager (approves and forwards to Manager)
  // - Stage 2 approval is done by Manager (System Manager)
  // - At Stage 2, Purchasing Manager has VIEW-ONLY ACCESS and cannot take any action
  const canApproveStage1 = isStage1 && isPurchasingManager;
  const canApproveStage2 = isStage2 && isGeneralManager;
  const canTakeAction = canApproveStage1 || canApproveStage2;

  // Handle Stage 1 Approve (Purchasing Manager -> forwards to Manager)
  const handleStage1Approve = async () => {
    if (!approval) return;
    if (!checklist.pricingCatalogChecked || !checklist.deliveryScheduleVerified || !checklist.budgetQuotaConfirmed) {
      toast.error('Please verify all pre-approval checklist items.');
      return;
    }

    setActionLoading(true);
    try {
      await approvalService.processAction(
        approval.id,
        'APPROVE',
        currentUser?.id || 'usr-pm-01',
        currentUser?.name || 'Mayura Samarakoon',
        'PURCHASING_MANAGER',
        remarks || 'Procurement pricing, quantity quotas, and delivery terms verified. Forwarded to Manager for Stage 2 authorization.'
      );

      toast.success(
        `Purchase Order ${approval.documentReferenceNumber} verified by Purchasing Manager and forwarded to Manager (System Manager) for Stage 2 approval!`
      );
      setApproveModalOpen(false);
      setRemarks('');
      await Promise.all([refetchApprovals(), refetchPOs()]);
    } catch (err: any) {
      toast.error('Failed to approve PO: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stage 2 Approve (Manager final authorization)
  const handleStage2Approve = async () => {
    if (!approval) return;

    setActionLoading(true);
    try {
      await approvalService.processAction(
        approval.id,
        'APPROVE',
        isGeneralManager ? currentUser?.id || 'usr-mgr-01' : 'usr-mgr-01',
        isGeneralManager ? currentUser?.name || 'General Manager' : 'General Manager (System Manager)',
        'MANAGER',
        remarks || 'Managerial budget & operational authorization confirmed. PO approved for supplier ordering.'
      );

      toast.success(
        `Purchase Order ${approval.documentReferenceNumber} fully authorized & approved by Manager! Ready for supplier fulfillment.`
      );
      setApproveModalOpen(false);
      setRemarks('');
      await Promise.all([refetchApprovals(), refetchPOs()]);
    } catch (err: any) {
      toast.error('Failed to approve PO: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle PO Approval action based on current stage
  const handleApprovePO = () => {
    setApproveModalOpen(true);
  };

  // Handle Reject
  const handleRejectPO = async () => {
    if (!approval) return;
    if (!remarks.trim()) {
      toast.error('Please enter a reason for rejecting the purchase order.');
      return;
    }

    setActionLoading(true);
    try {
      await approvalService.processAction(
        approval.id,
        'REJECT',
        currentUser?.id || 'usr-pm-01',
        currentUser?.name || 'Mayura Samarakoon',
        (role as any) || 'PURCHASING_MANAGER',
        remarks.trim()
      );

      toast.error(`Purchase Order ${approval.documentReferenceNumber} has been rejected.`);
      setRejectModalOpen(false);
      setRemarks('');
      await Promise.all([refetchApprovals(), refetchPOs()]);
    } catch (err: any) {
      toast.error('Failed to reject PO: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if ((poLoading || approvalsLoading) && !po && !approval) {
    return (
      <div className="max-w-7xl mx-auto p-8 space-y-4 animate-pulse">
        <div className="h-9 w-32 bg-slate-200 rounded-md" />
        <div className="h-12 w-80 bg-slate-200 rounded-md mt-4" />
        <div className="h-96 w-full bg-slate-100 rounded-xl mt-6" />
      </div>
    );
  }

  if (!po && !approval) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/approvals?tab=po-approvals')}
          className="gap-2 text-slate-700 bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Approvals</span>
        </Button>
        <Card className="p-12 text-center bg-white border-dashed border-slate-300">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-800">Purchase Order Record Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">
            Could not find an active approval request or purchase order with reference "{id}".
          </p>
        </Card>
      </div>
    );
  }

  const poNumber = po?.poNumber || approval?.documentReferenceNumber || 'PO-2026-XXXX';
  const supplierName = po?.supplierName || approval?.description.split('for ')[1]?.split(' totaling')[0] || 'Supplier';
  const grandTotal = po?.grandTotal || 0;
  const items = po?.items || [];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP HEADER & ACTION CONTROLS                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/approvals?tab=po-approvals');
              }
            }}
            className="text-xs -ml-2 text-slate-500 hover:text-slate-900 gap-1.5 h-7 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Approvals</span>
          </Button>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <span>{poNumber}</span>
            </h1>

            {isStage1 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold px-2.5 py-1 text-xs gap-1.5 animate-pulse">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Stage 1: Awaiting Purchasing Manager Approval
              </Badge>
            )}

            {isStage2 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold px-2.5 py-1 text-xs gap-1.5 animate-pulse">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                Stage 2: Awaiting Manager Approval
              </Badge>
            )}

            {isFullyApproved && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold px-2.5 py-1 text-xs gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Fully Approved &amp; Authorized
              </Badge>
            )}

            {isRejected && (
              <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold px-2.5 py-1 text-xs gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                Purchase Order Rejected
              </Badge>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Supplier: <strong className="text-slate-800">{supplierName}</strong> • Initiator:{' '}
            <strong className="text-slate-800">{approval?.initiatorName || 'Ruwan Wickramasinghe'}</strong>
          </p>
        </div>

        {/* Action Buttons: Print PO, Approve PO, Reject PO */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (po?.id) {
                navigate(`/purchasing/orders/${po.id}/print`);
              } else {
                window.print();
              }
            }}
            className="gap-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            <span>Print PO</span>
          </Button>

          {/* Purchasing Manager View-Only Badge for Stage 2 */}
          {isStage2 && isPurchasingManager && (
            <Badge
              variant="outline"
              className="bg-slate-100 text-slate-700 border-slate-300 font-semibold px-2.5 py-1 text-xs gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
              <span>View-Only Mode (Awaiting Manager)</span>
            </Badge>
          )}

          {!isFullyApproved && !isRejected && canTakeAction && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(true)}
                disabled={actionLoading}
                className="gap-1.5 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50 shadow-2xs cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject PO</span>
              </Button>

              <Button
                size="sm"
                onClick={handleApprovePO}
                disabled={actionLoading}
                className={cn(
                  'gap-1.5 text-xs font-bold text-white shadow-xs cursor-pointer',
                  isStage1 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {isStage1
                    ? 'Approve PO (Stage 1)'
                    : 'Approve PO (Stage 2)'}
                </span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* APPROVAL STAGE LIFECYCLE STEPPER                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
          <span>Multi-Tier Approval Journey</span>
          <span className="text-2xs font-normal normal-case text-slate-400">
            Default Approval Engine • Scenario A / B
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          {/* Step 1 */}
          <div className="p-3 rounded-lg border bg-emerald-50/70 border-emerald-200 text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[11px]">1. PO Created</div>
              <div className="text-2xs text-emerald-800">
                {approval?.initiatorName || 'Purchasing Officer'}
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={cn(
              'p-3 rounded-lg border flex items-start gap-2.5',
              isStage1
                ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-300/50'
                : isStage2 || isFullyApproved
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            )}
          >
            {isStage1 ? (
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-spin" />
            ) : isStage2 || isFullyApproved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-[11px]">2. Purchasing Manager</div>
              <div className="text-2xs">
                {isStage1 ? 'Awaiting Stage 1 Approval' : 'Verified & Forwarded'}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={cn(
              'p-3 rounded-lg border flex items-start gap-2.5',
              isStage2
                ? 'bg-blue-50 border-blue-300 text-blue-950 ring-2 ring-blue-300/50'
                : isFullyApproved
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            )}
          >
            {isStage2 ? (
              <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
            ) : isFullyApproved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-[11px]">3. Manager Authorization</div>
              <div className="text-2xs">
                {isStage2
                  ? 'Awaiting Stage 2 Final Approval'
                  : isFullyApproved
                  ? 'Authorized by Manager'
                  : 'Pending Stage 1'}
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div
            className={cn(
              'p-3 rounded-lg border flex items-start gap-2.5',
              isFullyApproved
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            )}
          >
            {isFullyApproved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Truck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-[11px]">4. Supplier Dispatch</div>
              <div className="text-2xs">
                {isFullyApproved ? 'Ready for Warehouse Inward' : 'Pending Approvals'}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Workflow Alert Banner */}
        {isStage1 && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-sm">
                Stage 1 Action Required: Purchasing Manager Approval
              </span>
              <p className="text-amber-800 leading-relaxed text-xs">
                This Purchase Order was submitted by <strong>{approval?.initiatorName}</strong>.
                Approving this order will verify supplier price catalogs and quota compliance, and automatically forward the request to the <strong>Manager (System Manager)</strong> for final Stage 2 authorization.
              </p>
            </div>
          </div>
        )}

        {isStage2 && (
          <div
            className={cn(
              'p-3.5 rounded-xl border text-xs flex items-start gap-3',
              isPurchasingManager
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-blue-50/90 border-blue-300 text-blue-950'
            )}
          >
            <ShieldCheck
              className={cn(
                'h-5 w-5 shrink-0 mt-0.5',
                isPurchasingManager ? 'text-slate-500' : 'text-blue-600'
              )}
            />
            <div className="space-y-1">
              <span className="font-bold block text-sm">
                {isPurchasingManager
                  ? 'Stage 2 Approval Pending – Purchasing Manager View-Only Access'
                  : 'Stage 2 Action Required: Manager (System Manager) Final Approval'}
              </span>
              <p
                className={cn(
                  'leading-relaxed text-xs',
                  isPurchasingManager ? 'text-slate-600' : 'text-blue-800'
                )}
              >
                {isPurchasingManager
                  ? 'This Purchase Order has passed Stage 1 verification and has been forwarded to the Manager (System Manager) for Stage 2 final authorization. At Stage 2, the Purchasing Manager has view-only access and cannot take approval or rejection actions.'
                  : 'This Purchase Order has passed Stage 1 verification and is now awaiting final managerial authorization. Once approved, the order will be marked as fully approved and released for supplier ordering.'}
              </p>
            </div>
          </div>
        )}

        {isFullyApproved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm">Purchase Order Fully Approved</span>
              <p className="text-emerald-800 leading-relaxed text-xs">
                All multi-tier approval stages have completed successfully. The order is authorized for supplier placement and warehouse receiving intake.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* KEY FINANCIAL & LOGISTIC METRICS                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Product Lines
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {items.length || 2}
          </span>
        </Card>

        <Card className="border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Units
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {items.reduce((sum, it) => sum + (it.quantity || 0), 0) || 13}
          </span>
        </Card>

        <Card className="border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Payment Terms
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {po?.paymentTerms || 'Net 15'}
          </span>
        </Card>

        <Card className="border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-primary block tracking-wider">
            Grand Total (LKR)
          </span>
          <span className="text-xl font-black font-mono text-primary mt-1 block">
            {formatCurrency(grandTotal || 241767)}
          </span>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUPPLIER & LOGISTICS CARDS                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supplier Info */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardHeader className="p-3.5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Supplier Information</span>
            </CardTitle>
            <Badge variant="outline" className="font-mono text-2xs">
              {po?.supplierId || 'SUP-002'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="font-bold text-sm text-slate-900">{supplierName}</div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Contact</span>
                <span>{po?.supplierContactPerson || 'Nimal Samarasinghe'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Phone</span>
                <span>{po?.supplierPhone || '+94 11 234 5678'}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Billing / Factory Address</span>
              <span className="text-slate-600">
                {po?.supplierAddress || 'No. 45/A, Industrial Zone, Biyagama, Sri Lanka'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Order Governance Info */}
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardHeader className="p-3.5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Order Governance &amp; Dates</span>
            </CardTitle>
            <Badge variant="outline" className="font-mono text-2xs">
              {approval?.id || 'app-po-01'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Order Date</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatDate(po?.orderDate || '2026-10-26')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Expected Delivery</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatDate(po?.expectedDeliveryDate || '2026-11-08')}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Initiated By</span>
                <span className="font-bold text-slate-800">
                  {approval?.initiatorName || 'Ruwan Wickramasinghe'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Receiving Warehouse</span>
                <span className="font-mono text-slate-800">{po?.warehouseId || 'WH-MAIN (Colombo Hub)'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PURCHASED PRODUCT LINE ITEMS TABLE                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>Purchased Product Line Items</span>
          </CardTitle>
          <span className="text-xs text-slate-500 font-mono font-semibold">
            {items.length || 2} Line Items
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader className="bg-slate-100/70 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Product Code &amp; Description</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price (LKR)</TableHead>
                <TableHead className="text-right font-bold">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {items.length > 0 ? (
                items.map((it, idx) => (
                  <TableRow key={it.id || idx} className="hover:bg-slate-50/70">
                    <TableCell className="text-center font-mono text-slate-400">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-900">{it.productName}</TableCell>
                    <TableCell className="font-mono text-slate-600">{it.sku}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{it.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(it.unitPrice)}</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-900">
                      {formatCurrency(it.totalPrice || it.quantity * it.unitPrice)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  <TableRow className="hover:bg-slate-50/70">
                    <TableCell className="text-center font-mono text-slate-400">1</TableCell>
                    <TableCell className="font-bold text-slate-900">
                      Siemens SINAMICS V20 7.5kW VFD Inverter
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">AUT-VFD-7.5KW</TableCell>
                    <TableCell className="text-right font-mono font-bold">8</TableCell>
                    <TableCell className="text-right font-mono">LKR 18,500.00</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-900">
                      LKR 157,176.00
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/70">
                    <TableCell className="text-center font-mono text-slate-400">2</TableCell>
                    <TableCell className="font-bold text-slate-900">
                      Siemens SIMATIC S7-1200 CPU 1214C DC/DC/DC
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">AUT-PLC-1200</TableCell>
                    <TableCell className="text-right font-mono font-bold">5</TableCell>
                    <TableCell className="text-right font-mono">LKR 14,200.00</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-900">
                      LKR 79,591.00
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* APPROVAL DIALOG (STAGE 1 & STAGE 2 MOCK WORKFLOW)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>
                {isStage1
                  ? `Approve & Forward Purchase Order (${poNumber})`
                  : `Manager Final Authorization (${poNumber})`}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {isStage1
                ? 'Verify procurement parameters and forward to the General Manager for Stage 2 final authorization.'
                : 'Grant final managerial approval to release this purchase order for supplier fulfillment.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Stage 1 verification checklist */}
            {isStage1 && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Purchasing Manager Verification Checklist
                </span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checklist.pricingCatalogChecked}
                    onChange={(e) => setChecklist({ ...checklist, pricingCatalogChecked: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                  />
                  <span>Supplier pricing verified against active catalog</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checklist.deliveryScheduleVerified}
                    onChange={(e) => setChecklist({ ...checklist, deliveryScheduleVerified: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                  />
                  <span>Expected delivery schedule &amp; credit terms confirmed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={checklist.budgetQuotaConfirmed}
                    onChange={(e) => setChecklist({ ...checklist, budgetQuotaConfirmed: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary"
                  />
                  <span>Quantities confirmed within quarterly budget quota</span>
                </label>
              </div>
            )}

            {/* Stage 1 Notice */}
            {isStage1 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>Next Approval Stage:</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Approving this Purchase Order will verify procurement specifications and forward it to the <strong>Manager (System Manager)</strong> for the next approval stage.
                </p>
              </div>
            )}

            {/* Stage 2 Notice */}
            {isStage2 && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Final Approval Stage:</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Executing this approval will complete Stage 2 authorization. The Purchase Order will immediately be finalized for supplier delivery and warehouse receiving.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Verification &amp; Approval Remarks:
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  isStage1
                    ? 'e.g. Procurement pricing and catalog specifications verified. Forwarding to Manager.'
                    : 'e.g. Managerial sign-off confirmed. Approved for supplier ordering.'
                }
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={isStage1 ? handleStage1Approve : handleStage2Approve}
              disabled={actionLoading}
              className={cn(
                'text-xs font-bold text-white shadow-xs',
                isStage1 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              )}
            >
              {actionLoading ? (
                'Processing...'
              ) : isStage1 ? (
                'Approve & Forward to Manager'
              ) : (
                'Authorize & Approve PO'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REJECT DIALOG                                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700">
              <XCircle className="h-5 w-5" />
              <span>Reject Purchase Order ({poNumber})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a clear reason for rejecting this purchase order. It will be returned to the initiator.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label className="text-[11px] font-bold text-slate-700 block">
              Rejection Reason <span className="text-rose-500">*</span>:
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Pricing exceeds permitted quarterly budget. Please renegotiate with supplier."
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectPO}
              disabled={actionLoading || !remarks.trim()}
              className="text-xs font-bold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

