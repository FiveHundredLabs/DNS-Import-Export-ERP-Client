import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Invoice, InvoiceStatus, InvoicePaymentFilterType } from '../../types/invoice';
import { Customer } from '../../types/customer';
import { invoiceService } from '../../services/InvoiceService';
import { customerService } from '../../services/CustomerService';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { printerService } from '../../services/PrinterService';
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
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import {
  Search,
  Filter,
  Eye,
  Printer,
  Download,
  Send,
  PlusCircle,
  Plus,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  RefreshCw,
  Building2,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  X,
  Lock,
  FileEdit,
  Edit3,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, currentUser } = useAuth();
  const activeRole = currentUser?.role || role;
  const isSalesManager = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR', 'ADMIN'].includes(activeRole);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerIdFilter, setCustomerIdFilter] = useState(searchParams.get('customerId') || '');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoicePaymentFilterType | InvoiceStatus | 'ALL'>(
    (searchParams.get('filter') as any) || 'ALL'
  );
  const [allInvoicesForCounts, setAllInvoicesForCounts] = useState<Invoice[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await customerService.listCustomers({ pageSize: 100 });
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to load customers for invoice filter', err);
      }
    }
    loadCustomers();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const isRep = role === 'SALES_REP';
      const [res, allRes] = await Promise.all([
        invoiceService.getInvoices({
          search: search.trim() || undefined,
          paymentFilter: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
          status: statusFilter as any,
          customerId: customerIdFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          pageSize: 50,
          salesRepId: isRep ? currentUser?.id : undefined,
        }),
        invoiceService.getInvoices({
          pageSize: 200,
          customerId: customerIdFilter || undefined,
          salesRepId: isRep ? currentUser?.id : undefined,
        }),
      ]);
      setInvoices(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
      setAllInvoicesForCounts(allRes.data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, customerIdFilter, startDate, endDate, page, role, currentUser?.id]);

  // Compute live filter counts across customer invoices
  const counts = useMemo(() => {
    const now = new Date();
    const sevenDaysAheadTime = now.getTime() + 7 * 24 * 60 * 60 * 1000;

    let outstanding = 0;
    let overdue = 0;
    let nearDue = 0;
    let pendingCollection = 0;
    let settled = 0;
    let draft = 0;

    for (const inv of allInvoicesForCounts) {
      if (inv.status === 'DRAFT') draft++;
      const uncollected = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
      const [y, m, d] = inv.dueDate.split('-').map(Number);
      const dueTime = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      const isOvd = dueTime < now.getTime() || inv.status === 'OVERDUE';
      const isNear = !isOvd && dueTime <= sevenDaysAheadTime && uncollected > 0;

      if (inv.balanceAmount > 0) outstanding++;
      if (isOvd && uncollected > 0) overdue++;
      if (isNear) nearDue++;
      if (
        inv.status === 'COLLECTED' ||
        inv.status === 'PARTIALLY_COLLECTED' ||
        ((inv.collectedAmount || 0) > 0 && inv.status !== 'PAID')
      ) {
        pendingCollection++;
      }
      if (inv.status === 'PAID' || inv.balanceAmount <= 0) settled++;
    }

    return {
      all: allInvoicesForCounts.length,
      draft,
      outstanding,
      overdue,
      nearDue,
      pendingCollection,
      settled,
    };
  }, [allInvoicesForCounts]);

  const selectedCustomer = customers.find((c) => c.id === customerIdFilter);

  // Aggregate metrics
  const totalReceivables = invoices.reduce((acc, inv) => acc + inv.balanceAmount, 0);
  const overdueAmount = invoices.filter((i) => i.status === 'OVERDUE').reduce((acc, inv) => acc + inv.balanceAmount, 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Commercial Tax Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            IRD-compliant invoice management, credit receivables tracking, and settlement history.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            className="h-9 px-3 gap-1.5 text-xs rounded-xl"
            title="Refresh Invoices"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 px-3.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold gap-1.5 shadow-xs rounded-xl flex-1 sm:flex-initial justify-center cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/payments/new')}
            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs rounded-xl flex-1 sm:flex-initial justify-center"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row (Compact 2x2 Grid on Mobile, 4 Columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Receivables</p>
                <div className="mt-0.5 min-w-0">
                  <AmountDisplay amount={totalReceivables} className="text-sm sm:text-lg font-bold text-slate-900" />
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-semibold text-rose-600 uppercase tracking-wider truncate">Overdue Invoices</p>
                <div className="mt-0.5 min-w-0 flex items-baseline gap-1 truncate">
                  <span className="text-sm sm:text-base font-bold tabular-nums text-rose-600 shrink-0">{overdueCount}</span>
                  <span className="text-[11px] sm:text-xs text-rose-600 font-semibold truncate">
                    ({formatCurrency(overdueAmount)})
                  </span>
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Active</p>
                <p className="text-sm sm:text-base font-bold tabular-nums text-primary mt-0.5 truncate">
                  {invoices.filter((i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID').length} open
                </p>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Settled</p>
                <p className="text-sm sm:text-base font-bold tabular-nums text-emerald-600 mt-0.5 truncate">{paidCount} Paid</p>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3 sm:p-3.5 space-y-2.5 sm:space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by invoice #, order #, or customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs h-9 rounded-xl"
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
                  <SelectTrigger className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-300 bg-white">
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
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 rounded-xl w-full sm:w-36"
                placeholder="From Date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs h-9 rounded-xl w-full sm:w-36"
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Customer filter active indicator pill */}
          {selectedCustomer && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary-light/40 border border-primary/20 text-xs text-primary">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Filtering invoices for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.code})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomerIdFilter('');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-dark underline cursor-pointer text-[11px]"
              >
                <X className="h-3.5 w-3.5" /> Clear Filter
              </button>
            </div>
          )}

          {/* Standard Status Filter Tabs matching Customer Payments */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {(
              [
                { label: 'All Invoices', value: 'ALL', count: counts.all, icon: Receipt },
                { label: 'Drafts', value: 'DRAFT', count: counts.draft, icon: FileEdit },
                { label: 'Outstanding', value: 'OUTSTANDING', count: counts.outstanding, icon: DollarSign },
                { label: 'Overdue', value: 'OVERDUE', count: counts.overdue, icon: AlertTriangle },
                { label: 'Near Due', value: 'NEAR_DUE', count: counts.nearDue, icon: Clock },
                { label: 'Pending Collection', value: 'PENDING_COLLECTION', count: counts.pendingCollection, icon: ShieldCheck },
                { label: 'Fully Settled', value: 'FULLY_SETTLED', count: counts.settled, icon: CheckCircle },
              ] as const
            ).map((st) => {
              const Icon = st.icon;
              const isActive = statusFilter === st.value;
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st.value);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{st.label}</span>
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <TableLoadingSkeleton />
          ) : invoices.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Receipt}
                title="No Invoices Found"
                description={
                  search || statusFilter !== 'ALL'
                    ? 'No invoices match your selected filters. Try clearing some criteria.'
                    : 'No invoices have been issued yet. Invoices are generated from approved and fulfilled sales orders.'
                }
              />
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Visible on small screens, hidden on md+) */}
              <div className="block md:hidden p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
                {invoices.map((inv) => {
                  const isOverdue = inv.status === 'OVERDUE';
                  return (
                    <div
                      key={inv.id}
                      onClick={() =>
                        navigate(inv.status === 'DRAFT' ? `/invoices/${inv.id}/edit` : `/invoices/${inv.id}`)
                      }
                      className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      {/* Top: Invoice #, Order #, Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0 min-w-0">
                          <span className="font-mono text-xs font-bold text-primary tabular-nums whitespace-nowrap shrink-0">
                            Inv #{inv.invoiceNumber}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                            • SO: {inv.orderNumber}
                          </span>
                        </div>
                        <div className="shrink-0">
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="mt-1.5 min-w-0">
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug truncate">
                          {inv.customerName}
                        </h4>
                        <span className="font-mono text-[10.5px] text-slate-400">
                          {inv.customerCode}
                        </span>
                      </div>

                      {/* Financial info box */}
                      <div className="mt-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Balance Due</span>
                          <div className={`text-sm font-black tabular-nums ${isOverdue ? 'text-rose-600' : inv.balanceAmount > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                            {inv.balanceAmount > 0 ? formatCurrency(inv.balanceAmount) : 'Settled'}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Total: {formatCurrency(inv.totalAmount)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Due Date</span>
                          <div className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatDate(inv.dueDate)}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Issued: {formatDate(inv.issueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Actions bar */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewInvoice(inv);
                              setPreviewModalOpen(true);
                            }}
                            className="h-8 px-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 gap-1 rounded-xl cursor-pointer shrink-0"
                            title="Preview A4 Document"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                            <span>A4</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              whatsAppService.shareInvoice(inv);
                            }}
                            className="h-8 px-2 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/80 gap-1 rounded-xl cursor-pointer shrink-0"
                            title="Share via WhatsApp"
                          >
                            <Send className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="hidden xs:inline">WhatsApp</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              printerService.printInvoice(inv);
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer shrink-0"
                            title="Print Invoice"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              pdfService.downloadInvoicePdf(inv);
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer shrink-0"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {inv.status === 'DRAFT' && isSalesManager ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/${inv.id}/edit`);
                            }}
                            className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer gap-1 shadow-xs shrink-0"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit Draft</span>
                          </Button>
                        ) : inv.balanceAmount > 0 ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/${inv.id}?collect=true`);
                            }}
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer gap-1 shadow-xs shrink-0"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Collect</span>
                          </Button>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-primary gap-0.5 shrink-0 px-2 py-1">
                            Details <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        )}
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
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Paid Amount</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right w-44">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        className={cn(
                          "hover:bg-slate-50/80 cursor-pointer transition-colors focus:outline-hidden focus:bg-slate-50",
                          inv.status === 'DRAFT' && "bg-amber-50/20 hover:bg-amber-50/50"
                        )}
                        tabIndex={0}
                        onClick={() =>
                          navigate(inv.status === 'DRAFT' ? `/invoices/${inv.id}/edit` : `/invoices/${inv.id}`)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(inv.status === 'DRAFT' ? `/invoices/${inv.id}/edit` : `/invoices/${inv.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-mono text-xs font-semibold tabular-nums text-primary">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(inv.status === 'DRAFT' ? `/invoices/${inv.id}/edit` : `/invoices/${inv.id}`);
                            }}
                            className="hover:underline cursor-pointer"
                          >
                            {inv.invoiceNumber}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          <Link
                            to={`/orders/${inv.orderId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {inv.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-[13px]">
                          <div className="font-semibold text-slate-900">{inv.customerName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{inv.customerCode}</div>
                        </TableCell>
                        <TableCell className="text-[13px] text-slate-600 whitespace-nowrap">
                          {formatDate(inv.issueDate)}
                        </TableCell>
                        <TableCell className="text-[13px] whitespace-nowrap">
                          <span
                            className={
                              inv.status === 'OVERDUE'
                                ? 'font-semibold text-rose-600'
                                : 'text-slate-600'
                            }
                          >
                            {formatDate(inv.dueDate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13.5px] font-semibold text-slate-900">
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13px] text-emerald-600 font-medium">
                          {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[13.5px] font-semibold text-slate-900">
                          {inv.balanceAmount > 0 ? (
                            <span className={inv.status === 'OVERDUE' ? 'text-rose-600' : 'text-slate-900'}>
                              {formatCurrency(inv.balanceAmount)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-normal">Settled</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <InvoiceStatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inv.status === 'DRAFT' && isSalesManager && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/invoices/${inv.id}/edit`);
                                }}
                                className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg cursor-pointer gap-1 shadow-2xs shrink-0"
                                title="Edit Draft Invoice"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Edit Draft</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewInvoice(inv);
                                setPreviewModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                              title="Preview A4 Document"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                printerService.printInvoice(inv);
                              }}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                              title="Print Invoice"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                pdfService.downloadInvoicePdf(inv);
                              }}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                              title="Download PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                whatsAppService.shareInvoice(inv);
                              }}
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                              title="Share via WhatsApp"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            {inv.balanceAmount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/invoices/${inv.id}?collect=true`);
                                }}
                                className="h-7 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 gap-1 rounded-lg"
                                title="Collect Payment on this Invoice"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>Collect</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Showing {invoices.length} of {totalCount} records
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

      {/* A4 Invoice Preview Modal (Commercial & IRD Tax Templates) */}
      <InvoicePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        invoice={previewInvoice}
      />

      {/* Create Commercial Sales Invoice Modal */}
      <CreateInvoiceModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          fetchInvoices();
        }}
      />
    </div>
  );
}
