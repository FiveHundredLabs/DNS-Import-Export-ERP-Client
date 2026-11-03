import React, { useState, useMemo } from 'react';
import { Payment } from '../../../types/payment';
import { Invoice } from '../../../types/invoice';
import { User } from '../../../types/auth';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import { evaluate24hHandoverStatus } from '../../../rules/paymentRules';
import { cn } from '../../../utils/cn';
import {
  Search,
  Filter,
  FileText,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Send,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react';

export interface InvoiceCollectionsLedgerProps {
  payments: Payment[];
  invoices: Invoice[];
  salesReps: User[];
  onInspectRep?: (rep: User) => void;
}

export function InvoiceCollectionsLedger({
  payments,
  invoices,
  salesReps,
  onInspectRep,
}: InvoiceCollectionsLedgerProps) {
  const [search, setSearch] = useState('');
  const [selectedRepId, setSelectedRepId] = useState<string>('ALL');
  const [handoverStatusFilter, setHandoverStatusFilter] = useState<
    'ALL' | 'IN_HAND' | 'HANDED_OVER' | 'APPROVED' | 'OVERDUE'
  >('ALL');

  // Flatten payments into an invoice-level collection matrix
  const invoiceCollectionRows = useMemo(() => {
    const rows: Array<{
      id: string;
      invoiceId: string;
      invoiceNumber: string;
      customerName: string;
      customerCode?: string;
      salesRepId: string;
      salesRepName: string;
      paymentId: string;
      receiptNumber: string;
      paymentMethod: string;
      collectedAt: string;
      allocatedAmount: number;
      invoiceTotal: number;
      invoiceRemainingBalance: number;
      invoiceStatus: string;
      handoverStatus: string;
      isOverdue: boolean;
      paymentRaw: Payment;
    }> = [];

    // Map each payment allocation to an invoice row
    payments.forEach((payment) => {
      const h24 = evaluate24hHandoverStatus(payment);
      const isOverdue = h24.isOverdue && h24.handoverStatus === 'PENDING_HANDOVER';

      if (payment.invoiceAllocations && payment.invoiceAllocations.length > 0) {
        payment.invoiceAllocations.forEach((alloc, allocIdx) => {
          const inv = invoices.find(
            (i) => i.invoiceNumber === alloc.invoiceNumber || i.id === alloc.invoiceId
          );
          const invoiceTotal = inv?.totalAmount ?? (alloc.allocatedAmount * 1.3);
          const invoiceRemainingBalance = inv?.balanceAmount ?? Math.max(0, invoiceTotal - alloc.allocatedAmount);

          rows.push({
            id: `${payment.id}-alloc-${allocIdx}`,
            invoiceId: alloc.invoiceId || inv?.id || alloc.invoiceNumber,
            invoiceNumber: alloc.invoiceNumber,
            customerName: payment.customerName,
            customerCode: payment.customerCode,
            salesRepId: payment.salesRepId,
            salesRepName: payment.salesRepName,
            paymentId: payment.id,
            receiptNumber: payment.receiptNumber,
            paymentMethod: payment.paymentMethod,
            collectedAt: payment.collectedAt,
            allocatedAmount: alloc.allocatedAmount,
            invoiceTotal,
            invoiceRemainingBalance,
            invoiceStatus: inv?.status || 'PARTIALLY_PAID',
            handoverStatus: payment.status === 'APPROVED' ? 'APPROVED' : (payment.handoverStatus || 'PENDING_HANDOVER'),
            isOverdue,
            paymentRaw: payment,
          });
        });
      } else {
        // Direct unallocated payment
        rows.push({
          id: `${payment.id}-unalloc`,
          invoiceId: 'UNALLOCATED',
          invoiceNumber: 'Direct Advance',
          customerName: payment.customerName,
          customerCode: payment.customerCode,
          salesRepId: payment.salesRepId,
          salesRepName: payment.salesRepName,
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber,
          paymentMethod: payment.paymentMethod,
          collectedAt: payment.collectedAt,
          allocatedAmount: payment.amount,
          invoiceTotal: payment.amount,
          invoiceRemainingBalance: 0,
          invoiceStatus: 'ON_ACCOUNT',
          handoverStatus: payment.status === 'APPROVED' ? 'APPROVED' : (payment.handoverStatus || 'PENDING_HANDOVER'),
          isOverdue,
          paymentRaw: payment,
        });
      }
    });

    // Sort newest collection first
    rows.sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
    return rows;
  }, [payments, invoices]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return invoiceCollectionRows.filter((row) => {
      if (selectedRepId !== 'ALL' && row.salesRepId !== selectedRepId) {
        return false;
      }

      if (handoverStatusFilter === 'IN_HAND') {
        if (row.handoverStatus !== 'PENDING_HANDOVER' || row.handoverStatus === 'APPROVED') return false;
      } else if (handoverStatusFilter === 'HANDED_OVER') {
        if (row.handoverStatus !== 'HANDED_OVER') return false;
      } else if (handoverStatusFilter === 'APPROVED') {
        if (row.handoverStatus !== 'APPROVED') return false;
      } else if (handoverStatusFilter === 'OVERDUE') {
        if (!row.isOverdue) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchInv = row.invoiceNumber.toLowerCase().includes(q);
        const matchCust = row.customerName.toLowerCase().includes(q);
        const matchRec = row.receiptNumber.toLowerCase().includes(q);
        const matchRep = row.salesRepName.toLowerCase().includes(q);
        if (!matchInv && !matchCust && !matchRec && !matchRep) return false;
      }

      return true;
    });
  }, [invoiceCollectionRows, selectedRepId, handoverStatusFilter, search]);

  const totalFilteredCollections = filteredRows.reduce((sum, r) => sum + r.allocatedAmount, 0);

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-slate-800">
              Invoice Collections &amp; Cash Accountability Ledger ({filteredRows.length} Mapped Settlements)
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Collections Filtered: <span className="text-primary">{formatCurrency(totalFilteredCollections)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by Invoice #, Customer, Receipt #, or Rep..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs rounded-xl"
            />
          </div>

          {/* Sales Rep Selector */}
          <div>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Sales Representatives</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name} ({rep.areaName || 'Territory'})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={handoverStatusFilter}
              onChange={(e) => setHandoverStatusFilter(e.target.value as any)}
              className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Settlement Statuses</option>
              <option value="IN_HAND">Cash in Rep Hand</option>
              <option value="HANDED_OVER">Handed Over to Finance</option>
              <option value="APPROVED">Finance Cleared &amp; Banked</option>
              <option value="OVERDUE">Overdue &gt;24h Breach</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto [scrollbar-width:thin]">
          <Table className="min-w-[1050px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="text-[11px] font-bold text-slate-600">
                <TableHead className="w-36">Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Sales Representative</TableHead>
                <TableHead>Receipt &amp; Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Invoice Total</TableHead>
                <TableHead className="text-right">Collected Amount</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
                <TableHead className="text-center">Cash Handover Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400 italic">
                    No invoice collections match the filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  const repObj = salesReps.find((r) => r.id === row.salesRepId);
                  return (
                    <TableRow key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Invoice # */}
                      <TableCell className="font-mono font-bold text-primary">
                        <span className="hover:underline cursor-pointer">
                          {row.invoiceNumber}
                        </span>
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <div className="font-medium text-slate-900">{row.customerName}</div>
                        {row.customerCode && (
                          <div className="text-[10px] text-slate-400 font-mono">{row.customerCode}</div>
                        )}
                      </TableCell>

                      {/* Sales Rep */}
                      <TableCell>
                        <div
                          onClick={() => repObj && onInspectRep && onInspectRep(repObj)}
                          className={cn(
                            "font-semibold text-slate-800 flex items-center gap-1",
                            onInspectRep && "hover:text-primary cursor-pointer hover:underline"
                          )}
                        >
                          {row.salesRepName}
                        </div>
                        {repObj?.areaName && (
                          <div className="text-[10px] text-slate-400">{repObj.areaName}</div>
                        )}
                      </TableCell>

                      {/* Receipt & Date */}
                      <TableCell>
                        <div className="font-mono text-xs font-bold text-slate-700">{row.receiptNumber}</div>
                        <div className="text-[10px] text-slate-400">{formatDate(row.collectedAt)}</div>
                      </TableCell>

                      {/* Payment Method */}
                      <TableCell>
                        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {row.paymentMethod}
                        </span>
                      </TableCell>

                      {/* Invoice Total */}
                      <TableCell className="text-right font-mono text-slate-600">
                        {formatCurrency(row.invoiceTotal)}
                      </TableCell>

                      {/* Collected Amount */}
                      <TableCell className="text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                        +{formatCurrency(row.allocatedAmount)}
                      </TableCell>

                      {/* Outstanding Balance */}
                      <TableCell className="text-right font-mono font-bold text-slate-900">
                        {formatCurrency(row.invoiceRemainingBalance)}
                      </TableCell>

                      {/* Cash Handover Status */}
                      <TableCell className="text-center">
                        {row.handoverStatus === 'APPROVED' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
                            <ShieldCheck className="h-3 w-3" /> Finance Cleared
                          </Badge>
                        ) : row.handoverStatus === 'HANDED_OVER' ? (
                          <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] font-bold gap-1">
                            <Send className="h-3 w-3" /> Handed Over
                          </Badge>
                        ) : row.isOverdue ? (
                          <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse gap-1">
                            <AlertCircle className="h-3 w-3" /> Overdue &gt;24h
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold gap-1">
                            <Clock className="h-3 w-3" /> In Rep Hand
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
  );
}

