import React, { useState, useEffect, useMemo } from 'react';
import { cashBookService } from '../../../services/CashBookService';
import { apService } from '../services/apService';
import { PaymentVoucher } from '../../../types/cashbook';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { PrintablePaymentVoucher } from './PrintablePaymentVoucher';
import {
  Search,
  Plus,
  RefreshCw,
  Printer,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

export interface UnifiedPaymentVoucherRow {
  id: string;
  auditNumber: string;
  voucherNumber: string;
  date: string;
  paidTo: string;
  account: string;
  remarks: string;
  method: 'CASH' | 'BANK' | 'CHEQUE';
  amount: number;
  status: 'DRAFT' | 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED' | 'POSTED';
  rawVoucher?: PaymentVoucher;
}

interface PaymentVouchersRegistryProps {
  onNewVoucher: () => void;
  onSelectVoucher?: (voucher: UnifiedPaymentVoucherRow) => void;
}

export function PaymentVouchersRegistry({
  onNewVoucher,
  onSelectVoucher,
}: PaymentVouchersRegistryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<PaymentVoucher | null>(null);
  const [cbVouchers, setCbVouchers] = useState<PaymentVoucher[]>([]);

  useEffect(() => {
    cashBookService.getVouchers().then((vouchers) => {
      setCbVouchers(vouchers || []);
    }).catch(() => {
      setCbVouchers([]);
    });
  }, []);

  // Load vouchers from CashBookService and AP Advances
  const vouchersList: UnifiedPaymentVoucherRow[] = useMemo(() => {
    const rows: UnifiedPaymentVoucherRow[] = [];

    // From CashBookService
    cbVouchers.forEach((v, idx) => {
      rows.push({
        id: v.id,
        auditNumber: `AUD-${(1000 + idx).toString()}`,
        voucherNumber: v.voucherNumber,
        date: v.date,
        paidTo: v.payeeOrPayer || 'General Vendor',
        account: `${v.offsetAccountCode || '5000'} / ${v.cashAccountCode || '1010'}`,
        remarks: v.description || '-',
        method: v.cashAccountCode === '1040' ? 'CASH' : 'BANK',
        amount: v.amount,
        status: v.status as any,
        rawVoucher: v,
      });
    });

    // From AP Advances
    const advances = apService.getSupplierAdvances();
    advances.forEach((adv, idx) => {
      rows.push({
        id: adv.id,
        auditNumber: `AUD-${(2000 + idx).toString()}`,
        voucherNumber: `PV-ADV-${adv.advanceNumber}`,
        date: adv.paymentDate,
        paidTo: adv.supplierName,
        account: `1050 Advances / ${adv.bankAccountCode || '1010'}`,
        remarks: adv.notes || (adv.purchaseOrderNumber ? `PO Advance: ${adv.purchaseOrderNumber}` : 'Supplier Advance Deposit'),
        method: 'BANK',
        amount: adv.amount,
        status: 'POSTED',
        rawVoucher: {
          id: adv.id,
          voucherNumber: `PV-ADV-${adv.advanceNumber}`,
          date: adv.paymentDate,
          voucherType: 'PAYMENT',
          category: 'SUPPLIER_PAYMENT',
          payeeOrPayer: adv.supplierName,
          amount: adv.amount,
          cashAccountCode: (adv.bankAccountCode === '1040' ? '1040' : '1010') as '1010' | '1040',
          cashAccountName: 'Operating Bank Account',
          offsetAccountId: 'acc-1050',
          offsetAccountCode: '1050',
          offsetAccountName: 'Advance Payments to Suppliers',
          description: adv.notes || `Advance prepayment for PO ${adv.purchaseOrderNumber || 'Procurement'}`,
          status: 'APPROVED',
          createdBy: 'usr-fin',
          createdByName: 'Finance Desk',
          createdAt: adv.createdAt,
          updatedAt: adv.createdAt,
        },
      });
    });

    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cbVouchers]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return vouchersList.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) {
        if (statusFilter === 'APPROVED' && row.status !== 'APPROVED' && row.status !== 'POSTED') {
          return false;
        }
      }
      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          row.voucherNumber.toLowerCase().includes(q) ||
          row.auditNumber.toLowerCase().includes(q) ||
          row.paidTo.toLowerCase().includes(q) ||
          row.account.toLowerCase().includes(q) ||
          row.remarks.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [vouchersList, search, statusFilter, dateFrom, dateTo]);

  const handlePrint = (v: UnifiedPaymentVoucherRow) => {
    if (v.rawVoucher) {
      setSelectedVoucherForPrint(v.rawVoucher);
    } else {
      setSelectedVoucherForPrint({
        id: v.id,
        voucherNumber: v.voucherNumber,
        date: v.date,
        voucherType: 'PAYMENT',
        category: 'SUPPLIER_PAYMENT',
        payeeOrPayer: v.paidTo,
        amount: v.amount,
        cashAccountCode: '1010',
        cashAccountName: 'Operating Bank Account',
        offsetAccountId: 'acc-2010',
        offsetAccountCode: '2010',
        offsetAccountName: 'Accounts Payable',
        description: v.remarks,
        status: 'APPROVED',
        createdBy: 'usr-fin',
        createdByName: 'Finance Manager',
        createdAt: v.date,
        updatedAt: v.date,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & + New Voucher Button (Image 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Expense — Payment Vouchers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit registry of vendor payment vouchers, bill settlements, and supplier advances.
          </p>
        </div>

        <Button
          size="sm"
          onClick={onNewVoucher}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>+ New Voucher</span>
        </Button>
      </div>

      {/* Single-Line Filter Bar (Image 4) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/90 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs w-36"
          >
            <option value="ALL">All Status</option>
            <option value="APPROVED">Approved / Paid</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
          </Select>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 font-medium">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs w-36"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 font-medium">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs w-36"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setDateFrom('');
              setDateTo('');
            }}
            className="h-9 text-xs text-slate-600 gap-1.5"
            title="Reset Filters"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total: <span className="font-semibold text-slate-800">{filteredRows.length}</span> vouchers
        </div>
      </div>

      {/* Clean Table with Dark Header Bar (Image 4) */}
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 w-24">AUDIT #</th>
                <th className="px-3.5 py-3 w-32">VOUCHER #</th>
                <th className="px-3.5 py-3 w-28">DATE</th>
                <th className="px-3.5 py-3">PAID TO / SUPPLIER</th>
                <th className="px-3.5 py-3 w-40">ACCOUNT</th>
                <th className="px-3.5 py-3">REMARKS</th>
                <th className="px-3.5 py-3 w-24 text-center">METHOD</th>
                <th className="px-3.5 py-3 text-right w-32">AMOUNT</th>
                <th className="px-3.5 py-3 text-center w-28">STATUS</th>
                <th className="px-3.5 py-3 text-right w-20">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-400">
                    No payment vouchers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onSelectVoucher?.(v)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* AUDIT # */}
                    <td className="px-3.5 py-3 font-mono text-slate-500 text-[11px]">
                      {v.auditNumber}
                    </td>

                    {/* VOUCHER # */}
                    <td className="px-3.5 py-3 font-mono font-bold text-primary group-hover:underline">
                      {v.voucherNumber}
                    </td>

                    {/* DATE */}
                    <td className="px-3.5 py-3 text-slate-700 font-mono text-[11px]">
                      {formatDate(v.date)}
                    </td>

                    {/* PAID TO / SUPPLIER */}
                    <td className="px-3.5 py-3 font-semibold text-slate-900">
                      {v.paidTo}
                    </td>

                    {/* ACCOUNT */}
                    <td className="px-3.5 py-3">
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {v.account}
                      </span>
                    </td>

                    {/* REMARKS */}
                    <td className="px-3.5 py-3 text-slate-600 text-[11px] truncate max-w-xs" title={v.remarks}>
                      {v.remarks}
                    </td>

                    {/* METHOD */}
                    <td className="px-3.5 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-mono py-0 font-medium',
                          v.method === 'CASH' && 'bg-amber-50 text-amber-700 border-amber-200',
                          v.method === 'BANK' && 'bg-sky-50 text-sky-700 border-sky-200',
                          v.method === 'CHEQUE' && 'bg-purple-50 text-purple-700 border-purple-200'
                        )}
                      >
                        {v.method}
                      </Badge>
                    </td>

                    {/* AMOUNT */}
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(v.amount)}
                    </td>

                    {/* STATUS */}
                    <td className="px-3.5 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] py-0 font-semibold',
                          (v.status === 'APPROVED' || v.status === 'POSTED') &&
                            'bg-emerald-50 text-emerald-700 border-emerald-200',
                          v.status === 'DRAFT' && 'bg-slate-100 text-slate-600 border-slate-200',
                          v.status === 'PENDING_APPROVAL' && 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {v.status === 'POSTED' || v.status === 'APPROVED' ? 'Approved' : v.status}
                      </Badge>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrint(v)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-primary hover:bg-primary-light"
                        title="Download / Print PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Payment Voucher Modal */}
      <PrintablePaymentVoucher
        voucher={selectedVoucherForPrint}
        open={Boolean(selectedVoucherForPrint)}
        onOpenChange={(open) => !open && setSelectedVoucherForPrint(null)}
      />
    </div>
  );
}
