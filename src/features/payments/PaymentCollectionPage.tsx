import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { Invoice } from '../../types/invoice';
import { PaymentMethod, PaymentAllocation, Payment } from '../../types/payment';
import { customerService } from '../../services/CustomerService';
import { invoiceService } from '../../services/InvoiceService';
import { paymentService } from '../../services/PaymentService';
import { autoAllocatePayment } from '../../rules/paymentRules';
import { InvoiceStatusBadge } from '../invoices/InvoiceStatusBadge';
import { CustomerSelector } from '../../components/selectors/CustomerSelector';
import { CustomerSummaryCard } from '../../components/selectors/CustomerSummaryCard';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  CreditCard,
  Banknote,
  Building,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  Printer,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export function PaymentCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, currentUser } = useAuth();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Form State
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amountRef = useRef<number | ''>(amount);
  amountRef.current = amount;

  // Receipt Modal State
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Auto-allocate helper: applies FIFO across open invoices
  const applyFifoAllocations = (totalToAllocate: number, invoices: Invoice[]) => {
    if (totalToAllocate <= 0 || !invoices || invoices.length === 0) {
      const cleared: Record<string, number> = {};
      for (const inv of invoices || []) {
        cleared[inv.id] = 0;
      }
      setAllocations(cleared);
      return;
    }

    const allocs = autoAllocatePayment(totalToAllocate, invoices);
    const newAllocations: Record<string, number> = {};
    for (const inv of invoices) {
      newAllocations[inv.id] = 0;
    }
    for (const alloc of allocs) {
      newAllocations[alloc.invoiceId] = alloc.allocatedAmount;
    }

    setAllocations(newAllocations);
  };

  // When user updates collection amount in the input
  const handleAmountChange = (newVal: number | '') => {
    setAmount(newVal);
    amountRef.current = newVal;
    setErrorMessage(null);
    const num = typeof newVal === 'number' && !isNaN(newVal) ? newVal : 0;
    applyFifoAllocations(num, customerInvoices);
  };

  // Load customer and amount if passed in URL
  useEffect(() => {
    const custId = searchParams.get('customerId');
    const amountParam = searchParams.get('amount');
    if (amountParam && !isNaN(Number(amountParam))) {
      const parsedAmt = Number(amountParam);
      setAmount(parsedAmt);
      amountRef.current = parsedAmt;
    }
    if (custId) {
      customerService.getCustomer(custId).then((c) => {
        if (c) setSelectedCustomer(c);
      });
    }
  }, [searchParams.toString()]);

  // Load open invoices for selected customer
  useEffect(() => {
    async function loadInvoices() {
      if (!selectedCustomer) {
        setCustomerInvoices([]);
        setAllocations({});
        return;
      }
      try {
        setInvoicesLoading(true);
        const res = await invoiceService.getInvoices({
          customerId: selectedCustomer.id,
          pageSize: 50,
        });
        // Open invoices have balanceAmount > 0
        const openInvs = res.data.filter((i) => i.balanceAmount > 0);
        // Sort FIFO by oldest first: issueDate ascending, then createdAt, then dueDate
        openInvs.sort((a, b) => {
          const parseTs = (d?: string) => (d ? new Date(d).getTime() || 0 : 0);
          const issueA = parseTs(a.issueDate);
          const issueB = parseTs(b.issueDate);
          if (issueA !== issueB) return issueA - issueB;
          const createdA = parseTs(a.createdAt);
          const createdB = parseTs(b.createdAt);
          if (createdA !== createdB) return createdA - createdB;
          const dueA = parseTs(a.dueDate);
          const dueB = parseTs(b.dueDate);
          if (dueA !== dueB) return dueA - dueB;
          return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
        });
        setCustomerInvoices(openInvs);

        // Pre-allocate to specific invoice if requested via URL
        const preselectInvId = searchParams.get('invoiceId');
        const amountParam = searchParams.get('amount');
        const urlCustId = searchParams.get('customerId');
        const isUrlCustomer = !urlCustId || urlCustId === selectedCustomer.id;

        if (preselectInvId && isUrlCustomer) {
          const target = openInvs.find((i) => i.id === preselectInvId);
          if (target) {
            const allocable = Math.max(0, target.balanceAmount - (target.collectedAmount || 0));
            setAmount(allocable);
            amountRef.current = allocable;
            const initialAllocs: Record<string, number> = {};
            for (const inv of openInvs) {
              initialAllocs[inv.id] = 0;
            }
            initialAllocs[target.id] = allocable;
            setAllocations(initialAllocs);
            return;
          }
        }

        const totalToAllocate =
          typeof amountRef.current === 'number' && !isNaN(amountRef.current)
            ? amountRef.current
            : isUrlCustomer && amountParam && !isNaN(Number(amountParam))
            ? Number(amountParam)
            : 0;

        if (totalToAllocate > 0) {
          setAmount(totalToAllocate);
          amountRef.current = totalToAllocate;
          applyFifoAllocations(totalToAllocate, openInvs);
        } else {
          const cleared: Record<string, number> = {};
          for (const inv of openInvs) {
            cleared[inv.id] = 0;
          }
          setAllocations(cleared);
        }
      } catch (err) {
        console.error('Failed to load customer invoices', err);
      } finally {
        setInvoicesLoading(false);
      }
    }
    loadInvoices();
  }, [selectedCustomer, searchParams.toString()]);

  // Total allocated sum
  const totalAllocated = Object.values(allocations).reduce((acc, val) => acc + (val || 0), 0);
  const unallocatedAmount = (Number(amount) || 0) - totalAllocated;

  // Auto-allocate FIFO algorithm against oldest outstanding invoices
  const handleAutoAllocate = () => {
    const totalToAllocate = Number(amount) || 0;
    applyFifoAllocations(totalToAllocate, customerInvoices);
  };

  const handleManualAllocationChange = (invoiceId: string, val: string) => {
    if (val === '') {
      setAllocations((prev) => {
        const next = { ...prev };
        delete next[invoiceId];
        return next;
      });
      return;
    }
    const num = parseFloat(val);
    const safeNum = Math.max(0, isNaN(num) ? 0 : num);
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: safeNum,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payAmount = Number(amount);
    if (!selectedCustomer) {
      setErrorMessage('Please select a customer first.');
      return;
    }
    if (!payAmount || payAmount <= 0) {
      setErrorMessage('Please enter a valid positive payment amount.');
      return;
    }

    // Build allocation array
    const allocArray: PaymentAllocation[] = [];
    for (const inv of customerInvoices) {
      const allocated = allocations[inv.id] || 0;
      if (allocated > 0) {
        const allocable = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
        if (allocated > allocable + 0.001) {
          setErrorMessage(
            `Allocated amount for invoice ${inv.invoiceNumber} cannot exceed remaining uncollected balance of ${formatCurrency(allocable)}.`
          );
          return;
        }
        allocArray.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          allocatedAmount: allocated,
        });
      }
    }

    if (totalAllocated > payAmount) {
      setErrorMessage(
        `Total allocated (LKR ${totalAllocated.toLocaleString()}) exceeds collected amount (LKR ${payAmount.toLocaleString()}).`
      );
      return;
    }

    try {
      setSubmitting(true);
      const created = await paymentService.recordPayment(
        {
          customerId: selectedCustomer.id,
          amount: payAmount,
          paymentMethod,
          chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber : undefined,
          chequeDate: paymentMethod === 'CHEQUE' ? chequeDate : undefined,
          bankName: paymentMethod === 'CHEQUE' ? bankName : undefined,
          invoiceAllocations: allocArray,
          notes: notes.trim() || undefined,
        },
        currentUser
      );

      setCreatedPayment(created);
      setReceiptModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link to="/payments">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> Back to Payments
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Record Payment Collection</h1>
        <p className="text-xs text-slate-500">
          Issue collection receipt, validate cheque details, and allocate against open customer invoices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Customer Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block tracking-wider">
              1. Customer Account
            </label>
            <CustomerSelector
              selectedCustomerId={selectedCustomer?.id}
              assignedRepId={role === 'SALES_REP' ? currentUser.id : undefined}
              onSelect={(cust) => {
                setSelectedCustomer(cust);
                setAllocations({});
                setAmount('');
                amountRef.current = '';
              }}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500 mb-2 block tracking-wider">
              Selected Account Overview
            </label>
            {selectedCustomer ? (
              <CustomerSummaryCard customer={selectedCustomer} />
            ) : (
              <div className="h-40 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-400">
                <Building className="h-8 w-8 text-slate-300 mb-2" />
                Select a customer to view credit status and outstanding receivables.
              </div>
            )}
          </div>
        </div>

        {/* 2. Collection Details & Payment Method */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">2. Collection Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Collection Amount (LKR) *
                </label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="font-mono text-sm font-bold h-9"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method *</label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
                >
                  <SelectTrigger className="w-full text-xs h-9 px-3 rounded-md border border-slate-300 bg-white">
                    <SelectValue placeholder="Select Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash Settlement</SelectItem>
                    <SelectItem value="CHEQUE">Cheque (PDC / Current)</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Direct Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Collection Officer / Sales Rep
                </label>
                <Input
                  value={role === 'SALES_REP' ? currentUser.name : (selectedCustomer?.assignedRepName || currentUser.name)}
                  disabled
                  className="bg-slate-50 text-xs h-9"
                />
              </div>
            </div>

            {/* Cheque Specific Fields */}
            {paymentMethod === 'CHEQUE' && (
              <div className="p-4 bg-amber-50/70 rounded-lg border border-amber-200/80 space-y-3">
                <div className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-700" /> Cheque Verification Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Cheque Number *</label>
                    <Input
                      placeholder="e.g. CHQ-890211"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      className="font-mono text-xs h-8 bg-white"
                      required={paymentMethod === 'CHEQUE'}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Cheque Date *</label>
                    <Input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="text-xs h-8 bg-white"
                      required={paymentMethod === 'CHEQUE'}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Must not be older than 90 days.
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Drawee Bank Name *</label>
                    <Input
                      placeholder="e.g. Commercial Bank / HNB / Sampath"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="text-xs h-8 bg-white"
                      required={paymentMethod === 'CHEQUE'}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Collection Notes / Remarks</label>
              <Input
                placeholder="Optional payment notes or customer receipt remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Invoice Allocation Ledger */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">3. Open Invoice Settlement Allocation</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Allocate collected funds across open invoices. Balances will update once approved by Finance.
              </p>
            </div>
            {customerInvoices.length > 0 && Number(amount) > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoAllocate}
                className="text-xs gap-1.5 h-8 border-primary-border text-primary-text hover:bg-primary-light"
              >
                <Sparkles className="h-3.5 w-3.5" /> Auto-Allocate (FIFO)
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {invoicesLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading open invoices...</div>
            ) : !selectedCustomer ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Please select a customer above to view their outstanding invoices.
              </div>
            ) : customerInvoices.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                This customer has no open invoices with outstanding balances.
              </div>
            ) : (
              <>
                {/* 1. Mobile Cards View for Invoice Allocation (Visible on small screens, hidden on md+) */}
                <div className="block md:hidden space-y-3">
                  {customerInvoices.map((inv) => {
                    const isOverdue = inv.status === 'OVERDUE';
                    const currentAlloc = allocations[inv.id] !== undefined ? allocations[inv.id] : '';
                    const pendingCollection = inv.collectedAmount || 0;
                    const allocableBalance = Math.max(0, inv.balanceAmount - pendingCollection);
                    const isFullyCollected = allocableBalance <= 0;

                    return (
                      <div
                        key={inv.id}
                        className={`rounded-2xl border p-3.5 space-y-3 transition-colors ${
                          isFullyCollected
                            ? 'bg-slate-50/70 border-slate-200 opacity-75'
                            : isOverdue
                            ? 'bg-rose-50/30 border-rose-200'
                            : 'bg-white border-slate-200/90 shadow-xs'
                        }`}
                      >
                        {/* Top: Invoice # & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {inv.invoiceNumber}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isOverdue && (
                              <span className="text-[10.5px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                                Overdue
                              </span>
                            )}
                            <InvoiceStatusBadge status={inv.status} />
                          </div>
                        </div>

                        {/* Dates & Amounts */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10.5px] text-slate-400 block">Due Date</span>
                            <span className={`font-medium ${isOverdue ? 'font-bold text-rose-600' : 'text-slate-700'}`}>
                              {formatDate(inv.dueDate)}
                            </span>
                            <span className="text-[10.5px] text-slate-400 block mt-1">Total Invoice</span>
                            <span className="font-mono text-slate-700 tabular-nums">
                              {formatCurrency(inv.totalAmount)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10.5px] text-slate-400 block">Balance Due</span>
                            <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                              {formatCurrency(inv.balanceAmount)}
                            </span>
                            {pendingCollection > 0 && (
                              <div className="mt-1">
                                <span className="text-[10px] text-blue-600 block font-medium">Pending Coll.</span>
                                <span className="font-mono text-[11px] text-blue-700 font-semibold tabular-nums">
                                  {formatCurrency(pendingCollection)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Allocation Input + Quick Max Action */}
                        <div className="pt-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Allocated Amount (LKR)
                            </label>
                            {!isFullyCollected && allocableBalance > 0 && (
                              <button
                                type="button"
                                onClick={() => handleManualAllocationChange(inv.id, allocableBalance.toString())}
                                className="text-[11px] font-bold text-primary hover:underline bg-primary-light px-2 py-0.5 rounded-md border border-primary-border"
                              >
                                Allocate Full ({formatCurrency(allocableBalance)})
                              </button>
                            )}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            max={allocableBalance}
                            step="any"
                            placeholder={isFullyCollected ? 'Already Collected' : '0.00'}
                            disabled={isFullyCollected}
                            value={currentAlloc}
                            onChange={(e) => handleManualAllocationChange(inv.id, e.target.value)}
                            className={`font-mono text-sm font-bold text-right h-10 w-full rounded-xl ${
                              isFullyCollected ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop Full Table View (Hidden on mobile, block on md+) */}
                <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issue Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Total Invoice</TableHead>
                          <TableHead className="text-right">Balance Due</TableHead>
                          <TableHead className="text-right">Pending Collection</TableHead>
                          <TableHead className="text-right w-36 sm:w-44">Allocated Amount (LKR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerInvoices.map((inv) => {
                          const isOverdue = inv.status === 'OVERDUE';
                          const currentAlloc = allocations[inv.id] !== undefined ? allocations[inv.id] : '';
                          const pendingCollection = inv.collectedAmount || 0;
                          const allocableBalance = Math.max(0, inv.balanceAmount - pendingCollection);
                          const isFullyCollected = allocableBalance <= 0;

                          return (
                            <TableRow key={inv.id} className={isFullyCollected ? 'bg-slate-50/60 opacity-80' : undefined}>
                              <TableCell className="font-mono text-xs font-semibold text-primary">
                                {inv.invoiceNumber}
                              </TableCell>
                              <TableCell className="text-xs">
                                <InvoiceStatusBadge status={inv.status} />
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                                {formatDate(inv.issueDate)}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                <span className={isOverdue ? 'font-bold text-rose-600' : 'text-slate-600'}>
                                  {formatDate(inv.dueDate)} {isOverdue && '(Overdue)'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-slate-600">
                                {formatCurrency(inv.totalAmount)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                                {formatCurrency(inv.balanceAmount)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-blue-600 font-medium">
                                {pendingCollection > 0 ? formatCurrency(pendingCollection) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  max={allocableBalance}
                                  step="any"
                                  placeholder={isFullyCollected ? '0.00' : '0.00'}
                                  disabled={isFullyCollected}
                                  value={currentAlloc}
                                  onChange={(e) => handleManualAllocationChange(inv.id, e.target.value)}
                                  className={`font-mono text-xs text-right h-8 w-28 sm:w-36 ml-auto ${
                                    isFullyCollected ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                                  }`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}

            {/* Allocation Summary Footer */}
            {selectedCustomer && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500">Collected: </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(Number(amount) || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Allocated: </span>
                    <span className="font-mono font-bold text-primary-text">
                      {formatCurrency(totalAllocated)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500">Unallocated Float: </span>
                  <span
                    className={`font-mono font-bold ${
                      unallocatedAmount < 0
                        ? 'text-rose-600'
                        : unallocatedAmount > 0
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(unallocatedAmount)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2 pb-6 md:pb-0">
          <Link to="/payments" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" type="button" className="w-full sm:w-auto text-xs h-10 sm:h-9 cursor-pointer">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm px-6 h-11 sm:h-9 cursor-pointer font-semibold"
          >
            <CheckCircle className="h-4 w-4" />
            {submitting ? 'Recording Collection...' : 'Issue Receipt (Submit for Approval)'}
          </Button>
        </div>
      </form>

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          navigate('/payments');
        }}
        payment={createdPayment}
        customerBalance={
          selectedCustomer
            ? Math.max(0, selectedCustomer.financials.totalOutstanding - (createdPayment?.amount || 0))
            : undefined
        }
      />
    </div>
  );
}
