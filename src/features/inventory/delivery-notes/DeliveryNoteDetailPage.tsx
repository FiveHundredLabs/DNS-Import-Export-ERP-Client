import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { deliveryNoteService } from '../../../services/DeliveryNoteService';
import { DeliveryNote, SubmitRejectionPayload } from '../../../types/deliveryNote';
import { PrintableDeliveryNote } from './PrintableDeliveryNote';
import { CustomerRejectionModal } from './CustomerRejectionModal';
import { useAuth } from '../../../hooks/useAuth';
import {
  Truck,
  Printer,
  Edit3,
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
} from 'lucide-react';
import { toast } from 'sonner';

export const DeliveryNoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const [note, setNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Quick edit mode for driver/vehicle
  const [isEditing, setIsEditing] = useState(false);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Expandable row barcode drawers
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const isManagerOrAdmin =
    role === 'MANAGER' ||
    role === 'DIRECTOR' ||
    role === 'ADMIN' ||
    role === 'STOCK_KEEPER'; // Allow testing as Stock Keeper or Operations Manager

  const fetchNote = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await deliveryNoteService.getById(id);
      if (data) {
        setNote(data);
        setEditDriverName(data.driverName);
        setEditDriverPhone(data.driverPhone || '');
        setEditVehicleNumber(data.vehicleNumber);
        setEditNotes(data.notes || '');

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

  const handleSaveEdit = async () => {
    if (!note) return;
    try {
      const updated = await deliveryNoteService.updateDeliveryNote(note.id, {
        driverName: editDriverName.trim(),
        driverPhone: editDriverPhone.trim(),
        vehicleNumber: editVehicleNumber.trim().toUpperCase(),
        notes: editNotes.trim(),
      });
      setNote(updated);
      setIsEditing(false);
      toast.success('Delivery Note details updated.');
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  // Case A: 100% Delivered & Accepted without rejections
  const handleConfirmFullDelivery = async () => {
    if (!note) return;
    const confirmed = window.confirm(
      'Confirm that ALL dispatched units have been received and accepted by the customer with signed delivery slip?'
    );
    if (!confirmed) return;

    try {
      const updated = await deliveryNoteService.confirmFullyDelivered(
        note.id,
        'Authorized Customer Representative'
      );
      setNote(updated);
      toast.success(
        `Delivery Note ${note.deliveryNoteNumber} marked as 100% Delivered and Accepted!`
      );
    } catch (err: any) {
      toast.error('Failed to confirm delivery: ' + err.message);
    }
  };

  // Case B: Customer Rejection submission
  const handleSubmitRejection = async (payload: SubmitRejectionPayload) => {
    if (!note) return;
    const user = currentUser || {
      id: 'usr-01',
      name: 'Amal Perera',
      role: 'STOCK_KEEPER',
    };
    const updated = await deliveryNoteService.submitRejection(note.id, payload, user as any);
    setNote(updated);
  };

  // Manager Approval Actions
  const handleApproveRejection = async () => {
    if (!note) return;
    const remarks = window.prompt(
      'Enter Manager Approval Remarks (e.g., Return rejected units to Quarantine Bay Q-01):',
      'Rejection verified. Return damaged units to Quarantine Bay Q-01.'
    );
    if (remarks === null) return;

    try {
      const approver = currentUser || {
        id: 'mgr-01',
        name: 'Sunil Weerasinghe',
        role: 'Operations Manager',
      };
      const updated = await deliveryNoteService.approveRejection(
        note.id,
        approver as any,
        remarks
      );
      setNote(updated);
      toast.success(
        `Customer rejection approved! ${note.totalRejectedUnits} unit(s) logged for warehouse quarantine.`
      );
    } catch (err: any) {
      toast.error('Failed to approve rejection: ' + err.message);
    }
  };

  const handleDeclineRejection = async () => {
    if (!note) return;
    const remarks = window.prompt('Enter reason for declining rejection:');
    if (remarks === null) return;

    try {
      const approver = currentUser || {
        id: 'mgr-01',
        name: 'Sunil Weerasinghe',
        role: 'Operations Manager',
      };
      const updated = await deliveryNoteService.declineRejection(
        note.id,
        approver as any,
        remarks
      );
      setNote(updated);
      toast.info('Rejection declined. Re-inspection required.');
    } catch (err: any) {
      toast.error('Failed to decline rejection: ' + err.message);
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
      case 'REJECTION_PENDING_APPROVAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            Rejection Pending Approval
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
        <Button size="sm" onClick={() => navigate('/inventory/delivery-notes')}>
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
            onClick={() => navigate('/inventory/delivery-notes')}
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
            Linked to Invoice: <strong className="font-mono text-slate-800">{note.invoiceNumber}</strong> • Customer:{' '}
            <strong className="text-slate-800">{note.customerName}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs gap-1.5"
          >
            <Edit3 className="h-3.5 w-3.5" />
            {isEditing ? 'Cancel Edit' : 'Edit Transport'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            className="text-xs gap-1.5 border-slate-300 font-semibold"
          >
            <Printer className="h-3.5 w-3.5 text-primary" />
            Print Delivery Note
          </Button>

          {note.status === 'DISPATCHED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectionModal(true)}
                className="text-xs gap-1.5 border-rose-300 text-rose-700 bg-rose-50/50 hover:bg-rose-50 font-semibold"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                Process Customer Rejection
              </Button>

              <Button
                size="sm"
                onClick={handleConfirmFullDelivery}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm 100% Delivered
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Approval Alert Banner (When Rejection is Pending Approval) ── */}
      {note.status === 'REJECTION_PENDING_APPROVAL' && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  Customer Rejection Submitted — Awaiting Operations Manager Review
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  The Stock Keeper ({note.rejectionSubmittedBy}) recorded{' '}
                  <strong>{note.totalRejectedUnits} physical unit(s)</strong> rejected by the customer.
                  Units are physically held in warehouse Quarantine Bay Q-01.
                </p>
                {note.rejectionNotes && (
                  <div className="mt-2 text-[11px] text-amber-800 bg-white/70 p-2 rounded-md border border-amber-200 italic">
                    Stock Keeper Note: {note.rejectionNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Manager Approval Buttons */}
            {isManagerOrAdmin && (
              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeclineRejection}
                  className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  Decline Rejection
                </Button>
                <Button
                  size="sm"
                  onClick={handleApproveRejection}
                  className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Approve Customer Rejection
                </Button>
              </div>
            )}
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
                Customer Rejection Approved & Logged for Quarantine:
              </span>{' '}
              {note.totalRejectedUnits} unit(s) approved for return by{' '}
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
                  VAT Reg No
                </span>
                {note.customerVatNumber || '—'}
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
            {!isEditing ? (
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
                      Route
                    </span>
                    <span className="text-slate-700">{note.deliveryRoute}</span>
                  </div>
                )}

                {note.notes && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 italic text-[11px]">
                    "{note.notes}"
                  </div>
                )}
              </div>
            ) : (
              /* Inline Edit Mode */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Driver Name
                    </label>
                    <Input
                      value={editDriverName}
                      onChange={(e) => setEditDriverName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Vehicle No
                    </label>
                    <Input
                      value={editVehicleNumber}
                      onChange={(e) => setEditVehicleNumber(e.target.value)}
                      className="h-8 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Driver Phone
                  </label>
                  <Input
                    value={editDriverPhone}
                    onChange={(e) => setEditDriverPhone(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Dispatch Notes
                  </label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs font-bold">
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
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
              Total Invoiced: <strong className="text-slate-900">{note.totalInvoicedUnits}</strong>
            </span>
            <span>
              Dispatched: <strong className="text-slate-900">{note.totalDispatchedUnits}</strong>
            </span>
            <span>
              Accepted:{' '}
              <strong className="text-emerald-700">{note.totalAcceptedUnits}</strong>
            </span>
            {note.totalRejectedUnits > 0 && (
              <span className="text-rose-700 font-bold">
                Rejected: {note.totalRejectedUnits}
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
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right font-bold">Dispatched</TableHead>
                <TableHead className="text-right text-emerald-700 font-bold">Accepted</TableHead>
                <TableHead className="text-right text-rose-700 font-bold">Rejected</TableHead>
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
                      <TableCell className="text-right text-slate-700">
                        {item.invoicedQuantity}
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900">
                        {item.dispatchedQuantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {item.acceptedQuantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-700">
                        {item.rejectedQuantity > 0 ? item.rejectedQuantity : '0'}
                      </TableCell>
                      <TableCell className="text-center">
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
                                  Reason: {item.rejectionReason} • {item.rejectionNotes}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {item.unitBarcodes.map((barcode, bIdx) => {
                                const isRejected = item.rejectedUnitBarcodes.includes(barcode);
                                return (
                                  <span
                                    key={bIdx}
                                    className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border shadow-2xs ${
                                      isRejected
                                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold ring-1 ring-rose-200'
                                        : 'bg-white border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <span className="text-[10px] text-slate-400 font-sans">
                                      #{bIdx + 1}
                                    </span>
                                    <span>{barcode}</span>
                                    {isRejected ? (
                                      <span className="text-[9.5px] bg-rose-200/80 text-rose-900 px-1 rounded uppercase font-bold">
                                        Rejected
                                      </span>
                                    ) : (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    )}
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
          onSubmit={handleSubmitRejection}
        />
      )}
    </div>
  );
};
