import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Payment } from '../../types/payment';
import { paymentService } from '../../services/PaymentService';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { printerService } from '../../services/PrinterService';
import { pdfService } from '../../services/PdfService';
import { whatsAppService } from '../../services/WhatsAppService';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  ArrowLeft,
  Printer,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Building,
  CreditCard,
  User,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, currentUser } = useAuth();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);

  // Approval / Rejection modal state
  const [actionDialogMode, setActionDialogMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFinanceOrDirector = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER'].includes(role);

  const loadPayment = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await paymentService.getPaymentById(id);
      setPayment(data);
    } catch (err) {
      console.error('Failed to load payment record:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayment();
  }, [id]);

  const handleOpenAction = (mode: 'APPROVE' | 'REJECT') => {
    setActionDialogMode(mode);
    setActionComment(mode === 'APPROVE' ? 'Payment funds cleared and verified.' : '');
    setActionError(null);
  };

  const handleExecuteAction = async () => {
    if (!payment || !actionDialogMode) return;
    try {
      setProcessingAction(true);
      setActionError(null);

      if (actionDialogMode === 'APPROVE') {
        const approved = await paymentService.approvePayment(
          payment.id,
          currentUser,
          actionComment
        );
        setPayment(approved);
        setActionDialogMode(null);
        setThermalModalOpen(true);
      } else {
        if (!actionComment || actionComment.trim().length < 3) {
          setActionError('A rejection reason is mandatory (minimum 3 characters).');
          return;
        }
        const rejected = await paymentService.rejectPayment(payment.id, actionComment, currentUser);
        setPayment(rejected);
        setActionDialogMode(null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Operation failed.');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return <TableLoadingSkeleton />;
  }

  if (!payment) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-base font-bold text-slate-900">Payment Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">The requested payment receipt record could not be found.</p>
        <Link to="/payments" className="text-indigo-600 text-xs font-semibold underline mt-4 block">
          Return to Payments Registry
        </Link>
      </div>
    );
  }

  const isPending = payment.status === 'PENDING_APPROVAL';

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link to="/payments">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> Back to Payments
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isFinanceOrDirector && isPending && (
            <>
              <Button
                size="sm"
                onClick={() => handleOpenAction('APPROVE')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Approve Settlement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAction('REJECT')}
                className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setThermalModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Thermal ESC/POS
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdfService.downloadReceiptPdf(payment)}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => whatsAppService.sharePaymentReceipt(payment)}
            className="text-xs gap-1.5 text-emerald-700 hover:text-emerald-800"
          >
            <Send className="h-3.5 w-3.5" /> Share WhatsApp
          </Button>
        </div>
      </div>

      {/* Main Payment Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="font-mono text-xl font-bold text-indigo-700">
                {payment.receiptNumber}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Issued on {new Date(payment.collectedAt).toLocaleString()}
              </p>
              <div className="pt-2">
                <PaymentStatusBadge status={payment.status} />
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Amount Collected
              </span>
              <div className="font-mono text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(payment.amount)}
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                Method: {payment.paymentMethod}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Customer Details
              </span>
              <div className="font-bold text-slate-900 text-sm">
                <Link to={`/customers/${payment.customerId}`} className="hover:underline text-indigo-600">
                  {payment.customerName}
                </Link>
              </div>
              {payment.customerCode && (
                <div className="text-slate-600 font-mono">Code: {payment.customerCode}</div>
              )}
              <div className="text-slate-600">
                Collecting Officer: <span className="font-semibold">{payment.salesRepName}</span>
              </div>
            </div>

            <div className="space-y-1.5 md:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Verification & Approval
              </span>
              {payment.chequeNumber && (
                <div>
                  <span className="text-slate-500">Cheque No: </span>
                  <span className="font-mono font-semibold text-slate-800">{payment.chequeNumber}</span>
                </div>
              )}
              {payment.bankName && (
                <div>
                  <span className="text-slate-500">Bank: </span>
                  <span className="font-semibold text-slate-800">{payment.bankName}</span>
                </div>
              )}
              {payment.chequeDate && (
                <div>
                  <span className="text-slate-500">Cheque Date: </span>
                  <span className="font-semibold text-slate-800">{payment.chequeDate}</span>
                </div>
              )}
              {payment.approvedByName && (
                <div className="text-emerald-700 font-semibold">
                  Approved by {payment.approvedByName} on {formatDate(payment.approvedAt!)}
                </div>
              )}
              {payment.rejectionReason && (
                <div className="text-rose-700 font-semibold">
                  Rejected: {payment.rejectionReason}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Allocations */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
              Allocated Invoices
            </h3>
            {payment.invoiceAllocations.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
                Unallocated advance collection (held on customer account).
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Allocated Amount (LKR)</TableHead>
                      <TableHead className="text-right w-28">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payment.invoiceAllocations.map((alloc) => (
                      <TableRow key={alloc.invoiceId}>
                        <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                          <Link to={`/invoices/${alloc.invoiceId}`} className="hover:underline">
                            {alloc.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                          {formatCurrency(alloc.allocatedAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            to={`/invoices/${alloc.invoiceId}`}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            View Invoice
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {payment.notes && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Notes:</span> {payment.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        isOpen={thermalModalOpen}
        onClose={() => setThermalModalOpen(false)}
        payment={payment}
      />

      {/* Approval / Rejection Dialog */}
      <Dialog
        open={actionDialogMode !== null}
        onOpenChange={(open) => !open && setActionDialogMode(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {actionDialogMode === 'APPROVE' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Confirm Finance Approval
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  Reject Payment
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                {actionDialogMode === 'APPROVE' ? 'Approval Remark:' : 'Rejection Reason (Mandatory):'}
              </label>
              <Input
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  actionDialogMode === 'APPROVE'
                    ? 'Payment verified.'
                    : 'Reason for rejection...'
                }
                className="text-xs"
              />
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded border border-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionDialogMode(null)}
              disabled={processingAction}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteAction}
              disabled={processingAction}
              className={`text-xs ${
                actionDialogMode === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {processingAction
                ? 'Processing...'
                : actionDialogMode === 'APPROVE'
                ? 'Confirm & Reconcile'
                : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
