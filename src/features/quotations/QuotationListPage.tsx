import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuotations } from '../../hooks/useQuotations';
import { useAuth } from '../../hooks/useAuth';
import { Quotation, QuotationStatus } from '../../types/quotation';
import { Customer } from '../../types/customer';
import { customerService } from '../../services/CustomerService';
import { QuotationStatusBadge } from './QuotationStatusBadge';
import { QuotationConvertModal } from './QuotationConvertModal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import { whatsAppService } from '../../services/WhatsAppService';
import { printerService } from '../../services/PrinterService';
import {
  FileSpreadsheet,
  Plus,
  Search,
  ArrowUpDown,
  Share2,
  Printer,
  Eye,
  CheckCircle,
  Clock,
  ShoppingCart,
  DollarSign,
  UserCheck,
  Filter,
  Building2,
  ChevronRight,
} from 'lucide-react';

const STATUS_FILTERS: Array<{ label: string; value: QuotationStatus | 'ALL' }> = [
  { label: 'All Quotations', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Converted', value: 'CONVERTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Expired', value: 'EXPIRED' },
];

export function QuotationListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const initialCustomerId = searchParams.get('customerId') || undefined;

  const {
    quotations,
    loading,
    error,
    filters,
    setFilters,
    total,
    convertToSalesOrder,
  } = useQuotations(
    initialCustomerId
      ? { page: 1, pageSize: 15, status: 'ALL', sortByDate: 'desc', customerId: initialCustomerId }
      : undefined
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [convertingQuotation, setConvertingQuotation] = useState<Quotation | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await customerService.listCustomers(
          currentUser.role === 'SALES_REP'
            ? { assignedRepId: currentUser.id, pageSize: 100 }
            : { pageSize: 100 }
        );
        setCustomers(res.data);
      } catch (err) {
        console.error('Failed to load customers for filter', err);
      }
    }
    loadCustomers();
  }, [currentUser]);

  const handleSearchChange = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleCustomerFilter = (custId: string) => {
    setFilters({ ...filters, customerId: custId ? custId : undefined, page: 1 });
  };

  const handleStatusFilter = (status: QuotationStatus | 'ALL') => {
    setFilters({ ...filters, status, page: 1 });
  };

  const handleToggleSort = () => {
    const nextSort = filters.sortByDate === 'asc' ? 'desc' : 'asc';
    setFilters({ ...filters, sortByDate: nextSort });
  };

  // Metrics summary
  const pendingCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL').length;
  const approvedCount = quotations.filter((q) => q.status === 'APPROVED').length;
  const convertedCount = quotations.filter((q) => q.status === 'CONVERTED').length;
  const totalPipelineValue = quotations.reduce((acc, q) => acc + q.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="h-7 w-7 text-primary" />
            Quotation Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standard customer price proposals, discount threshold approvals, and sales order conversions.
          </p>
        </div>

        <Button
          onClick={() => navigate('/quotations/new')}
          className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          New Quotation
        </Button>
      </div>

      {/* Role Scoping Banner */}
      {currentUser.role === 'SALES_REP' ? (
        <div className="rounded-lg bg-primary-light border border-primary-border p-3 text-xs flex items-center justify-between text-indigo-900">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span>
              <strong>Territory Scoped View:</strong> Showing quotations created by you (
              <span className="font-semibold">{currentUser.name}</span>) for your assigned dealers.
            </span>
          </div>
          <span className="text-xs font-medium text-primary bg-white px-2.5 py-0.5 rounded border border-primary-border">
            Rep Max Discount Limit: 5%
          </span>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs flex items-center justify-between text-slate-700">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span>
              <strong>Enterprise Scope:</strong> Viewing all area quotations across the distribution network as{' '}
              <span className="font-semibold">{currentUser.role.replace('_', ' ')}</span>.
            </span>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-4">
        <Card className="shadow-xs">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Quotes</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 sm:mt-1">{total}</h3>
            </div>
            <div className="rounded-lg bg-primary-light p-2 sm:p-2.5 text-primary shrink-0">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Pending Approval</p>
              <h3 className="text-lg sm:text-xl font-bold text-amber-600 mt-0.5 sm:mt-1">{pendingCount}</h3>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 sm:p-2.5 text-amber-600 shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Converted Orders</p>
              <h3 className="text-lg sm:text-xl font-bold text-primary mt-0.5 sm:mt-1">{convertedCount}</h3>
            </div>
            <div className="rounded-lg bg-primary-light p-2 sm:p-2.5 text-primary shrink-0">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs col-span-2 sm:col-span-1 min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Pipeline Value</p>
              <div className="mt-0.5 sm:mt-1 min-w-0">
                <AmountDisplay amount={totalPipelineValue} className="text-emerald-700 font-bold" />
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2 sm:p-2.5 text-emerald-600 shrink-0">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Quotation #, Dealer Name, Code, or Sales Rep..."
                value={filters.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
              <div className="relative min-w-48">
                <Select
                  value={filters.customerId || '__all__'}
                  onValueChange={(val) => handleCustomerFilter(val === '__all__' ? '' : val)}
                >
                  <SelectTrigger aria-label="Filter by Customer" className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                    <SelectValue placeholder="All Customers / Dealers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Customers / Dealers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSort}
                className="text-xs h-9 gap-1.5 shrink-0"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                Date: {filters.sortByDate === 'asc' ? 'Oldest First' : 'Newest First'}
              </Button>
            </div>
          </div>

          {/* Status Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {STATUS_FILTERS.map((f) => {
              const isActive = (filters.status || 'ALL') === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => handleStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading quotations...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600">{error}</div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700 text-sm">No quotations found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No quotations match your current search or status filter. Create a new quotation to begin.
              </p>
              <Button
                onClick={() => navigate('/quotations/new')}
                size="sm"
                className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Create First Quotation
              </Button>
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Visible on small screens, hidden on md+) */}
              <div className="block md:hidden p-3 space-y-3">
                {quotations.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/quotations/${q.id}`)}
                    className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {/* Top Row: Quotation # & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary tabular-nums">
                          {q.quotationNumber}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          • {q.items.length} {q.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <QuotationStatusBadge status={q.status} />
                    </div>

                    {/* Customer Info */}
                    <div className="mt-2">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                        {q.customerNameSnapshot}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>{q.customerCodeSnapshot}</span>
                        <span>•</span>
                        <span>Valid until {q.validUntil}</span>
                      </div>
                    </div>

                    {/* Middle: Amount & Discount */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Amount</span>
                        <div className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(q.totalAmount)}
                        </div>
                        {q.discountAmount > 0 && (
                          <span className="text-[10.5px] text-emerald-600 font-medium">
                            Saved {formatCurrency(q.discountAmount)}
                          </span>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <span>Issued: {formatDate(q.createdAt)}</span>
                      </div>
                    </div>

                    {/* Bottom Actions: WhatsApp, Print, Convert */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            whatsAppService.shareQuotation(q);
                          }}
                          className="h-8 px-2.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/80 gap-1 rounded-xl cursor-pointer"
                          title="Share via WhatsApp"
                        >
                          <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            printerService.printQuotation(q);
                          }}
                          className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                          title="Print Quotation"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {q.status === 'APPROVED' ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConvertingQuotation(q);
                          }}
                          className="h-8 px-3 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl cursor-pointer gap-1"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Convert to SO</span>
                        </Button>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-primary gap-0.5">
                          Details <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Desktop Full Table View (Hidden on mobile, block on md+) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="w-32">Quotation #</TableHead>
                      <TableHead>Customer / Dealer</TableHead>
                      <TableHead className="w-28">Date Issued</TableHead>
                      <TableHead className="w-24 text-center">Items</TableHead>
                      <TableHead className="w-32 text-right">Grand Total</TableHead>
                      <TableHead className="w-32 text-center">Status</TableHead>
                      <TableHead className="w-44 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((q) => (
                      <TableRow
                        key={q.id}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors focus:outline-hidden focus:bg-slate-50"
                        tabIndex={0}
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/quotations/${q.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          <span className="hover:underline text-left">
                            {q.quotationNumber}
                          </span>
                          <div className="text-[10px] font-normal text-slate-400">
                            Rep: {q.salesRepNameSnapshot}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-900 text-xs truncate max-w-xs">
                            {q.customerNameSnapshot}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Code: {q.customerCodeSnapshot} | Exp: {q.validUntil}
                          </div>
                        </TableCell>

                        <TableCell className="text-[13px] text-slate-600">
                          {formatDate(q.createdAt)}
                        </TableCell>

                        <TableCell className="text-center text-[13px] text-slate-700 font-normal">
                          {q.items.length} {q.items.length === 1 ? 'item' : 'items'}
                        </TableCell>

                        <TableCell className="text-right tabular-nums text-[13.5px] font-semibold text-slate-900">
                          {formatCurrency(q.totalAmount)}
                          {q.discountAmount > 0 && (
                            <div className="text-xs text-emerald-600 font-normal mt-0.5">
                              - {formatCurrency(q.discountAmount)} disc
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          <QuotationStatusBadge status={q.status} />
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                whatsAppService.shareQuotation(q);
                              }}
                              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                              title="Share via WhatsApp"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                printerService.printQuotation(q);
                              }}
                              className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
                              title="Print Quotation"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            {q.status === 'APPROVED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConvertingQuotation(q);
                                }}
                                className="text-xs h-7 px-2.5 text-primary border-primary-border hover:bg-primary-light font-medium"
                                title="Convert to Sales Order"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Order
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
        </CardContent>
      </Card>

      {/* Convert to Sales Order Modal */}
      {convertingQuotation && (
        <QuotationConvertModal
          isOpen={!!convertingQuotation}
          onClose={() => setConvertingQuotation(null)}
          quotation={convertingQuotation}
          onConfirmConvert={(details) => convertToSalesOrder(convertingQuotation.id, details)}
        />
      )}
    </div>
  );
}
