import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { Invoice } from '../../types/invoice';
import { Payment, PaymentMethod } from '../../types/payment';
import { customerService } from '../../services/CustomerService';
import { invoiceService } from '../../services/InvoiceService';
import { paymentService } from '../../services/PaymentService';
import { whatsAppService } from '../../services/WhatsAppService';
import { useAuth } from '../../hooks/useAuth';
import {
  calculateFifoAllocation,
  evaluateCustomerPaymentStatus,
  FifoAllocationBreakdown,
} from '../../rules/customerPaymentRules';
import { InvoiceListSelector } from './components/InvoiceListSelector';
import { PaymentCollectionForm } from './components/PaymentCollectionForm';
import { FifoAllocationPreview } from './components/FifoAllocationPreview';
import { PaymentConfirmationModal } from './components/PaymentConfirmationModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { StatCard } from '../../components/common/StatCard';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { Button } from '../../components/ui/button';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  DollarSign,
  AlertCircle,
  FileText,
  Clock,
  Printer,
  Sparkles,
  Receipt,
  CheckCircle2,
  Share2,
  Calendar,
  Building,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function CustomerPaymentDetailPage() {
  const { customerId, id } = useParams<{ customerId?: string; id?: string }>();
  const effectiveCustomerId = customerId || id;
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'COLLECT' | 'HISTORY'>('COLLECT');

  // Form State
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  // Dialog & Modal States
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomerData = async () => {
    if (!effectiveCustomerId) return;
    try {
      setLoading(true);
      const [cust, invs, pmts] = await Promise.all([
        customerService.getCustomer(effectiveCustomerId),
        invoiceService.getInvoicesByCustomer(effectiveCustomerId),
        paymentService.getPayments({ customerId: effectiveCustomerId, pageSize: 50 }),
      ]);

      setCustomer(cust);
      setInvoices(invs);
      setPaymentHistory(pmts.data);

      // Pre-fill amount with overdue if overdue exists, or first outstanding invoice
      const activeInvs = invs.filter((i) => {
        const uncollected = Math.max(0, i.balanceAmount - (i.collectedAmount || 0));
        return uncollected > 0 && i.status !== 'CANCELLED' && i.status !== 'DRAFT';
      });

      if (activeInvs.length > 0 && amount === '') {
        // Default to total outstanding
        const totalOut = activeInvs.reduce((acc, i) => acc + Math.max(0, i.balanceAmount - (i.collectedAmount || 0)), 0);
        setAmount(totalOut);
      }
    } catch (err) {
      console.error('Failed to load customer payment details:', err);
      toast.error('Could not load customer payment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [effectiveCustomerId]);

  // Handle invoice multi-selection
  const handleToggleInvoice = (invId: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId];
      // If user selectively toggled specific invoices, update amount to sum of selected
      if (next.length > 0) {
        const selectedSum = invoices
          .filter((i) => next.includes(i.id))
          .reduce((sum, i) => sum + Math.max(0, i.balanceAmount - (i.collectedAmount || 0)), 0);
        setAmount(selectedSum);
      }
      return next;
    });
  };

  const handleSelectAllInvoices = () => {
    const activeIds = invoices
      .filter((i) => Math.max(0, i.balanceAmount - (i.collectedAmount || 0)) > 0 && i.status !== 'CANCELLED')
      .map((i) => i.id);
    setSelectedInvoiceIds(activeIds);
    const sum = invoices
      .filter((i) => activeIds.includes(i.id))
      .reduce((acc, i) => acc + Math.max(0, i.balanceAmount - (i.collectedAmount || 0)), 0);
    setAmount(sum);
  };

  const handleClearAllInvoices = () => {
    setSelectedInvoiceIds([]);
  };

  // Customer status meta
  const statusMeta = useMemo(() => {
    if (!customer) return null;
    return evaluateCustomerPaymentStatus(customer, invoices);
  }, [customer, invoices]);

  // FIFO Allocation breakdown
  const fifoBreakdown: FifoAllocationBreakdown = useMemo(() => {
    const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return calculateFifoAllocation(numAmount, invoices, selectedInvoiceIds);
  }, [amount, invoices, selectedInvoiceIds]);

  // Validation before opening confirmation
  const handleInitiatePayment = () => {
    const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    if (numAmount <= 0) {
      toast.error('Please enter a valid collection payment amount greater than zero.');
      return;
    }

    if (fifoBreakdown.totalAllocated <= 0) {
      toast.error('No outstanding balance available to allocate this payment.');
      return;
    }

    if (paymentMethod === 'CHEQUE') {
      if (!chequeNumber.trim()) {
        toast.error('Cheque number is required for Cheque collections.');
        return;
      }
      if (!chequeDate) {
        toast.error('Cheque realization / due date is required.');
        return;
      }
      if (!bankName.trim()) {
        toast.error('Drawn bank name is required.');
        return;
      }
    }

    if (paymentMethod === 'BANK_TRANSFER' && !chequeNumber.trim()) {
      toast.error('Transaction reference or deposit slip number is required.');
      return;
    }

    setConfirmModalOpen(true);
  };

  // Record Payment Submission
  const handleConfirmPayment = async () => {
    if (!customer) return;
    const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

    try {
      setSubmitting(true);

      const allocationsToSubmit = fifoBreakdown.items
        .filter((item) => item.allocatedAmount > 0)
        .map((item) => ({
          invoiceId: item.invoiceId,
          invoiceNumber: item.invoiceNumber,
          allocatedAmount: item.allocatedAmount,
        }));

      const newPayment = await paymentService.recordPayment(
        {
          customerId: customer.id,
          amount: numAmount,
          paymentMethod,
          chequeNumber: chequeNumber || undefined,
          chequeDate: chequeDate || undefined,
          bankName: bankName || undefined,
          notes: notes.trim() || undefined,
          invoiceAllocations: allocationsToSubmit,
        },
        currentUser
      );

      setCreatedPayment(newPayment);
      setConfirmModalOpen(false);
      toast.success(`Payment collection receipt ${newPayment.receiptNumber} recorded successfully!`);

      // Reload fresh customer and invoice states
      await loadCustomerData();

      // Open receipt modal for thermal printing or WhatsApp delivery
      setThermalModalOpen(true);
    } catch (err: any) {
      console.error('Failed to record payment collection:', err);
      toast.error(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Customer Account Not Found</h3>
        <p className="text-xs text-slate-500">The requested customer could not be found or has been archived.</p>
        <Button onClick={() => navigate('/payments')} className="text-xs rounded-xl">
          Return to Payments
        </Button>
      </div>
    );
  }

  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

  return (
    <div className="max-w-5xl mx-auto pb-28 md:pb-12 space-y-4 sm:space-y-6">
      {/* 1. Header & Back Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs active:scale-95 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customers</span>
        </button>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${customer.phone.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Phone className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Call</span>
          </a>

          <button
            type="button"
            onClick={() =>
              whatsAppService.openChat(
                customer.phone,
                `Hello ${customer.contactPerson}, regarding your outstanding account of LKR ${(
                  statusMeta?.totalOutstanding || 0
                ).toLocaleString()} with DNS ERP.`
              )
            }
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-emerald-100 active:scale-95 transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 2. Customer Banner */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono">
                {customer.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">{customer.areaName}</span>
              {statusMeta?.isNearby && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  📍 {statusMeta.distanceLabel}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1">
              {customer.name}
            </h1>

            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Contact: <strong>{customer.contactPerson}</strong> ({customer.phone})</span>
              <span>•</span>
              <span className="text-slate-400 truncate">{customer.address}</span>
            </p>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 pt-1 sm:pt-0">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs',
                statusMeta?.filterStatus === 'OVERDUE'
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : statusMeta?.filterStatus === 'PENDING_COLLECTION'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : statusMeta?.filterStatus === 'SETTLED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-blue-100 text-blue-800 border-blue-200'
              )}
            >
              {statusMeta?.filterStatus === 'OVERDUE' ? (
                <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              ) : statusMeta?.filterStatus === 'SETTLED' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>{statusMeta?.badgeLabel}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Customer Financial KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(statusMeta?.totalOutstanding || 0)}
          subtitle="Remaining trade balance"
          variant="warning"
          icon={DollarSign}
        />

        <StatCard
          title="Overdue Debt"
          value={formatCurrency(statusMeta?.totalOverdue || 0)}
          subtitle={`${statusMeta?.overdueCount || 0} Invoices past terms`}
          variant={statusMeta?.totalOverdue ? 'danger' : 'success'}
          icon={AlertCircle}
        />

        <StatCard
          title="Open Invoices"
          value={`${statusMeta?.openInvoicesCount || 0} Invoices`}
          subtitle={`Credit Limit: ${formatCurrency(customer.commercialTerms?.creditLimit || 0)}`}
          variant="indigo"
          icon={FileText}
        />
      </div>

      {/* 4. Tab Switcher: Collect Payment (FIFO) vs Payment History */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/80 border border-slate-200/90 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('COLLECT')}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all',
            activeTab === 'COLLECT'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <CreditCard className={cn('h-4 w-4', activeTab === 'COLLECT' ? 'text-primary' : 'text-slate-400')} />
          <span>Collect Payment (FIFO)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all',
            activeTab === 'HISTORY'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <Receipt className={cn('h-4 w-4', activeTab === 'HISTORY' ? 'text-primary' : 'text-slate-400')} />
          <span>Receipt History ({paymentHistory.length})</span>
        </button>
      </div>

      {/* 5. Main Content Section */}
      {activeTab === 'COLLECT' ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Section A: Outstanding Invoices Selection */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            <InvoiceListSelector
              invoices={invoices}
              selectedInvoiceIds={selectedInvoiceIds}
              onToggleInvoice={handleToggleInvoice}
              onSelectAll={handleSelectAllInvoices}
              onClearAll={handleClearAllInvoices}
            />
          </div>

          {/* Section B: Payment Amount & Method Form */}
          <PaymentCollectionForm
            amount={amount}
            onAmountChange={setAmount}
            totalOutstanding={statusMeta?.totalOutstanding || 0}
            totalOverdue={statusMeta?.totalOverdue || 0}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            chequeNumber={chequeNumber}
            onChequeNumberChange={setChequeNumber}
            chequeDate={chequeDate}
            onChequeDateChange={setChequeDate}
            bankName={bankName}
            onBankNameChange={setBankName}
            notes={notes}
            onNotesChange={setNotes}
          />

          {/* Section C: Live Automatic FIFO Allocation Breakdown */}
          <FifoAllocationPreview
            paymentAmount={numAmount}
            invoices={invoices}
            selectedInvoiceIds={selectedInvoiceIds.length > 0 ? selectedInvoiceIds : undefined}
          />

          {/* Section D: Desktop Submission CTA */}
          <div className="hidden md:flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                Total Collection Scheduled
              </span>
              <div className="text-lg font-black text-slate-900">
                {numAmount > 0 ? formatCurrency(numAmount) : 'LKR 0.00'}
                {fifoBreakdown.fullySettledCount > 0 && (
                  <span className="text-xs text-emerald-600 font-bold ml-2">
                    ({fifoBreakdown.fullySettledCount} Settled)
                  </span>
                )}
              </div>
            </div>

            <Button
              size="lg"
              disabled={numAmount <= 0 || fifoBreakdown.totalAllocated <= 0}
              onClick={handleInitiatePayment}
              className="h-11 px-6 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Review & Confirm Collection
            </Button>
          </div>
        </div>
      ) : (
        /* Receipt & Payment History Tab */
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Customer Collection Ledger & Previous Receipts
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {paymentHistory.length} Recorded Transactions
            </span>
          </div>

          {paymentHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-medium">No previous collections recorded for this customer.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paymentHistory.map((pmt) => (
                <div
                  key={pmt.id}
                  className="rounded-2xl border border-slate-200 p-3.5 sm:p-4 hover:border-slate-300 transition-colors bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {pmt.receiptNumber}
                      </span>
                      <PaymentStatusBadge status={pmt.status} />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Collected: {formatDateTime(pmt.collectedAt || pmt.createdAt)}</span>
                      <span>•</span>
                      <span>Method: <strong className="text-slate-700">{pmt.paymentMethod}</strong></span>
                      {pmt.salesRepName && <span>• Rep: {pmt.salesRepName}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Amount</span>
                      <AmountDisplay amount={pmt.amount} size="sm" className="font-extrabold text-slate-900" />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCreatedPayment(pmt);
                        setThermalModalOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs gap-1 rounded-xl"
                      title="Print Thermal Receipt"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-600" /> Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Mobile Sticky Bottom Action Bar (Mobile First UX) */}
      {activeTab === 'COLLECT' && (
        <div className="fixed md:hidden bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Collection
              </span>
              <div className="font-black text-slate-900 truncate text-base">
                {numAmount > 0 ? formatCurrency(numAmount) : 'LKR 0.00'}
              </div>
            </div>

            <Button
              disabled={numAmount <= 0 || fifoBreakdown.totalAllocated <= 0}
              onClick={handleInitiatePayment}
              className="h-12 px-5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md active:scale-95 transition-all gap-1.5 shrink-0"
            >
              <CheckCircle2 className="h-4 w-4" /> Collect (FIFO)
            </Button>
          </div>
        </div>
      )}

      {/* 7. Confirmation Modal */}
      {confirmModalOpen && (
        <PaymentConfirmationModal
          open={confirmModalOpen}
          onOpenChange={setConfirmModalOpen}
          customer={customer}
          amount={numAmount}
          paymentMethod={paymentMethod}
          chequeNumber={chequeNumber}
          chequeDate={chequeDate}
          bankName={bankName}
          notes={notes}
          breakdown={fifoBreakdown}
          onConfirm={handleConfirmPayment}
          submitting={submitting}
        />
      )}

      {/* 8. Thermal Receipt Modal */}
      {createdPayment && (
        <ThermalReceiptModal
          open={thermalModalOpen}
          onOpenChange={setThermalModalOpen}
          payment={createdPayment}
        />
      )}
    </div>
  );
}
