import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { arService, ARReceiptItem, AROpenInvoice } from '../services/arService';
import { handoverService } from '../../../services/HandoverService';
import { CashHandover } from '../../../types/handover';
import { useAuth } from '../../../hooks/useAuth';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { evaluate24hHandoverStatus } from '../../../rules/paymentRules';
import { MOCK_CUSTOMERS } from '../../../mock/mockCustomers';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatCard } from '../../../components/common/StatCard';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { CurrencyInput } from '../components/CurrencyInput';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { printerService } from '../../../services/PrinterService';
import { pdfService } from '../../../services/PdfService';
import {
  Search,
  ChevronRight,
  ShieldCheck,
  Landmark,
  Wallet,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  Printer,
  Download,
  CreditCard,
  RotateCcw,
  Receipt,
  Plus,
  Coins,
  ArrowRight,
  Banknote,
  SlidersHorizontal,
  Check,
  Building,
  User,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import Decimal from 'decimal.js';

interface IncomeDeskPageProps {
  defaultTab?: 'handovers' | 'receipts';
}

export function IncomeDeskPage({ defaultTab }: IncomeDeskPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { accounts } = useFinanceLedger();

  const queryTab = searchParams.get('tab');
  const [deskTab, setDeskTab] = useState<'HANDOVERS_QUEUE' | 'CUSTOMER_RECEIPTS'>(() => {
    if (queryTab === 'receipts' || defaultTab === 'receipts') return 'CUSTOMER_RECEIPTS';
    return 'HANDOVERS_QUEUE';
  });

  useEffect(() => {
    if (queryTab === 'receipts' && deskTab !== 'CUSTOMER_RECEIPTS') {
      setDeskTab('CUSTOMER_RECEIPTS');
    } else if (queryTab === 'handovers' && deskTab !== 'HANDOVERS_QUEUE') {
      setDeskTab('HANDOVERS_QUEUE');
    }
  }, [queryTab]);

  const handleDeskTabChange = (tab: 'HANDOVERS_QUEUE' | 'CUSTOMER_RECEIPTS') => {
    setDeskTab(tab);
    setSearchParams({ tab: tab === 'CUSTOMER_RECEIPTS' ? 'receipts' : 'handovers' });
  };

  // -------------------------------------------------------------------------
  // QUEUE & DATA REFRESH
  // -------------------------------------------------------------------------
  const [receipts, setReceipts] = useState<ARReceiptItem[]>(() => arService.getReceipts());
  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = async () => {
    setReceipts(arService.getReceipts());
    try {
      const res = await handoverService.getHandovers({ status: 'ALL' });
      setHandovers(res.data);
    } catch {
      // fallback
    }
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    refreshData();
  }, [refreshKey]);

  // -------------------------------------------------------------------------
  // TAB 1: SALES REP HANDOVERS & APPROVALS QUEUE
  // -------------------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'PENDING_APPROVAL' | 'DUE_24H' | 'OVERDUE_24H' | 'APPROVED' | 'REJECTED'
  >('PENDING_APPROVAL');

  // Unified items list combining AR collection receipts and submitted handover batches
  interface UnifiedQueueItem {
    id: string;
    type: 'RECEIPT' | 'HANDOVER';
    referenceNumber: string;
    customerName: string;
    customerCode?: string;
    salesRepName: string;
    collectedAt: string;
    paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
    amount: number;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    slaStatus: 'DUE_24H' | 'OVERDUE_24H' | 'PENDING_APPROVAL' | 'ON_TRACK';
    rawReceipt?: ARReceiptItem;
    rawHandover?: CashHandover;
  }

  const queueItems = useMemo<UnifiedQueueItem[]>(() => {
    const list: UnifiedQueueItem[] = [];

    // Map AR Receipts
    receipts.forEach((r) => {
      const sla = evaluate24hHandoverStatus({
        collectedAt: r.collectedAt,
        paymentMethod: r.paymentMethod,
        status: r.status,
        handoverStatus: r.status,
      });

      let slaStatus: 'DUE_24H' | 'OVERDUE_24H' | 'PENDING_APPROVAL' | 'ON_TRACK' = 'ON_TRACK';
      if (r.status === 'PENDING_APPROVAL') {
        if (sla.isOverdue) slaStatus = 'OVERDUE_24H';
        else if (sla.isDue) slaStatus = 'DUE_24H';
        else slaStatus = 'PENDING_APPROVAL';
      }

      list.push({
        id: r.id,
        type: 'RECEIPT',
        referenceNumber: r.receiptNumber,
        customerName: r.customerName,
        customerCode: r.customerCode,
        salesRepName: r.collectorName,
        collectedAt: r.collectedAt,
        paymentMethod: r.paymentMethod,
        amount: r.amount,
        status: r.status === 'APPROVED' ? 'APPROVED' : r.status === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL',
        slaStatus,
        rawReceipt: r,
      });
    });

    // Map Submitted Handovers
    handovers.forEach((h) => {
      const isPending = h.status === 'PENDING_APPROVAL';
      let slaStatus: 'DUE_24H' | 'OVERDUE_24H' | 'PENDING_APPROVAL' | 'ON_TRACK' = 'ON_TRACK';

      if (isPending) {
        const submittedTime = new Date(h.submittedAt).getTime();
        const elapsed = (Date.now() - submittedTime) / (1000 * 60 * 60);
        if (elapsed > 24) slaStatus = 'OVERDUE_24H';
        else slaStatus = 'DUE_24H';
      }

      list.push({
        id: h.id,
        type: 'HANDOVER',
        referenceNumber: h.handoverNumber,
        customerName: `${h.customerCount} Customer(s) / ${h.invoiceCount} Invoice(s)`,
        customerCode: `${h.items?.length || 0} items`,
        salesRepName: h.salesRepName,
        collectedAt: h.submittedAt,
        paymentMethod: 'CASH',
        amount: h.totalAmount,
        status: h.status === 'APPROVED' ? 'APPROVED' : h.status === 'REJECTED' ? 'REJECTED' : 'PENDING_APPROVAL',
        slaStatus,
        rawHandover: h,
      });
    });

    return list;
  }, [receipts, handovers]);

  // Metric Computations
  const pendingItems = queueItems.filter((i) => i.status === 'PENDING_APPROVAL');
  const cashInTransit = pendingItems
    .filter((i) => i.paymentMethod === 'CASH')
    .reduce((sum, i) => sum + i.amount, 0);
  const due24hCount = pendingItems.filter((i) => i.slaStatus === 'DUE_24H').length;
  const overdue24hCount = pendingItems.filter((i) => i.slaStatus === 'OVERDUE_24H').length;
  const approvedCount = queueItems.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = queueItems.filter((i) => i.status === 'REJECTED').length;

  const filteredQueue = useMemo(() => {
    return queueItems.filter((item) => {
      if (statusFilter === 'PENDING_APPROVAL' && item.status !== 'PENDING_APPROVAL') return false;
      if (statusFilter === 'APPROVED' && item.status !== 'APPROVED') return false;
      if (statusFilter === 'REJECTED' && item.status !== 'REJECTED') return false;
      if (statusFilter === 'DUE_24H' && (item.status !== 'PENDING_APPROVAL' || item.slaStatus !== 'DUE_24H'))
        return false;
      if (statusFilter === 'OVERDUE_24H' && (item.status !== 'PENDING_APPROVAL' || item.slaStatus !== 'OVERDUE_24H'))
        return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.referenceNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.salesRepName.toLowerCase().includes(q) ||
        item.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [queueItems, statusFilter, search]);

  // -------------------------------------------------------------------------
  // APPROVE / REJECT MODAL STATE
  // -------------------------------------------------------------------------
  const [approvingItem, setApprovingItem] = useState<UnifiedQueueItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<UnifiedQueueItem | null>(null);
  const [inspectingItem, setInspectingItem] = useState<UnifiedQueueItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Approval config
  const [depositAccountId, setDepositAccountId] = useState('acc-1010');
  const [autoFIFO, setAutoFIFO] = useState(true);

  // 1-Click Fast Approval Handler
  const handleFastApprove = async (item: UnifiedQueueItem) => {
    try {
      setProcessingId(item.id);
      if (item.type === 'HANDOVER') {
        await handoverService.approveHandover(
          item.id,
          currentUser,
          'Physical cash received, verified, and settled with field receipts.'
        );
        toast.success(
          `Handover ${item.referenceNumber} verified & approved! Relieved sales rep transit, posted GL double entry, and marked invoices paid.`
        );
      } else {
        await arService.approveReceipt(item.id, {
          depositAccountId:
            item.paymentMethod === 'CHEQUE'
              ? 'acc-1018'
              : item.paymentMethod === 'CASH'
              ? 'acc-1040'
              : 'acc-1010',
          autoFIFO: true,
        });
        toast.success(
          `Receipt ${item.referenceNumber} approved! Posted Dr ${
            item.paymentMethod === 'CHEQUE' ? '1018 PDC Vault' : item.paymentMethod === 'CASH' ? '1040 Cash' : '1010 Bank'
          }, Cr 1020 A/R with FIFO invoice settlement.`
        );
      }
      refreshData();
    } catch (err: any) {
      toast.error(err?.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Rejection Handler
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      toast.error('A mandatory rejection reason is required.');
      return;
    }

    try {
      setProcessingId(rejectingItem.id);
      if (rejectingItem.type === 'HANDOVER') {
        await handoverService.rejectHandover(rejectingItem.id, currentUser, rejectionReason.trim());
        toast.info(
          `Handover ${rejectingItem.referenceNumber} rejected and returned to sales representative.`
        );
      } else {
        arService.rejectReceipt(rejectingItem.id, rejectionReason.trim());
        toast.info(
          `Receipt ${rejectingItem.referenceNumber} rejected and returned to sales representative.`
        );
      }
      setRejectingItem(null);
      setRejectionReason('');
      refreshData();
    } catch (err: any) {
      toast.error(err?.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  // -------------------------------------------------------------------------
  // TAB 2: CUSTOMER PAYMENT RECEIPTS & NEW RECEIPT MODAL
  // -------------------------------------------------------------------------
  const [selectedReceiptForView, setSelectedReceiptForView] = useState<ARReceiptItem | null>(null);
  const [isNewReceiptModalOpen, setIsNewReceiptModalOpen] = useState(false);

  // New Receipt Form State
  const [newReceiptCustomer, setNewReceiptCustomer] = useState(MOCK_CUSTOMERS[0]?.id || '');
  const [newReceiptDate, setNewReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [newReceiptMethod, setNewReceiptMethod] = useState<'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [newReceiptDepositAccount, setNewReceiptDepositAccount] = useState('acc-1010');
  const [newReceiptAmount, setNewReceiptAmount] = useState<number>(0);
  const [newReceiptChequeNo, setNewReceiptChequeNo] = useState('');
  const [newReceiptDrawerBank, setNewReceiptDrawerBank] = useState('Commercial Bank of Ceylon');
  const [newReceiptChequeDate, setNewReceiptChequeDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [newReceiptIncomeAccount, setNewReceiptIncomeAccount] = useState('acc-1020');
  const [newReceiptRemarks, setNewReceiptRemarks] = useState('');
  const [newReceiptAllocations, setNewReceiptAllocations] = useState<Record<string, number>>({});
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [receiptsSearch, setReceiptsSearch] = useState('');
  const [receiptsDateFrom, setReceiptsDateFrom] = useState('');
  const [receiptsDateTo, setReceiptsDateTo] = useState('');
  const [receiptsStatusFilter, setReceiptsStatusFilter] = useState('ALL');

  const creditIncomeAccounts = useMemo(() => {
    return accounts.filter(
      (a) => a.accountClass === 'INCOME' || a.code === '1020' || a.code.startsWith('40')
    );
  }, [accounts]);

  useEffect(() => {
    if (creditIncomeAccounts.length > 0 && !newReceiptIncomeAccount) {
      const ar = creditIncomeAccounts.find((a) => a.code === '1020');
      setNewReceiptIncomeAccount(ar ? ar.id : creditIncomeAccounts[0].id);
    }
  }, [creditIncomeAccounts, newReceiptIncomeAccount]);

  const clearedFilteredReceipts = useMemo(() => {
    return receipts
      .filter((r) => r.status === 'APPROVED')
      .filter((r) => {
        if (receiptsDateFrom && r.collectedAt < receiptsDateFrom) return false;
        if (receiptsDateTo && r.collectedAt > receiptsDateTo) return false;
        if (receiptsSearch.trim()) {
          const q = receiptsSearch.toLowerCase();
          const match =
            r.receiptNumber.toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q) ||
            r.customerCode.toLowerCase().includes(q) ||
            (r.remarks && r.remarks.toLowerCase().includes(q));
          if (!match) return false;
        }
        return true;
      });
  }, [receipts, receiptsSearch, receiptsDateFrom, receiptsDateTo]);

  // Customer Open Invoices for New Receipt Modal
  const customerOpenInvoices: AROpenInvoice[] = useMemo(() => {
    if (!newReceiptCustomer) return [];
    return arService.getOpenInvoicesForCustomer(newReceiptCustomer);
  }, [newReceiptCustomer, refreshKey]);

  // Auto-FIFO button in New Receipt Modal
  const handleAutoFIFOAllocate = () => {
    if (!newReceiptCustomer || newReceiptAmount <= 0) {
      toast.error('Please enter a receipt amount first to auto-allocate.');
      return;
    }
    const fifo = arService.calculateAutoFIFO(newReceiptCustomer, newReceiptAmount);
    setNewReceiptAllocations(fifo);
    toast.info('Applied Auto-FIFO allocations across oldest open invoices.');
  };

  const handleClearAllocations = () => {
    setNewReceiptAllocations({});
  };

  const handleToggleInvoice = (inv: AROpenInvoice, checked: boolean) => {
    if (!checked) {
      setNewReceiptAllocations((prev) => {
        const next = { ...prev };
        delete next[inv.id];
        return next;
      });
      return;
    }

    // Checking: allocate remaining available or balance due
    const currentAppliedWithoutThis = Object.entries(newReceiptAllocations)
      .filter(([id]) => id !== inv.id)
      .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
    const remainingUnallocated = Math.max(0, (newReceiptAmount || 0) - currentAppliedWithoutThis);
    const toApply = remainingUnallocated > 0 ? Math.min(inv.balanceDue, remainingUnallocated) : inv.balanceDue;

    setNewReceiptAllocations((prev) => ({
      ...prev,
      [inv.id]: toApply,
    }));
  };

  const handleAllocationValueChange = (invId: string, val: number) => {
    const inv = customerOpenInvoices.find((i) => i.id === invId);
    const maxVal = inv ? inv.balanceDue : val;
    const clamped = Math.max(0, Math.min(val, maxVal));
    setNewReceiptAllocations((prev) => {
      const next = { ...prev };
      if (clamped <= 0) {
        delete next[invId];
      } else {
        next[invId] = clamped;
      }
      return next;
    });
  };

  // Total applied vs unallocated calculations
  const totalReceiptApplied = useMemo(() => {
    return Object.values(newReceiptAllocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [newReceiptAllocations]);

  const isOverAllocated = useMemo(() => {
    return totalReceiptApplied > newReceiptAmount;
  }, [totalReceiptApplied, newReceiptAmount]);

  const unallocatedOnAccount = useMemo(() => {
    const total = new Decimal(newReceiptAmount || 0);
    const applied = new Decimal(totalReceiptApplied || 0);
    return Math.max(0, total.minus(applied).toNumber());
  }, [newReceiptAmount, totalReceiptApplied]);

  // Create & Save Receipt Handler
  const handleSaveNewReceipt = async () => {
    if (!newReceiptCustomer) {
      toast.error('Please select a customer.');
      return;
    }
    if (newReceiptAmount <= 0) {
      toast.error('Receipt amount must be greater than zero.');
      return;
    }
    if (isOverAllocated) {
      toast.error(
        `Total applied to invoices (LKR ${formatCurrency(
          totalReceiptApplied
        )}) exceeds receipt amount (LKR ${formatCurrency(newReceiptAmount)}).`
      );
      return;
    }
    if (newReceiptMethod === 'CHEQUE' && !newReceiptChequeNo.trim()) {
      toast.error('Please enter a cheque number.');
      return;
    }

    const cust = MOCK_CUSTOMERS.find((c) => c.id === newReceiptCustomer);
    if (!cust) return;

    try {
      setSavingReceipt(true);
      const selectedIncomeAcc = accounts.find((a) => a.id === newReceiptIncomeAccount);
      const created = await arService.createReceipt({
        customerId: cust.id,
        customerName: cust.name,
        customerCode: cust.code,
        collectedAt: newReceiptDate,
        paymentMethod: newReceiptMethod,
        depositAccountId: newReceiptDepositAccount,
        incomeAccountId: newReceiptIncomeAccount,
        incomeAccountCode: selectedIncomeAcc?.code || '1020',
        remarks: newReceiptRemarks.trim() || undefined,
        amount: newReceiptAmount,
        chequeNumber: newReceiptMethod === 'CHEQUE' ? newReceiptChequeNo : undefined,
        drawerBank: newReceiptMethod === 'CHEQUE' ? newReceiptDrawerBank : undefined,
        chequeDate: newReceiptMethod === 'CHEQUE' ? newReceiptChequeDate : undefined,
        allocations: newReceiptAllocations,
        autoApprove: true,
      });

      toast.success(
        `Receipt ${created.receiptNumber} created! Cleared LKR ${formatCurrency(
          totalReceiptApplied
        )} against open invoices. Unallocated LKR ${formatCurrency(
          unallocatedOnAccount
        )} held on customer account.`
      );

      setIsNewReceiptModalOpen(false);
      setNewReceiptAmount(0);
      setNewReceiptAllocations({});
      setNewReceiptChequeNo('');
      refreshData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save receipt');
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16" data-testid="unified-income-desk">
      {/* Canonical Page Header */}
      <PageHeader
        title="Income & Collections Desk"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Income & Collections' },
        ]}
        onBack={() => navigate('/finance')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ar/pdc-vault')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>PDC Vault (1018)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/notes?tab=credit')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span>Credit Notes</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ar/allocate')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              <span>Batch Allocation</span>
            </Button>
          </div>
        }
      />

      {/* Al Akleel-Style 2-Tab Segmented Desk Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80">
          <button
            type="button"
            onClick={() => handleDeskTabChange('HANDOVERS_QUEUE')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              deskTab === 'HANDOVERS_QUEUE'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Banknote className="h-3.5 w-3.5 text-amber-600" />
            <span>Rep Handovers & Approvals (Queue)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
              {pendingItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleDeskTabChange('CUSTOMER_RECEIPTS')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              deskTab === 'CUSTOMER_RECEIPTS'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Receipt className="h-3.5 w-3.5 text-primary" />
            <span>Customer Payment Receipts</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-mono">
              {receipts.length}
            </span>
          </button>
        </div>

        {/* Action Button for New Receipt on Tab 2 */}
        {deskTab === 'CUSTOMER_RECEIPTS' ? (
          <Button
            size="sm"
            onClick={() => setIsNewReceiptModalOpen(true)}
            className="h-8 px-3 text-xs bg-primary hover:bg-primary-dark text-white font-semibold gap-1.5 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ New Receipt</span>
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground hidden lg:flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Workflow: Field Collection → Sales Rep Physical Handover → Finance Verification</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REP HANDOVERS & APPROVALS (QUEUE)                                  */}
      {/* ========================================================================= */}
      {deskTab === 'HANDOVERS_QUEUE' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3 border-amber-200 bg-amber-50/50 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-800">Cash In Transit</span>
                <Wallet className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-1 text-lg font-bold font-mono text-amber-950">
                {formatCurrency(cashInTransit)}
              </div>
              <span className="text-[10px] text-amber-700">Held by reps pending approval</span>
            </Card>

            <StatCard
              title="Pending Approval"
              value={pendingItems.length}
              icon={Clock}
              variant="amber"
              selected={statusFilter === 'PENDING_APPROVAL'}
              onClick={() => setStatusFilter('PENDING_APPROVAL')}
            />

            <StatCard
              title="Due < 24 Hours"
              value={due24hCount}
              icon={Clock}
              variant="indigo"
              selected={statusFilter === 'DUE_24H'}
              onClick={() => setStatusFilter('DUE_24H')}
            />

            <StatCard
              title="Overdue > 24 Hours"
              value={overdue24hCount}
              icon={AlertCircle}
              variant="rose"
              selected={statusFilter === 'OVERDUE_24H'}
              onClick={() => setStatusFilter('OVERDUE_24H')}
            />

            <StatCard
              title="Cleared / Approved"
              value={approvedCount}
              icon={CheckCircle2}
              variant="emerald"
              selected={statusFilter === 'APPROVED'}
              onClick={() => setStatusFilter('APPROVED')}
            />
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by receipt #, handover #, rep, or customer..."
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Showing <strong className="text-foreground">{filteredQueue.length}</strong> collection(s)
              </span>
            </div>
          </div>

          {/* Unified Approvals Queue Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[1000px] text-left text-xs tabular-nums">
                <thead className="bg-muted/60 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4">Sales Rep (Transit)</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Handover SLA (24h)</th>
                    <th className="py-3 px-4 text-right">Amount (LKR)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                        No pending handovers or collection receipts matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => {
                      const isPending = item.status === 'PENDING_APPROVAL';

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => setInspectingItem(item)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {item.referenceNumber}
                            <span className="block text-[10px] text-muted-foreground font-normal">
                              {item.type === 'HANDOVER' ? 'Handover Batch' : 'Field Receipt'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <User className="h-3 w-3 text-primary" />
                              <span>{item.salesRepName}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateTime(item.collectedAt)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground truncate max-w-[200px]">
                              {item.customerName}
                            </div>
                            {item.customerCode && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {item.customerCode}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-[10px] py-0 font-medium capitalize">
                              {item.paymentMethod.toLowerCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            {item.slaStatus === 'OVERDUE_24H' ? (
                              <Badge variant="destructive" className="text-[10px] py-0 font-semibold gap-1">
                                <AlertCircle className="h-3 w-3" />
                                <span>Overdue &gt; 24h</span>
                              </Badge>
                            ) : item.slaStatus === 'DUE_24H' ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 font-semibold border-amber-300 text-amber-800 bg-amber-50 gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                <span>Due &lt; 24h</span>
                              </Badge>
                            ) : item.status === 'APPROVED' ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 font-semibold border-emerald-300 text-emerald-800 bg-emerald-50 gap-1"
                              >
                                <Check className="h-3 w-3" />
                                <span>Cleared</span>
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">On Track</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] py-0 font-semibold',
                                item.status === 'APPROVED' && 'border-emerald-300 bg-emerald-50 text-emerald-800',
                                item.status === 'PENDING_APPROVAL' && 'border-amber-300 bg-amber-50 text-amber-800',
                                item.status === 'REJECTED' && 'border-rose-300 bg-rose-50 text-rose-800'
                              )}
                            >
                              {item.status === 'APPROVED'
                                ? 'Approved'
                                : item.status === 'PENDING_APPROVAL'
                                ? 'Pending'
                                : 'Rejected'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setInspectingItem(item)}
                                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                              >
                                Inspect
                              </Button>

                              {isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleFastApprove(item)}
                                    disabled={processingId === item.id}
                                    className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1 shadow-2xs"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Verify & Approve</span>
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setRejectingItem(item)}
                                    className="h-7 px-2 text-rose-600 hover:bg-rose-50 border-rose-200 text-xs font-medium"
                                  >
                                    Reject
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMER PAYMENT RECEIPTS                                          */}
      {/* ========================================================================= */}
      {deskTab === 'CUSTOMER_RECEIPTS' && (
        <div className="space-y-4">
          {/* Header & Title matching Image 4 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Customer Cleared Receipts Registry</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit registry of cleared customer payments, receipts, and income allocations.
              </p>
            </div>
          </div>

          {/* Single-Line Filter Bar (Image 4) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/90 bg-card p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[180px] max-w-xs flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={receiptsSearch}
                  onChange={(e) => setReceiptsSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 text-xs h-9"
                />
              </div>

              <Select
                value={receiptsStatusFilter}
                onChange={(e) => setReceiptsStatusFilter(e.target.value)}
                className="h-9 text-xs w-36"
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Cleared</option>
                <option value="PENDING_APPROVAL">Pending</option>
              </Select>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground font-medium">From:</span>
                <Input
                  type="date"
                  value={receiptsDateFrom}
                  onChange={(e) => setReceiptsDateFrom(e.target.value)}
                  className="h-9 text-xs w-36"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground font-medium">To:</span>
                <Input
                  type="date"
                  value={receiptsDateTo}
                  onChange={(e) => setReceiptsDateTo(e.target.value)}
                  className="h-9 text-xs w-36"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReceiptsSearch('');
                  setReceiptsStatusFilter('ALL');
                  setReceiptsDateFrom('');
                  setReceiptsDateTo('');
                }}
                className="h-9 text-xs text-muted-foreground gap-1.5"
                title="Reset Filters"
              >
                <span>Refresh</span>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Total: <span className="font-semibold text-foreground">{clearedFilteredReceipts.length}</span> cleared receipts
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left cols: Receipts Registry */}
            <div className={cn(selectedReceiptForView ? "lg:col-span-7" : "lg:col-span-12", "space-y-3")}>
              <div className="rounded-lg border border-border overflow-hidden bg-card shadow-xs">
                <div className="overflow-x-auto w-full max-h-[500px]">
                  <table className="w-full text-left text-xs tabular-nums">
                    <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-3 w-24">AUDIT #</th>
                        <th className="px-3.5 py-3 w-32">RECEIPT #</th>
                        <th className="px-3.5 py-3 w-28">DATE</th>
                        <th className="px-3.5 py-3">CUSTOMER / PAYER</th>
                        <th className="px-3.5 py-3 w-36">ACCOUNT</th>
                        <th className="px-3.5 py-3 w-24 text-center">METHOD</th>
                        <th className="px-3.5 py-3 text-right w-32">AMOUNT</th>
                        <th className="px-3.5 py-3 text-center w-24">STATUS</th>
                        <th className="px-3.5 py-3 text-right w-20">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {clearedFilteredReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                            No cleared customer receipts found.
                          </td>
                        </tr>
                      ) : (
                        clearedFilteredReceipts.map((r, idx) => {
                          const isSelected = selectedReceiptForView?.id === r.id;
                          return (
                            <tr
                              key={r.id}
                              onClick={() => setSelectedReceiptForView(r)}
                              className={cn(
                                'cursor-pointer transition-colors hover:bg-muted/40',
                                isSelected && 'bg-primary/10 border-l-3 border-primary'
                              )}
                            >
                              <td className="px-3.5 py-3 font-mono text-muted-foreground text-[11px]">
                                AUD-{4000 + idx}
                              </td>
                              <td className="px-3.5 py-3 font-mono font-bold text-foreground">
                                {r.receiptNumber}
                              </td>
                              <td className="px-3.5 py-3 text-muted-foreground font-mono text-[11px]">
                                {formatDate(r.collectedAt)}
                              </td>
                              <td className="px-3.5 py-3">
                                <div className="font-semibold text-foreground truncate max-w-[160px]">{r.customerName}</div>
                                <span className="text-[10px] text-muted-foreground">{r.customerCode}</span>
                              </td>
                              <td className="px-3.5 py-3">
                                <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                                  {r.incomeAccountCode || '1020'} / {r.depositAccountCode || '1010'}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] font-mono py-0 font-medium',
                                    r.paymentMethod === 'CASH' && 'bg-amber-50 text-amber-700 border-amber-200',
                                    r.paymentMethod === 'BANK_TRANSFER' && 'bg-sky-50 text-sky-700 border-sky-200',
                                    r.paymentMethod === 'CHEQUE' && 'bg-purple-50 text-purple-700 border-purple-200'
                                  )}
                                >
                                  {r.paymentMethod === 'BANK_TRANSFER' ? 'BANK' : r.paymentMethod}
                                </Badge>
                              </td>
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-foreground">
                                {formatCurrency(r.amount)}
                              </td>
                              <td className="px-3.5 py-3 text-center">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold py-0 border-emerald-300 bg-emerald-50 text-emerald-800"
                                >
                                  Cleared
                                </Badge>
                              </td>
                              <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedReceiptForView(r)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Inspect Receipt"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Selected Receipt & Open Invoices Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <span>
                    {selectedReceiptForView
                      ? `Invoices: ${selectedReceiptForView.customerName}`
                      : 'Select a Receipt to Inspect'}
                  </span>
                </h3>
              </div>

              {selectedReceiptForView ? (
                <Card className="p-4 border-border space-y-3 bg-card shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                    <div>
                      <span className="font-mono text-sm font-bold text-primary">
                        {selectedReceiptForView.receiptNumber}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Collected on {formatDate(selectedReceiptForView.collectedAt)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-foreground block">
                        {formatCurrency(selectedReceiptForView.amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        {selectedReceiptForView.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {/* Customer outstanding invoices list */}
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-1.5">
                      Customer Open Outstanding Invoices
                    </h4>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                      {arService.getOpenInvoicesForCustomer(selectedReceiptForView.customerId).length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-lg">
                          All invoices for this customer are fully settled.
                        </div>
                      ) : (
                        arService
                          .getOpenInvoicesForCustomer(selectedReceiptForView.customerId)
                          .map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs border border-border/60"
                            >
                              <div>
                                <span className="font-mono font-bold text-primary">{inv.invoiceNumber}</span>
                                <span className="text-[10px] text-muted-foreground block">Date {formatDate(inv.date)}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-semibold text-rose-600 block">
                                  {formatCurrency(inv.balanceDue)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  of {formatCurrency(inv.originalAmount)}
                                </span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Print & thermal action */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        printerService.printPaymentReceipt({
                          id: selectedReceiptForView.id,
                          receiptNumber: selectedReceiptForView.receiptNumber,
                          customerId: selectedReceiptForView.customerId,
                          customerName: selectedReceiptForView.customerName,
                          customerCode: selectedReceiptForView.customerCode,
                          amount: selectedReceiptForView.amount,
                          paymentMethod: selectedReceiptForView.paymentMethod as any,
                          salesRepId: 'usr-1',
                          salesRepName: selectedReceiptForView.collectorName,
                          collectedAt: selectedReceiptForView.collectedAt,
                          status: 'APPROVED',
                        } as any)
                      }
                      className="text-xs h-7 px-2.5 gap-1"
                    >
                      <Printer className="h-3 w-3" />
                      <span>Print Thermal</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        pdfService.generatePaymentReceiptPdf({
                          id: selectedReceiptForView.id,
                          receiptNumber: selectedReceiptForView.receiptNumber,
                          customerId: selectedReceiptForView.customerId,
                          customerName: selectedReceiptForView.customerName,
                          customerCode: selectedReceiptForView.customerCode,
                          amount: selectedReceiptForView.amount,
                          paymentMethod: selectedReceiptForView.paymentMethod as any,
                          salesRepId: 'usr-1',
                          salesRepName: selectedReceiptForView.collectorName,
                          collectedAt: selectedReceiptForView.collectedAt,
                          status: 'APPROVED',
                        } as any)
                      }
                      className="text-xs h-7 px-2.5 gap-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>PDF</span>
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  Select any cleared receipt on the left to inspect customer unpaid invoices and print options.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: + NEW RECEIPT WITH AL AKLEEL INLINE OPEN INVOICE SETTLEMENT TABLE  */}
      {/* ========================================================================= */}
      <Dialog open={isNewReceiptModalOpen} onOpenChange={setIsNewReceiptModalOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <span>+ Record New Customer Payment Receipt</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record receipt and settle against customer open invoices with Al Akleel inline allocation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* LEDGER ACCOUNTS & RECEIPT DETAILS (Two Distinct Cards matching Image 3) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* LEDGER ACCOUNTS */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-foreground">
                  <Landmark className="h-3.5 w-3.5 text-primary" />
                  <span>Ledger Accounts</span>
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    Credit Account (Income / Revenue / A/R) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={newReceiptIncomeAccount}
                    onChange={(e) => setNewReceiptIncomeAccount(e.target.value)}
                    className="h-8 text-xs"
                  >
                    {creditIncomeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name} ({a.accountClass})
                      </option>
                    ))}
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Select respective income account (4010, 4020) or receivables (1020).
                  </p>
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    Debit Account (Receiving Asset: Bank/Cash) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={newReceiptDepositAccount}
                    onChange={(e) => setNewReceiptDepositAccount(e.target.value)}
                    className="h-8 text-xs"
                  >
                    {accounts
                      .filter((a) => a.accountClass === 'ASSET' && (a.code.startsWith('101') || a.code === '1040'))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>

              {/* RECEIPT DETAILS */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/80 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-foreground">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Receipt Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">
                      Customer / Payer <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={newReceiptCustomer}
                      onChange={(e) => {
                        setNewReceiptCustomer(e.target.value);
                        setNewReceiptAllocations({});
                      }}
                      className="h-8 text-xs"
                    >
                      {MOCK_CUSTOMERS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Receipt Date <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={newReceiptDate}
                      onChange={(e) => setNewReceiptDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      value={newReceiptMethod}
                      onChange={(e) => {
                        const m = e.target.value as any;
                        setNewReceiptMethod(m);
                        if (m === 'CASH') {
                          const cash = accounts.find((a) => a.code === '1040');
                          if (cash) setNewReceiptDepositAccount(cash.id);
                        } else if (m === 'BANK_TRANSFER') {
                          const bank = accounts.find((a) => a.code === '1010');
                          if (bank) setNewReceiptDepositAccount(bank.id);
                        } else if (m === 'CHEQUE') {
                          const chq = accounts.find((a) => a.code === '1018');
                          if (chq) setNewReceiptDepositAccount(chq.id);
                        }
                      }}
                      className="h-8 text-xs"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (1010)</option>
                      <option value="CASH">Cash in Hand (1040)</option>
                      <option value="CHEQUE">Cheque / PDC Vault (1018)</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Receipt Total Amount (LKR) <span className="text-rose-500">*</span>
                    </label>
                    <CurrencyInput
                      value={newReceiptAmount}
                      onChange={(val) => setNewReceiptAmount(val)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Cheque Details if Cheque */}
                {newReceiptMethod === 'CHEQUE' && (
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div>
                      <label className="block font-semibold mb-0.5 text-[10px]">Cheque No</label>
                      <Input
                        value={newReceiptChequeNo}
                        onChange={(e) => setNewReceiptChequeNo(e.target.value)}
                        placeholder="CHQ-90124"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-0.5 text-[10px]">Bank</label>
                      <Input
                        value={newReceiptDrawerBank}
                        onChange={(e) => setNewReceiptDrawerBank(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-0.5 text-[10px]">Due Date</label>
                      <Input
                        type="date"
                        value={newReceiptChequeDate}
                        onChange={(e) => setNewReceiptChequeDate(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">
                Remarks / Reference
              </label>
              <Input
                value={newReceiptRemarks}
                onChange={(e) => setNewReceiptRemarks(e.target.value)}
                placeholder="e.g. Settlement for commercial goods, service contract ref, or wire transfer slip..."
                className="h-8 text-xs"
              />
            </div>

            {/* Inline Open Invoices Settlement Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">
                    Open Invoices for Selected Customer ({customerOpenInvoices.length})
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Check or enter amount to allocate payment against each invoice.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFIFOAllocate}
                    className="h-7 text-xs px-2.5 text-primary border-primary/40 font-semibold"
                  >
                    Auto-FIFO Allocate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllocations}
                    className="h-7 text-xs px-2 text-muted-foreground"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
                <div className="overflow-x-auto w-full max-h-[220px]">
                  <table className="w-full text-left text-xs tabular-nums">
                    <thead className="bg-muted/60 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 text-center w-12">Pay</th>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Date / Due</th>
                        <th className="py-2 px-3 text-right">Invoice Total</th>
                        <th className="py-2 px-3 text-right">Balance Due</th>
                        <th className="py-2 px-3 text-right w-36">Amount to Apply</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {customerOpenInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                            No open unpaid invoices found for this customer. Total receipt will be held on account.
                          </td>
                        </tr>
                      ) : (
                        customerOpenInvoices.map((inv) => {
                          const applied = newReceiptAllocations[inv.id] || 0;
                          const isChecked = applied > 0;
                          return (
                            <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleToggleInvoice(inv, e.target.checked)}
                                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                  aria-label={`Pay invoice ${inv.invoiceNumber}`}
                                />
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-primary">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-2 px-3 text-[11px] text-muted-foreground">
                                <div>{formatDate(inv.date)}</div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                                {formatCurrency(inv.originalAmount)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                                {formatCurrency(inv.balanceDue)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <CurrencyInput
                                  value={applied || ''}
                                  onChange={(val) => handleAllocationValueChange(inv.id, val)}
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Real-Time Live Settlement Balance Card */}
              <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="font-semibold text-foreground block">
                      Receipt Amount: <strong className="font-mono text-primary">{formatCurrency(newReceiptAmount)}</strong>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Total Applied to Invoices: <strong className="font-mono">{formatCurrency(totalReceiptApplied)}</strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block font-medium">Unallocated on Account</span>
                    <span
                      className={cn(
                        'font-mono font-bold text-sm',
                        isOverAllocated ? 'text-rose-600' : unallocatedOnAccount > 0 ? 'text-amber-600' : 'text-emerald-600'
                      )}
                    >
                      {formatCurrency(unallocatedOnAccount)}
                    </span>
                    {unallocatedOnAccount > 0 && !isOverAllocated && (
                      <span className="text-[10px] text-amber-700 block">
                        Will remain as customer credit / advance
                      </span>
                    )}
                  </div>
                </div>

                {isOverAllocated && (
                  <div className="text-rose-600 font-semibold flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-2 rounded-lg text-[11px]">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Allocations exceed receipt total by {formatCurrency(totalReceiptApplied - newReceiptAmount)}! Please reduce applied amounts before saving.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewReceiptModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveNewReceipt}
              disabled={savingReceipt || newReceiptAmount <= 0}
              className="bg-primary hover:bg-primary-dark text-white font-semibold"
            >
              {savingReceipt ? 'Posting...' : 'Save & Post Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: MANDATORY REJECTION REASON                                         */}
      {/* ========================================================================= */}
      <Dialog open={!!rejectingItem} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span>Reject Collection ({rejectingItem?.referenceNumber})</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              State the exact reason for rejecting this cash collection. The collection will be returned to{' '}
              {rejectingItem?.salesRepName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <label className="block font-semibold">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Deposit slip seal is illegible, cheque drawer name mismatch, or cash shortage..."
              className="text-xs"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectingItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: INSPECT ITEM DETAILS                                               */}
      {/* ========================================================================= */}
      <Dialog open={!!inspectingItem} onOpenChange={(open) => !open && setInspectingItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Inspection: {inspectingItem?.referenceNumber}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              High-detail breakdown of collection handover and physical receipt.
            </DialogDescription>
          </DialogHeader>

          {inspectingItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Reference</span>
                  <span className="font-mono font-bold text-foreground">{inspectingItem.referenceNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Amount</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(inspectingItem.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Sales Rep</span>
                  <span className="font-semibold text-foreground">{inspectingItem.salesRepName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Payment Method</span>
                  <span className="capitalize font-semibold text-foreground">{inspectingItem.paymentMethod.toLowerCase()}</span>
                </div>
              </div>

              {inspectingItem.rawReceipt?.attachmentUrl && (
                <div>
                  <span className="font-semibold text-foreground block mb-1">Physical Deposit Slip / Cheque Image</span>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={inspectingItem.rawReceipt.attachmentUrl}
                      alt="Deposit Slip"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectingItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
