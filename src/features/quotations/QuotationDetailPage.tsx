import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useQuotations } from '../../hooks/useQuotations';
import { quotationService } from '../../services/QuotationService';
import { whatsAppService } from '../../services/WhatsAppService';
import { printerService } from '../../services/PrinterService';
import { pdfService } from '../../services/PdfService';
import { Quotation } from '../../types/quotation';
import { QuotationStatusBadge } from './QuotationStatusBadge';
import { QuotationConvertModal } from './QuotationConvertModal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  FileSpreadsheet,
  ArrowLeft,
  Share2,
  Printer,
  Download,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Edit,
  ShieldCheck,
  Building2,
  User,
  AlertTriangle,
} from 'lucide-react';

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    approveQuotation,
    rejectQuotation,
    submitForApproval,
    issueQuotation,
    convertToSalesOrder,
  } = useQuotations();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Approval / Rejection dialog state
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const fetchQuotation = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await quotationService.getQuotationById(id);
      if (!data) {
        setError('Quotation document not found.');
      } else {
        setQuotation(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const canApproveOrReject =
    ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role) &&
    quotation?.status === 'PENDING_APPROVAL';

  const handleActionConfirm = async () => {
    if (!quotation || !actionType) return;
    try {
      setIsActionSubmitting(true);
      if (actionType === 'APPROVE') {
        await approveQuotation(quotation.id, actionComment || 'Approved by commercial authority.');
      } else {
        await rejectQuotation(quotation.id, actionComment || 'Rejected by commercial authority.');
      }
      setActionType(null);
      setActionComment('');
      await fetchQuotation();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!quotation) return;
    try {
      setLoading(true);
      await submitForApproval(quotation.id, 'Quotation submitted for discount approval.');
      await fetchQuotation();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueQuotation = async () => {
    if (!quotation) return;
    try {
      setLoading(true);
      await issueQuotation(quotation.id);
      await fetchQuotation();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Issuing quotation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading quotation document...</div>;
  }

  if (error || !quotation) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-sm">Quotation Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'The requested quotation could not be loaded.'}</p>
        <Button onClick={() => navigate('/quotations')} variant="outline" size="sm" className="mt-2">
          Back to Quotations List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Top Navigation & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate('/quotations')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Quotations List
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => whatsAppService.shareQuotation(quotation)}
            className="text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-600" />
            Send via WhatsApp
          </Button>

          {/* Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => printerService.printQuotation(quotation)}
            className="text-xs gap-1.5 text-slate-700"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print
          </Button>

          {/* PDF Download Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdfService.downloadQuotationPdf(quotation)}
            className="text-xs gap-1.5 text-slate-700"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Download PDF
          </Button>

          {/* Edit (if DRAFT) */}
          {quotation.status === 'DRAFT' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
              className="text-xs gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Draft
            </Button>
          )}

          {/* Issue Quotation (if DRAFT and standard authority) */}
          {quotation.status === 'DRAFT' && !quotation.requiresApproval && (
            <Button
              size="sm"
              onClick={handleIssueQuotation}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Issue Quotation
            </Button>
          )}

          {/* Submit for Approval (if DRAFT) */}
          {quotation.status === 'DRAFT' && quotation.requiresApproval && (
            <Button
              size="sm"
              onClick={handleSubmitForApproval}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Submit for Approval
            </Button>
          )}

          {/* Approve / Reject (for Managers when PENDING_APPROVAL) */}
          {canApproveOrReject && (
            <>
              <Button
                size="sm"
                onClick={() => setActionType('APPROVE')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve Quotation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionType('REJECT')}
                className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                Reject
              </Button>
            </>
          )}

          {/* Convert to Sales Order (if APPROVED and not expired) */}
          {quotation.status === 'APPROVED' && (
            <Button
              size="sm"
              onClick={() => setIsConvertModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-xs"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Convert to Sales Order
            </Button>
          )}
        </div>
      </div>

      {/* Contextual Status Alerts */}
      {quotation.status === 'PENDING_APPROVAL' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900">Quotation Pending Special Discount Approval</h4>
            <p className="text-amber-800">
              This quotation contains line items with discount percentages exceeding the sales representative authority limit (5%).
              It has been routed to the <strong>Sales Manager</strong> for commercial review.
            </p>
            {quotation.approvalReason && (
              <p className="font-mono text-[11px] text-amber-950 bg-amber-100/60 p-1.5 rounded mt-1">
                Reason: {quotation.approvalReason}
              </p>
            )}
          </div>
        </div>
      )}

      {quotation.status === 'CONVERTED' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900">Converted to Sales Order</h4>
            <p className="text-blue-800 mt-0.5">
              This quotation was converted to Sales Order{' '}
              <span className="font-mono font-bold">{quotation.convertedOrderNumber}</span> on{' '}
              {quotation.convertedAt ? formatDate(quotation.convertedAt) : 'recently'}. Historical price snapshots are locked.
            </p>
            {quotation.convertedToOrderId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/orders/${quotation.convertedToOrderId}`)}
                className="mt-2 text-xs border-blue-300 text-blue-800 hover:bg-blue-100"
              >
                View Sales Order
              </Button>
            )}
          </div>
        </div>
      )}

      {quotation.status === 'REJECTED' && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900">Quotation Rejected</h4>
            <p className="text-rose-800 mt-0.5">
              Rejected by {quotation.rejectedByName || 'Sales Manager'}: {quotation.rejectionReason || 'Discount terms not accepted.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Quotation Document Container */}
      <Card className="shadow-sm border border-slate-200 bg-white">
        <CardContent className="p-8 space-y-6">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <h2 className="text-2xl font-black text-indigo-900 tracking-tight">DNS DISTRIBUTION (PVT) LTD</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Authorized Electrical, Automation & Industrial Wholesale Distributor
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                142 First Cross Street, Colombo 11, Sri Lanka | Tel: +94 11 234 5678
              </p>
              <p className="text-[11px] text-slate-400">VAT Registration No: 109847291-7000</p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Official Commercial Document
              </span>
              <div className="text-xl font-bold font-mono text-indigo-600">
                {quotation.quotationNumber}
              </div>
              <div className="pt-1">
                <QuotationStatusBadge status={quotation.status} />
              </div>
              <div className="text-xs text-slate-500 pt-2">
                <span>Date Issued: </span>
                <strong className="text-slate-700">{formatDate(quotation.createdAt)}</strong>
              </div>
              <div className="text-xs text-rose-600">
                <span>Valid Until: </span>
                <strong className="font-semibold">{quotation.validUntil}</strong>
              </div>
            </div>
          </div>

          {/* Customer & Rep Meta Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-slate-50/80 border border-slate-200 p-4 text-xs">
            <div>
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                Quoted Customer / Dealer
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{quotation.customerNameSnapshot}</h4>
              <p className="text-slate-500 mt-0.5">Dealer Code: <span className="font-mono">{quotation.customerCodeSnapshot}</span></p>
              {quotation.customerAddressSnapshot && (
                <p className="text-slate-600 mt-0.5">{quotation.customerAddressSnapshot}</p>
              )}
              <p className="text-slate-600 mt-0.5">Contact: {quotation.customerPhoneSnapshot}</p>
            </div>

            <div className="sm:text-right">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1 sm:justify-end">
                <User className="h-3.5 w-3.5 text-indigo-600" />
                Sales Representative
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{quotation.salesRepNameSnapshot}</h4>
              <p className="text-slate-500 mt-0.5">Commercial Sales Division</p>
              <p className="text-slate-500 mt-0.5">Ref: Territory Western Central</p>
            </div>
          </div>

          {/* Line Items Snapshot Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Item & Description</TableHead>
                  <TableHead className="w-20 text-center">Qty</TableHead>
                  <TableHead className="w-28 text-right">List Price</TableHead>
                  <TableHead className="w-20 text-right">Disc %</TableHead>
                  <TableHead className="w-24 text-right">VAT (18%)</TableHead>
                  <TableHead className="w-32 text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.items.map((it, idx) => (
                  <TableRow key={it.id || idx}>
                    <TableCell className="text-center text-xs text-slate-400">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{it.productNameSnapshot}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        SKU: {it.skuSnapshot} {it.requiresApproval && <span className="text-amber-600 font-sans ml-1">(Approval Required)</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-700">
                      {it.quantity} {it.uomSnapshot || 'pcs'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-700">
                      {formatCurrency(it.unitPriceSnapshot)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-700">
                      {it.discountPercentage}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-500">
                      {formatCurrency(it.taxAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                      {formatCurrency(it.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Financial Breakdown & Totals */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="flex-1 space-y-3 text-xs text-slate-600">
              <div>
                <strong className="block text-slate-800 font-semibold mb-1">Standard Terms & Conditions:</strong>
                <p className="leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px]">
                  {quotation.termsAndConditions || 'Payment within agreed credit period. Prices valid until validity date.'}
                </p>
              </div>

              {quotation.notes && (
                <div>
                  <strong className="block text-slate-800 font-semibold mb-1">Special Notes / Remarks:</strong>
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    {quotation.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 py-1">
                <span>Subtotal (List Price):</span>
                <span className="font-mono font-medium">{formatCurrency(quotation.subtotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-600 py-1">
                <span>Total Applied Discount:</span>
                <span className="font-mono font-medium">- {formatCurrency(quotation.discountAmount)}</span>
              </div>

              <div className="flex justify-between text-slate-600 py-1">
                <span>VAT (18% Included):</span>
                <span className="font-mono font-medium">{formatCurrency(quotation.taxAmount)}</span>
              </div>

              <div className="border-t-2 border-indigo-900 pt-2 flex justify-between font-bold text-base text-slate-900">
                <span>Grand Total:</span>
                <span className="text-indigo-700 font-mono">{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Convert to Sales Order Modal */}
      {isConvertModalOpen && (
        <QuotationConvertModal
          isOpen={isConvertModalOpen}
          onClose={() => setIsConvertModalOpen(false)}
          quotation={quotation}
          onConfirmConvert={(details) => convertToSalesOrder(quotation.id, details)}
          onSuccess={() => fetchQuotation()}
        />
      )}

      {/* Approval / Rejection Comment Modal */}
      {actionType && (
        <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                {actionType === 'APPROVE' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    Approve Quotation
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-rose-600" />
                    Reject Quotation
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'APPROVE'
                  ? `Confirm approval for quotation ${quotation.quotationNumber} with special discount.`
                  : `State reason for rejecting quotation ${quotation.quotationNumber}.`}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {actionType === 'APPROVE' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  actionType === 'APPROVE'
                    ? 'e.g. Approved in accordance with customer annual commitment.'
                    : 'e.g. Requested 12% discount exceeds commercial margin limit.'
                }
                rows={3}
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setActionType(null)} disabled={isActionSubmitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleActionConfirm}
                disabled={isActionSubmitting || (actionType === 'REJECT' && !actionComment.trim())}
                className={actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
              >
                {isActionSubmitting ? 'Processing...' : actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
