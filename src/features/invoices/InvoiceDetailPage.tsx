import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Invoice } from '../../types/invoice';
import { Payment } from '../../types/payment';
import { DeliveryNote } from '../../types/deliveryNote';
import { invoiceService } from '../../services/InvoiceService';
import { deliveryNoteService } from '../../services/DeliveryNoteService';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoicePaymentCollectModal } from './components/InvoicePaymentCollectModal';
import { ThermalReceiptModal } from '../payments/ThermalReceiptModal';
import { A4InvoiceViewer } from './components/A4InvoiceViewer';
import { printerService } from '../../services/PrinterService';
import { pdfService } from '../../services/PdfService';
import { whatsAppService } from '../../services/WhatsAppService';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import {
  ArrowLeft,
  Printer,
  Download,
  Send,
  CreditCard,
  Building,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ShieldCheck,
  Truck,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  Phone,
  MapPin,
  FileCheck,
  XCircle,
  Eye,
  Check,
  Boxes,
} from 'lucide-react';
import { RecordWarrantyNoteModal } from '../warranty/RecordWarrantyNoteModal';
import { WarrantyRecord } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { Edit3 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeliveryNotes, setLoadingDeliveryNotes] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [matchingWarranty, setMatchingWarranty] = useState<WarrantyRecord | null>(null);

  // View Mode: 'SYSTEM' (Default system view & activity log) or 'PDF' (Formal A4 Document)
  const [viewMode, setViewMode] = useState<'SYSTEM' | 'PDF'>('SYSTEM');

  // Single-Invoice Collection state
  const [collectModalOpen, setCollectModalOpen] = useState(searchParams.get('collect') === 'true');
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [recordedPayment, setRecordedPayment] = useState<Payment | null>(null);

  // Load Invoice
  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await invoiceService.getInvoiceById(id);
        setInvoice(data);
      } catch (err) {
        console.error('Failed to load invoice:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);



  // Load Delivery Notes related to this invoice/order
  useEffect(() => {
    async function loadDeliveryNotes() {
      if (!invoice) return;
      try {
        setLoadingDeliveryNotes(true);
        const allNotes = await deliveryNoteService.getAll();
        const matching = allNotes.filter(
          (dn) =>
            dn.invoiceId === invoice.id ||
            dn.invoiceNumber === invoice.invoiceNumber ||
            (invoice.orderId && dn.orderId === invoice.orderId) ||
            (invoice.orderNumber && dn.orderNumber === invoice.orderNumber)
        );
        setDeliveryNotes(matching);
      } catch (err) {
        console.error('Failed to load delivery notes for invoice:', err);
      } finally {
        setLoadingDeliveryNotes(false);
      }
    }
    loadDeliveryNotes();
  }, [invoice]);

  // Check Warranty Records
  useEffect(() => {
    async function checkWarranty() {
      if (!invoice) return;
      try {
        const records = await warrantyService.getAllRecords();
        const found = records.find(
          (r) => r.invoiceNumber === invoice.invoiceNumber || r.invoiceId === invoice.id
        );
        if (found) {
          setMatchingWarranty(found);
        }
      } catch (e) {
        console.error('Failed to check warranty record:', e);
      }
    }
    checkWarranty();
  }, [invoice]);

  // Aggregate fulfillment metrics across delivery notes
  const fulfillmentMetrics = useMemo(() => {
    const totalInvoiced =
      invoice?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const totalDispatched = deliveryNotes.reduce(
      (sum, dn) => sum + (dn.totalDispatchedUnits || 0),
      0
    );
    const totalAccepted = deliveryNotes.reduce(
      (sum, dn) => sum + (dn.totalAcceptedUnits || 0),
      0
    );
    const totalRejected = deliveryNotes.reduce(
      (sum, dn) => sum + (dn.totalRejectedUnits || 0),
      0
    );

    return {
      totalInvoiced,
      totalDispatched,
      totalAccepted,
      totalRejected,
      hasDamagedOrRejected: totalRejected > 0,
      isFullyDelivered: totalInvoiced > 0 && totalAccepted >= totalInvoiced,
    };
  }, [invoice, deliveryNotes]);

  if (loading) {
    return <TableLoadingSkeleton />;
  }

  if (!invoice) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-base font-bold text-slate-900">Invoice Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">
          The requested invoice record could not be located in the system.
        </p>
        <Link to="/invoices" className="text-primary text-xs font-semibold underline mt-4 block">
          Return to Invoice Registry
        </Link>
      </div>
    );
  }

  const isDraft = invoice.status === 'DRAFT';
  const isSalesManager = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(
    currentUser?.role || role
  );
  const isOverdue = invoice.status === 'OVERDUE';
  const previouslyCollected = invoice.collectedAmount || 0;
  const uncollectedBalance = Math.max(0, invoice.balanceAmount - previouslyCollected);
  const hasRemainingReceivable = !isDraft && uncollectedBalance > 0;

  const handlePaymentSuccess = (payment: Payment, updatedInvoice: Invoice) => {
    setInvoice(updatedInvoice);
    setRecordedPayment(payment);
    setThermalModalOpen(true);
  };

  const handleFinalizeAndIssue = async () => {
    const userToUse = currentUser || ({ id: 'usr-sm-1', name: 'Sales Manager', role: 'SALES_MANAGER' } as any);
    if (!invoice) return;
    try {
      setFinalizing(true);
      const finalized = await invoiceService.finalizeAndIssueInvoice(invoice.id, userToUse);
      setInvoice(finalized);
      toast.success('Draft invoice successfully finalized and issued!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to finalize invoice');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-20">
      {/* ── Top Bar: Navigation, View Mode Switcher & Primary Action Buttons ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/invoices">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-4 w-4" /> Back to Invoices
            </Button>
          </Link>

          {/* View Mode Switcher: System View vs Formal A4 Document */}
          <div className="flex items-center rounded-xl p-1 bg-slate-100 border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('SYSTEM')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                viewMode === 'SYSTEM'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>System View &amp; Fulfillment</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('PDF')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
                viewMode === 'PDF'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              <span>Formal A4 / PDF Document</span>
            </button>
          </div>
        </div>

        {/* Global Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'SYSTEM' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('PDF')}
              className="text-xs gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
            >
              <Eye className="h-3.5 w-3.5 text-indigo-600" />
              <span>View A4 PDF Document</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('SYSTEM')}
              className="text-xs gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Back to System View</span>
            </Button>
          )}

          {isDraft && isSalesManager && (
            <>
              <Link to={`/invoices/${invoice.id}/edit`}>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 border-slate-300">
                  <Edit3 className="h-3.5 w-3.5 text-slate-600" /> Edit Draft
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={handleFinalizeAndIssue}
                disabled={finalizing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {finalizing ? 'Finalizing...' : 'Finalize & Issue'}
              </Button>
            </>
          )}

          {hasRemainingReceivable && (
            <Button
              size="sm"
              onClick={() => setCollectModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-semibold"
            >
              <CreditCard className="h-3.5 w-3.5" /> Collect Payment
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWarrantyModalOpen(true)}
            className="text-xs gap-1.5 text-indigo-700 hover:text-indigo-800 border-indigo-200 hover:bg-indigo-50"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            Warranty Card
          </Button>
        </div>
      </div>

      {/* Draft Invoice Banner */}
      {isDraft && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-500/[0.10] via-amber-50/40 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="h-3.5 w-3.5 text-amber-700" /> DRAFT INVOICE
                </span>
                <span className="font-mono text-xs font-semibold text-slate-600">
                  Origin: {invoice.orderNumber}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Awaiting Sales Manager Finalization and Issue
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl">
                This invoice was converted as a draft. Sales Managers have full authority to modify line item quantities, substitute products, or finalize and issue the invoice.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isSalesManager ? (
                <>
                  <Link to={`/invoices/${invoice.id}/edit`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 bg-white border-amber-300 hover:bg-amber-50 text-amber-900 font-semibold">
                      <Edit3 className="h-3.5 w-3.5" /> Edit Draft
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={handleFinalizeAndIssue}
                    disabled={finalizing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{finalizing ? 'Issuing...' : 'Finalize & Issue'}</span>
                  </Button>
                </>
              ) : (
                <span className="text-xs text-amber-800 italic bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  Editing restricted to Sales Management
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── 1. SYSTEM VIEW: ERP Cards, Delivery Notes & Action Log ── */}
      {/* ────────────────────────────────────────────────────────── */}
      {viewMode === 'SYSTEM' && (
        <div className="space-y-5">
          {/* Top Invoice Identification Banner */}
          <Card className="border-slate-200 shadow-2xs overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
                      Invoice #{invoice.invoiceNumber}
                    </h1>
                    <InvoiceStatusBadge status={invoice.status} />
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="h-3 w-3 text-rose-600" /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                    <span>
                      Issued: <strong className="text-slate-800 font-mono">{formatDate(invoice.issueDate)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Payment Due: <strong className="text-slate-800 font-mono">{formatDate(invoice.dueDate)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Origin Sales Order:{' '}
                      <Link
                        to={`/orders/${invoice.orderId}`}
                        className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        {invoice.orderNumber}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t border-slate-100 sm:border-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider">
                      Balance Due
                    </span>
                    <AmountDisplay
                      amount={uncollectedBalance}
                      className={cn(
                        'text-lg sm:text-2xl font-black font-mono',
                        isOverdue
                          ? 'text-rose-600'
                          : uncollectedBalance > 0
                          ? 'text-slate-900'
                          : 'text-emerald-600'
                      )}
                    />
                  </div>
                  {hasRemainingReceivable && (
                    <Button
                      onClick={() => setCollectModalOpen(true)}
                      className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Collect</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2-Column Info Grid: Customer Details & Financial Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Customer Details */}
            <Card className="border-slate-200 shadow-2xs lg:col-span-2">
              <CardHeader className="p-4 border-b border-slate-100 pb-3">
                <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  Customer &amp; Billing Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">
                      Customer Name
                    </span>
                    <Link
                      to={`/customers/${invoice.customerId}`}
                      className="font-bold text-slate-900 hover:text-primary transition-colors block text-sm"
                    >
                      {invoice.customerName}
                    </Link>
                    <span className="font-mono text-[11px] text-slate-500">
                      Code: {invoice.customerCode}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">
                      Tax &amp; Business ID
                    </span>
                    <span className="font-mono text-slate-800 font-semibold block">
                      TIN / VAT: {invoice.customerVatNumber || 'Not Specified (Non-VAT)'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Terms: {invoice.paymentTerms || 'Net 30 Days'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">
                      Billing / Registered Address
                    </span>
                    <span className="text-slate-700 flex items-start gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{invoice.customerAddress || 'Colombo Commercial Delivery Hub'}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">
                      Contact &amp; Territory
                    </span>
                    <span className="text-slate-700 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{invoice.customerPhone || '+94 11 258 9632'}</span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="p-4 border-b border-slate-100 pb-3">
                <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Receivable Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Gross Subtotal</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between items-center text-amber-700 font-medium">
                    <span>Discount Deducted</span>
                    <span className="font-mono font-semibold">
                      -{formatCurrency(invoice.discountTotal)}
                    </span>
                  </div>
                )}
                {invoice.taxTotal > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>VAT ({invoice.taxRatePercentage || 18}%)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(invoice.taxTotal)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-slate-900">
                  <span className="text-sm">Total Invoice Amount</span>
                  <span className="font-mono text-sm text-slate-900">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-semibold pt-1">
                  <span>Paid / Settled</span>
                  <span className="font-mono">
                    {formatCurrency(invoice.paidAmount || invoice.collectedAmount || 0)}
                  </span>
                </div>
                <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Remaining Balance
                  </span>
                  <span
                    className={cn(
                      'font-mono font-black text-sm',
                      uncollectedBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    )}
                  >
                    {uncollectedBalance > 0 ? formatCurrency(uncollectedBalance) : 'Fully Settled'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoiced Commercial Line Items Table */}
          <Card className="border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Invoiced Commercial Line Items</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-normal">
                  {invoice.items.length} Product Line{invoice.items.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-600">Product / SKU</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 text-center w-20">UOM</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 text-right w-24">Qty Invoiced</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 text-right w-28">Unit Price</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 text-center w-24">Discount</TableHead>
                    <TableHead className="text-xs font-bold text-slate-600 text-right w-32">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={item.id || idx} className="hover:bg-slate-50/60">
                      <TableCell className="py-3">
                        <div className="font-bold text-slate-900 text-xs">{item.productNameSnapshot}</div>
                        <div className="font-mono text-[11px] text-slate-400">{item.skuSnapshot}</div>
                        {item.batchNumber && (
                          <div className="text-[10px] text-indigo-600 font-mono mt-0.5">
                            Batch: {item.batchNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600 py-3">
                        {item.uomSnapshot || 'PCS'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-slate-900 py-3">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700 py-3">
                        {formatCurrency(item.unitPriceSnapshot)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-600 py-3">
                        {item.discountPercentage > 0 ? (
                          <span className="text-amber-700 font-semibold">
                            {item.discountPercentage}%
                            <span className="block text-[10px] text-slate-400">
                              (-{formatCurrency(item.discountAmount)})
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-slate-900 py-3">
                        {formatCurrency(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ────────────────────────────────────────────────────────── */}
          {/* ── 2. DELIVERY NOTES & LOGISTICS FULFILLMENT TRACKER ───── */}
          {/* ────────────────────────────────────────────────────────── */}
          <Card className="border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-4.5 w-4.5 text-indigo-600" />
                    <span>Dispatched Delivery Notes &amp; Fulfillment Tracker</span>
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Physical shipments dispatched under this invoice, including delivered, rejected, and damaged unit breakdowns.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-white text-slate-700 font-mono">
                    {deliveryNotes.length} Delivery Note{deliveryNotes.length !== 1 ? 's' : ''} Issued
                  </Badge>
                  <Link to="/inventory/delivery-notes">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1">
                      <span>Delivery Notes Hub</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Delivery KPI Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Invoiced
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-900 mt-0.5 block">
                    {fulfillmentMetrics.totalInvoiced} Units
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total Dispatched
                  </span>
                  <span className="font-mono font-bold text-sm text-indigo-700 mt-0.5 block">
                    {fulfillmentMetrics.totalDispatched} Units
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Delivered &amp; Accepted
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-700 mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {fulfillmentMetrics.totalAccepted} Units
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Damaged / Rejected
                  </span>
                  <span
                    className={cn(
                      'font-mono font-bold text-sm mt-0.5 block',
                      fulfillmentMetrics.totalRejected > 0 ? 'text-rose-600' : 'text-slate-400'
                    )}
                  >
                    {fulfillmentMetrics.totalRejected} Units
                  </span>
                </div>
              </div>

              {/* Delivery Notes List */}
              {loadingDeliveryNotes ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading delivery records...</div>
              ) : deliveryNotes.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                  <Boxes className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">No Delivery Notes Dispatched Yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    The warehouse has not yet created physical delivery notes for this invoice. Once goods are packed and dispatched, delivery notes and inspection logs will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deliveryNotes.map((dn) => {
                    const hasRejection = (dn.totalRejectedUnits || 0) > 0;
                    return (
                      <div
                        key={dn.id}
                        className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                      >
                        {/* Delivery Note Header */}
                        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {dn.deliveryNoteNumber}
                            </span>
                            <Badge
                              className={cn(
                                'text-[10.5px] font-mono px-2 py-0.5',
                                dn.status === 'DELIVERED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : dn.status === 'DISPATCHED'
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                  : dn.status === 'REJECTION_PENDING_APPROVAL' ||
                                    dn.status === 'REJECTION_APPROVED'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              )}
                            >
                              {dn.status.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">
                              Dispatched: <strong className="font-mono">{formatDate(dn.dispatchDate)}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-500">
                            <span>
                              Driver: <strong className="text-slate-800">{dn.driverName}</strong> ({dn.vehicleNumber})
                            </span>
                            <Link
                              to={`/inventory/delivery-notes/${dn.id}`}
                              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                            >
                              View DN <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>

                        {/* Products Shipped, Accepted, and Rejected Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50/40 text-slate-500 border-b border-slate-100 text-[10.5px] uppercase font-semibold">
                              <tr>
                                <th className="py-2 px-3 text-left">Product</th>
                                <th className="py-2 px-3 text-right">Invoiced</th>
                                <th className="py-2 px-3 text-right">Dispatched</th>
                                <th className="py-2 px-3 text-right">Accepted (Good)</th>
                                <th className="py-2 px-3 text-right">Rejected (Damaged)</th>
                                <th className="py-2 px-3 text-left">Quality Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {dn.items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3">
                                    <span className="font-semibold text-slate-900 block truncate">
                                      {item.productName}
                                    </span>
                                    <span className="font-mono text-[10.5px] text-slate-400">
                                      SKU: {item.sku}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    {item.invoicedQuantity}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-700">
                                    {item.dispatchedQuantity}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                    {item.acceptedQuantity}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                                    {item.rejectedQuantity > 0 ? (
                                      <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                        {item.rejectedQuantity} Damaged
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">0</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                                    {item.rejectedQuantity > 0 ? (
                                      <span className="text-rose-700 text-[11px] font-medium">
                                        {item.rejectionReason?.replace(/_/g, ' ') || 'Damaged in transit'}:{' '}
                                        {item.rejectionNotes || 'Reported damaged on receipt'}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                                        <Check className="h-3 w-3" /> All units verified intact
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Customer Physical Sign-Off / Rejection Banner */}
                        {hasRejection && (
                          <div className="p-3 bg-rose-50/70 border-t border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-rose-900">
                                Customer Rejection &amp; Quarantine Notice:
                              </p>
                              <p className="text-[11px] text-rose-800 mt-0.5">
                                {dn.rejectionNotes ||
                                  'Damaged units were returned physically to the warehouse quarantine bay. Awaiting Operations review and replacement delivery note generation.'}
                              </p>
                            </div>
                          </div>
                        )}

                        {dn.customerSignatureName && (
                          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                            <span>
                              Signed by Store Receiver:{' '}
                              <strong className="text-slate-800 font-semibold">{dn.customerSignatureName}</strong>
                            </span>
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Physical Receipt Acknowledged
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ────────────────────────────────────────────────────────── */}
          {/* ── 3. INVOICE, DISPATCH & PAYMENT ACTIVITY TIMELINE ────── */}
          {/* ────────────────────────────────────────────────────────── */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Comprehensive Invoice &amp; Fulfillment Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
                {/* Event 1: Invoice Finalized & Issued */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        Commercial Tax Invoice Issued ({invoice.invoiceNumber})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(invoice.issueDate)}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11.5px]">
                      Commercial invoice generated from sales order {invoice.orderNumber}. Total billed value:{' '}
                      <strong className="font-mono text-slate-800">{formatCurrency(invoice.totalAmount)}</strong>.
                    </p>
                  </div>
                </div>

                {/* Event 2: Delivery Notes Dispatched */}
                {deliveryNotes.map((dn) => (
                  <div key={dn.id} className="relative">
                    <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-indigo-500 border-2 border-white shadow-xs" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          Delivery Note Dispatched ({dn.deliveryNoteNumber})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(dn.dispatchDate)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11.5px]">
                        Shipped {dn.totalDispatchedUnits} units via driver {dn.driverName} ({dn.vehicleNumber}). Route:{' '}
                        {dn.deliveryRoute || 'Standard Commercial Route'}.
                      </p>
                      {dn.status === 'DELIVERED' && (
                        <p className="text-emerald-700 font-semibold text-[11px] pt-0.5">
                          ✓ Delivery confirmed received in good condition by customer.
                        </p>
                      )}
                      {(dn.totalRejectedUnits || 0) > 0 && (
                        <p className="text-rose-700 font-semibold text-[11px] pt-0.5">
                          ⚠ Discrepancy logged: {dn.totalRejectedUnits} units damaged in transit.
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Event 3: Payment Collections */}
                {previouslyCollected > 0 && (
                  <div className="relative">
                    <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-teal-500 border-2 border-white shadow-xs" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          Payment Collection Recorded
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(invoice.issueDate)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11.5px]">
                        Collected <strong className="font-mono text-teal-800">{formatCurrency(previouslyCollected)}</strong>{' '}
                        against this invoice.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── 2. FORMAL A4 DOCUMENT VIEW: Print, PDF & WhatsApp ──── */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={viewMode === 'PDF' ? 'block' : 'hidden'}>
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Formal Commercial Tax Invoice Document:</strong> Formatted for formal A4 printing, IRD tax reporting, and customer PDF distribution.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode('SYSTEM')}
            className="text-xs bg-white text-indigo-950 font-bold border-indigo-300 h-8"
          >
            ← Back to System View
          </Button>
        </div>

        {/* Universal A4 Document Viewer */}
        <A4InvoiceViewer invoice={invoice} />
      </div>

      {/* Invoice-Wise Payment Collection Modal */}
      <InvoicePaymentCollectModal
        isOpen={collectModalOpen}
        onClose={() => setCollectModalOpen(false)}
        invoice={invoice}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        isOpen={thermalModalOpen}
        onClose={() => setThermalModalOpen(false)}
        payment={recordedPayment}
        customerBalance={uncollectedBalance}
      />

      {/* Sticky Bottom Bar for Mobile View */}
      {hasRemainingReceivable && (
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Due</span>
              <span className="font-mono text-sm font-black text-slate-900 truncate block">
                {formatCurrency(uncollectedBalance)}
              </span>
            </div>
            <Button
              onClick={() => setCollectModalOpen(true)}
              className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md flex-1"
            >
              <CreditCard className="h-4 w-4" />
              <span>Collect Payment</span>
            </Button>
          </div>
        </div>
      )}

      <RecordWarrantyNoteModal
        open={isWarrantyModalOpen}
        onOpenChange={setIsWarrantyModalOpen}
        preselectedRecord={matchingWarranty}
        onSuccess={() => {}}
      />
    </div>
  );
}
