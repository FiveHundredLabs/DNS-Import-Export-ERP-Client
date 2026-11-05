import React, { useState } from 'react';
import { User } from '../../../types/auth';
import { Payment } from '../../../types/payment';
import { CashHandover } from '../../../types/handover';
import { Invoice } from '../../../types/invoice';
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
  DrawerFooter,
} from '../../../components/ui/drawer';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import { evaluate24hHandoverStatus } from '../../../rules/paymentRules';
import { cn } from '../../../utils/cn';
import {
  Banknote,
  Clock,
  AlertCircle,
  ShieldCheck,
  Send,
  Receipt,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Search,
  X,
  CreditCard,
  Building,
} from 'lucide-react';

export interface SalesRepCashDetailModalProps {
  rep: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: Payment[];
  handovers: CashHandover[];
  invoices: Invoice[];
  initialTab?: 'CASH_IN_HAND' | 'HANDOVERS' | 'HISTORY';
  onInspectHandover?: (handover: CashHandover) => void;
}

export function SalesRepCashDetailModal({
  rep,
  open,
  onOpenChange,
  payments,
  handovers,
  invoices,
  initialTab = 'CASH_IN_HAND',
  onInspectHandover,
}: SalesRepCashDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'CASH_IN_HAND' | 'HANDOVERS' | 'HISTORY'>(initialTab);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState<'ALL' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('ALL');

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, rep?.id]);

  if (!rep) return null;

  // Filter payments belonging to this rep
  const repPayments = payments.filter((p) => p.salesRepId === rep.id);
  const repHandovers = handovers.filter((h) => h.salesRepId === rep.id);

  // Cash payments currently in hand (not handed over, not yet approved/cleared)
  const cashInHandPayments = repPayments.filter((p) => {
    if (p.paymentMethod !== 'CASH') return false;
    const h24 = evaluate24hHandoverStatus(p);
    return h24.handoverStatus === 'PENDING_HANDOVER' && p.status !== 'APPROVED';
  });

  const totalCashInHand = cashInHandPayments.reduce((sum, p) => sum + p.amount, 0);

  // Overdue >24h collections
  const overdueCashPayments = cashInHandPayments.filter((p) => {
    const h24 = evaluate24hHandoverStatus(p);
    return h24.isOverdue;
  });

  // Pending handovers submitted to finance
  const pendingHandovers = repHandovers.filter((h) => h.status === 'PENDING_APPROVAL');
  const totalPendingHandoverAmount = pendingHandovers.reduce((sum, h) => sum + h.totalAmount, 0);

  // Approved collections
  const approvedPayments = repPayments.filter((p) => p.status === 'APPROVED');
  const totalApprovedAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Helper to get invoice remaining balance
  const getInvoiceDetails = (invoiceNumber: string) => {
    return invoices.find((inv) => inv.invoiceNumber === invoiceNumber || inv.id === invoiceNumber);
  };

  // Filtered complete history
  const filteredHistory = repPayments.filter((p) => {
    if (historyMethodFilter !== 'ALL' && p.paymentMethod !== historyMethodFilter) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const matchReceipt = p.receiptNumber.toLowerCase().includes(q);
      const matchCustomer = p.customerName.toLowerCase().includes(q);
      const matchInv = p.invoiceAllocations.some((a) => a.invoiceNumber.toLowerCase().includes(q));
      if (!matchReceipt && !matchCustomer && !matchInv) return false;
    }
    return true;
  });

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      width="3xl"
      className="p-0 flex flex-col bg-slate-50 shadow-2xl"
    >
      {/* 1. Header Profile Surface */}
      <DrawerHeader className="p-6 bg-white border-b border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              {rep.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DrawerTitle className="text-xl font-bold text-slate-900 tracking-tight">
                  {rep.name}
                </DrawerTitle>
                <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs font-semibold">
                  Sales Representative
                </Badge>
                {overdueCashPayments.length > 0 ? (
                  <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-bold animate-pulse gap-1">
                    <AlertCircle className="h-3 w-3" /> {overdueCashPayments.length} Overdue (&gt;24h)
                  </Badge>
                ) : totalCashInHand > 0 ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10.5px] gap-1">
                    <Clock className="h-3 w-3" /> Cash in Hand Active
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10.5px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Fully Cleared
                  </Badge>
                )}
              </div>
              <DrawerDescription className="flex flex-wrap items-center gap-3.5 text-xs text-slate-500 font-medium mt-1">
                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> {rep.areaName || 'Colombo Territory'}
                </span>
                {rep.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {rep.phone}
                  </span>
                )}
                {rep.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {rep.email}
                  </span>
                )}
                <span>· {rep.assignedCustomersCount || 14} Assigned Dealers</span>
              </DrawerDescription>
            </div>
          </div>

          <div className="bg-amber-50/90 border border-amber-200/90 px-4 py-2.5 rounded-2xl text-left sm:text-right shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-amber-800 font-bold block">
              Current Cash Balance
            </span>
            <span className="text-xl sm:text-2xl font-mono font-black text-amber-900 leading-tight">
              {formatCurrency(totalCashInHand)}
            </span>
          </div>
        </div>

        {/* 4 Modern Stat Metric Cards (Spacious, Clear, Non-Truncated) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Current Cash in Hand
            </span>
            <span className="text-base sm:text-lg font-extrabold text-amber-900 font-mono mt-1 block">
              {formatCurrency(totalCashInHand)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
              {cashInHandPayments.length} receipts held
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Pending Handover
            </span>
            <span className="text-base sm:text-lg font-extrabold text-sky-900 font-mono mt-1 block">
              {formatCurrency(totalPendingHandoverAmount)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
              {pendingHandovers.length} batch awaiting Finance
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Approved by Finance
            </span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-800 font-mono mt-1 block">
              {formatCurrency(totalApprovedAmount)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
              {approvedPayments.length} receipts banked
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
              24h Policy Compliance
            </span>
            <span className={cn(
              "text-sm font-bold mt-1.5 block",
              overdueCashPayments.length > 0 ? "text-rose-600" : "text-emerald-700"
            )}>
              {overdueCashPayments.length > 0 ? `${overdueCashPayments.length} Overdue (>24h)` : '100% Policy Compliant'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
              Handover deadline
            </span>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto [scrollbar-width:thin]">
          <button
            type="button"
            onClick={() => setActiveTab('CASH_IN_HAND')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'CASH_IN_HAND'
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Banknote className="h-4 w-4 text-amber-700" />
            <span>Cash in Hand &amp; Invoices Breakdown ({cashInHandPayments.length})</span>
            {overdueCashPayments.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {overdueCashPayments.length} Overdue
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HANDOVERS')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'HANDOVERS'
                ? "bg-primary/10 text-primary border border-primary/30 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Send className="h-4 w-4 text-primary" />
            <span>Previous Cash Handovers ({repHandovers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer",
              activeTab === 'HISTORY'
                ? "bg-primary/10 text-primary border border-primary/30 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Receipt className="h-4 w-4 text-primary" />
            <span>All Collections Ledger ({repPayments.length})</span>
          </button>
        </div>
      </DrawerHeader>

      {/* 2. Content Body Area */}
      <DrawerContent className="p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50">
        {/* TAB 1: CASH IN HAND & INVOICE BREAKDOWN */}
        {activeTab === 'CASH_IN_HAND' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Cash Currently Held in Hand:</strong> These are verified cash receipts collected by {rep.name} that have not yet been handed over to the Finance Department.
                </span>
              </div>
              <div className="font-mono font-extrabold text-sm text-amber-900">
                Total in Hand: {formatCurrency(totalCashInHand)}
              </div>
            </div>

            {cashInHandPayments.length === 0 ? (
              <div className="text-center py-14 border-2 border-dashed border-slate-200 rounded-3xl bg-white shadow-2xs">
                <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-slate-800">No Cash Held in Hand</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {rep.name} has zero un-handed cash. All collected payments have been submitted in handover batches or cleared by Finance.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cashInHandPayments.map((payment) => {
                  const h24 = evaluate24hHandoverStatus(payment);
                  return (
                    <div
                      key={payment.id}
                      className={cn(
                        "rounded-2xl p-5 transition-all bg-white shadow-xs border",
                        h24.isOverdue
                          ? "border-rose-300 ring-1 ring-rose-200"
                          : "border-slate-200/90 hover:border-slate-300"
                      )}
                    >
                      {/* Receipt Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200">
                            {payment.receiptNumber}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {payment.customerName}
                          </span>
                          {payment.customerCode && (
                            <span className="text-xs text-slate-500 font-mono">
                              ({payment.customerCode})
                            </span>
                          )}
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                            Cash in Hand
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block">
                              Receipt Amount
                            </span>
                            <span className="font-mono font-extrabold text-base text-slate-900">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                          {h24.isOverdue ? (
                            <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse gap-1 shrink-0">
                              <AlertCircle className="h-3 w-3" /> Overdue &gt;24h
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold gap-1 shrink-0">
                              <Clock className="h-3 w-3" /> Due &lt;24h
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Timing and Collection Info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 py-2.5 border-b border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Collected on: <strong className="text-slate-700">{formatDateTime(payment.collectedAt)}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Policy Timer: <strong className={h24.isOverdue ? "text-rose-600 font-bold" : "text-amber-800 font-bold"}>{h24.label}</strong>
                        </span>
                        {payment.notes && (
                          <span className="italic text-slate-500 truncate max-w-md">
                            "{payment.notes}"
                          </span>
                        )}
                      </div>

                      {/* Target Invoices Allocation Breakdown */}
                      <div className="pt-3.5">
                        <div className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-primary" />
                            Target Invoices Collected Against ({payment.invoiceAllocations?.length || 0})
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Funds mapped directly to customer ledger
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-[10.5px] uppercase font-bold text-slate-600 border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3.5 font-bold">Invoice #</th>
                                <th className="py-2.5 px-3.5 font-bold">Customer</th>
                                <th className="py-2.5 px-3.5 text-right font-bold">Invoice Total</th>
                                <th className="py-2.5 px-3.5 text-right font-bold">Collected on Receipt</th>
                                <th className="py-2.5 px-3.5 text-right font-bold">Remaining Balance</th>
                                <th className="py-2.5 px-3.5 text-center font-bold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {payment.invoiceAllocations && payment.invoiceAllocations.length > 0 ? (
                                payment.invoiceAllocations.map((alloc, idx) => {
                                  const inv = getInvoiceDetails(alloc.invoiceNumber);
                                  const invTotal = inv?.totalAmount ?? (alloc.allocatedAmount * 1.25);
                                  const remainingBalance = inv?.balanceAmount ?? Math.max(0, invTotal - alloc.allocatedAmount);

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2.5 px-3.5 font-mono font-bold text-primary">
                                        {alloc.invoiceNumber}
                                      </td>
                                      <td className="py-2.5 px-3.5 text-slate-700">
                                        {payment.customerName}
                                      </td>
                                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">
                                        {formatCurrency(invTotal)}
                                      </td>
                                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50">
                                        +{formatCurrency(alloc.allocatedAmount)}
                                      </td>
                                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                                        {formatCurrency(remainingBalance)}
                                      </td>
                                      <td className="py-2.5 px-3.5 text-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                          {inv?.status || 'PARTIALLY_PAID'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={6} className="py-3 px-3.5 text-center text-slate-400 italic">
                                    Direct customer advance payment (Unallocated)
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PREVIOUS CASH HANDOVERS */}
        {activeTab === 'HANDOVERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-slate-200 p-3.5 rounded-2xl text-xs text-slate-700 shadow-2xs">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Handover Batches Ledger:</strong> All previous formal cash handover submissions generated by {rep.name} for transfer to Finance Officers.
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono font-bold">
                {repHandovers.length} Total Batches
              </div>
            </div>

            {repHandovers.length === 0 ? (
              <div className="text-center py-14 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
                <Receipt className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No Handover Records Found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  This Sales Representative has not created any cash handovers yet.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <Table className="min-w-[850px]">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="text-[11px] font-bold text-slate-600">
                        <TableHead className="w-36">Handover #</TableHead>
                        <TableHead>Submitted Date</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Recipient Finance Person</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Verification Details</TableHead>
                        <TableHead className="text-center">Receipts / Invoices</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs divide-y divide-slate-100">
                      {repHandovers.map((handover) => (
                        <TableRow key={handover.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="font-mono font-bold text-slate-900">
                            {handover.handoverNumber}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <div>{formatDate(handover.submittedAt)}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(handover.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-900">
                            {formatCurrency(handover.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-800">{handover.recipientName || 'Nimal Perera'}</div>
                            <div className="text-[10px] text-slate-400">Finance Department</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {handover.status === 'APPROVED' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                Approved &amp; Banked
                              </Badge>
                            ) : handover.status === 'REJECTED' ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                                Handover Discrepancy
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                                Pending Approval
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {handover.verifiedAt ? (
                              <div className="text-slate-600">
                                <div>Verified: {formatDate(handover.verifiedAt)}</div>
                                <div className="text-[10px] text-slate-400 font-mono">By {handover.verifiedByName || 'Finance'}</div>
                              </div>
                            ) : (
                              <span className="italic text-slate-400 text-[11px]">Awaiting physical sign-off</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700">
                              {(handover.paymentIds?.length ?? (handover as any).receiptCount ?? 1)} receipts
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {onInspectHandover && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onInspectHandover(handover)}
                                className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1 border-slate-200 hover:bg-slate-100 cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="h-3 w-3 text-slate-400" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALL COLLECTIONS LEDGER */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search receipt #, customer name, or invoice #..."
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'CASH', 'CHEQUE', 'BANK_TRANSFER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setHistoryMethodFilter(method)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      historyMethodFilter === method
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {method === 'ALL' ? 'All Methods' : method}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <Table className="min-w-[850px]">
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="text-[11px] font-bold text-slate-600">
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Target Invoices</TableHead>
                      <TableHead className="text-center">Handover Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y divide-slate-100">
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-slate-400 italic">
                          No collection receipts match the filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((p) => {
                        const h24 = evaluate24hHandoverStatus(p);
                        return (
                          <TableRow key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <TableCell className="font-mono font-bold text-primary">
                              {p.receiptNumber}
                            </TableCell>
                            <TableCell className="text-slate-600">
                              <div>{formatDate(p.collectedAt)}</div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(p.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-slate-900">{p.customerName}</div>
                              {p.customerCode && (
                                <div className="text-[10px] font-mono text-slate-400">{p.customerCode}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-[11px] font-semibold text-slate-700">
                                {p.paymentMethod}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-slate-900">
                              {formatCurrency(p.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {p.invoiceAllocations?.map((alloc, idx) => (
                                  <span key={idx} className="font-mono text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                                    {alloc.invoiceNumber}: {formatCurrency(alloc.allocatedAmount)}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {p.status === 'APPROVED' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                  Finance Cleared
                                </Badge>
                              ) : p.handoverStatus === 'HANDED_OVER' ? (
                                <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] font-bold">
                                  Handed Over
                                </Badge>
                              ) : h24.isOverdue ? (
                                <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                                  Overdue &gt;24h
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                                  In Rep Hand
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>

      {/* 3. Drawer Footer */}
      <DrawerFooter className="p-4 px-6 bg-white border-t border-slate-200/90 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Rep ID: <strong className="font-mono text-slate-700">{rep.id}</strong></span>
          <span>·</span>
          <span>Territory: <strong className="text-slate-700">{rep.areaName || 'Main Territory'}</strong></span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="h-9 px-4 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border-slate-200 shadow-2xs cursor-pointer"
        >
          Close
        </Button>
      </DrawerFooter>
    </Drawer>
  );
}
