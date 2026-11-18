import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSmartBack } from '../../../hooks/useSmartBack';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { deliveryNoteService } from '../../../services/DeliveryNoteService';
import { DeliveryNote, SubmitDeliveryOutcomePayload } from '../../../types/deliveryNote';
import { PrintableDeliveryNote } from './PrintableDeliveryNote';
import { CustomerRejectionModal } from './CustomerRejectionModal';
import { DeliveryNoteBarcodeModal } from './DeliveryNoteBarcodeModal';
import { ConfirmDialog } from '../../../components/ui/confirm-button';
import { Dialog } from '../../../components/ui/dialog';
import { useAuth } from '../../../hooks/useAuth';
import {
  Truck,
  Printer,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  Barcode,
  Calendar,
  Building,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../utils/cn';

export const DeliveryNoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack('/inventory/delivery-notes');
  const { currentUser, role } = useAuth();

  const [note, setNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showConfirmDeliveryModal, setShowConfirmDeliveryModal] = useState(false);
  const [showApproveRejectionModal, setShowApproveRejectionModal] = useState(false);
  const [showDeclineRejectionModal, setShowDeclineRejectionModal] = useState(false);

  // Cancellation states
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showApproveCancelModal, setShowApproveCancelModal] = useState(false);
  const [showDeclineCancelModal, setShowDeclineCancelModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('Cancellation verified. Stock returned to available.');

  const [approvalRemarks, setApprovalRemarks] = useState(
    'Rejection verified. Return damaged units to Quarantine Bay Q-01.'
  );
  const [declineRemarks, setDeclineRemarks] = useState('');
  const [barcodeFilterProduct, setBarcodeFilterProduct] = useState<string>('ALL');
  const [barcodeSingleCode, setBarcodeSingleCode] = useState<string | undefined>(undefined);

  // Expandable row barcode drawers
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const effectiveRole = role || currentUser?.role;
  const isManagerOrAdmin =
    effectiveRole === 'MANAGER' ||
    effectiveRole === 'DIRECTOR' ||
    effectiveRole === 'STOCK_MANAGER';

  // Confirmed Decision #8: Sales Manager or Director approves Customer Rejections (no Stock Manager self-approval)
  const isSalesManagerOrDirector =
    effectiveRole === 'SALES_MANAGER' ||
    effectiveRole === 'MANAGER' ||
    effectiveRole === 'DIRECTOR';

  const fetchNote = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await deliveryNoteService.getById(id);
      if (data) {
        setNote(data);

        // Expand all line item drawers by default
        const initExpanded: Record<string, boolean> = {};
        data.items.forEach((i) => {
          initExpanded[i.id] = true;
        });
        setExpandedItems(initExpanded);
      } else {
        toast.error(`Delivery Note ${id} not found.`);
      }
    } catch (err: any) {
      toast.error('Failed to load delivery note: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNote();
  }, [id]);

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const barcodeItems = useMemo(() => {
    if (!note) return [];
    return note.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      uom: i.uom || 'PCS',
      unitBarcodes: i.unitBarcodes,
    }));
  }, [note]);

  // Case A: 100% Delivered & Accepted without rejections
  const handleConfirmFullDelivery = async () => {
    if (!note) return;
    try {
      const updated = await deliveryNoteService.confirmFullyDelivered(
        note.id,
        currentUser?.name || 'Authorized Customer Representative'
      );
      setNote(updated);
      setShowConfirmDeliveryModal(false);
      toast.success(
        `Delivery Note ${note.deliveryNoteNumber} marked as 100% Delivered and Accepted!`
      );
    } catch (err: any) {
      toast.error('Failed to confirm delivery: ' + err.message);
    }
  };

  // Case B: Delivery Outcome / Rejection submission (Two-Step workflow)
  const handleSubmitOutcome = async (payload: SubmitDeliveryOutcomePayload | any) => {
    if (!note) return;
    const user = {
      id: currentUser?.id || 'usr-01',
      name: currentUser?.name || 'Amal Perera',
      role: role || currentUser?.role || 'STOCK_KEEPER',
    };

    let updated: DeliveryNote;
    if (payload.productSummary) {
      updated = await deliveryNoteService.submitDeliveryOutcome(payload, user as any);
    } else {
      updated = await deliveryNoteService.submitRejection(note.id, payload, user as any);
    }
    setNote(updated);

    if (updated.status === 'REJECTION_APPROVED' || updated.status === 'PARTIALLY_REJECTED' || updated.status === 'DELIVERED') {
      toast.success(
        `Customer outcome processed and approved! ${updated.totalAcceptedUnits} delivered, ${updated.totalRejectedUnits} returned.`
      );
    } else {
      toast.info(
        `Delivery outcome submitted. ${updated.totalAcceptedUnits} accepted, ${updated.totalRejectedUnits} returned. Awaiting Stock Manager review.`
      );
    }
  };

  // Manager Approval Actions
  const handleApproveRejection = async () => {
    if (!note) return;
    try {
      const approver = currentUser || {
        id: 'usr-115',
        name: 'Bandara Jayasinghe',
        role: role || 'STOCK_MANAGER',
      };
      const updated = await deliveryNoteService.approveRejection(
        note.id,
        approver as any,
        approvalRemarks.trim() || 'Rejection verified. Return damaged units to Quarantine Bay Q-01.'
      );
      setNote(updated);
      toast.success(
        `Customer rejection approved! ${note.totalDamagedUnits || 0} unit(s) quarantined, ${note.totalReusableUnits || 0} restocked.`
      );
      setShowApproveRejectionModal(false);
    } catch (err: any) {
      toast.error('Failed to approve rejection: ' + err.message);
    }
  };

  const handleDeclineRejection = async () => {
    if (!note) return;
    if (!declineRemarks.trim() || declineRemarks.trim().length < 3) {
      toast.error('Decline requires a reason (minimum 3 characters)');
      return;
    }

    try {
      const approver = currentUser || {
        id: 'usr-115',
        name: 'Bandara Jayasinghe',
        role: role || 'STOCK_MANAGER',
      };
      const updated = await deliveryNoteService.declineRejection(
        note.id,
        approver as any,
        declineRemarks.trim()
      );
      setNote(updated);
      toast.info('Rejection declined. Re-inspection required.');
      setShowDeclineRejectionModal(false);
      setDeclineRemarks('');
    } catch (err: any) {
      toast.error('Failed to decline rejection: ' + err.message);
    }
  };

  // Cancellation Actions
  const handleRequestCancellation = async () => {
    if (!note) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      toast.error('Cancellation reason must be at least 5 characters');
      return;
    }

    try {
      const user = currentUser || {
        id: 'usr-01',
        name: 'Amal Perera',
        role: role || 'STOCK_KEEPER',
      };
      const updated = await deliveryNoteService.requestCancellation(note.id, cancelReason.trim(), user as any);
      setNote(updated);
      setShowCancelRequestModal(false);
      setCancelReason('');
      toast.warning(`Cancellation requested for Delivery Note ${note.deliveryNoteNumber}. Awaiting Stock Manager review.`);
    } catch (err: any) {
      toast.error('Failed to request cancellation: ' + err.message);
    }
  };

  const handleApproveCancellation = async () => {
    if (!note) return;
    try {
      const approver = currentUser || {
        id: 'usr-115',
        name: 'Bandara Jayasinghe',
        role: role || 'STOCK_MANAGER',
      };
      const updated = await deliveryNoteService.approveCancellation(note.id, approver as any, cancelRemarks);
      setNote(updated);
      setShowApproveCancelModal(false);
      toast.success(`Delivery Note ${note.deliveryNoteNumber} cancelled. Dispatched units restored to stock.`);
    } catch (err: any) {
      toast.error('Failed to approve cancellation: ' + err.message);
    }
  };

  const handleDeclineCancellation = async () => {
    if (!note) return;
    try {
      const approver = currentUser || {
        id: 'usr-115',
        name: 'Bandara Jayasinghe',
        role: role || 'STOCK_MANAGER',
      };
      const updated = await deliveryNoteService.declineCancellation(note.id, approver as any, 'Cancellation declined by management.');
      setNote(updated);
      setShowDeclineCancelModal(false);
      toast.info(`Cancellation request declined. Delivery Note remains in DISPATCHED status.`);
    } catch (err: any) {
      toast.error('Failed to decline cancellation: ' + err.message);
    }
  };

  const getStatusBadge = (status: DeliveryNote['status']) => {
    switch (status) {
      case 'DISPATCHED':
        return (
          <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-bold text-xs gap-1">
            <Truck className="h-3 w-3" />
            Dispatched / In Transit
          </Badge>
        );
      case 'DELIVERED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Delivered & 100% Accepted
          </Badge>
        );
      case 'PARTIALLY_REJECTED':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs gap-1">
            <AlertTriangle className="h-3 w-3" />
            Partially Delivered & Returned
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-xs gap-1">
            <X className="h-3 w-3" />
            All Units Rejected
          </Badge>
        );
      case 'REJECTION_PENDING_APPROVAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs gap-1 animate-pulse">
            <ShieldAlert className="h-3 w-3" />
            Rejection Pending Stock Manager Approval
          </Badge>
        );
      case 'REJECTION_APPROVED':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold text-xs gap-1">
            <ShieldCheck className="h-3 w-3" />
            Rejection Approved (Quarantine)
          </Badge>
        );
      case 'REJECTION_DECLINED':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-xs gap-1">
            <X className="h-3 w-3" />
            Rejection Declined
          </Badge>
        );
      case 'CANCELLATION_PENDING':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs gap-1 animate-pulse">
            <Ban className="h-3 w-3 text-amber-700" />
            Cancellation Pending Review
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-bold text-xs gap-1">
            <Ban className="h-3 w-3 text-slate-500" />
            Cancelled & Voided
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading Delivery Note details...
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-sm font-bold text-slate-800">Delivery Note Not Found</div>
        <Button size="sm" onClick={goBack}>
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="text-xs mb-1 -ml-2 text-slate-500 hover:text-slate-900 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Delivery Notes
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {note.deliveryNoteNumber}
            </h1>
            {getStatusBadge(note.status)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sales Order: <strong className="font-mono text-primary">{note.orderNumber || 'SO-Direct'}</strong> • Customer:{' '}
            <strong className="text-slate-800">{note.customerName}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold select-none">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Permanently Non-Editable</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            className="text-xs gap-1.5 border-slate-300 font-semibold"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            Print Delivery Note
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBarcodeFilterProduct('ALL');
              setBarcodeSingleCode(undefined);
              setShowBarcodeModal(true);
            }}
            className="text-xs gap-1.5 border-slate-300 text-slate-800 hover:text-primary font-semibold"
          >
            <Barcode className="h-3.5 w-3.5 text-primary" />
            Print Barcode Stickers
          </Button>

          {note.status === 'DISPATCHED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelRequestModal(true)}
                className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:text-rose-700 hover:bg-rose-50"
              >
                <Ban className="h-3.5 w-3.5" />
                Request Cancellation
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectionModal(true)}
                className="text-xs gap-1.5 border-rose-300 text-rose-700 bg-rose-50/50 hover:bg-rose-50 font-semibold"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                Process Delivery Outcome / Returns
              </Button>

              <Button
                size="sm"
                onClick={() => setShowConfirmDeliveryModal(true)}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm 100% Delivered
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Cancellation Pending Review Banner (Phase 6) ── */}
      {note.status === 'CANCELLATION_PENDING' && (
        <Card className="border-amber-300 bg-amber-50/90 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <Ban className="h-6 w-6 text-amber-700" />
              </div>
              <div className="text-xs text-amber-950">
                <h3 className="font-bold text-sm text-amber-950">
                  Delivery Note Cancellation Requested — Awaiting Stock Manager Approval
                </h3>
                <p className="mt-0.5 text-amber-900 leading-relaxed">
                  Requested by: <strong>{note.cancellationRequestedBy}</strong> on{' '}
                  {note.cancellationRequestedAt?.split('T')[0]}.
                </p>
                {note.cancellationReason && (
                  <p className="mt-1 p-2 rounded bg-white/80 border border-amber-200 text-amber-900 italic">
                    Reason: "{note.cancellationReason}"
                  </p>
                )}
              </div>
            </div>

            {isManagerOrAdmin ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeclineCancelModal(true)}
                  className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  Decline Cancellation
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowApproveCancelModal(true)}
                  className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs gap-1.5"
                >
                  <Ban className="h-4 w-4" />
                  Approve Cancellation & Void Note
                </Button>
              </div>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-100/60 px-3 py-1.5 rounded-lg border border-amber-300/60 font-medium">
                Awaiting Stock Manager review. Stock Keepers cannot approve cancellations.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Cancelled Notice ── */}
      {note.status === 'CANCELLED' && (
        <Card className="border-slate-300 bg-slate-100 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3 text-xs text-slate-700">
            <Ban className="h-5 w-5 text-slate-500 shrink-0" />
            <div>
              <span className="font-bold">Delivery Note Cancelled & Voided:</span> Dispatched physical units
              were reverted to warehouse inventory by <strong>{note.cancellationApprovedBy}</strong>. Remarks: "
              {note.cancellationApprovalRemarks || 'Cancellation approved'}".
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Approval Alert Banner (When Rejection is Pending Approval) ── */}
      {note.status === 'REJECTION_PENDING_APPROVAL' && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white shadow-xs">
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    Customer Rejection Submitted — Awaiting Sales Manager Approval
                  </h3>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    Submitted by: <strong>{note.rejectionSubmittedBy}</strong> • Total Returned Units:{' '}
                    <strong>{note.totalRejectedUnits} physical unit(s)</strong> ({note.totalDamagedUnits || 0} Damaged,{' '}
                    {note.totalReusableUnits || 0} Reusable).
                  </p>
                  {note.rejectionNotes && (
                    <div className="mt-1.5 text-[11px] text-amber-800 bg-white/70 p-2 rounded-md border border-amber-200 italic">
                      Stock Keeper Handover Note: {note.rejectionNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Sales Manager Approval Buttons */}
              {isSalesManagerOrDirector ? (
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeclineRejectionModal(true)}
                    className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold"
                  >
                    Decline Rejection
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowApproveRejectionModal(true)}
                    className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Approve Customer Rejection as Sales Manager
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-100/60 px-3 py-1.5 rounded-lg border border-amber-300/60 font-medium">
                  Awaiting Sales Manager approval. Stock Managers and Keepers cannot self-approve customer returns.
                </div>
              )}
            </div>

            {/* Detailed Returned Units Breakdown */}
            <div className="pt-3 border-t border-amber-200/80 space-y-2">
              <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider block">
                Returned Units Breakdown ({note.totalRejectedUnits} Units):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(note.returnedUnitsDetail && note.returnedUnitsDetail.length > 0
                  ? note.returnedUnitsDetail
                  : note.items.flatMap((item) =>
                      item.rejectedUnitBarcodes.map((bc) => ({
                        productId: item.productId,
                        productName: item.productName,
                        sku: item.sku,
                        barcode: bc,
                        condition: (item.damagedUnitBarcodes?.includes(bc) ? 'DAMAGED' : 'REUSABLE') as 'REUSABLE' | 'DAMAGED',
                        notes: item.rejectionNotes,
                      }))
                    )
                ).map((rej, rIdx) => {
                  const isDamaged = rej.condition === 'DAMAGED';
                  return (
                    <div
                      key={rIdx}
                      className="bg-white/95 p-2.5 rounded-lg border border-amber-200 text-xs shadow-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 gap-1">
                        <span className="truncate max-w-[170px]" title={rej.productName}>
                          {rej.productName}
                        </span>
                        <Badge
                          variant={isDamaged ? 'destructive' : 'outline'}
                          className={cn(
                            'text-[9.5px] py-0 px-1 font-bold',
                            !isDamaged && 'bg-sky-50 text-sky-800 border-sky-300'
                          )}
                        >
                          {isDamaged ? 'DAMAGED' : 'REUSABLE RETURN'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>SKU: {rej.sku}</span>
                        <span className="text-slate-800 font-bold bg-slate-100 px-1 rounded">
                          {rej.barcode}
                        </span>
                      </div>
                      {rej.notes && (
                        <p className="text-[10px] text-slate-600 italic">
                          "{rej.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Rejection Approved Banner ── */}
      {note.status === 'REJECTION_APPROVED' && (
        <Card className="border-purple-200 bg-purple-50/50 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3 text-xs text-purple-950">
            <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold">
                Customer Rejection Approved & Stock Movements Processed:
              </span>{' '}
              {note.totalDamagedUnits || 0} unit(s) quarantined, {note.totalReusableUnits || 0} unit(s) restocked by{' '}
              <strong>{note.rejectionApprovedBy}</strong> on{' '}
              {note.rejectionApprovedAt?.split('T')[0]}. Remarks: "
              {note.rejectionApprovalRemarks || 'Approved'}".
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Details Grid: Customer & Logistics ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              Consignee & Deliver-To Customer
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px]">
              {note.customerCode}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            <div>
              <span className="font-bold text-sm text-slate-900 block">
                {note.customerName}
              </span>
            </div>
            {note.customerAddress && (
              <div className="text-slate-600 leading-snug">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Delivery Address
                </span>
                {note.customerAddress}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-600">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Contact Phone
                </span>
                {note.customerPhone || '—'}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Originating Sales Order
                </span>
                <span className="font-mono font-bold text-primary">{note.orderNumber || 'SO-Direct'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transport & Driver Logistics Card */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Transport & Dispatch Logistics
            </CardTitle>
            <span className="text-xs text-slate-500">
              Dispatched on: <strong>{note.dispatchDate}</strong>
            </span>
          </CardHeader>
          <CardContent className="p-4 text-xs">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Delivery Driver
                  </span>
                  <span className="font-bold text-slate-900">{note.driverName}</span>
                  {note.driverPhone && (
                    <span className="text-slate-500 block text-[11px]">
                      {note.driverPhone}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Vehicle / Lorry No
                  </span>
                  <span className="font-mono font-bold text-slate-900 uppercase">
                    {note.vehicleNumber}
                  </span>
                </div>
              </div>

              {note.deliveryRoute && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Route / Destination
                  </span>
                  <span className="text-slate-700">{note.deliveryRoute}</span>
                </div>
              )}

              {note.notes && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 italic text-[11px]">
                  "{note.notes}"
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <Lock className="h-3 w-3 text-slate-400" />
                  Locked upon dispatch creation
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Audit: Immutable
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Dispatched Goods & Physical Unit Allocation Table ── */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Barcode className="h-4 w-4 text-primary" />
              Dispatched Line Items & Physical Unit Barcodes
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Every unit allocated by physical barcode scan from warehouse stock.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span>
              Dispatched: <strong className="text-slate-900">{note.totalDispatchedUnits}</strong>
            </span>
            <span>
              Accepted:{' '}
              <strong className="text-emerald-700">{note.totalAcceptedUnits}</strong>
            </span>
            {note.totalRejectedUnits > 0 && (
              <span className="text-rose-700 font-bold">
                Returned: {note.totalRejectedUnits} ({note.totalDamagedUnits || 0} Dam, {note.totalReusableUnits || 0} Reu)
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader className="bg-slate-100/70 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Product Description</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">UoM</TableHead>
                <TableHead className="text-right font-bold">Dispatched</TableHead>
                <TableHead className="text-right text-emerald-700 font-bold">Accepted</TableHead>
                <TableHead className="text-right text-sky-700 font-bold">Reusable</TableHead>
                <TableHead className="text-right text-rose-700 font-bold">Damaged</TableHead>
                <TableHead className="w-20 text-center">Barcodes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {note.items.map((item, idx) => {
                const isExpanded = !!expandedItems[item.id];
                return (
                  <React.Fragment key={item.id}>
                    <TableRow className="border-b border-slate-200 hover:bg-slate-50/60">
                      <TableCell className="text-center text-slate-400 font-medium">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {item.productName}
                      </TableCell>
                      <TableCell className="font-mono text-slate-600">{item.sku}</TableCell>
                      <TableCell className="text-center text-slate-600 font-medium">
                        {item.uom || 'PCS'}
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900">
                        {item.dispatchedQuantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {item.acceptedQuantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sky-700">
                        {item.reusableQuantity || 0}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-700">
                        {item.damagedQuantity || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleExpand(item.id)}
                            className="h-7 px-2 text-xs text-primary gap-1"
                          >
                            {isExpanded ? (
                              <>
                                Hide <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                View ({item.unitBarcodes.length}) <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setBarcodeFilterProduct(item.productId);
                              setBarcodeSingleCode(undefined);
                              setShowBarcodeModal(true);
                            }}
                            title={`Print ${item.unitBarcodes?.length || 0} unit barcode stickers`}
                            className="h-7 px-2 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/5 font-semibold"
                          >
                            <Printer className="h-3 w-3" />
                            Print ({item.unitBarcodes?.length || 0})
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Unit Barcodes Drawer */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/90 border-b border-slate-200">
                        <TableCell colSpan={9} className="p-3 pl-12">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                Scanned Physical Unit Barcodes ({item.unitBarcodes.length} Units):
                              </span>
                              {item.rejectedQuantity > 0 && (
                                <span className="text-[11px] text-rose-700 font-semibold">
                                  {item.damagedQuantity || 0} Damaged, {item.reusableQuantity || 0} Reusable Return
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {item.unitBarcodes.map((barcode, bIdx) => {
                                const isDamaged = item.damagedUnitBarcodes?.includes(barcode);
                                const isReusable = item.reusableUnitBarcodes?.includes(barcode) || (!isDamaged && item.rejectedUnitBarcodes.includes(barcode));
                                const isAccepted = !isDamaged && !isReusable;

                                return (
                                  <span
                                    key={bIdx}
                                    className={cn(
                                      'inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border shadow-2xs',
                                      isDamaged
                                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold ring-1 ring-rose-200'
                                        : isReusable
                                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold ring-1 ring-sky-200'
                                          : 'bg-white border-slate-200 text-slate-800'
                                    )}
                                  >
                                    <span className="text-[10px] text-slate-400 font-sans">
                                      #{bIdx + 1}
                                    </span>
                                    <span>{barcode}</span>
                                    {isDamaged ? (
                                      <span className="text-[9.5px] bg-rose-200 text-rose-900 px-1 rounded uppercase font-bold">
                                        Damaged
                                      </span>
                                    ) : isReusable ? (
                                      <span className="text-[9.5px] bg-sky-200 text-sky-900 px-1 rounded uppercase font-bold">
                                        Return
                                      </span>
                                    ) : (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setBarcodeFilterProduct('ALL');
                                        setBarcodeSingleCode(barcode);
                                        setShowBarcodeModal(true);
                                      }}
                                      title="Print this single unit barcode sticker"
                                      className="h-5 w-5 p-0 text-slate-400 hover:text-primary ml-0.5"
                                    >
                                      <Printer className="h-3 w-3" />
                                    </Button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Printable A4 Modal (Shown on "Print Delivery Note") ── */}
      {showPrintModal && (
        <PrintableDeliveryNote note={note} onClose={() => setShowPrintModal(false)} />
      )}

      {/* ── Customer Rejection Processing Modal ── */}
      {showRejectionModal && (
        <CustomerRejectionModal
          note={note}
          isOpen={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          onSubmit={handleSubmitOutcome}
        />
      )}

      {/* ── Unit Barcode Stickers Modal (Bulk, Item-wise & One-by-One Print) ── */}
      {note && showBarcodeModal && (
        <DeliveryNoteBarcodeModal
          isOpen={showBarcodeModal}
          onClose={() => setShowBarcodeModal(false)}
          deliveryNoteNumber={note.deliveryNoteNumber}
          invoiceNumber={note.invoiceNumber}
          customerName={note.customerName}
          items={barcodeItems}
          initialProductId={barcodeFilterProduct}
          initialSingleBarcode={barcodeSingleCode}
        />
      )}

      {/* ── Confirmation Popup Modal for Marking Delivered ── */}
      {note && (
        <ConfirmDialog
          open={showConfirmDeliveryModal}
          onOpenChange={setShowConfirmDeliveryModal}
          dialogVariant="success"
          confirmTitle="Confirm 100% Delivery Acceptance"
          confirmMessage={`Are you sure you want to mark Delivery Note ${note.deliveryNoteNumber} as 100% Delivered and Accepted? Confirm that all dispatched units have been received and accepted by ${note.customerName} with a signed physical delivery slip.`}
          confirmText="Yes, Confirm Delivered"
          cancelText="Cancel"
          onConfirm={handleConfirmFullDelivery}
        />
      )}

      {/* ── Modal: Request Cancellation ── */}
      <Dialog
        open={showCancelRequestModal}
        onOpenChange={setShowCancelRequestModal}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b pb-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Request Delivery Note Cancellation</h3>
              <p className="text-xs text-slate-500">
                Submit cancellation for Stock Manager review and approval.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Driver met with accident / customer cancelled order prior to drop-off..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setShowCancelRequestModal(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRequestCancellation}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Submit Cancellation Request
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Confirmation Modal: Approve Cancellation ── */}
      {note && (
        <ConfirmDialog
          open={showApproveCancelModal}
          onOpenChange={setShowApproveCancelModal}
          dialogVariant="destructive"
          confirmTitle="Approve Delivery Note Cancellation"
          confirmMessage={`Are you sure you want to approve cancellation of Delivery Note ${note.deliveryNoteNumber}? All ${note.totalDispatchedUnits} physical units will be restored to warehouse inventory.`}
          confirmText="Yes, Cancel Delivery Note"
          cancelText="Back"
          onConfirm={handleApproveCancellation}
        />
      )}

      {/* ── Confirmation Modal: Decline Cancellation ── */}
      {note && (
        <ConfirmDialog
          open={showDeclineCancelModal}
          onOpenChange={setShowDeclineCancelModal}
          dialogVariant="default"
          confirmTitle="Decline Delivery Note Cancellation"
          confirmMessage={`Decline cancellation request for Delivery Note ${note.deliveryNoteNumber}? The note will remain in DISPATCHED status.`}
          confirmText="Decline Request"
          cancelText="Cancel"
          onConfirm={handleDeclineCancellation}
        />
      )}

      {/* ── Confirmation Popup Modal for Approving Customer Rejection ── */}
      {note && (
        <ConfirmDialog
          open={showApproveRejectionModal}
          onOpenChange={setShowApproveRejectionModal}
          dialogVariant="success"
          confirmTitle="Approve Customer Rejection"
          confirmMessage={`Approve the customer rejection for ${note.totalRejectedUnits} unit(s)? (${note.totalDamagedUnits || 0} Damaged to Quarantine, ${note.totalReusableUnits || 0} Reusable to Stock)`}
          confirmText="Approve Customer Rejection"
          cancelText="Cancel"
          confirmContent={
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Approval Remarks
              </label>
              <Textarea
                rows={2}
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                className="text-xs"
                placeholder="Enter remarks..."
              />
            </div>
          }
          onConfirm={handleApproveRejection}
        />
      )}

      {/* ── Confirmation Popup Modal for Declining Customer Rejection ── */}
      {note && (
        <ConfirmDialog
          open={showDeclineRejectionModal}
          onOpenChange={(open) => {
            setShowDeclineRejectionModal(open);
            if (!open) setDeclineRemarks('');
          }}
          dialogVariant="destructive"
          confirmTitle="Decline Customer Rejection"
          confirmMessage="Declining this customer rejection will mark it as Rejection Declined and require physical re-inspection."
          confirmText="Reject Customer Rejection"
          cancelText="Cancel"
          confirmContent={
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Reason for Declining <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={2}
                placeholder="e.g. Physical counts do not match reported customer rejections..."
                value={declineRemarks}
                onChange={(e) => setDeclineRemarks(e.target.value)}
                className="text-xs"
              />
              {declineRemarks.trim().length > 0 && declineRemarks.trim().length < 3 && (
                <p className="text-[11px] text-rose-600">Reason must be at least 3 characters.</p>
              )}
            </div>
          }
          onConfirm={handleDeclineRejection}
        />
      )}
    </div>
  );
};
