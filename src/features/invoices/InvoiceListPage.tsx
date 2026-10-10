import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Invoice, InvoiceStatus } from '../../types/invoice';
import { Customer } from '../../types/customer';
import { invoiceService } from '../../services/InvoiceService';
import { customerService } from '../../services/CustomerService';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
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
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  RefreshCw,
  Building2,
  ChevronRight,
} from 'lucide-react';

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerIdFilter, setCustomerIdFilter] = useState(searchParams.get('customerId') || '');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
      const res = await invoiceService.getInvoices({
        search: search.trim() || undefined,
        status: statusFilter,
        customerId: customerIdFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: 10,
        salesRepId: role === 'SALES_REP' ? currentUser.id : undefined,
      });
      setInvoices(res.data);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, customerIdFilter, startDate, endDate, page, role, currentUser.id]);

  // Aggregate metrics
  const totalReceivables = invoices.reduce((acc, inv) => acc + inv.balanceAmount, 0);
  const overdueAmount = invoices.filter((i) => i.status === 'OVERDUE').reduce((acc, inv) => acc + inv.balanceAmount, 0);
  const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Commercial Tax Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            IRD-compliant invoice management, credit receivables tracking, and settlement history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            className="gap-1.5"
            title="Refresh Invoices"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/payments/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs"
          >
            <CreditCard className="h-3.5 w-3.5" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="border-slate-200 col-span-2 sm:col-span-1 min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-medium text-slate-600 truncate">Total Receivables</p>
                <div className="mt-0.5 min-w-0">
                  <AmountDisplay amount={totalReceivables} className="text-slate-900 font-bold" />
                </div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 col-span-2 sm:col-span-1 min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-medium text-slate-600 truncate">Overdue Invoices</p>
                <div className="mt-0.5 min-w-0 flex flex-wrap items-baseline gap-1">
                  <span className="text-sm sm:text-base font-bold tabular-nums text-rose-600 shrink-0">{overdueCount}</span>
                  <span className="text-xs sm:text-sm text-rose-600 font-semibold">(</span>
                  <div className="inline-block flex-1 min-w-0">
                    <AmountDisplay amount={overdueAmount} className="text-rose-600 font-bold" />
                  </div>
                  <span className="text-xs sm:text-sm text-rose-600 font-semibold">)</span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-medium text-slate-600 truncate">Active Invoices</p>
                <p className="text-base sm:text-lg font-bold tabular-nums text-primary mt-0.5 truncate">
                  {invoices.filter((i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID').length} open
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-medium text-slate-600 truncate">Fully Settled</p>
                <p className="text-base sm:text-lg font-bold tabular-nums text-emerald-600 mt-0.5 truncate">{paidCount} Paid</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by invoice #, order #, or customer name..."
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
                { label: 'All Invoices', value: 'ALL' },
                { label: 'Issued', value: 'ISSUED' },
                { label: 'Collected', value: 'COLLECTED' },
                { label: 'Partially Collected', value: 'PARTIALLY_COLLECTED' },
                { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
                { label: 'Overdue', value: 'OVERDUE' },
                { label: 'Paid', value: 'PAID' },
              ] as const
            ).map((st) => (
              <button
                key={st.value}
                onClick={() => {
                  setStatusFilter(st.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors text-[11px] whitespace-nowrap ${
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
              <div className="block md:hidden p-3 space-y-3">
                {invoices.map((inv) => {
                  const isOverdue = inv.status === 'OVERDUE';
                  return (
                    <div
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      {/* Top: Invoice #, Order #, Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0 min-w-0">
                          <span className="font-mono text-xs font-bold text-primary tabular-nums whitespace-nowrap shrink-0">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                            • SO: {inv.orderNumber}
                          </span>
                        </div>
                        <div className="shrink-0">
                          <InvoiceStatusBadge status={inv.status} />
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="mt-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                          {inv.customerName}
                        </h4>
                        <span className="font-mono text-[11px] text-slate-400">
                          {inv.customerCode}
                        </span>
                      </div>

                      {/* Financial info box */}
                      <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Balance Due</span>
                          <div className={`text-sm font-bold tabular-nums ${isOverdue ? 'text-rose-600' : inv.balanceAmount > 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
                            {inv.balanceAmount > 0 ? formatCurrency(inv.balanceAmount) : 'Settled'}
                          </div>
                          <span className="text-[10.5px] text-slate-400 block mt-0.5">
                            Total: {formatCurrency(inv.totalAmount)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Due Date</span>
                          <div className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatDate(inv.dueDate)}
                          </div>
                          <span className="text-[10.5px] text-slate-400 block mt-0.5">
                            Issued: {formatDate(inv.issueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Actions bar */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              whatsAppService.shareInvoice(inv);
                            }}
                            className="h-8 px-2.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/80 gap-1 rounded-xl cursor-pointer"
                            title="Share via WhatsApp"
                          >
                            <Send className="h-3.5 w-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              printerService.printInvoice(inv);
                            }}
                            className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
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
                            className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {inv.balanceAmount > 0 ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/payments/new?customerId=${inv.customerId}&invoiceId=${inv.id}`);
                            }}
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Collect</span>
                          </Button>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-primary gap-0.5">
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
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors focus:outline-hidden focus:bg-slate-50"
                        tabIndex={0}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/invoices/${inv.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-mono text-xs font-semibold tabular-nums text-primary">
                          <span className="hover:underline">
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
                                  navigate(`/payments/new?customerId=${inv.customerId}&invoiceId=${inv.id}`);
                                }}
                                className="h-7 w-7 p-0 text-emerald-700 hover:bg-emerald-50"
                                title="Record Settlement"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
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
    </div>
  );
}
