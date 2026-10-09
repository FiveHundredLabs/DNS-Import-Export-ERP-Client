import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { Quotation } from '../../types/quotation';
import { quotationService } from '../../services/QuotationService';
import { QuotationStatusBadge } from '../quotations/QuotationStatusBadge';
import { SalesOrder } from '../../types/order';
import { orderService } from '../../services/OrderService';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { Invoice } from '../../types/invoice';
import { invoiceService } from '../../services/InvoiceService';
import { Payment } from '../../types/payment';
import { paymentService } from '../../services/PaymentService';
import { InvoiceStatusBadge } from '../invoices/InvoiceStatusBadge';
import { PaymentStatusBadge } from '../payments/PaymentStatusBadge';
import { WarrantyRecord, WarrantyClaim } from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { WarrantyStatusBadge, ClaimStatusBadge } from '../warranty/WarrantyStatusBadge';
import { calculatePendingWarrantyNotes } from '../../rules/warrantyRules';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AmountDisplay } from '../../components/common/AmountDisplay';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  ShieldCheck,
  Send,
  Calendar,
  CheckCircle,
  FileText,
  UserCheck,
  PlusCircle,
  Eye,
  CreditCard,
} from 'lucide-react';
import { whatsAppService } from '../../services/WhatsAppService';

