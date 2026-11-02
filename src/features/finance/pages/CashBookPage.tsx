import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { cashBookService } from '../../../services/CashBookService';
import { pdfService } from '../../../services/PdfService';
import {
  PaymentVoucher,
  CashBookSummary,
  CashVoucherType,
  CashVoucherCategory,
  CashBookTransaction,
} from '../../../types/cashbook';
import { PrintablePaymentVoucher } from '../components/PrintablePaymentVoucher';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FormField } from '../../../components/common/FormField';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Landmark,
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  ExternalLink,
  Printer,
  History,
  Layers,
  Download,
  Eye,
  RefreshCw,
  Filter,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function CashBookPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'VOUCHERS'>('LEDGER');
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CashBookTransaction[]>([]);
  const [summary, setSummary] = useState<CashBookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // System View / Print Voucher Modal State
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<PaymentVoucher | null>(null);
  const [isSystemViewOpen, setIsSystemViewOpen] = useState(false);

  // New Voucher Modal State
  const [isNewVoucherOpen, setIsNewVoucherOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voucherType, setVoucherType] = useState<CashVoucherType>('PAYMENT');
  const [category, setCategory] = useState<CashVoucherCategory>('OFFICE_EXPENSE');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('CASH');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [payeeOrPayer, setPayeeOrPayer] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [cashAccountCode, setCashAccountCode] = useState<'1010' | '1040'>('1040');
  const [offsetAccountCode, setOffsetAccountCode] = useState('5020');
  const [description, setDescription] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedVoucherForReject, setSelectedVoucherForReject] = useState<PaymentVoucher | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const canApprove =
    currentUser?.role === 'DIRECTOR' ||
    currentUser?.role === 'MANAGER' ||
    currentUser?.role === 'FINANCE_MANAGER';

  const loadData = async () => {
    try {
      setLoading(true);
      const [vList, sum] = await Promise.all([
        cashBookService.getVouchers(),
        cashBookService.getSummary(),
      ]);
      setVouchers(vList);
      setSummary(sum);
    } catch {
      toast.error('Failed to load cash book entries.');
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    try {
      setLedgerLoading(true);
      const ledger = await cashBookService.getCashBookLedger({
        accountCode: accountFilter,
        transactionType: typeFilter as any,
      });
      setLedgerEntries(ledger);
    } catch {
      toast.error('Failed to load live cash book ledger.');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(), loadLedger()]);
    setIsRefreshing(false);
    toast.success('Cash book records synchronized with General Ledger.');
  };

  useEffect(() => {
    loadData();
    loadLedger();
  }, [accountFilter, typeFilter]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than zero.');
      return;
    }
    if (!payeeOrPayer.trim()) {
      toast.error('Payee or Payer name is required.');
      return;
    }
    if (!description.trim()) {
      toast.error('Description / Narrative is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await cashBookService.createVoucher(
        {
          voucherType,
          category,
          payeeOrPayer,
          amount: numAmount,
          cashAccountCode,
          offsetAccountCode,
          description,
          paymentMethod,
          chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber : undefined,
          bankName: paymentMethod !== 'CASH' ? bankName : undefined,
          autoApprove,
        },
        currentUser
      );

      if (created.status === 'APPROVED') {
        toast.success(
          `Voucher ${created.voucherNumber} approved! Posted Dr ${offsetAccountCode}, Cr ${cashAccountCode} to General Ledger.`
        );
      } else {
        toast.success(
          `Payment Voucher ${created.voucherNumber} submitted for Manager approval (MG-02).`
        );
      }

      setIsNewVoucherOpen(false);
      resetForm();
      await loadData();
      await loadLedger();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create payment voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (voucherId: string) => {
    try {
      const updated = await cashBookService.approveVoucher(voucherId, currentUser);
      toast.success(
        `Voucher ${updated.voucherNumber} approved! Live Cash in Hand updated and GL impact posted.`
      );
      await loadData();
      await loadLedger();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
    }
  };

  const handleReject = async () => {
    if (!selectedVoucherForReject) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejecting this voucher.');
      return;
    }

    try {
      await cashBookService.rejectVoucher(selectedVoucherForReject.id, rejectionReason, currentUser);
      toast.success(`Voucher ${selectedVoucherForReject.voucherNumber} rejected.`);
      setRejectModalOpen(false);
      setSelectedVoucherForReject(null);
      setRejectionReason('');
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed.');
    }
  };

  const resetForm = () => {
    setVoucherType('PAYMENT');
    setCategory('OFFICE_EXPENSE');
    setPaymentMethod('CASH');
    setChequeNumber('');
    setBankName('');
    setPayeeOrPayer('');
    setAmount('');
    setCashAccountCode('1040');
    setOffsetAccountCode('5020');
    setDescription('');
    setAutoApprove(false);
  };

  // Open System View for a given voucher
  const handleOpenSystemView = (voucher: PaymentVoucher) => {
    setSelectedVoucherForView(voucher);
    setIsSystemViewOpen(true);
  };

  // Direct download payment voucher from list
  const handleDirectDownload = (voucher: PaymentVoucher, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    pdfService.downloadPaymentVoucherPdf(voucher, true);
    toast.success(`Payment voucher ${voucher.voucherNumber} downloaded.`);
  };

  // Helper to find a matching voucher from ledger reference
  const findVoucherByRef = (refNumber: string): PaymentVoucher | undefined => {
    if (!refNumber) return undefined;
    const cleanRef = refNumber.trim().toLowerCase();
    return vouchers.find(
      (v) =>
        v.voucherNumber.toLowerCase() === cleanRef ||
        v.voucherNumber.toLowerCase() === cleanRef.replace(/^ref-/, '') ||
        (v.glJournalId && v.glJournalId.toLowerCase() === cleanRef)
    );
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        searchQuery === '' ||
        v.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.payeeOrPayer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchAccount = accountFilter === 'ALL' || v.cashAccountCode === accountFilter;

      return matchSearch && matchStatus && matchAccount;
    });
  }, [vouchers, searchQuery, statusFilter, accountFilter]);

  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((e) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.entryNumber.toLowerCase().includes(q) ||
        e.referenceNumber.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.accountCode.includes(q) ||
        e.accountName.toLowerCase().includes(q)
      );
    });
  }, [ledgerEntries, searchQuery]);

  // Float balance helper for new voucher dialog
  const currentFloatBalance = useMemo(() => {
    if (!summary) return 0;
    return cashAccountCode === '1010' ? summary.account1010Balance : summary.account1040Balance;
  }, [summary, cashAccountCode]);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* 1. Page Header */}
      <PageHeader
        title="Cash Book & Payment Vouchers"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Cash Book' },
        ]}
        onBack={() => navigate('/finance')}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs h-8 gap-1.5 font-medium border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link to="/finance/reports/general-ledger">
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 font-medium border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs">
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">View</span> General Ledger
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setIsNewVoucherOpen(true)}
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs h-8 gap-1.5 font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Payment Voucher
            </Button>
          </div>
        }
      />

      {/* 2. Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Account 1010 Operating Bank Float */}
        <Card
          onClick={() => setAccountFilter(accountFilter === '1010' ? 'ALL' : '1010')}
          className={`p-4 border transition-all cursor-pointer rounded-xl bg-white shadow-2xs hover:shadow-xs ${
            accountFilter === '1010' ? 'ring-2 ring-primary border-primary' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              Operating Float (1010)
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 tabular-nums tracking-tight">
            {summary ? formatCurrency(summary.account1010Balance) : '---'}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Checking / Bank
            </span>
            <span className="text-slate-400 font-mono text-[10px]">Filter 1010</span>
          </div>
        </Card>

        {/* Card 2: Account 1040 Petty Cash Float */}
        <Card
          onClick={() => setAccountFilter(accountFilter === '1040' ? 'ALL' : '1040')}
          className={`p-4 border transition-all cursor-pointer rounded-xl bg-white shadow-2xs hover:shadow-xs ${
            accountFilter === '1040' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Petty Cash Float (1040)</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 tabular-nums tracking-tight">
            {summary ? formatCurrency(summary.account1040Balance) : '---'}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">
              Showroom &amp; warehouse float
            </span>
            <span className="text-slate-400 font-mono text-[10px]">Filter 1040</span>
          </div>
        </Card>

        {/* Card 3: Pending Approvals (MG-02) */}
        <Card
          onClick={() => {
            setActiveTab('VOUCHERS');
            setStatusFilter(statusFilter === 'PENDING_APPROVAL' ? 'ALL' : 'PENDING_APPROVAL');
          }}
          className={`p-4 border transition-all cursor-pointer rounded-xl shadow-2xs hover:shadow-xs ${
            (summary?.pendingApprovalsCount ?? 0) > 0
              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Pending Approvals (MG-02)</span>
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-950 tabular-nums tracking-tight flex items-baseline gap-2">
            <span>{summary?.pendingApprovalsCount ?? 0}</span>
            <span className="text-xs font-semibold text-amber-800">Vouchers</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-800 font-mono font-medium">
            <span>LKR {summary?.pendingApprovalsAmount.toLocaleString() ?? '0.00'} awaiting sign-off</span>
            <span className="text-amber-900 font-semibold underline text-[10px]">Review</span>
          </div>
        </Card>

        {/* Card 4: Monthly Disbursements / Outflows */}
        <Card className="p-4 border border-slate-200 bg-white shadow-2xs rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Monthly Disbursements</span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 tabular-nums tracking-tight">
            {summary ? formatCurrency(summary.monthlyDisbursements) : '---'}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              Receipts: <span className="font-mono text-emerald-700 font-bold">{summary ? formatCurrency(summary.monthlyReceipts) : '-'}</span>
            </span>
            <span className="text-rose-600 font-semibold text-[10px]">Outflows</span>
          </div>
        </Card>
      </div>

      {/* 3. Sub-Navigation Tabs & Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LEDGER'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className={`h-3.5 w-3.5 ${activeTab === 'LEDGER' ? 'text-primary' : 'text-slate-400'}`} />
            <span>Cash Book Ledger (Live GL)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'LEDGER' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
            }`}>
              {ledgerEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VOUCHERS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'VOUCHERS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className={`h-3.5 w-3.5 ${activeTab === 'VOUCHERS' ? 'text-primary' : 'text-slate-400'}`} />
            <span>Payment &amp; Receipt Vouchers</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'VOUCHERS' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
            }`}>
              {vouchers.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {activeTab === 'LEDGER' ? (
            <span>Showing real-time general ledger postings affecting Cash &amp; Bank accounts</span>
          ) : (
            <span>Official dual-authorized cash vouchers &amp; disbursement orders</span>
          )}
        </div>
      </div>

      {/* 4. Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={
              activeTab === 'LEDGER'
                ? 'Search reference #, entry, narrative, account...'
                : 'Search voucher #, payee, particulars...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 text-xs h-9 bg-slate-50/50 border-slate-200 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {activeTab === 'VOUCHERS' ? (
            /* Status Filter for Vouchers */
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval (MG-02)</option>
              <option value="APPROVED">Approved &amp; Posted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          ) : (
            /* Transaction Type Filter for Ledger */
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Transactions</option>
              <option value="RECEIPT">Receipts (Dr Inflow)</option>
              <option value="PAYMENT">Payments (Cr Outflow)</option>
            </select>
          )}

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Cash &amp; Bank Accounts</option>
            <option value="1010">1010 - Operating Bank Float</option>
            <option value="1040">1040 - Petty Cash Float</option>
          </select>

          {/* Reset Filters button */}
          {(statusFilter !== 'ALL' || accountFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery !== '') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setAccountFilter('ALL');
                setTypeFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs h-9 px-2.5 text-slate-500 hover:text-slate-800"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* 5. Main Content: Ledger or Vouchers Table */}
      {activeTab === 'LEDGER' ? (
        /* Cash Book Ledger View */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[1050px] text-xs text-left tabular-nums">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3 whitespace-nowrap">Reference / Voucher</th>
                  <th className="py-3 px-3 whitespace-nowrap">Account</th>
                  <th className="py-3 px-4 whitespace-nowrap">Transaction Narrative</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 text-right text-emerald-700 whitespace-nowrap">Receipts (Dr +)</th>
                  <th className="py-3 px-4 text-right text-rose-700 whitespace-nowrap">Disbursements (Cr -)</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Running Balance</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary/60" />
                      Loading live cash book ledger...
                    </td>
                  </tr>
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No cash transactions recorded for the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((tx) => {
                    const isReceipt = tx.transactionType === 'RECEIPT';
                    const matchingVoucher = findVoucherByRef(tx.referenceNumber);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                          {tx.date}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {matchingVoucher ? (
                              <button
                                type="button"
                                onClick={() => handleOpenSystemView(matchingVoucher)}
                                className="font-mono font-bold text-primary hover:text-primary-hover hover:underline flex items-center gap-1 cursor-pointer"
                                title="Click to view official payment voucher"
                              >
                                {tx.referenceNumber}
                                <Eye className="h-3 w-3 text-primary/70" />
                              </button>
                            ) : (
                              <span className="font-mono font-bold text-slate-900">
                                {tx.referenceNumber}
                              </span>
                            )}
                          </div>
                          {tx.entryNumber !== tx.referenceNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Entry: {tx.entryNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-slate-800">
                            {tx.accountCode}
                          </span>
                          <div className="text-[10.5px] text-slate-500 truncate max-w-[140px]">
                            {tx.accountName}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="text-slate-900 font-medium line-clamp-1">
                            {tx.description}
                          </div>
                          {tx.source && (
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              Source: {tx.source}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              isReceipt
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                                : 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                            }
                          >
                            {isReceipt ? (
                              <>
                                <ArrowUpRight className="h-3 w-3 mr-0.5 inline text-emerald-600" />
                                + INFLOW
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="h-3 w-3 mr-0.5 inline text-rose-600" />
                                - OUTFLOW
                              </>
                            )}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(tx.runningBalance)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {matchingVoucher && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenSystemView(matchingVoucher)}
                                  className="h-7 px-2 border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] gap-1 font-medium cursor-pointer"
                                  title="Open System View"
                                >
                                  <Eye className="h-3 w-3 text-slate-500" />
                                  <span className="hidden sm:inline">Voucher</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => handleDirectDownload(matchingVoucher, e)}
                                  className="h-7 w-7 p-0 border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] cursor-pointer"
                                  title="Download Payment Voucher"
                                >
                                  <Download className="h-3 w-3 text-slate-500" />
                                </Button>
                              </>
                            )}

                            {tx.journalId ? (
                              <Link to={`/finance/journal/new?journalId=${tx.journalId}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] text-primary hover:bg-primary/10 gap-1 font-medium"
                                  title="Inspect double-entry journal entry"
                                >
                                  GL Entry <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            ) : !matchingVoucher ? (
                              <span className="text-slate-400 text-xs">-</span>
                            ) : null}
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
      ) : (
        /* Vouchers View */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[1080px] text-xs text-left tabular-nums">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Voucher #</th>
                  <th className="py-3 px-3 whitespace-nowrap">Date</th>
                  <th className="py-3 px-3 whitespace-nowrap">Type &amp; Mode</th>
                  <th className="py-3 px-4 whitespace-nowrap">Payee / Particulars</th>
                  <th className="py-3 px-3 whitespace-nowrap">Cash Account</th>
                  <th className="py-3 px-3 whitespace-nowrap">Offset Account</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Amount (LKR)</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary/60" />
                      Loading payment vouchers...
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No payment vouchers found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => {
                    const isPayment = v.voucherType === 'PAYMENT';

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenSystemView(v)}
                            className="font-mono font-bold text-primary hover:text-primary-hover hover:underline cursor-pointer flex items-center gap-1"
                            title="Open System View"
                          >
                            {v.voucherNumber}
                            <Eye className="h-3 w-3 opacity-60" />
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                          {v.date}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge
                              variant="outline"
                              className={
                                isPayment
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                              }
                            >
                              {isPayment ? (
                                <ArrowDownRight className="h-3 w-3 mr-0.5 inline text-rose-600" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 mr-0.5 inline text-emerald-600" />
                              )}
                              {v.voucherType}
                            </Badge>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {v.paymentMethod || 'CASH'}{' '}
                              {v.chequeNumber && `• #${v.chequeNumber}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">
                            {v.payeeOrPayer}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {v.description}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-slate-800">
                            {v.cashAccountCode}
                          </span>
                          <div className="text-[10.5px] text-slate-400 truncate max-w-[120px]">
                            {v.cashAccountName}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-slate-800">
                            {v.offsetAccountCode}
                          </span>
                          <div className="text-[10.5px] text-slate-400 truncate max-w-[140px]">
                            {v.offsetAccountName}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isPayment ? 'text-slate-900' : 'text-emerald-700'
                            }`}
                          >
                            {isPayment ? '-' : '+'} {formatCurrency(v.amount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <StatusBadge
                            status={v.status}
                            label={
                              v.status === 'PENDING_APPROVAL'
                                ? 'Pending Approval'
                                : v.status === 'APPROVED'
                                ? 'Approved'
                                : 'Rejected'
                            }
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* System View Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSystemView(v)}
                              className="h-7 px-2 border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] gap-1 font-semibold cursor-pointer shadow-2xs"
                              title="Open System View"
                            >
                              <Eye className="h-3 w-3 text-slate-500" />
                              <span>View</span>
                            </Button>

                            {/* Direct Download Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleDirectDownload(v, e)}
                              className="h-7 px-2 border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] gap-1 font-semibold cursor-pointer shadow-2xs"
                              title="Download official voucher PDF / HTML"
                            >
                              <Download className="h-3 w-3 text-slate-500" />
                              <span className="hidden sm:inline">Download</span>
                            </Button>

                            {/* Print Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVoucherForView(v);
                                setIsSystemViewOpen(true);
                              }}
                              className="h-7 px-2 border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] gap-1 font-semibold cursor-pointer shadow-2xs"
                              title="Print Official Payment Voucher"
                            >
                              <Printer className="h-3 w-3 text-slate-500" />
                              <span>Print</span>
                            </Button>

                            {/* Inline Approval Actions for Managers */}
                            {v.status === 'PENDING_APPROVAL' && canApprove && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(v.id)}
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1 cursor-pointer shadow-2xs"
                                  title="Direct Approve (MG-02)"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Approve</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedVoucherForReject(v);
                                    setRejectModalOpen(true);
                                  }}
                                  className="h-7 px-2 border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] cursor-pointer"
                                  title="Reject Voucher"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
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
      )}

      {/* 6. New Payment Voucher Dialog */}
      <Dialog open={isNewVoucherOpen} onOpenChange={setIsNewVoucherOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Issue Cash Voucher / Payment Order
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateVoucher} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Voucher Type" required>
                <select
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value as CashVoucherType)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="PAYMENT">Payment (Outflow)</option>
                  <option value="RECEIPT">Receipt (Inflow / Float)</option>
                </select>
              </FormField>

              <FormField label="Category" required>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CashVoucherCategory)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="OFFICE_EXPENSE">Office Expense</option>
                  <option value="PETTY_CASH">Petty Cash Supplies</option>
                  <option value="UTILITIES">Electricity &amp; Utilities</option>
                  <option value="TRAVEL_TRANSPORT">Freight &amp; Travel</option>
                  <option value="FLOAT_REPLENISHMENT">Float Replenishment</option>
                  <option value="OTHER">Other Disbursement</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Payee / Recipient Name" required>
                <Input
                  value={payeeOrPayer}
                  onChange={(e) => setPayeeOrPayer(e.target.value)}
                  placeholder="e.g. CEB, Vendor, Driver..."
                  className="h-8 text-xs font-medium"
                  required
                />
              </FormField>

              <FormField label="Disbursement Amount (LKR)" required>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-xs font-mono font-semibold"
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Payment Method" required>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="CASH">Cash Float</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Transfer / SLIPS</option>
                </select>
              </FormField>

              {paymentMethod === 'CHEQUE' ? (
                <FormField label="Cheque Number" required>
                  <Input
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="e.g. CHQ-889412"
                    className="h-8 text-xs font-mono"
                    required
                  />
                </FormField>
              ) : (
                <FormField label="Bank / Drawee Branch (Optional)">
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Commercial Bank Colombo"
                    className="h-8 text-xs"
                  />
                </FormField>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cash Account (Source / Float)" required>
                <select
                  value={cashAccountCode}
                  onChange={(e) => setCashAccountCode(e.target.value as '1010' | '1040')}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="1040">1040 - Petty Cash Float</option>
                  <option value="1010">1010 - Bank / Operating Float</option>
                </select>
              </FormField>

              <FormField label="Offset GL Expense / Liability" required>
                <select
                  value={offsetAccountCode}
                  onChange={(e) => setOffsetAccountCode(e.target.value)}
                  className="w-full h-8 text-xs px-2 rounded-md border border-slate-200 bg-white font-medium"
                >
                  <option value="5020">5020 - Office &amp; Administrative</option>
                  <option value="5030">5030 - Electricity &amp; Utilities</option>
                  <option value="5040">5040 - Freight &amp; Delivery Transport</option>
                  <option value="2010">2010 - Accounts Payable (Vendor)</option>
                  <option value="1010">1010 - Operating Bank (Float transfer)</option>
                </select>
              </FormField>
            </div>

            {/* Available Float Notice */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] flex items-center justify-between">
              <span className="text-slate-600">Available Float in Account {cashAccountCode}:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(currentFloatBalance)}
              </span>
            </div>

            <FormField label="Narrative / Description" required>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Specific business reason or receipt details..."
                className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-primary font-sans"
                required
              />
            </FormField>

            {canApprove && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Auto-approve immediately as Manager (Direct GL Post)</span>
              </label>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewVoucherOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Issue Voucher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Reject Payment Voucher {selectedVoucherForReject?.voucherNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-600">
              Please enter an explicit reason for rejecting this disbursement. The narrative will be saved to the permanent audit trail:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Missing valid vendor tax invoice or exceeding monthly allowance..."
              className="w-full rounded-md border border-slate-200 p-2 text-xs focus:ring-1 focus:ring-rose-500 font-sans"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReject}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Printable Payment Voucher / System View Modal */}
      <PrintablePaymentVoucher
        voucher={selectedVoucherForView}
        open={isSystemViewOpen}
        onOpenChange={setIsSystemViewOpen}
        onApprove={handleApprove}
        onReject={(v) => {
          setSelectedVoucherForReject(v);
          setRejectModalOpen(true);
        }}
        canApprove={canApprove}
      />
    </div>
  );
}
