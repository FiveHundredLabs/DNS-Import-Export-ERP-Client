import React, { useState } from 'react';
import { User } from '../../../types/auth';
import { Payment } from '../../../types/payment';
import { CashHandover } from '../../../types/handover';
import { Invoice } from '../../../types/invoice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-slate-200 shadow-2xl rounded-2xl">
        {/* Header Profile Bar */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-t-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-900 font-extrabold text-lg flex items-center justify-center shadow-md">
                {rep.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{rep.name}</h2>
                  <Badge variant="outline" className="border-amber-400/40 text-amber-300 bg-amber-500/10 text-[11px] font-semibold">
                    Sales Representative
                  </Badge>
                  {overdueCashPayments.length > 0 ? (
                    <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold animate-pulse gap-1">
                      <AlertCircle className="h-3 w-3" /> {overdueCashPayments.length} Overdue (&gt;24h)
                    </Badge>
                  ) : totalCashInHand > 0 ? (
                    <Badge className="bg-amber-500 text-slate-900 font-bold text-[10px] gap-1">
                      <Clock className="h-3 w-3" /> Cash in Hand Active
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Fully Cleared
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" /> {rep.areaName || 'Colombo Territory'}
                  </span>
                  {rep.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {rep.phone}
                    </span>
                  )}
                  {rep.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {rep.email}
                    </span>
                  )}
                  <span>· {rep.assignedCustomersCount || 14} Assigned Dealers</span>
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2.5 rounded-xl text-right sm:self-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Current Cash Balance</span>
              <span className="text-xl font-mono font-extrabold text-amber-400">
                {formatCurrency(totalCashInHand)}
              </span>
            </div>
          </div>

          {/* 4 Summary Stat Mini-Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-800">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Current Cash in Hand</span>
              <span className="text-base font-extrabold text-amber-300 font-mono mt-0.5 block truncate">
                {formatCurrency(totalCashInHand)}
              </span>
              <span className="text-[10px] text-slate-400">{cashInHandPayments.length} receipts held</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Pending Handover</span>
              <span className="text-base font-extrabold text-sky-300 font-mono mt-0.5 block truncate">
                {formatCurrency(totalPendingHandoverAmount)}
              </span>
              <span className="text-[10px] text-slate-400">{pendingHandovers.length} batch awaiting Finance</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Approved by Finance</span>
              <span className="text-base font-extrabold text-emerald-300 font-mono mt-0.5 block truncate">
                {formatCurrency(totalApprovedAmount)}
              </span>
              <span className="text-[10px] text-slate-400">{approvedPayments.length} receipts banked</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">24h Compliance</span>
              <span className={cn(
                "text-xs font-bold mt-1 block",
                overdueCashPayments.length > 0 ? "text-rose-400" : "text-emerald-400"
              )}>
                {overdueCashPayments.length > 0 ? `${overdueCashPayments.length} Overdue >24h` : '100% Policy Compliant'}
              </span>
              <span className="text-[10px] text-slate-400">Handover deadline</span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('CASH_IN_HAND')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all -mb-px",
                activeTab === 'CASH_IN_HAND'
                  ? "border-amber-600 text-amber-700 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <Banknote className="h-4 w-4" />
              <span>Cash in Hand &amp; Invoices Breakdown ({cashInHandPayments.length})</span>
              {overdueCashPayments.length > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {overdueCashPayments.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HANDOVERS')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all -mb-px",
                activeTab === 'HANDOVERS'
                  ? "border-primary text-primary bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <Send className="h-4 w-4" />
              <span>Previous Cash Handovers ({repHandovers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all -mb-px",
                activeTab === 'HISTORY'
                  ? "border-primary text-primary bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              <Receipt className="h-4 w-4" />
              <span>All Collections Ledger ({repPayments.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Tab Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* TAB 1: CASH IN HAND & INVOICE BREAKDOWN */}
          {activeTab === 'CASH_IN_HAND' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap bg-amber-50/80 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Cash Currently Held in Hand:</strong> These are verified cash receipts collected by {rep.name} that have not yet been handed over to the Finance Department.
                  </span>
                </div>
                <div className="font-mono font-bold text-sm text-amber-800">
                  Total in Hand: {formatCurrency(totalCashInHand)}
                </div>
              </div>

              {cashInHandPayments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No Cash Held in Hand</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {rep.name} has zero un-handed cash. All collected payments have been submitted in handover batches or cleared by Finance.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {cashInHandPayments.map((payment) => {
                    const h24 = evaluate24hHandoverStatus(payment);
                    return (
                      <div
                        key={payment.id}
                        className={cn(
                          "border rounded-xl p-4 transition-all bg-white shadow-xs",
                          h24.isOverdue
                            ? "border-rose-300 bg-rose-50/30 ring-1 ring-rose-200"
                            : "border-slate-200/90 hover:border-slate-300"
                        )}
                      >
                        {/* Receipt Top Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                              {payment.receiptNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {payment.customerName}
                            </span>
                            {payment.customerCode && (
                              <span className="text-[11px] text-slate-500 font-mono">
                                ({payment.customerCode})
                              </span>
                            )}
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                              Cash in Hand
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block">Receipt Amount</span>
                              <span className="font-mono font-extrabold text-sm text-slate-900">
                                {formatCurrency(payment.amount)}
                              </span>
                            </div>
                            {h24.isOverdue ? (
                              <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse gap-1 shrink-0">
                                <AlertCircle className="h-3 w-3" /> Overdue &gt;24h
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-slate-900 text-[10px] font-bold gap-1 shrink-0">
                                <Clock className="h-3 w-3" /> Due &lt;24h
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Timing and Collection Info */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 py-2 border-b border-slate-100">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            Collected on: <strong className="text-slate-700">{formatDateTime(payment.collectedAt)}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Policy Timer: <strong className={h24.isOverdue ? "text-rose-600" : "text-amber-700"}>{h24.label}</strong>
                          </span>
                          {payment.notes && (
                            <span className="italic text-slate-500 truncate max-w-md">
                              "{payment.notes}"
                            </span>
                          )}
                        </div>

                        {/* Invoice Allocations Table */}
                        <div className="pt-3">
                          <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              Target Invoices Collected Against ({payment.invoiceAllocations?.length || 0})
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              Funds mapped directly to debtor accounts
                            </span>
                          </div>

                          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-slate-50/60">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-3">Invoice #</th>
                                  <th className="py-2 px-3">Customer</th>
                                  <th className="py-2 px-3 text-right">Invoice Total</th>
                                  <th className="py-2 px-3 text-right">Collected on Receipt</th>
                                  <th className="py-2 px-3 text-right">Remaining Balance</th>
                                  <th className="py-2 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/80">
                                {payment.invoiceAllocations && payment.invoiceAllocations.length > 0 ? (
                                  payment.invoiceAllocations.map((alloc, idx) => {
                                    const inv = getInvoiceDetails(alloc.invoiceNumber);
                                    const invTotal = inv?.totalAmount ?? (alloc.allocatedAmount * 1.25);
                                    const remainingBalance = inv?.balanceAmount ?? Math.max(0, invTotal - alloc.allocatedAmount);

                                    return (
                                      <tr key={idx} className="hover:bg-white/80 transition-colors">
                                        <td className="py-2 px-3 font-mono font-bold text-primary">
                                          {alloc.invoiceNumber}
                                        </td>
                                        <td className="py-2 px-3 text-slate-700">
                                          {payment.customerName}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                                          {formatCurrency(invTotal)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                                          +{formatCurrency(alloc.allocatedAmount)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                          {formatCurrency(remainingBalance)}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                            {inv?.status || 'PARTIALLY_PAID'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={6} className="py-2 px-3 text-center text-slate-400 italic">
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
              <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong>Handover Batches Ledger:</strong> All previous formal cash handover submissions generated by {rep.name} for transfer to Finance Officers.
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {repHandovers.length} Total Handover Batches
                </div>
              </div>

              {repHandovers.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Receipt className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800">No Handover Records Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    This Sales Representative has not created any cash handovers yet.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto [scrollbar-width:thin]">
                    <Table className="min-w-[850px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow className="text-[11px] font-bold text-slate-600">
                        <TableHead className="w-32">Handover #</TableHead>
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
                        <TableRow key={handover.id} className="hover:bg-slate-50/70">
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
                            <div className="font-semibold text-slate-800">{handover.recipientUserName}</div>
                            <div className="text-[10px] text-slate-400">{handover.recipientUserRole}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {handover.status === 'APPROVED' && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                Approved &amp; Banked
                              </Badge>
                            )}
                            {handover.status === 'PENDING_APPROVAL' && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                                Pending Finance
                              </Badge>
                            )}
                            {handover.status === 'REJECTED' && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                                Discrepancy / Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {handover.status === 'APPROVED' && (
                              <div className="text-[11px] text-emerald-800">
                                <div>Verified by: <strong>{handover.approvedByName || handover.recipientUserName}</strong></div>
                                {handover.approvalComment && (
                                  <div className="italic text-slate-500 truncate max-w-xs text-[10px]">
                                    "{handover.approvalComment}"
                                  </div>
                                )}
                              </div>
                            )}
                            {handover.status === 'REJECTED' && (
                              <div className="text-[11px] text-rose-800">
                                <strong>Discrepancy:</strong> {handover.rejectionReason}
                              </div>
                            )}
                            {handover.status === 'PENDING_APPROVAL' && (
                              <div className="text-[11px] text-slate-500 italic">
                                Physical cash counting in progress
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              {handover.items?.length || handover.customerCount || 1} receipts · {handover.invoiceCount || 1} inv
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {onInspectHandover && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onInspectHandover(handover)}
                                className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg"
                              >
                                View Items <ChevronRight className="h-3 w-3" />
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

          {/* TAB 3: COMPLETE COLLECTION HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search receipt #, customer, invoice..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['ALL', 'CASH', 'CHEQUE', 'BANK_TRANSFER'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setHistoryMethodFilter(method)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all",
                        historyMethodFilter === method
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {method === 'ALL' ? 'All Methods' : method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <Table className="min-w-[850px]">
                  <TableHeader className="bg-slate-50">
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
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400 italic">
                          No collection receipts match the filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((p) => {
                        const h24 = evaluate24hHandoverStatus(p);
                        return (
                          <TableRow key={p.id} className="hover:bg-slate-50/60">
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
                              <div className="font-medium text-slate-900">{p.customerName}</div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
