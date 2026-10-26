import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Invoice } from '../../types/invoice';
import { Payment } from '../../types/payment';
import { invoiceService } from '../../services/InvoiceService';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoicePaymentCollectModal } from './components/InvoicePaymentCollectModal';
import { ThermalReceiptModal } from '../payments/ThermalReceiptModal';
import { A4InvoiceViewer } from './components/A4InvoiceViewer';
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

      {/* Universal A4 Document Viewer with Standard & IRD Tax Switcher and Zoom Controls */}
      <A4InvoiceViewer invoice={invoice} />

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
