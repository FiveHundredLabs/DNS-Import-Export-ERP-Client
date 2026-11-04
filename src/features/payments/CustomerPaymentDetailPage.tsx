import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  CreditCard,
  Banknote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function CustomerPaymentDetailPage() {
  const { customerId, id } = useParams<{ customerId?: string; id?: string }>();
  const effectiveCustomerId = customerId || id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, role } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

  // Form State (Default amount starts at 0 per user requirement)
  const [amount, setAmount] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [partialAmounts, setPartialAmounts] = useState<Record<string, number>>({});

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

      // Pre-select single invoice if invoiceId passed in URL (BR-06, BR-07)
      const targetInvoiceId = searchParams.get('invoiceId');
      if (targetInvoiceId) {
        const target = invs.find((i) => i.id === targetInvoiceId || i.invoiceNumber === targetInvoiceId);
        if (target) {
          const uncoll = Math.max(0, target.balanceAmount - (target.collectedAmount || 0));
          setSelectedInvoiceIds([target.id]);
          setAmount(uncoll);
          toast.info(`Pre-selected invoice ${target.invoiceNumber} for collection.`);
        }
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
  }, [effectiveCustomerId, searchParams.toString()]);

  // Quick action: Collect single invoice in full (BR-07)
  const handleCollectSingleFull = (inv: Invoice) => {
    const uncoll = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
    setSelectedInvoiceIds([inv.id]);
    setPartialAmounts((prev) => ({ ...prev, [inv.id]: uncoll }));
    setAmount(uncoll);
    toast.info(`Selected ${inv.invoiceNumber} for full collection (${formatCurrency(uncoll)}).`);
  };

  // Quick action: Partial payment for single invoice
  const handleCollectSinglePartial = (inv: Invoice, partialAmount: number) => {
    const uncoll = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
    const safePartial = Math.min(uncoll, Math.max(0, partialAmount));
    setSelectedInvoiceIds([inv.id]);
    setPartialAmounts((prev) => ({ ...prev, [inv.id]: safePartial }));
    setAmount(safePartial);
    toast.info(`Selected ${inv.invoiceNumber} for partial payment (${formatCurrency(safePartial)} of ${formatCurrency(uncoll)}).`);
  };

  const handlePartialAmountChange = (invId: string, val: number) => {
    setPartialAmounts((prev) => ({ ...prev, [invId]: val }));
    setAmount(val);
  };

  // Handle invoice prioritization checkbox toggle
  const handleToggleInvoice = (invId: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId];
      // If user hasn't entered an amount yet (0 or empty), auto-fill with the prioritized invoices' balance
      if (amount === 0 || amount === '') {
        const selectedSum = invoices
          .filter((i) => next.includes(i.id))
          .reduce((sum, i) => sum + Math.max(0, i.balanceAmount - (i.collectedAmount || 0)), 0);
        if (selectedSum > 0) {
          setAmount(selectedSum);
        }
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
    setPartialAmounts({});
    setAmount(0);
  };

  // Customer status meta
  const statusMeta = useMemo(() => {
    if (!customer) return null;
    return evaluateCustomerPaymentStatus(customer, invoices);
  }, [customer, invoices]);

  // Target invoice meta for partial or single collection
  const targetedSingleInvoice = useMemo(() => {
    if (selectedInvoiceIds.length === 1) {
      const target = invoices.find((i) => i.id === selectedInvoiceIds[0]);
      if (target) {
        const uncoll = Math.max(0, target.balanceAmount - (target.collectedAmount || 0));
        return {
          invoice: target,
          invoiceNumber: target.invoiceNumber,
          balance: uncoll,
        };
      }
    }
    return null;
  }, [selectedInvoiceIds, invoices]);

  // FIFO Allocation breakdown
  const fifoBreakdown: FifoAllocationBreakdown = useMemo(() => {
    const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return calculateFifoAllocation(numAmount, invoices, selectedInvoiceIds);
  }, [amount, invoices, selectedInvoiceIds]);

  const handleAmountChange = (newAmount: number | '') => {
    if (newAmount === '') {
      setAmount('');
      if (targetedSingleInvoice) {
        setPartialAmounts((prev) => ({ ...prev, [targetedSingleInvoice.invoice.id]: 0 }));
      }
      return;
    }
    const maxAllowed = statusMeta?.totalOutstanding || 0;
    if (maxAllowed > 0 && newAmount > maxAllowed) {
      setAmount(maxAllowed);
      if (targetedSingleInvoice) {
        setPartialAmounts((prev) => ({ ...prev, [targetedSingleInvoice.invoice.id]: maxAllowed }));
      }
      return;
    }
    setAmount(newAmount);
    if (targetedSingleInvoice) {
      setPartialAmounts((prev) => ({ ...prev, [targetedSingleInvoice.invoice.id]: newAmount }));
    }
  };

  // Validation before opening confirmation
  const handleInitiatePayment = () => {
    const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    if (numAmount <= 0) {
      toast.error('Please enter a valid collection payment amount greater than zero.');
      return;
    }

    const maxAllowed = statusMeta?.totalOutstanding || 0;
    if (maxAllowed > 0 && numAmount > maxAllowed) {
      toast.error(`Collection amount cannot exceed total outstanding balance of LKR ${maxAllowed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      setAmount(maxAllowed);
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
      <div className="w-full space-y-4">
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
    <div className="w-full pb-28 md:pb-12 space-y-4 sm:space-y-6">
      {/* 1. Header & Navigation Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/payments/collect')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Collections</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/payments')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl shadow-2xs active:scale-95 transition-all"
            title="View Cash in Hand and Handover to Finance"
          >
            <Banknote className="h-4 w-4 text-amber-600" />
            <span>Cash in Hand (Wallet)</span>
          </button>
        </div>

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

      {/* 2. Compact Customer Summary & Combined Financial Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs space-y-2.5">
        {/* Customer Header Row */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                {customer.code}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate">{customer.areaName}</span>
            </div>

            {/* Compact Status Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs shrink-0',
                statusMeta?.filterStatus === 'OVERDUE'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : statusMeta?.filterStatus === 'PENDING_COLLECTION'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : statusMeta?.filterStatus === 'SETTLED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              )}
            >
              {statusMeta?.filterStatus === 'OVERDUE' ? (
                <AlertCircle className="h-3 w-3 text-rose-600" />
              ) : statusMeta?.filterStatus === 'SETTLED' ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              ) : (
                <Clock className="h-3 w-3 text-blue-600" />
              )}
              <span>{statusMeta?.badgeLabel}</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-1">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {customer.name}
            </h1>
            <button
              type="button"
              onClick={() => setShowCustomerDetails((prev) => !prev)}
              className="text-[10.5px] text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0 ml-1"
            >
              <span>{showCustomerDetails ? 'Less' : 'Details'}</span>
              {showCustomerDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 min-w-0 gap-2">
            <span className="truncate font-medium text-slate-700">{customer.contactPerson}</span>
            <a
              href={`tel:${customer.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs whitespace-nowrap shrink-0 ml-auto"
            >
              <Phone className="h-3 w-3 text-primary/70 shrink-0" />
              <span>{customer.phone}</span>
            </a>
          </div>
        </div>

        {/* Expandable Secondary Customer Details */}
        {showCustomerDetails && (
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-start gap-1">
              <span className="text-slate-400 font-medium shrink-0">Address:</span>
              <span className="text-slate-700">{customer.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Credit Limit:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(customer.commercialTerms?.creditLimit || 0)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400 font-medium">Terms:</span>
              <span className="font-semibold text-slate-800">{customer.commercialTerms?.creditDays || 30} Days</span>
            </div>
          </div>
        )}

        {/* 3. Combined Financial Summary Grid (Responsive 2-col on mobile, 3-col on desktop with Clean Numbers) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/80 p-2 sm:p-2.5 rounded-xl">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Outstanding
              </span>
              <span className="text-[10px] font-semibold text-slate-400 shrink-0 sm:hidden">
                ({statusMeta?.openInvoicesCount || 0} Inv)
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">LKR</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums truncate">
                {(statusMeta?.totalOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="border-l border-slate-200/80 pl-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block truncate">
              Overdue Debt
            </span>
            <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-[10px] font-bold text-rose-400 uppercase shrink-0">LKR</span>
              <span className="text-xs sm:text-sm font-extrabold text-rose-700 tabular-nums truncate">
                {(statusMeta?.totalOverdue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="hidden sm:block border-l border-slate-200/80 pl-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">
              Open Invoices
            </span>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5 tabular-nums">
              {statusMeta?.openInvoicesCount || 0} Invoices
            </div>
          </div>
        </div>
      </div>

      {/* 4. Payment Collection Form & Automatic FIFO Allocation */}
      <div className="space-y-4 sm:space-y-6">
        {/* Section A: Payment Amount & Method Form */}
        <PaymentCollectionForm
          amount={amount}
          onAmountChange={handleAmountChange}
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
          targetInvoice={targetedSingleInvoice ? {
            invoiceNumber: targetedSingleInvoice.invoiceNumber,
            balance: targetedSingleInvoice.balance,
          } : null}
        />

        {/* Section B: Live Priority & Automatic FIFO Allocation Breakdown */}
        <FifoAllocationPreview
          paymentAmount={numAmount}
          invoices={invoices}
          selectedInvoiceIds={selectedInvoiceIds}
          onToggleInvoice={handleToggleInvoice}
          onSelectAll={handleSelectAllInvoices}
          onClearAll={handleClearAllInvoices}
        />

        {/* Section C: Submission CTA (Responsive in-flow card for both mobile and desktop) */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider block">
              Total Collection
            </span>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              {numAmount > 0 ? (
                <>
                  <span className="text-xs font-bold text-slate-400 mr-1">LKR</span>
                  <span>{numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </>
              ) : (
                'LKR 0.00'
              )}
              {fifoBreakdown.fullySettledCount > 0 && (
                <span className="text-[11px] sm:text-xs text-emerald-600 font-bold ml-1.5">
                  ({fifoBreakdown.fullySettledCount} Settled)
                </span>
              )}
            </div>
          </div>

          <Button
            size="lg"
            disabled={numAmount <= 0 || fifoBreakdown.totalAllocated <= 0}
            onClick={handleInitiatePayment}
            className="h-10 sm:h-11 px-5 sm:px-6 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs gap-1.5 shrink-0 active:scale-95 transition-all"
          >
            <CheckCircle2 className="h-4 w-4" /> Confirm Collection
          </Button>
        </div>
      </div>

      {/* 5. Customer Payment & Receipt History with 1-Click Thermal Reprint */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Customer Payment & Receipt History
              </h3>
              <p className="text-[11px] text-slate-500">
                Historical collection receipts with 1-click thermal print & customer handover
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {paymentHistory.length} Receipts
          </span>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No historical collections recorded for this customer yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Receipt #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Receipt Handover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {p.receiptNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDate(p.collectedAt)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold uppercase text-[10.5px]">
                        {p.paymentMethod === 'CASH' && <Banknote className="h-3 w-3 text-emerald-600" />}
                        {p.paymentMethod === 'CHEQUE' && <CreditCard className="h-3 w-3 text-indigo-600" />}
                        {p.paymentMethod}
                        {p.chequeNumber && (
                          <span className="text-slate-400 font-mono text-[10px]">
                            ({p.chequeNumber})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCreatedPayment(p);
                          setThermalModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-[11px] gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 font-semibold"
                        title="Print / Reprint Thermal Receipt to handover to customer"
                      >
                        <Printer className="h-3 w-3 text-emerald-600" />
                        Print Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
          isOpen={thermalModalOpen}
          open={thermalModalOpen}
          onClose={() => setThermalModalOpen(false)}
          onOpenChange={setThermalModalOpen}
          payment={createdPayment}
          customerBalance={statusMeta?.totalOutstanding}
        />
      )}
    </div>
  );
}
