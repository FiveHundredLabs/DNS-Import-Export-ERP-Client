import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Invoice } from '../../types/invoice';
import { Payment } from '../../types/payment';
import { invoiceService } from '../../services/InvoiceService';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoicePaymentCollectModal } from './components/InvoicePaymentCollectModal';
import { ThermalReceiptModal } from '../payments/ThermalReceiptModal';
import { printerService } from '../../services/PrinterService';
import { pdfService } from '../../services/PdfService';
import { whatsAppService } from '../../services/WhatsAppService';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
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
} from 'lucide-react';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  // Single-Invoice Collection state
  const [collectModalOpen, setCollectModalOpen] = useState(searchParams.get('collect') === 'true');
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [recordedPayment, setRecordedPayment] = useState<Payment | null>(null);

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

  const isOverdue = invoice.status === 'OVERDUE';
  const previouslyCollected = invoice.collectedAmount || 0;
  const uncollectedBalance = Math.max(0, invoice.balanceAmount - previouslyCollected);
  const hasRemainingReceivable = uncollectedBalance > 0;

  const handlePaymentSuccess = (payment: Payment, updatedInvoice: Invoice) => {
    setInvoice(updatedInvoice);
    setRecordedPayment(payment);
    setThermalModalOpen(true);
  };

  return (
    <div className="w-full space-y-5 pb-20">
      {/* Top Bar with Navigation and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link to="/invoices">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> Back to Invoices
          </Button>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => printerService.printInvoice(invoice)}
            className="text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pdfService.downloadInvoicePdf(invoice)}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => whatsAppService.shareInvoice(invoice)}
            className="text-xs gap-1.5 text-emerald-700 hover:text-emerald-800"
          >
            <Send className="h-3.5 w-3.5" /> Share WhatsApp
          </Button>
          {hasRemainingReceivable && (
            <Button
              size="sm"
              onClick={() => setCollectModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-semibold"
            >
              <CreditCard className="h-3.5 w-3.5" /> Collect Payment
            </Button>
          )}
        </div>
      </div>

      {/* Dedicated Invoice-Wise Payment Collection Highlight Banner */}
      {hasRemainingReceivable ? (
        <div className="rounded-2xl sm:rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-500/[0.08] via-teal-50/40 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Lock className="h-3 w-3 text-emerald-700" />
                  Invoice-Wise Collection
                </span>
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                    Overdue
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                Outstanding Balance on {invoice.invoiceNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Collect payment strictly for this invoice. Funds will NOT be distributed to any other invoices.
              </p>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Remaining to Collect
                </span>
                <AmountDisplay amount={uncollectedBalance} className="text-xl sm:text-2xl font-black text-emerald-950" />
              </div>
              <Button
                onClick={() => setCollectModalOpen(true)}
                className="h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-xs active:scale-[0.98]"
              >
                <CreditCard className="h-4 w-4" />
                <span>Collect Now</span>
              </Button>
            </div>
          </div>
        </div>
      ) : invoice.status === 'COLLECTED' || invoice.status === 'PARTIALLY_COLLECTED' ? (
        <div className="rounded-2xl sm:rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-500/[0.08] via-orange-50/30 to-white p-4 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 flex-1 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-amber-950 text-sm">
                Collection Recorded — Awaiting Finance Verification
              </span>
              <span className="font-mono font-bold text-amber-900 text-xs">
                {formatCurrency(previouslyCollected)} Recorded
              </span>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              The Sales Representative has collected the required funds. The invoice will officially transition to <strong>Paid</strong> or <strong>Partially Paid</strong> once authorized by Finance.
            </p>
          </div>
        </div>
      ) : null}

      {/* Main IRD Commercial Invoice Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-8 sm:p-10 space-y-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base">
                  DNS
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 leading-none">
                    DNS DISTRIBUTION (PVT) LTD
                  </h1>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Authorized Wholesale Electrical, Automation & Industrial Switchgear Solutions
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-3 space-y-0.5">
                <p>142 First Cross Street, Colombo 11, Sri Lanka</p>
                <p>Tel: +94 11 234 5678 | Email: billing@dnsdistribution.lk</p>
                <p className="font-semibold text-slate-700">VAT Registration No: 109847291-7000</p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono text-xs uppercase tracking-wider font-semibold">
                COMMERCIAL TAX INVOICE
              </span>
              <div className="font-mono text-xl font-semibold tabular-nums text-primary-text pt-1">
                {invoice.invoiceNumber}
              </div>
              <div className="pt-1">
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <div className="text-xs text-slate-500 pt-2 space-y-0.5">
                <p>
                  Order Ref:{' '}
                  <Link to={`/orders/${invoice.orderId}`} className="font-mono font-semibold text-primary hover:underline">
                    {invoice.orderNumber}
                  </Link>
                </p>
                <p>Issue Date: <span className="font-semibold text-slate-800">{formatDate(invoice.issueDate)}</span></p>
                <p className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-700 font-semibold'}>
                  Due Date: {formatDate(invoice.dueDate)} {isOverdue && '(OVERDUE)'}
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Commercial Terms Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Billed Customer
              </span>
              <div className="font-semibold text-slate-900 text-sm">{invoice.customerName}</div>
              <div className="text-slate-600 font-mono">Dealer Code: {invoice.customerCode}</div>
              {invoice.customerVatNumber && (
                <div className="text-slate-600">VAT Reg: {invoice.customerVatNumber}</div>
              )}
              {invoice.customerAddress && (
                <div className="text-slate-600">{invoice.customerAddress}</div>
              )}
              {invoice.customerPhone && (
                <div className="text-slate-600">Contact: {invoice.customerPhone}</div>
              )}
            </div>

            <div className="space-y-1.5 md:text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Commercial Reference
              </span>
              <div>
                <span className="text-slate-500">Sales Representative: </span>
                <span className="font-semibold text-slate-800">{invoice.salesRepName}</span>
              </div>
              <div>
                <span className="text-slate-500">Payment Terms: </span>
                <span className="font-semibold text-primary-text">{invoice.paymentTerms || 'Standard Credit'}</span>
              </div>
              <div>
                <span className="text-slate-500">Created At: </span>
                <span className="text-slate-700">{new Date(invoice.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Item & Description</TableHead>
                  <TableHead className="w-24 text-center">Qty</TableHead>
                  <TableHead className="w-32 text-right">Unit Price (LKR)</TableHead>
                  <TableHead className="w-24 text-right">Disc %</TableHead>
                  <TableHead className="w-24 text-right">Tax %</TableHead>
                  <TableHead className="w-36 text-right">Line Total (LKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{item.productNameSnapshot}</div>
                      <div className="font-mono text-xs text-slate-500">SKU: {item.skuSnapshot}</div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-semibold tabular-nums text-slate-800">
                      {item.quantity} {item.uomSnapshot || 'pcs'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-slate-700">
                      {formatCurrency(item.unitPriceSnapshot)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-slate-600">
                      <div>{item.discountPercentage > 0 ? `${item.discountPercentage}%` : '-'}</div>
                      {item.discountApprovalStatus === 'PENDING_APPROVAL' && (
                        <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-0.5 whitespace-nowrap">
                          Pending Management Approval
                        </span>
                      )}
                      {item.discountApprovalStatus === 'APPROVED' && (
                        <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 mt-0.5 whitespace-nowrap">
                          Discount Approved
                        </span>
                      )}
                      {item.discountApprovalStatus === 'REJECTED' && (
                        <span className="inline-block text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 mt-0.5 whitespace-nowrap">
                          Discount Rejected
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-slate-600">
                      {item.taxPercentage}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="flex-1 space-y-3 text-xs text-slate-600 max-w-md">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-800 block text-xs uppercase tracking-wide">
                  Remittance Advice & Banking Details
                </span>
                <p>Bank: Commercial Bank of Ceylon | Branch: City Office</p>
                <p>Account Name: DNS Distribution (Pvt) Ltd</p>
                <p className="font-mono font-semibold tabular-nums text-primary-text">Account No: 1000984721</p>
                <p className="text-xs text-slate-500 pt-1">
                  Please quote Invoice Number <strong>{invoice.invoiceNumber}</strong> upon remitting funds.
                </p>
              </div>

              {invoice.notes && (
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Notes:</span> {invoice.notes}
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-mono font-semibold tabular-nums">- {formatCurrency(invoice.discountTotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100 pb-2">
                <span>
                  {invoice.taxEnabled !== false && invoice.taxTotal > 0
                    ? `VAT (${invoice.taxRatePercentage ?? 18}% Included):`
                    : 'Tax:'}
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">{formatCurrency(invoice.taxTotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-semibold text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono tabular-nums">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Paid to Date:</span>
                <span className="font-mono font-semibold tabular-nums text-emerald-600">
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              {invoice.collectedAmount !== undefined && invoice.collectedAmount > 0 && (
                <div className="flex justify-between py-1 text-blue-600">
                  <span>Collected (Pending Verification):</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatCurrency(invoice.collectedAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-lg border border-slate-200 text-sm font-semibold">
                <span className={invoice.balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  Balance Due:
                </span>
                <span className={`font-mono tabular-nums ${invoice.balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatCurrency(invoice.balanceAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Commercial Authorization Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-12 border-t border-slate-100 text-center">
            <div className="space-y-1">
              <div className="border-t border-dashed border-slate-400 w-36 mx-auto pt-2 text-xs uppercase font-semibold text-slate-500">
                Commercial Officer
              </div>
              <p className="text-xs text-slate-400">{invoice.salesRepName}</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-dashed border-slate-400 w-36 mx-auto pt-2 text-xs uppercase font-semibold text-slate-500">
                Accountant / Cashier
              </div>
              <p className="text-xs text-slate-400">DNS Finance Dept</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-dashed border-slate-400 w-36 mx-auto pt-2 text-xs uppercase font-semibold text-slate-500">
                Customer Acceptance
              </div>
              <p className="text-xs text-slate-400">Authorized Dealer Seal</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
