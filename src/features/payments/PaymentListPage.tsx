import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Payment, PaymentStatus, PaymentMethod } from '../../types/payment';
import { Customer } from '../../types/customer';
import { paymentService } from '../../services/PaymentService';
import { customerService } from '../../services/CustomerService';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { pdfService } from '../../services/PdfService';
import { whatsAppService } from '../../services/WhatsAppService';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  Search,
  PlusCircle,
  CreditCard,
  Printer,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Building2,
  ChevronRight,
} from 'lucide-react';

export function PaymentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, currentUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerIdFilter, setCustomerIdFilter] = useState(searchParams.get('customerId') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Thermal modal state
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Approval / Rejection dialog state
  const [actionDialogMode, setActionDialogMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionTargetPayment, setActionTargetPayment] = useState<Payment | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFinanceOrDirector = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER'].includes(role);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await customerService.listCustomers({ pageSize: 100 });
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to load customers for payment filter', err);
      }
    }
    loadCustomers();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getPayments({
        search: search.trim() || undefined,
        status: statusFilter,
        paymentMethod: methodFilter,
        customerId: customerIdFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: 10,
        salesRepId: role === 'SALES_REP' ? currentUser.id : undefined,
      });
      setPayments(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, statusFilter, methodFilter, customerIdFilter, startDate, endDate, page, role, currentUser.id]);

  const handleOpenAction = (payment: Payment, mode: 'APPROVE' | 'REJECT') => {
    setActionTargetPayment(payment);
    setActionDialogMode(mode);
    setActionComment(mode === 'APPROVE' ? 'Payment funds cleared and verified.' : '');
    setActionError(null);
  };

  const handleExecuteAction = async () => {
    if (!actionTargetPayment || !actionDialogMode) return;
    try {
      setProcessingAction(true);
      setActionError(null);

      if (actionDialogMode === 'APPROVE') {
        const approved = await paymentService.approvePayment(
          actionTargetPayment.id,
          currentUser,
          actionComment
        );
        setActionDialogMode(null);
        await fetchPayments();
        // Prompt thermal receipt preview
        setSelectedPayment(approved);
        setThermalModalOpen(true);
      } else {
        if (!actionComment || actionComment.trim().length < 3) {
          setActionError('A rejection reason is mandatory (minimum 3 characters).');
          return;
        }
        await paymentService.rejectPayment(actionTargetPayment.id, actionComment, currentUser);
        setActionDialogMode(null);
        await fetchPayments();
      }
    } catch (err: any) {
      setActionError(err.message || 'Operation failed.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Metrics
  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const pendingAmount = payments
    .filter((p) => p.status === 'PENDING_APPROVAL')
    .reduce((acc, p) => acc + p.amount, 0);
  const approvedAmount = payments
    .filter((p) => p.status === 'APPROVED')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Payment Collections & Verification</h1>
          <p className="text-xs text-slate-500">
            Field receipts, cheque validation, and multi-tier Finance Manager settlement approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            className="text-xs gap-1.5"
            title="Refresh Payments"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/payments/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Collected</p>
                <p className="text-xl font-semibold text-slate-900 tabular-nums mt-0.5">{formatCurrency(totalCollected)}</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Pending Finance Verification</p>
                <p className="text-xl font-semibold text-amber-700 tabular-nums mt-0.5">
                  {pendingCount} ({formatCurrency(pendingAmount)})
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Reconciled & Posted</p>
                <p className="text-xl font-semibold text-emerald-700 tabular-nums mt-0.5">
                  {formatCurrency(approvedAmount)}
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Cheque Collections</p>
                <p className="text-xl font-semibold text-primary tabular-nums mt-0.5">
                  {payments.filter((p) => p.paymentMethod === 'CHEQUE').length} Cheques
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Row */}
      <Card className="border-slate-200">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by receipt #, customer name, or cheque #..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="w-full md:w-56">
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={customerIdFilter}
                  onChange={(e) => {
                    setCustomerIdFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 h-9 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Customers</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value as any);
                  setPage(1);
                }}
                className="text-xs h-9 px-3 rounded-md border border-slate-300 bg-white"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 w-36"
                placeholder="From Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 w-36"
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(
              [
                { label: 'All Receipts', value: 'ALL' },
                { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
                { label: 'Approved & Reconciled', value: 'APPROVED' },
                { label: 'Rejected', value: 'REJECTED' },
              ] as const
            ).map((st) => (
              <button
                key={st.value}
                onClick={() => {
                  setStatusFilter(st.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors text-xs whitespace-nowrap ${
                  statusFilter === st.value
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <TableLoadingSkeleton />
          ) : payments.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={CreditCard}
                title="No Payment Records Found"
                description={
                  search || statusFilter !== 'ALL' || methodFilter !== 'ALL'
                    ? 'No collections match your filter criteria.'
                    : 'No payments have been recorded yet. Click "Record Payment" to register a payment receipt.'
                }
              />
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Visible on small screens, hidden on md+) */}
              <div className="block md:hidden p-3 space-y-3">
                {payments.map((p) => {
                  const isPending = p.status === 'PENDING_APPROVAL';

                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/payments/${p.id}`)}
                      className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      {/* Top Row: Receipt # + Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-primary tabular-nums">
                            {p.receiptNumber}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <PaymentStatusBadge status={p.status} />
                      </div>

                      {/* Customer Info */}
                      <div className="mt-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {p.customerName}
                        </h4>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                          <span>Officer: {p.salesRepName}</span>
                          <span>{formatDateTime(p.collectedAt)}</span>
                        </div>
                      </div>

                      {/* Cheque Info if any */}
                      {p.chequeNumber && (
                        <div className="mt-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                          Chq: {p.chequeNumber} ({p.bankName || 'Bank'})
                        </div>
                      )}

                      {/* Amount & Actions */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10.5px] text-slate-400 block">Collected Amount</span>
                          <div className="text-sm font-bold text-slate-900 tabular-nums">
                            {formatCurrency(p.amount)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPayment(p);
                              setThermalModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 rounded-lg"
                            title="Thermal Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              whatsAppService.sharePaymentReceipt(p);
                            }}
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 rounded-lg"
                            title="WhatsApp Receipt"
                          >
                            <Send className="h-4 w-4" />
                          </Button>

                          <span className="inline-flex items-center text-xs font-semibold text-primary gap-0.5 ml-1">
                            Details <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. Desktop Full Table View (Hidden on mobile, block on md+) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Collected Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Method & Details</TableHead>
                      <TableHead className="text-right">Collected Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right w-48">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const isPending = p.status === 'PENDING_APPROVAL';

                      return (
                        <TableRow
                          key={p.id}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors focus:outline-hidden focus:bg-slate-50"
                          tabIndex={0}
                          onClick={() => navigate(`/payments/${p.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/payments/${p.id}`);
                            }
                          }}
                        >
                          <TableCell className="font-mono text-[13px] font-medium text-primary tabular-nums">
                            <span className="hover:underline">
                              {p.receiptNumber}
                            </span>
                          </TableCell>
                          <TableCell className="text-[13px] text-slate-600 whitespace-nowrap">
                            {formatDateTime(p.collectedAt)}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            <div className="font-semibold text-slate-900">{p.customerName}</div>
                            <div className="text-xs text-slate-400 font-mono">
                              Rep: {p.salesRepName}
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px]">
                            <span className="font-semibold text-slate-800">{p.paymentMethod}</span>
                            {p.chequeNumber && (
                              <div className="text-xs text-slate-500 font-mono">
                                Chq: {p.chequeNumber} ({p.bankName || 'Bank'})
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[13px] font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <PaymentStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Fast Finance Manager inline action */}
                              {isFinanceOrDirector && isPending && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAction(p, 'APPROVE');
                                    }}
                                    className="h-7 px-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                    title="Approve Settlement"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAction(p, 'REJECT');
                                    }}
                                    className="h-7 px-2 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100"
                                    title="Reject Settlement"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayment(p);
                                  setThermalModalOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                                title="Thermal Receipt Preview"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pdfService.downloadReceiptPdf(p);
                                }}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                                title="Download PDF Receipt"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  whatsAppService.sharePaymentReceipt(p);
                                }}
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                                title="Share Receipt WhatsApp"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Showing {payments.length} of {totalCount} records
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span className="text-slate-700 font-medium">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        isOpen={thermalModalOpen}
        onClose={() => setThermalModalOpen(false)}
        payment={selectedPayment}
      />

      {/* Action Dialog (Approve / Reject) */}
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
                  Reject Payment Collection
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {actionTargetPayment && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Number:</span>
                  <span className="font-mono font-bold">{actionTargetPayment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold">{actionTargetPayment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(actionTargetPayment.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span>{actionTargetPayment.paymentMethod}</span>
                </div>
              </div>

              {actionDialogMode === 'APPROVE' ? (
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-200">
                  <p className="font-semibold">Notice of Ledger Commitment:</p>
                  <p className="mt-1">
                    Approving will immediately reduce customer outstanding receivables, apply amounts to
                    the designated invoices, and recalculate customer available credit.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 rounded-lg text-rose-800 border border-rose-200">
                  <p className="font-semibold">Rejection Notice:</p>
                  <p className="mt-1">
                    Customer outstanding balances will remain unchanged. Please provide a clear explanation for the sales rep.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  {actionDialogMode === 'APPROVE' ? 'Approval Remark:' : 'Rejection Reason (Mandatory):'}
                </label>
                <Input
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={
                    actionDialogMode === 'APPROVE'
                      ? 'E.g. Bank slip verified / cheque realized.'
                      : 'E.g. Cheque signature mismatch / insufficient funds.'
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
          )}

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
