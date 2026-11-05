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
import { Card } from '../../../components/ui/card';
import { PrintablePaymentVoucher } from './PrintablePaymentVoucher';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';
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
  XCircle,
  ShieldCheck,
  Wallet,
  Receipt,
  Landmark,
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
  hideHeader?: boolean;
}

export function PaymentVouchersRegistry({
  onNewVoucher,
  onSelectVoucher,
  hideHeader = false,
}: PaymentVouchersRegistryProps) {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<PaymentVoucher | null>(null);
  const [cbVouchers, setCbVouchers] = useState<PaymentVoucher[]>([]);

  const effectiveUser = useMemo(() => {
    return (
      currentUser || {
        id: 'usr-fin',
        name: 'Finance Desk',
        email: 'finance@dns.lk',
        role: 'FINANCE_MANAGER',
      }
    );
  }, [currentUser]);

  const loadData = () => {
    cashBookService
      .getVouchers()
      .then((vouchers) => {
        setCbVouchers(vouchers || []);
      })
      .catch(() => {
        setCbVouchers([]);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveVoucher = async (voucherId: string) => {
    try {
      await cashBookService.approveVoucher(voucherId, effectiveUser as any);
      toast.success(`Payment Voucher #${voucherId} approved! Live Cash in Hand updated and GL impact posted.`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve voucher');
    }
  };

  const handleRejectVoucher = async (voucherId: string) => {
    try {
      await cashBookService.rejectVoucher(voucherId, 'Disbursement rejected by Finance Desk', effectiveUser as any);
      toast.info(`Payment Voucher #${voucherId} rejected.`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject voucher');
    }
  };

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
        if (statusFilter !== 'APPROVED') {
          return false;
        }
      }

      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          row.voucherNumber.toLowerCase().includes(q) ||
          row.auditNumber.toLowerCase().includes(q) ||
          row.paidTo.toLowerCase().includes(q) ||
          row.remarks.toLowerCase().includes(q) ||
          row.account.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [vouchersList, search, statusFilter, dateFrom, dateTo]);

  // Key metrics
  const totalDisbursed = useMemo(() => {
    return vouchersList
      .filter((v) => v.status === 'APPROVED' || v.status === 'POSTED')
      .reduce((sum, v) => sum + v.amount, 0);
  }, [vouchersList]);

  const pendingCount = useMemo(() => {
    return vouchersList.filter((v) => v.status === 'PENDING_APPROVAL').length;
  }, [vouchersList]);

  const handlePrintVoucher = (v: UnifiedPaymentVoucherRow) => {
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
        status: v.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'APPROVED',
        createdBy: 'usr-fin',
        createdByName: 'Finance Manager',
        createdAt: v.date,
        updatedAt: v.date,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Optional standalone Title (hidden when inside unified desk) */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Payment Vouchers History
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Audit registry of vendor payment vouchers, bill settlements, supplier advances, and direct expenses.
            </p>
          </div>

          <Button
            size="sm"
            onClick={onNewVoucher}
            className="gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs h-9 px-4 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Payment Voucher</span>
          </Button>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-semibold">Total Disbursements</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground">
            {formatCurrency(totalDisbursed)}
          </div>
          <span className="text-[10px] text-muted-foreground">Approved &amp; posted vouchers</span>
        </Card>

        <Card className="p-3 border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-semibold">Total Vouchers</span>
            <Receipt className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground">
            {vouchersList.length}
          </div>
          <span className="text-[10px] text-muted-foreground">Recorded payment orders</span>
        </Card>

        <Card className={cn(
          'p-3 border-border bg-card shadow-xs',
          pendingCount > 0 && 'border-amber-300 bg-amber-50/40'
        )}>
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className={cn('font-semibold', pendingCount > 0 && 'text-amber-900 font-bold')}>
              Pending Approval
            </span>
            <Clock className={cn('h-4 w-4 text-amber-600', pendingCount > 0 && 'animate-pulse')} />
          </div>
          <div className={cn('mt-1 text-base sm:text-lg font-bold font-mono text-foreground', pendingCount > 0 && 'text-amber-950')}>
            {pendingCount}
          </div>
          <span className="text-[10px] text-amber-800">
            {pendingCount > 0 ? 'Action required below' : 'All vouchers authorized'}
          </span>
        </Card>

        <Card className="p-3 border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-semibold">Verified Settlement</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-700">
            {vouchersList.filter((v) => v.status === 'APPROVED' || v.status === 'POSTED').length}
          </div>
          <span className="text-[10px] text-emerald-700">Audit-ready disbursements</span>
        </Card>
      </div>

      {/* Industrial Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by voucher #, audit #, payee, or remarks..."
              className="pl-8 text-xs h-9 bg-background"
            />
          </div>

          <div className="w-36 shrink-0">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 text-xs bg-background"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved / Paid</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="DRAFT">Draft</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-md border border-border/60 shrink-0">
            <span className="text-[11px] text-muted-foreground font-medium">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-7 text-xs w-28 bg-background border-border/80"
            />
            <span className="text-[11px] text-muted-foreground font-medium ml-1">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-7 text-xs w-28 bg-background border-border/80"
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
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            title="Reset Filters"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          Showing <span className="font-semibold text-foreground">{filteredRows.length}</span> voucher(s)
        </div>
      </div>

      {/* Industrial Data Table matching rest of ERP */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="bg-muted/60 text-muted-foreground border-b border-border text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 w-24">AUDIT #</th>
                <th className="px-3.5 py-3 w-32">VOUCHER #</th>
                <th className="px-3.5 py-3 w-28">DATE</th>
                <th className="px-3.5 py-3">PAID TO / BENEFICIARY</th>
                <th className="px-3.5 py-3 w-36">ACCOUNT</th>
                <th className="px-3.5 py-3">REMARKS / PURPOSE</th>
                <th className="px-3.5 py-3 w-20 text-center">METHOD</th>
                <th className="px-3.5 py-3 text-right w-32">AMOUNT</th>
                <th className="px-3.5 py-3 text-center w-28">STATUS</th>
                <th className="px-3.5 py-3 text-right w-44">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-xs text-muted-foreground">
                    No payment vouchers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((v) => {
                  const isPending = v.status === 'PENDING_APPROVAL';
                  return (
                    <tr
                      key={v.id}
                      onClick={() => handlePrintVoucher(v)}
                      className={cn(
                        'hover:bg-muted/40 transition-colors cursor-pointer group',
                        isPending && 'bg-amber-50/30'
                      )}
                    >
                      {/* AUDIT # */}
                      <td className="px-3.5 py-3 font-mono text-muted-foreground text-[11px]">
                        {v.auditNumber}
                      </td>

                      {/* VOUCHER # */}
                      <td className="px-3.5 py-3 font-mono font-bold text-primary group-hover:underline">
                        {v.voucherNumber}
                      </td>

                      {/* DATE */}
                      <td className="px-3.5 py-3 text-muted-foreground font-mono text-[11px]">
                        {formatDate(v.date)}
                      </td>

                      {/* PAID TO */}
                      <td className="px-3.5 py-3 font-semibold text-foreground">
                        {v.paidTo}
                      </td>

                      {/* ACCOUNT */}
                      <td className="px-3.5 py-3">
                        <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground">
                          {v.account}
                        </span>
                      </td>

                      {/* REMARKS */}
                      <td className="px-3.5 py-3 text-muted-foreground text-[11px] truncate max-w-xs" title={v.remarks}>
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
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(v.amount)}
                      </td>

                      {/* STATUS */}
                      <td className="px-3.5 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] py-0 font-semibold',
                            (v.status === 'APPROVED' || v.status === 'POSTED') &&
                              'bg-emerald-50 text-emerald-700 border-emerald-300',
                            v.status === 'DRAFT' && 'bg-muted text-muted-foreground border-border',
                            v.status === 'PENDING_APPROVAL' && 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse',
                            v.status === 'REJECTED' && 'bg-rose-50 text-rose-700 border-rose-300'
                          )}
                        >
                          {v.status === 'APPROVED' || v.status === 'POSTED'
                            ? 'Approved'
                            : v.status === 'PENDING_APPROVAL'
                            ? 'Pending Approval'
                            : v.status}
                        </Badge>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => handleApproveVoucher(v.id)}
                                className="h-7 px-2 text-[11px] bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-semibold gap-1"
                                title="1-Click Authorize & Post GL"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Approve</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => handleRejectVoucher(v.id)}
                                className="h-7 px-2 text-[11px] bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-semibold gap-1"
                                title="Reject Voucher"
                              >
                                <XCircle className="h-3 w-3 text-rose-500" />
                                <span>Reject</span>
                              </Button>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => handlePrintVoucher(v)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Inspect & Print Payment Voucher"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Payment Voucher Modal with Approve / Reject Controls */}
      <PrintablePaymentVoucher
        voucher={selectedVoucherForPrint}
        open={Boolean(selectedVoucherForPrint)}
        onOpenChange={(open) => !open && setSelectedVoucherForPrint(null)}
        canApprove={true}
        onApprove={(id) => handleApproveVoucher(id)}
        onReject={(v) => handleRejectVoucher(v.id)}
      />
    </div>
  );
}
