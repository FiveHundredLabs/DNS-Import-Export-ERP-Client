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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { EmptyState } from '../../components/common/EmptyState';
import { handoverService } from '../../services/HandoverService';
import { CashHandover, DailyHandoverMetrics, HandoverStatus } from '../../types/handover';
import { CashHandoverModal } from './components/CashHandoverModal';
import { HandoverDetailModal } from './components/HandoverDetailModal';
import { cn } from '../../utils/cn';
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
  Receipt,
  Users,
  Banknote,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export function PaymentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<'HANDOVERS' | 'RECEIPTS' | 'CUSTOMERS'>('HANDOVERS');
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

  // Daily Handover Metrics & Handovers state
  const [dailyMetrics, setDailyMetrics] = useState<DailyHandoverMetrics>({
    todayTotalCollected: 0,
    pendingHandover: 0,
    handedOver: 0,
    approvedByFinance: 0,
  });
  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [handoverSearch, setHandoverSearch] = useState('');
  const [handoverStatusFilter, setHandoverStatusFilter] = useState<HandoverStatus | 'ALL'>('ALL');
  const [loadingHandovers, setLoadingHandovers] = useState(false);

  // Handover Modals state
  const [cashHandoverModalOpen, setCashHandoverModalOpen] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState<CashHandover | null>(null);
  const [handoverDetailModalOpen, setHandoverDetailModalOpen] = useState(false);

  // Thermal modal state
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Approval / Rejection dialog state
  const [actionDialogMode, setActionDialogMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionTargetPayment, setActionTargetPayment] = useState<Payment | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFinanceOrDirector = ['FINANCE_MANAGER', 'DIRECTOR', 'MANAGER', 'CASHIER'].includes(role);

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

  const fetchMetrics = async () => {
    try {
      const metrics = await handoverService.getDailyMetrics(
        role === 'SALES_REP' ? currentUser.id : undefined
      );
      setDailyMetrics(metrics);
    } catch (err) {
      console.error('Failed to load daily handover metrics', err);
    }
  };

  const fetchHandovers = async () => {
    try {
      setLoadingHandovers(true);
      const res = await handoverService.getHandovers({
        search: handoverSearch.trim() || undefined,
        status: handoverStatusFilter,
        salesRepId: role === 'SALES_REP' ? currentUser.id : undefined,
      });
      setHandovers(res.data);
    } catch (err) {
      console.error('Failed to load handovers', err);
    } finally {
      setLoadingHandovers(false);
    }
  };

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

  useEffect(() => {
    fetchMetrics();
  }, [payments, handovers]);

  useEffect(() => {
    fetchHandovers();
  }, [handoverSearch, handoverStatusFilter, role, currentUser.id]);

  const handleHandoverSuccess = (newHandover: CashHandover) => {
    fetchPayments();
    fetchMetrics();
    fetchHandovers();
    setSelectedHandover(newHandover);
    setHandoverDetailModalOpen(true);
  };

  const handleHandoverUpdate = (updated: CashHandover) => {
    fetchPayments();
    fetchMetrics();
    fetchHandovers();
    setSelectedHandover(updated);
  };

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
    <div className="space-y-5 pb-28 sm:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {role === 'SALES_REP' ? 'Cash in Hand' : 'Customer Payments & Collections'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            {role === 'SALES_REP'
              ? 'View collected cash balance in hand and submit physical handovers to Finance.'
              : 'Real-time customer receivables, overdue balances, and mobile-friendly payment collection.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick "Hand Over Cash" button for Sales Rep */}
          <Button
            size="sm"
            data-testid="btn-hand-over-cash"
            onClick={() => setCashHandoverModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-xs font-semibold rounded-xl"
            title="Hand Over Collected Cash to Finance Department"
          >
            <Banknote className="h-3.5 w-3.5" /> Hand Over Cash
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchHandovers}
            className="text-xs gap-1.5 rounded-xl border-slate-200 shadow-2xs font-semibold"
            title="Refresh Handovers"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* 4 Payments Dashboard KPI Cards (Simplified: Title, Icon, Value) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* 1. Today's Total Collections */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 truncate">
              Today's Collections
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-slate-900 tracking-tight font-mono truncate">
            {formatCurrency(dailyMetrics.todayTotalCollected)}
          </div>
        </div>

        {/* 2. Pending Handover */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 truncate">
              {role === 'SALES_REP' ? 'Wallet' : 'Cash in Hand'}
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-amber-900 tracking-tight font-mono truncate">
            {formatCurrency(dailyMetrics.pendingHandover)}
          </div>
        </div>

        {/* 3. Handed Over */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 truncate">
              Handed Over
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-slate-900 tracking-tight font-mono truncate">
            {formatCurrency(dailyMetrics.handedOver)}
          </div>
        </div>

        {/* 4. Approved by Finance */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 truncate">
              Approved by Finance
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-base sm:text-xl font-extrabold text-emerald-900 tracking-tight font-mono truncate">
            {formatCurrency(dailyMetrics.approvedByFinance)}
          </div>
        </div>
      </div>

      {viewMode === 'HANDOVERS' || viewMode === 'CUSTOMERS' ? (
        <div className="space-y-4">
          {/* Handover Cash History Section Header */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-amber-600" />
                <span>Handover Cash History</span>
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHandovers}
              className="text-xs gap-1.5 h-8 font-semibold"
              title="Refresh Handovers"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>

          {/* Handover Filter Bar */}
          <Card className="border-slate-200">
                <CardContent className="p-3.5 space-y-3">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by handover #, sales rep, or finance recipient..."
                        value={handoverSearch}
                        onChange={(e) => setHandoverSearch(e.target.value)}
                        className="pl-9 text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    {(
                      [
                        { label: 'All Handovers', value: 'ALL' },
                        { label: 'Pending Finance Approval', value: 'PENDING_APPROVAL' },
                        { label: 'Approved by Finance', value: 'APPROVED' },
                        { label: 'Rejected', value: 'REJECTED' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.value}
                        onClick={() => setHandoverStatusFilter(st.value)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap ${
                          handoverStatusFilter === st.value
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Handover List Content */}
              <Card className="border-slate-200">
                <CardContent className="p-0">
                  {loadingHandovers ? (
                    <TableLoadingSkeleton />
                  ) : handovers.length === 0 ? (
                    <div className="p-8">
                      <EmptyState
                        icon={Banknote}
                        title="No Cash Handover Records Found"
                        description={
                          handoverSearch || handoverStatusFilter !== 'ALL'
                            ? 'No cash handovers match your current search and filter criteria.'
                            : 'No cash handovers recorded yet. Click "Hand Over Cash" to hand over field customer payments to Finance.'
                        }
                      />
                    </div>
                  ) : (
                    <>
                      {/* Mobile Cards (Visible on mobile, hidden on md+) */}
                      <div className="block md:hidden p-3 space-y-3">
                        {handovers.map((h) => {
                          const isPending = h.status === 'PENDING_APPROVAL';
                          const isApproved = h.status === 'APPROVED';

                          return (
                            <div
                              key={h.id}
                              onClick={() => {
                                setSelectedHandover(h);
                                setHandoverDetailModalOpen(true);
                              }}
                              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99]"
                            >
                              {/* Header */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-primary tabular-nums">
                                  {h.handoverNumber}
                                </span>
                                <span
                                  className={cn(
                                    'text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1',
                                    isApproved
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isPending
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  )}
                                >
                                  {isApproved && <CheckCircle2 className="h-3 w-3" />}
                                  {isPending && <Clock className="h-3 w-3" />}
                                  {isApproved
                                    ? 'Approved by Finance'
                                    : isPending
                                    ? 'Pending Approval'
                                    : 'Rejected'}
                                </span>
                              </div>

                              {/* Rep & Recipient */}
                              <div className="mt-2 space-y-1">
                                <div className="text-xs text-slate-800">
                                  <span className="text-slate-400">Sales Rep: </span>
                                  <span className="font-semibold">{h.salesRepName}</span>
                                </div>
                                <div className="text-xs text-slate-800">
                                  <span className="text-slate-400">Received By: </span>
                                  <span className="font-semibold text-slate-900">
                                    {h.recipientUserName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium ml-1">
                                    ({h.recipientUserRole})
                                  </span>
                                </div>
                              </div>

                              {/* Breakdown & Amount */}
                              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                  <span className="text-[10.5px] text-slate-400 block">
                                    {h.customerCount} Customers • {h.invoiceCount} Invoices
                                  </span>
                                  <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                                    {formatCurrency(h.totalAmount)}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {isFinanceOrDirector && isPending ? (
                                    <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                                      Review & Approve <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-xs font-semibold text-primary gap-0.5">
                                      Details <ChevronRight className="h-4 w-4" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Handover #</TableHead>
                              <TableHead>Submitted At</TableHead>
                              <TableHead>Sales Rep</TableHead>
                              <TableHead>Received By (Finance)</TableHead>
                              <TableHead className="text-center">Breakdown</TableHead>
                              <TableHead className="text-right">Total Amount</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {handovers.map((h) => {
                              const isPending = h.status === 'PENDING_APPROVAL';
                              const isApproved = h.status === 'APPROVED';

                              return (
                                <TableRow
                                  key={h.id}
                                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                                  onClick={() => {
                                    setSelectedHandover(h);
                                    setHandoverDetailModalOpen(true);
                                  }}
                                >
                                  <TableCell className="font-mono text-[13px] font-bold text-primary tabular-nums">
                                    {h.handoverNumber}
                                  </TableCell>
                                  <TableCell className="text-[13px] text-slate-600 whitespace-nowrap">
                                    {formatDateTime(h.submittedAt)}
                                  </TableCell>
                                  <TableCell className="text-[13px] font-medium text-slate-900">
                                    {h.salesRepName}
                                  </TableCell>
                                  <TableCell className="text-[13px]">
                                    <div className="font-semibold text-slate-900">{h.recipientUserName}</div>
                                    <div className="text-xs text-slate-500">{h.recipientUserRole}</div>
                                  </TableCell>
                                  <TableCell className="text-center text-[12px] text-slate-700 whitespace-nowrap">
                                    <span className="font-semibold">{h.customerCount}</span> Customers •{' '}
                                    <span className="font-semibold">{h.invoiceCount}</span> Invoices
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-[13px] font-bold text-slate-900 tabular-nums">
                                    {formatCurrency(h.totalAmount)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span
                                      className={cn(
                                        'text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1',
                                        isApproved
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : isPending
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      )}
                                    >
                                      {isApproved && <CheckCircle2 className="h-3 w-3" />}
                                      {isPending && <Clock className="h-3 w-3" />}
                                      {isApproved
                                        ? 'Approved by Finance'
                                        : isPending
                                        ? 'Pending Approval'
                                        : 'Rejected'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isFinanceOrDirector && isPending ? (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedHandover(h);
                                          setHandoverDetailModalOpen(true);
                                        }}
                                        className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                      >
                                        Review & Approve
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedHandover(h);
                                          setHandoverDetailModalOpen(true);
                                        }}
                                        className="h-7 px-2.5 text-xs"
                                      >
                                        View Details
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <>

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
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                <Select
                  value={customerIdFilter || '__all__'}
                  onValueChange={(val) => {
                    setCustomerIdFilter(val === '__all__' ? '' : val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full pl-9 pr-3 h-9 text-xs rounded-md border border-slate-300 bg-white">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={methodFilter}
                onValueChange={(val) => {
                  setMethodFilter(val as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="text-xs h-9 px-3 rounded-md border border-slate-300 bg-white min-w-36">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Payment Methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 flex-1 min-w-0 sm:flex-initial sm:w-36"
                placeholder="From Date"
              />
              <span className="text-xs text-slate-400 shrink-0">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 flex-1 min-w-0 sm:flex-initial sm:w-36"
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
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                          <span className="font-mono text-xs font-bold text-primary tabular-nums whitespace-nowrap shrink-0">
                            {p.receiptNumber}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 whitespace-nowrap shrink-0">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <PaymentStatusBadge status={p.status} />
                          {p.handoverNumber ? (
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5',
                                p.handoverStatus === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.handoverStatus === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-purple-100 text-purple-800'
                              )}
                            >
                              {p.handoverStatus === 'APPROVED' && <CheckCircle2 className="h-2.5 w-2.5" />}
                              {p.handoverStatus === 'REJECTED' && <AlertCircle className="h-2.5 w-2.5" />}
                              {p.handoverStatus === 'HANDED_OVER' && <Clock className="h-2.5 w-2.5" />}
                              {p.handoverStatus === 'APPROVED'
                                ? 'Verified'
                                : p.handoverStatus === 'REJECTED'
                                ? 'Rejected'
                                : 'Handed Over'}
                            </span>
                          ) : p.status === 'PENDING_APPROVAL' ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> Pending Handover
                            </span>
                          ) : null}
                        </div>
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
                      <TableHead className="text-center">Handover Status</TableHead>
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
                          <TableCell className="text-center">
                            {p.handoverNumber ? (
                              <span
                                className={cn(
                                  'text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap',
                                  p.handoverStatus === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : p.handoverStatus === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-purple-100 text-purple-800'
                                )}
                              >
                                {p.handoverStatus === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                                {p.handoverStatus === 'REJECTED' && <AlertCircle className="h-3 w-3" />}
                                {p.handoverStatus === 'HANDED_OVER' && <Clock className="h-3 w-3" />}
                                {p.handoverStatus === 'APPROVED'
                                  ? 'Finance Verified'
                                  : p.handoverStatus === 'REJECTED'
                                  ? 'Rejected'
                                  : `${p.handoverNumber}`}
                              </span>
                            ) : p.status === 'PENDING_APPROVAL' ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1 whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                Pending Handover
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">—</span>
                            )}
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
      </>
      )}

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

      {/* Cash Handover Submission Modal (Sales Rep -> Finance Recipient) */}
      <CashHandoverModal
        isOpen={cashHandoverModalOpen}
        onClose={() => setCashHandoverModalOpen(false)}
        currentUser={currentUser}
        onHandoverSuccess={handleHandoverSuccess}
      />

      {/* Handover Detail Review Modal (Finance Physical Verification / Sales Rep Review) */}
      <HandoverDetailModal
        isOpen={handoverDetailModalOpen}
        onClose={() => {
          setHandoverDetailModalOpen(false);
          setSelectedHandover(null);
        }}
        handover={selectedHandover}
        currentUser={currentUser}
        onUpdate={handleHandoverUpdate}
      />
    </div>
  );
}