export function CustomerHubView({ customer }: { customer: Customer }) {
  const navigate = useNavigate();
  const [customerQuotations, setCustomerQuotations] = useState<Quotation[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(true);
  const [customerOrders, setCustomerOrders] = useState<SalesOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [customerWarranties, setCustomerWarranties] = useState<WarrantyRecord[]>([]);
  const [warrantiesLoading, setWarrantiesLoading] = useState(true);
  const [customerClaims, setCustomerClaims] = useState<WarrantyClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [invoiceFilter, setInvoiceFilter] = useState<'ALL' | 'OVERDUE' | 'NEAR_DUE' | 'PENDING' | 'PAID'>('ALL');
  const isCreditOverdue = customer.financials.overdue > 0;

  useEffect(() => {
    async function loadQuotations() {
      try {
        setQuotationsLoading(true);
        const res = await quotationService.listQuotations({ customerId: customer.id });
        setCustomerQuotations(res.data);
      } catch (err) {
        console.error('Failed to load customer quotations', err);
      } finally {
        setQuotationsLoading(false);
      }
    }
    loadQuotations();
  }, [customer.id]);

  useEffect(() => {
    async function loadOrders() {
      try {
        setOrdersLoading(true);
        const res = await orderService.listOrders({ customerId: customer.id, pageSize: 50 });
        setCustomerOrders(res.data);
      } catch (err) {
        console.error('Failed to load customer orders', err);
      } finally {
        setOrdersLoading(false);
      }
    }
    loadOrders();
  }, [customer.id]);

  useEffect(() => {
    async function loadInvoices() {
      try {
        setInvoicesLoading(true);
        const res = await invoiceService.getInvoices({ customerId: customer.id, pageSize: 50 });
        setCustomerInvoices(res.data);
      } catch (err) {
        console.error('Failed to load customer invoices', err);
      } finally {
        setInvoicesLoading(false);
      }
    }
    loadInvoices();
  }, [customer.id]);

  useEffect(() => {
    async function loadPayments() {
      try {
        setPaymentsLoading(true);
        const res = await paymentService.getPayments({ customerId: customer.id, pageSize: 50 });
        setCustomerPayments(res.data);
      } catch (err) {
        console.error('Failed to load customer payments', err);
      } finally {
        setPaymentsLoading(false);
      }
    }
    loadPayments();
  }, [customer.id]);

  useEffect(() => {
    async function loadWarrantiesAndClaims() {
      try {
        setWarrantiesLoading(true);
        setClaimsLoading(true);
        const [warrs, clms] = await Promise.all([
          warrantyService.getWarrantiesByCustomerId(customer.id),
          warrantyService.getClaimsByCustomerId(customer.id),
        ]);
        setCustomerWarranties(warrs);
        setCustomerClaims(clms);
      } catch (err) {
        console.error('Failed to load customer warranty details', err);
      } finally {
        setWarrantiesLoading(false);
        setClaimsLoading(false);
      }
    }
    loadWarrantiesAndClaims();
  }, [customer.id]);

  const handleShareBalanceViaWhatsApp = () => {
    whatsAppService.shareDocument({
      phoneNumber: customer.phone,
      customerName: customer.contactPerson,
      documentType: 'INVOICE',
      documentNumber: 'ACC-STATEMENT',
      totalAmount: customer.financials.totalOutstanding,
      downloadUrl: `https://portal.dnserp.com/statement/${customer.code}`,
    });
  };

  const filteredInvoices = customerInvoices.filter((inv) => {
    if (invoiceFilter === 'ALL') return true;
    if (invoiceFilter === 'OVERDUE') return inv.status === 'OVERDUE';
    if (invoiceFilter === 'PAID') return inv.status === 'PAID';
    if (invoiceFilter === 'PENDING')
      return (
        inv.status === 'ISSUED' ||
        inv.status === 'PARTIALLY_PAID' ||
        inv.status === 'COLLECTED' ||
        inv.status === 'PARTIALLY_COLLECTED'
      );
    if (invoiceFilter === 'NEAR_DUE') {
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const due = new Date(inv.dueDate);
      return inv.balanceAmount > 0 && due >= now && due <= sevenDays;
    }
    return true;
  });

  const mockActivities = [
    {
      id: 'act-01',
      type: 'SHOP_VISIT',
      date: '2025-02-18',
      author: customer.assignedRepName,
      summary: 'Bi-weekly routine dealer stock inspection and re-order discussion.',
    },
    {
      id: 'act-02',
      type: 'PAYMENT_COLLECTION',
      date: '2025-02-12',
      author: customer.assignedRepName,
      summary: 'Collected security cheque for invoice INV-098 and issued thermal receipt.',
    },
    {
      id: 'act-03',
      type: 'WARRANTY_AUDIT',
      date: '2025-02-05',
      author: customer.assignedRepName,
      summary: 'Reconciled 14 pending warranty registrations from December sales batch.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Customer Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">{customer.code}</span>
            <Badge variant="outline">{customer.type}</Badge>
            {customer.loyaltyTier && <Badge variant="warning">{customer.loyaltyTier} Tier</Badge>}
            <Badge variant={customer.approvalStage === 'APPROVED' ? 'success' : 'warning'}>
              {customer.approvalStage}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">{customer.name}</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-slate-400" /> {customer.phone}
            </span>
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {customer.email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" /> {customer.address}
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <UserCheck className="h-3.5 w-3.5 text-primary" /> Rep: {customer.assignedRepName}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={customer.financials.totalOutstanding <= 0}
            onClick={() => {
              navigate(
                `/payments/new?customerId=${customer.id}&amount=${customer.financials.totalOutstanding}`
              );
            }}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            title={
              customer.financials.totalOutstanding <= 0
                ? 'No outstanding balance to settle'
                : `Settle full balance of ${formatCurrency(customer.financials.totalOutstanding)}`
            }
          >
            <CreditCard className="h-3.5 w-3.5" />
            Settle Full Balance ({formatCurrency(customer.financials.totalOutstanding)})
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleShareBalanceViaWhatsApp}
            className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <Send className="h-3.5 w-3.5" /> WhatsApp Statement
          </Button>
        </div>
      </div>

      {/* Credit & Outstanding Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Total Outstanding */}
        <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-medium text-slate-500 block truncate">
            Total Outstanding
          </span>
          <div className="mt-1 min-w-0">
            <AmountDisplay amount={customer.financials.totalOutstanding} className="text-slate-900 font-bold" />
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between flex-wrap gap-1">
            <span className="truncate">Limit: {formatCurrency(customer.commercialTerms.creditLimit)}</span>
            <span className="text-emerald-700 font-semibold truncate">
              Avail: {formatCurrency(Math.max(0, customer.commercialTerms.creditLimit - customer.financials.totalOutstanding))}
            </span>
          </div>
        </div>

        {/* Card 2: Current Due */}
        <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-medium text-emerald-800 block truncate">
            Current Due
          </span>
          <div className="mt-1 min-w-0">
            <AmountDisplay amount={customer.financials.currentDue} className="text-emerald-900 font-bold" />
          </div>
          <span className="text-xs text-emerald-700 block mt-1 truncate">{customer.commercialTerms.creditDays} Days Credit Policy</span>
        </div>

        {/* Card 3: Near Due (7 Days) */}
        <div className="col-span-1 p-3.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-medium text-amber-800 block truncate">
            Near Due (7 Days)
          </span>
          <div className="mt-1 min-w-0">
            <AmountDisplay amount={customer.financials.nearDue} className="text-amber-900 font-bold" />
          </div>
          <span className="text-xs text-amber-700 block mt-1 truncate">Follow-up due</span>
        </div>

        {/* Card 4: Overdue */}
        <div className="col-span-1 p-3.5 sm:p-4 rounded-xl border border-rose-200 bg-rose-50/50 shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-medium text-rose-800 block truncate">
            Overdue
          </span>
          <div className="mt-1 min-w-0">
            <AmountDisplay amount={customer.financials.overdue} className="text-rose-900 font-bold" />
          </div>
          <span className="text-xs text-rose-700 block mt-1 truncate">Immediate collection</span>
        </div>
      </div>

      {/* 360-Degree Master Hub Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <TabsTrigger value="overview">Overview & Terms</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({customerInvoices.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({customerOrders.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations ({customerQuotations.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({customerPayments.length})</TabsTrigger>
          <TabsTrigger value="warranty">Warranty ({customer.warrantyNotesExpected})</TabsTrigger>
          <TabsTrigger value="activity">Field Activity</TabsTrigger>
        </TabsList>

        {/* 1. Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Commercial Credit Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Credit Limit:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(customer.commercialTerms.creditLimit)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Allowed Credit Days:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{customer.commercialTerms.creditDays} Days</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Available Credit Balance:</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{formatCurrency(customer.financials.availableCredit)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Default Discount Privileges:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{customer.commercialTerms.defaultDiscountPercentage}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Maximum Discount Allowed:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{customer.commercialTerms.maxDiscountPercentage}%</span>
                </div>
                {customer.commercialTerms.paymentTermNotes && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-1">Commercial Notes:</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {customer.commercialTerms.paymentTermNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Account & Territory Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Operational Area:</span>
                  <span className="font-semibold text-slate-900">{customer.areaName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Assigned Sales Representative:</span>
                  <span className="font-semibold text-slate-900">{customer.assignedRepName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Contact Person:</span>
                  <span className="font-semibold text-slate-900">{customer.contactPerson}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Registered Shop Phone:</span>
                  <span className="font-semibold text-slate-900">{customer.phone}</span>
                </div>
                {customer.businessRegistrationNumber && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Business Reg Number:</span>
                    <span className="font-mono text-slate-900">{customer.businessRegistrationNumber}</span>
                  </div>
                )}
                {customer.taxNumber && (
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Tax / VAT Number:</span>
                    <span className="font-mono text-slate-900">{customer.taxNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold">Account Invoices & Outstanding Ledger</CardTitle>
              <div className="flex items-center gap-1.5 text-xs">
                {(['ALL', 'OVERDUE', 'NEAR_DUE', 'PENDING', 'PAID'] as const).map((filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={invoiceFilter === filter ? 'default' : 'outline'}
                    onClick={() => setInvoiceFilter(filter)}
                    className="text-xs h-7 px-2.5 font-medium"
                  >
                    {filter.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading customer invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="py-8 text-center border rounded-lg border-dashed border-slate-200">
                  <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No invoices found for this filter criteria.</p>
                </div>
              ) : (
                <>
                  {/* Mobile Invoice Cards */}
                  <div className="block md:hidden space-y-3">
                    {filteredInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 cursor-pointer active:scale-[0.99] transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {inv.invoiceNumber}
                          </span>
                          <InvoiceStatusBadge status={inv.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Due Date</span>
                            <span className={`font-medium ${inv.status === 'OVERDUE' ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                              {formatDate(inv.dueDate)}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1">Total</span>
                            <span className="font-mono text-slate-700 tabular-nums">
                              {formatCurrency(inv.totalAmount)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Balance Due</span>
                            <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                              {formatCurrency(inv.balanceAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400">
                            Issued: {formatDate(inv.issueDate)}
                          </span>
                          {inv.balanceAmount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/payments/new?customerId=${customer.id}&invoiceId=${inv.id}`);
                              }}
                              className="text-xs h-8 px-3 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 font-semibold rounded-xl"
                            >
                              Pay Invoice
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Full Table */}
                  <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Issue Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Total (LKR)</TableHead>
                          <TableHead className="text-right">Balance Due (LKR)</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((inv) => (
                          <TableRow
                            key={inv.id}
                            className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                          >
                            <TableCell className="font-mono text-[13px] font-medium text-primary tabular-nums">
                              <span className="hover:underline">
                                {inv.invoiceNumber}
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-slate-600">{formatDate(inv.issueDate)}</TableCell>
                            <TableCell className="text-[13px] text-slate-600">
                              <span className={inv.status === 'OVERDUE' ? 'text-rose-600 font-semibold' : ''}>
                                {formatDate(inv.dueDate)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-[13px] text-slate-700 tabular-nums">
                              {formatCurrency(inv.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[13px] font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(inv.balanceAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <InvoiceStatusBadge status={inv.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              {inv.balanceAmount > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/payments/new?customerId=${customer.id}&invoiceId=${inv.id}`);
                                  }}
                                  className="text-xs h-7 px-2 text-emerald-600 hover:text-emerald-800 border-emerald-300 font-medium"
                                  title="Pay Invoice"
                                >
                                  Pay
                                </Button>
                              )}
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
        </TabsContent>

        {/* 3. Sales Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Sales Order History</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official sales orders placed for {customer.name}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs h-8 gap-1.5 font-medium"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                New Sales Order
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading customer orders...</div>
              ) : customerOrders.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">No sales orders found for this customer.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
                    className="text-xs font-medium"
                  >
                    Create First Sales Order
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile Order Cards */}
                  <div className="block md:hidden space-y-3">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => navigate(`/orders/${ord.id}`)}
                        className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2 cursor-pointer active:scale-[0.99] transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {ord.orderNumber}
                          </span>
                          <OrderStatusBadge status={ord.status} isSpecialApproval={ord.isSpecialApproval} />
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-500">{formatDate(ord.createdAt)} • {ord.items.length} Items</span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatCurrency(ord.totalAmount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Full Table */}
                  <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-center">Items</TableHead>
                          <TableHead className="text-right">Order Amount</TableHead>
                          <TableHead className="text-center">Status / Approval</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerOrders.map((ord) => (
                          <TableRow
                            key={ord.id}
                            className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            onClick={() => navigate(`/orders/${ord.id}`)}
                          >
                            <TableCell className="font-mono text-[13px] font-medium text-primary tabular-nums">
                              <span className="hover:underline">
                                {ord.orderNumber}
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-slate-600">{formatDate(ord.createdAt)}</TableCell>
                            <TableCell className="text-center text-[13px] text-slate-600">{ord.items.length} Items</TableCell>
                            <TableCell className="text-right font-mono text-[13px] font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(ord.totalAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <OrderStatusBadge status={ord.status} isSpecialApproval={ord.isSpecialApproval} />
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
        </TabsContent>

        {/* 4. Quotations Tab */}
        <TabsContent value="quotations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Quotation Pipeline</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official quotations issued for {customer.name}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/quotations/new?customerId=${customer.id}`)}
                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs h-8 gap-1.5 font-medium"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                New Quotation
              </Button>
            </CardHeader>
            <CardContent>
              {quotationsLoading ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading quotations...</div>
              ) : customerQuotations.length === 0 ? (
                <div className="p-8 text-center border rounded-lg border-dashed border-slate-200">
                  <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No quotations issued for this customer yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/quotations/new?customerId=${customer.id}`)}
                    className="mt-3 text-xs font-medium"
                  >
                    Create First Quotation
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile Quotation Cards */}
                  <div className="block md:hidden space-y-3">
                    {customerQuotations.map((qt) => (
                      <div
                        key={qt.id}
                        onClick={() => navigate(`/quotations/${qt.id}`)}
                        className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2 cursor-pointer active:scale-[0.99] transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {qt.quotationNumber}
                          </span>
                          <QuotationStatusBadge status={qt.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-500">{formatDate(qt.createdAt)} • {qt.items.length} Items</span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatCurrency(qt.totalAmount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Full Table */}
                  <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quotation #</TableHead>
                          <TableHead>Date Issued</TableHead>
                          <TableHead>Validity</TableHead>
                          <TableHead className="text-center">Items</TableHead>
                          <TableHead className="text-right">Discount</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerQuotations.map((qt) => (
                          <TableRow
                            key={qt.id}
                            className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            onClick={() => navigate(`/quotations/${qt.id}`)}
                          >
                            <TableCell className="font-mono text-[13px] font-medium text-primary tabular-nums">
                              <span className="hover:underline">
                                {qt.quotationNumber}
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-slate-600">{formatDate(qt.createdAt)}</TableCell>
                            <TableCell className="text-[13px] text-slate-600">{qt.validUntil}</TableCell>
                            <TableCell className="text-center text-[13px] text-slate-700">{qt.items.length} items</TableCell>
                            <TableCell className="text-right font-mono text-[13px] text-emerald-600 tabular-nums">
                              {qt.discountAmount > 0 ? formatCurrency(qt.discountAmount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[13px] font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(qt.totalAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <QuotationStatusBadge status={qt.status} />
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
        </TabsContent>

        {/* 5. Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Payment Collections Ledger</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official collection receipts issued for {customer.name}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/payments/new?customerId=${customer.id}`)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-medium"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading payment collections...</div>
              ) : customerPayments.length === 0 ? (
                <div className="py-8 text-center border rounded-lg border-dashed border-slate-200">
                  <CreditCard className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No payments recorded for this customer yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/payments/new?customerId=${customer.id}`)}
                    className="mt-3 text-xs font-medium"
                  >
                    Record First Payment
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile Payment Cards */}
                  <div className="block md:hidden space-y-3">
                    {customerPayments.map((pay) => (
                      <div
                        key={pay.id}
                        onClick={() => navigate(`/payments/${pay.id}`)}
                        className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2 cursor-pointer active:scale-[0.99] transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {pay.receiptNumber}
                          </span>
                          <PaymentStatusBadge status={pay.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-500">
                            {formatDate(pay.collectedAt)} • {pay.paymentMethod}
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatCurrency(pay.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Full Table */}
                  <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Receipt #</TableHead>
                          <TableHead>Collected Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Collected Amount</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerPayments.map((pay) => (
                          <TableRow
                            key={pay.id}
                            className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                            onClick={() => navigate(`/payments/${pay.id}`)}
                          >
                            <TableCell className="font-mono text-[13px] font-medium text-slate-900 tabular-nums">
                              <span className="text-primary hover:underline font-mono">
                                {pay.receiptNumber}
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-slate-600">{formatDate(pay.collectedAt)}</TableCell>
                            <TableCell className="text-[13px] text-slate-600">
                              {pay.paymentMethod} {pay.chequeNumber && `(${pay.chequeNumber})`}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[13px] font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(pay.amount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <PaymentStatusBadge status={pay.status} />
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
        </TabsContent>

        {/* 6. Warranty Tab */}
        <TabsContent value="warranty" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Dealer Warranty Card Reconciliation
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Physical warranty note registration status for equipment sold through {customer.name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/warranty')}
                className="text-xs h-8 gap-1.5 font-medium"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Warranty Hub
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-xs font-medium">
                    Products Sold by Shop
                  </span>
                  <span className="text-xl font-semibold text-slate-900 tabular-nums">
                    {customer.warrantyNotesExpected} Units
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-xs font-medium">
                    Warranty Notes Received
                  </span>
                  <span className="text-xl font-semibold text-emerald-700 tabular-nums">
                    {customer.warrantyNotesReceived} Notes
                  </span>
                </div>
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200">
                  <span className="text-amber-800 block text-xs font-medium">
                    Missing Pending Notes
                  </span>
                  <span className="text-xl font-semibold text-amber-900 tabular-nums">
                    {calculatePendingWarrantyNotes(
                      customer.warrantyNotesExpected,
                      customer.warrantyNotesReceived
                    )}{' '}
                    Pending Notes
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Registered Warranties */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Registered Warranties ({customerWarranties.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {warrantiesLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading warranties...</div>
              ) : customerWarranties.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No registered warranty records found for this customer.
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product / SKU</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Sale Type</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerWarranties.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-semibold text-slate-900 text-[13px]">
                            {w.productName}
                            <span className="block text-xs text-slate-400 font-normal">
                              {w.sku}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-[13px] text-slate-600 tabular-nums">
                            {w.serialNumber || 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-[13px] text-primary tabular-nums">
                            {w.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={w.saleType === 'SHOWROOM' ? 'info' : 'secondary'}
                            >
                              {w.saleType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[13px] text-slate-700">
                            {formatDate(w.warrantyExpiryDate)}
                          </TableCell>
                          <TableCell className="text-center">
                            <WarrantyStatusBadge status={w.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Filed Claims */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">
                Filed Claims History ({customerClaims.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {claimsLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading claims...</div>
              ) : customerClaims.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No warranty claims filed by this customer.
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Claim #</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Complaint Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Resolution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerClaims.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-[13px] font-semibold text-slate-900 tabular-nums">
                            {c.claimNumber}
                          </TableCell>
                          <TableCell className="text-[13px] text-slate-800">
                            {c.productName}
                          </TableCell>
                          <TableCell className="text-[13px] text-slate-600">
                            {formatDate(c.complaintDate)}
                          </TableCell>
                          <TableCell className="text-[13px] text-slate-600 max-w-[200px] truncate" title={c.complaintReason}>
                            {c.complaintReason}
                          </TableCell>
                          <TableCell className="text-center">
                            <ClaimStatusBadge status={c.status} />
                          </TableCell>
                          <TableCell className="text-[13px] text-slate-600">
                            {c.resolutionType ? (
                              <span className="font-semibold text-slate-800">{c.resolutionType}</span>
                            ) : (
                              'Pending'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Field Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Field Representative Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-start gap-3"
                  >
                    <div className="p-2 rounded-md bg-primary-light text-primary mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{act.type.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400">{formatDate(act.date)}</span>
                      </div>
                      <p className="text-slate-600">{act.summary}</p>
                      <div className="text-xs text-slate-500 font-medium">Recorded by {act.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
