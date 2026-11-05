import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { Invoice } from '../../types/invoice';
import { customerService } from '../../services/CustomerService';
import { invoiceService } from '../../services/InvoiceService';
import { useAuth } from '../../hooks/useAuth';
import { useAreas } from '../../hooks/useAreas';
import { MOCK_USERS } from '../../mock/mockUsers';
import {
  evaluateCustomerPaymentStatus,
  getDaysOverdue,
  CustomerPaymentStatusMeta,
} from '../../rules/customerPaymentRules';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  DollarSign,
  AlertCircle,
  Users,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Building,
  Store,
  MapPin,
  UserCheck,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  ArrowUpRight,
  ArrowRight,
  Receipt,
  Download,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';
import { AreaPerformanceOverviewCard } from './components/AreaPerformanceOverviewCard';
import { CustomerInvoicesQuickModal } from './components/CustomerInvoicesQuickModal';
import { whatsAppService } from '../../services/WhatsAppService';

type CollectionStatusFilter = 'ALL' | 'OVERDUE' | 'DUE_SOON' | 'DUE_24H' | 'PENDING' | 'SETTLED';
type BalanceFilter = 'ALL' | 'OUTSTANDING_ONLY' | 'OVERDUE_ONLY' | 'SETTLED_ONLY';
type ViewMode = 'table' | 'cards';

interface CustomerPaymentsTabProps {
  onSelectCustomer?: (customer: Customer) => void;
  className?: string;
}

export function CustomerPaymentsTab({ onSelectCustomer, className }: CustomerPaymentsTabProps) {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { areas } = useAreas();

  // Primary data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Management Filter states
  const [selectedAreaId, setSelectedAreaId] = useState<string>('ALL');
  const [selectedRepId, setSelectedRepId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<CollectionStatusFilter>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Quick invoice preview modal state
  const [inspectCustomer, setInspectCustomer] = useState<Customer | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Load live data
  const loadData = async () => {
    try {
      setLoading(true);
      const isRep = role === 'SALES_REP';
      const [custRes, invRes] = await Promise.all([
        customerService.listCustomers({
          pageSize: 200,
          assignedRepId: isRep ? currentUser.id : undefined,
        }),
        invoiceService.getInvoices({
          pageSize: 300,
          salesRepId: isRep ? currentUser.id : undefined,
        }),
      ]);

      setCustomers(custRes.data);
      setInvoices(invRes.data);
    } catch (err) {
      console.error('Failed to load customers or invoices:', err);
      toast.error('Failed to load live ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, currentUser.id]);

  // If user is an Area Manager, default filter to their area
  useEffect(() => {
    if (role === 'AREA_MANAGER' && currentUser?.areaId && selectedAreaId === 'ALL') {
      setSelectedAreaId(currentUser.areaId);
    }
  }, [role, currentUser?.areaId]);

  // When area changes, if current selectedRepId does not belong to the newly selected area, reset rep
  useEffect(() => {
    if (selectedAreaId !== 'ALL' && selectedRepId !== 'ALL') {
      const rep = MOCK_USERS.find((u) => u.id === selectedRepId);
      if (rep && rep.areaId !== selectedAreaId) {
        setSelectedRepId('ALL');
      }
    }
  }, [selectedAreaId, selectedRepId]);

  // Derived list of all sales reps in system
  const salesReps = useMemo(() => {
    return MOCK_USERS.filter((u) => u.role === 'SALES_REP' && u.isActive);
  }, []);

  // Filtered sales reps based on selected area
  const availableRepsForSelectedArea = useMemo(() => {
    if (selectedAreaId === 'ALL') return salesReps;
    return salesReps.filter((r) => r.areaId === selectedAreaId);
  }, [salesReps, selectedAreaId]);

  // Selected Area details
  const selectedAreaObj = useMemo(() => {
    if (selectedAreaId === 'ALL') return null;
    return areas.find((a) => a.id === selectedAreaId) || null;
  }, [areas, selectedAreaId]);

  // Selected Sales Rep details
  const selectedRepObj = useMemo(() => {
    if (selectedRepId === 'ALL') return null;
    return salesReps.find((r) => r.id === selectedRepId) || null;
  }, [salesReps, selectedRepId]);

  // Navigate to FIFO Payment collection screen
  const handleSelectCustomer = (customer: Customer) => {
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    } else {
      navigate(`/payments/collect/${customer.id}`);
    }
  };

  // Quick WhatsApp reminder
  const handleWhatsApp = (customer: Customer, totalOutstanding: number) => {
    whatsAppService.openChat(
      customer.phone,
      `Hello ${customer.contactPerson}, this is DNS ERP Customer Credit Desk regarding your current balance of ${formatCurrency(
        totalOutstanding
      )} for ${customer.name}. Please confirm your settlement date.`
    );
  };

  // Compute rich ledger metadata for every customer
  const customerLedgerMap = useMemo(() => {
    const map = new Map<
      string,
      {
        meta: CustomerPaymentStatusMeta;
        oldestOverdueInvoice: Invoice | null;
        oldestOverdueDays: number;
        openInvoices: Invoice[];
        nextDueDate: string | null;
      }
    >();

    customers.forEach((c) => {
      const meta = evaluateCustomerPaymentStatus(c, invoices);
      const cInvoices = invoices.filter(
        (i) => i.customerId === c.id && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.balanceAmount > 0
      );

      // Find oldest overdue invoice
      let oldestOverdueInvoice: Invoice | null = null;
      let oldestOverdueDays = 0;
      let nextDueDate: string | null = null;

      cInvoices.forEach((inv) => {
        const days = getDaysOverdue(inv.dueDate);
        if (days > 0) {
          if (days > oldestOverdueDays) {
            oldestOverdueDays = days;
            oldestOverdueInvoice = inv;
          }
        } else {
          // Future due date
          if (!nextDueDate || inv.dueDate < nextDueDate) {
            nextDueDate = inv.dueDate;
          }
        }
      });

      if (!nextDueDate && oldestOverdueInvoice) {
        nextDueDate = oldestOverdueInvoice.dueDate;
      }

      map.set(c.id, {
        meta,
        oldestOverdueInvoice,
        oldestOverdueDays,
        openInvoices: cInvoices,
        nextDueDate,
      });
    });

    return map;
  }, [customers, invoices]);

  // Top Management Dashboard Overall KPIs
  const globalKPIs = useMemo(() => {
    let totalReceivables = 0;
    let totalOverdue = 0;
    let totalDueSoon = 0;
    let debtorCount = 0;

    customers.forEach((c) => {
      const data = customerLedgerMap.get(c.id);
      if (data) {
        totalReceivables += data.meta.totalOutstanding;
        totalOverdue += data.meta.totalOverdue;
        totalDueSoon += data.meta.totalNearDue;
        if (data.meta.totalOutstanding > 0) debtorCount++;
      }
    });

    // Collected amount this month from all paid/partially paid invoices
    const collectedThisMonth = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalTarget = totalReceivables + collectedThisMonth;
    const recoveryRate = totalTarget > 0 ? Math.round((collectedThisMonth / totalTarget) * 100) : 100;

    return {
      totalCustomers: customers.length,
      debtorCount,
      totalReceivables,
      totalOverdue,
      totalDueSoon,
      collectedThisMonth,
      recoveryRate,
    };
  }, [customers, invoices, customerLedgerMap]);

  // Selected Area Metrics
  const areaSpecificKPIs = useMemo(() => {
    if (!selectedAreaObj) return null;

    const areaCustomers = customers.filter((c) => c.areaId === selectedAreaObj.id);
    let areaReceivables = 0;
    let areaOverdue = 0;
    let areaDueSoon = 0;
    let areaDebtorCount = 0;

    areaCustomers.forEach((c) => {
      const data = customerLedgerMap.get(c.id);
      if (data) {
        areaReceivables += data.meta.totalOutstanding;
        areaOverdue += data.meta.totalOverdue;
        areaDueSoon += data.meta.totalNearDue;
        if (data.meta.totalOutstanding > 0) areaDebtorCount++;
      }
    });

    const areaCustIds = new Set(areaCustomers.map((c) => c.id));
    const areaInvoices = invoices.filter((i) => areaCustIds.has(i.customerId));
    const areaCollected = areaInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const target = areaReceivables + areaCollected;
    const rate = target > 0 ? Math.round((areaCollected / target) * 100) : 100;

    return {
      totalCustomers: areaCustomers.length,
      debtorCount: areaDebtorCount,
      receivables: areaReceivables,
      overdue: areaOverdue,
      dueSoon: areaDueSoon,
      collected: areaCollected,
      rate,
    };
  }, [selectedAreaObj, customers, invoices, customerLedgerMap]);

  // Selected Sales Rep Metrics
  const repSpecificKPIs = useMemo(() => {
    if (!selectedRepObj) return null;

    const repCustomers = customers.filter((c) => c.assignedRepId === selectedRepObj.id);
    let repReceivables = 0;
    let repOverdue = 0;
    let repDueSoon = 0;

    repCustomers.forEach((c) => {
      const data = customerLedgerMap.get(c.id);
      if (data) {
        repReceivables += data.meta.totalOutstanding;
        repOverdue += data.meta.totalOverdue;
        repDueSoon += data.meta.totalNearDue;
      }
    });

    const repCustIds = new Set(repCustomers.map((c) => c.id));
    const repInvoices = invoices.filter((i) => repCustIds.has(i.customerId));
    const repCollected = repInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const target = repReceivables + repCollected;
    const rate = target > 0 ? Math.round((repCollected / target) * 100) : 100;

    return {
      totalCustomers: repCustomers.length,
      receivables: repReceivables,
      overdue: repOverdue,
      dueSoon: repDueSoon,
      collected: repCollected,
      rate,
    };
  }, [selectedRepObj, customers, invoices, customerLedgerMap]);

  // Main Filtering Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const ledger = customerLedgerMap.get(customer.id);
      if (!ledger) return false;

      // 1. Area Filter
      if (selectedAreaId !== 'ALL' && customer.areaId !== selectedAreaId) {
        return false;
      }

      // 2. Sales Rep Filter
      if (selectedRepId !== 'ALL' && customer.assignedRepId !== selectedRepId) {
        return false;
      }

      // 3. Balance Filter
      if (balanceFilter === 'OUTSTANDING_ONLY' && ledger.meta.totalOutstanding <= 0) {
        return false;
      }
      if (balanceFilter === 'OVERDUE_ONLY' && ledger.meta.totalOverdue <= 0) {
        return false;
      }
      if (balanceFilter === 'SETTLED_ONLY' && ledger.meta.totalOutstanding > 0) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter === 'OVERDUE' && ledger.meta.totalOverdue <= 0) {
        return false;
      }
      if (statusFilter === 'DUE_SOON' && !ledger.meta.isNearDue) {
        return false;
      }
      if (statusFilter === 'DUE_24H' && !ledger.meta.isDueNext24h) {
        return false;
      }
      if (statusFilter === 'PENDING' && ledger.meta.pendingCollectionAmount <= 0) {
        return false;
      }
      if (statusFilter === 'SETTLED' && ledger.meta.totalOutstanding > 0) {
        return false;
      }

      // 5. Search Query Filter (Code, Name, Phone, Area, Rep)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = customer.code?.toLowerCase().includes(q);
        const nameMatch = customer.name?.toLowerCase().includes(q);
        const phoneMatch = customer.phone?.includes(q);
        const areaMatch = customer.areaName?.toLowerCase().includes(q);
        const repMatch = customer.assignedRepName?.toLowerCase().includes(q);
        const contactMatch = customer.contactPerson?.toLowerCase().includes(q);

        if (!codeMatch && !nameMatch && !phoneMatch && !areaMatch && !repMatch && !contactMatch) {
          return false;
        }
      }

      return true;
    });
  }, [customers, customerLedgerMap, selectedAreaId, selectedRepId, balanceFilter, statusFilter, searchQuery]);

  // Counts for the status pills
  const statusCounts = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let due24h = 0;
    let pending = 0;
    let settled = 0;
    let outstanding = 0;

    customers.forEach((c) => {
      // Respect area and rep filters when computing badge counts
      if (selectedAreaId !== 'ALL' && c.areaId !== selectedAreaId) return;
      if (selectedRepId !== 'ALL' && c.assignedRepId !== selectedRepId) return;

      const data = customerLedgerMap.get(c.id);
      if (data) {
        if (data.meta.totalOutstanding > 0) outstanding++;
        if (data.meta.totalOverdue > 0) overdue++;
        if (data.meta.isNearDue) dueSoon++;
        if (data.meta.isDueNext24h) due24h++;
        if (data.meta.pendingCollectionAmount > 0) pending++;
        if (data.meta.totalOutstanding <= 0) settled++;
      }
    });

    return {
      all: customers.filter((c) => {
        if (selectedAreaId !== 'ALL' && c.areaId !== selectedAreaId) return false;
        if (selectedRepId !== 'ALL' && c.assignedRepId !== selectedRepId) return false;
        return true;
      }).length,
      outstanding,
      overdue,
      dueSoon,
      due24h,
      pending,
      settled,
    };
  }, [customers, customerLedgerMap, selectedAreaId, selectedRepId]);

  // Export filtered customers to CSV
  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      toast.info('No customers match the active filters to export.');
      return;
    }

    const headers = [
      'Customer Code',
      'Customer Name',
      'Area',
      'Sales Representative',
      'Outstanding Amount (LKR)',
      'Overdue Amount (LKR)',
      'Oldest Overdue Days',
      'Open Invoices Count',
      'Next Due Date',
      'Last Payment Date',
      'Phone',
    ];

    const rows = filteredCustomers.map((c) => {
      const data = customerLedgerMap.get(c.id);
      return [
        `"${c.code}"`,
        `"${c.name}"`,
        `"${c.areaName || ''}"`,
        `"${c.assignedRepName || ''}"`,
        data?.meta.totalOutstanding || 0,
        data?.meta.totalOverdue || 0,
        data?.oldestOverdueDays || 0,
        data?.openInvoices.length || 0,
        `"${data?.nextDueDate || ''}"`,
        `"${c.financials?.lastPaymentDate ? formatDate(c.financials.lastPaymentDate) : ''}"`,
        `"${c.phone}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DNS_ERP_Customer_Collections_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Collection Ledger exported successfully.');
  };

  return (
    <div className={cn('space-y-5', className)}>
      {/* ── 1. Page Header & Global Management Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-primary-light text-primary border border-primary-border">
              <CreditCard className="h-3 w-3" /> Area & Field Float Management
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Customer Ledger Hub</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Clock className="h-2.5 w-2.5" /> FIFO Auto-Allocation
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Customer Collections & Receivables Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Area-wise debt monitoring, sales representative collection accountability, and customer ledger settlements.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
              )}
              title="Enterprise Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
              )}
              title="Executive Card View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl border-slate-200"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl border-slate-200"
            title="Refresh Ledger"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* ── 2. Top Management Dashboard KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Total Receivables */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Receivables</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {formatCurrency(globalKPIs.totalReceivables)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across all territories</div>
          </div>
        </div>

        {/* KPI 2: Total Overdue */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-600 font-semibold">
            <span>Total Overdue</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-rose-600">
              {formatCurrency(globalKPIs.totalOverdue)}
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-0.5">High priority recovery</div>
          </div>
        </div>

        {/* KPI 3: Due in 7 Days */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Due in 7 Days</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {formatCurrency(globalKPIs.totalDueSoon)}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">Upcoming collections</div>
          </div>
        </div>

        {/* KPI 4: Collected This Month */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Collected This Month</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700">
              {formatCurrency(globalKPIs.collectedThisMonth)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified settlements</div>
          </div>
        </div>

        {/* KPI 5: Recovery Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Collection Rate</span>
            <Percent className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-indigo-700">
              {globalKPIs.recoveryRate}%
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, globalKPIs.recoveryRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 6: Accounts Affected */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Customer Accounts</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {globalKPIs.totalCustomers} Accounts
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-0.5">
              {globalKPIs.debtorCount} with active debt
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Area-Wise Performance Overview ── */}
      <AreaPerformanceOverviewCard
        areas={areas}
        customers={customers}
        invoices={invoices}
        selectedAreaId={selectedAreaId}
        onSelectArea={setSelectedAreaId}
      />

      {/* ── 4. Dedicated Area Operational Context Banner (When Area is Selected) ── */}
      {selectedAreaObj && areaSpecificKPIs && (
        <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border-0 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Area & Responsible Area Manager Identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase bg-white/10 text-white border border-white/20">
                  <MapPin className="h-3 w-3 text-emerald-400" /> Area Focus: {selectedAreaObj.name}
                </span>
                <span className="text-xs text-slate-300 font-medium">{selectedAreaObj.region}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAreaId('ALL');
                    setSelectedRepId('ALL');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-white transition-colors cursor-pointer ml-1"
                >
                  <X className="h-3 w-3" /> Clear Area Focus
                </button>
              </div>

              {/* Area Manager Details */}
              <div className="flex items-center gap-3.5 bg-white/5 p-3 rounded-xl border border-white/10 max-w-lg">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedAreaObj.areaManagerName ? selectedAreaObj.areaManagerName.charAt(0) : 'A'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Area Manager Responsible
                    </span>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[9.5px]">
                      Active Oversight
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedAreaObj.areaManagerName || 'Nimal Bandara'}</div>
                  <div className="text-xs text-slate-300">Western Operations • Contact: +94 77 567 8901</div>
                </div>
              </div>

              {/* Assigned Sales Reps Pills */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Assigned Field Sales Representatives in {selectedAreaObj.name}:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedRepId('ALL')}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      selectedRepId === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                    )}
                  >
                    All Reps ({availableRepsForSelectedArea.length})
                  </button>

                  {availableRepsForSelectedArea.map((rep) => {
                    const isRepActive = selectedRepId === rep.id;
                    const repCustsCount = customers.filter(
                      (c) => c.areaId === selectedAreaObj.id && c.assignedRepId === rep.id
                    ).length;

                    return (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => setSelectedRepId(isRepActive ? 'ALL' : rep.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                          isRepActive
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                            : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20 hover:text-white'
                        )}
                      >
                        <UserCheck className="h-3 w-3" />
                        <span>{rep.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                          {repCustsCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Area Financial Summary Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-black/25 p-3.5 rounded-xl border border-white/10 shrink-0 lg:w-96">
              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider">Area Receivables</span>
                <p className="text-sm font-bold font-mono text-white mt-0.5">{formatCurrency(areaSpecificKPIs.receivables)}</p>
              </div>

              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10.5px] uppercase font-semibold text-rose-300 tracking-wider">Area Overdue</span>
                <p className="text-sm font-bold font-mono text-rose-300 mt-0.5">{formatCurrency(areaSpecificKPIs.overdue)}</p>
              </div>

              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10.5px] uppercase font-semibold text-amber-300 tracking-wider">Due in 7 Days</span>
                <p className="text-sm font-bold font-mono text-amber-300 mt-0.5">{formatCurrency(areaSpecificKPIs.dueSoon)}</p>
              </div>

              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider">Customers</span>
                <p className="text-sm font-bold font-mono text-white mt-0.5">
                  {areaSpecificKPIs.totalCustomers} ({areaSpecificKPIs.debtorCount} with debt)
                </p>
              </div>

              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider">Collected</span>
                <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{formatCurrency(areaSpecificKPIs.collected)}</p>
              </div>

              <div className="p-2 rounded-lg bg-white/5">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider">Area Recovery</span>
                <p className="text-sm font-bold font-mono text-indigo-300 mt-0.5">{areaSpecificKPIs.rate}%</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── 5. Dedicated Sales Representative Detail Card (When Rep is Selected) ── */}
      {selectedRepObj && repSpecificKPIs && (
        <Card className="bg-gradient-to-r from-indigo-50 via-white to-slate-50 border border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                {selectedRepObj.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{selectedRepObj.name}</h3>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold">
                    Field Sales Representative
                  </Badge>
                  <span className="text-xs text-slate-500">
                    Area: <strong className="text-slate-800">{selectedRepObj.areaName || 'Western'}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phone: {selectedRepObj.phone} • Email: {selectedRepObj.email} • {repSpecificKPIs.totalCustomers} Assigned Dealer Accounts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <div className="text-right sm:text-right">
                <div className="text-xs text-slate-500 font-medium">Monthly Achievement</div>
                <div className="text-sm font-bold font-mono text-indigo-700">{repSpecificKPIs.rate}% of Target</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRepId('ALL')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Clear Rep Focus"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Rep KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 pt-3 border-t border-indigo-100">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Outstanding</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 mt-0.5">
                {formatCurrency(repSpecificKPIs.receivables)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-500">Total Overdue</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-rose-600 mt-0.5">
                {formatCurrency(repSpecificKPIs.overdue)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-600">Due in 7 Days</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-amber-700 mt-0.5">
                {formatCurrency(repSpecificKPIs.dueSoon)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-600">Collected Month</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-emerald-700 mt-0.5">
                {formatCurrency(repSpecificKPIs.collected)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-indigo-200 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-indigo-500">Accounts Managed</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-indigo-800 mt-0.5">
                {repSpecificKPIs.totalCustomers} Accounts
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── 6. Comprehensive Management Filter Bar & Quick Status Chips ── */}
      <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 sm:p-5 space-y-4">
        {/* Row 1: Dropdown Selectors & Search Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, customer, area, rep..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-medium placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Area Selector */}
          <div className="relative">
            <select
              value={selectedAreaId}
              onChange={(e) => {
                setSelectedAreaId(e.target.value);
                setSelectedRepId('ALL');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-semibold text-slate-800"
            >
              <option value="ALL">All Operational Areas ({areas.length})</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.region})
                </option>
              ))}
            </select>
          </div>

          {/* Sales Representative Selector */}
          <div className="relative">
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-semibold text-slate-800"
            >
              <option value="ALL">
                {selectedAreaId !== 'ALL'
                  ? `All Reps in Selected Area (${availableRepsForSelectedArea.length})`
                  : `All Sales Representatives (${salesReps.length})`}
              </option>
              {availableRepsForSelectedArea.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.areaName || 'Western'})
                </option>
              ))}
            </select>
          </div>

          {/* Balance Filter Selector */}
          <div className="relative">
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-semibold text-slate-800"
            >
              <option value="ALL">All Ledger Accounts (Active Portfolio)</option>
              <option value="OUTSTANDING_ONLY">Accounts With Outstanding Only</option>
              <option value="OVERDUE_ONLY">Past Due Overdue Accounts Only</option>
              <option value="SETTLED_ONLY">Fully Settled (Zero Balance)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Quick Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Status:
          </span>

          {[
            { id: 'ALL' as CollectionStatusFilter, label: 'All Customers', count: statusCounts.all },
            { id: 'OVERDUE' as CollectionStatusFilter, label: 'Past Due / Overdue', count: statusCounts.overdue, variant: 'danger' },
            { id: 'DUE_SOON' as CollectionStatusFilter, label: 'Due in 7 Days', count: statusCounts.dueSoon, variant: 'warning' },
            { id: 'DUE_24H' as CollectionStatusFilter, label: 'Due in 24h', count: statusCounts.due24h, variant: 'warning' },
            { id: 'PENDING' as CollectionStatusFilter, label: 'Pending Collection', count: statusCounts.pending, variant: 'indigo' },
            { id: 'SETTLED' as CollectionStatusFilter, label: 'Fully Settled', count: statusCounts.settled, variant: 'success' },
          ].map((pill) => {
            const isActive = statusFilter === pill.id;

            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                )}
              >
                <span>{pill.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                  )}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}

          {(selectedAreaId !== 'ALL' || selectedRepId !== 'ALL' || statusFilter !== 'ALL' || balanceFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedAreaId('ALL');
                setSelectedRepId('ALL');
                setStatusFilter('ALL');
                setBalanceFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 ml-auto shrink-0 cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </Card>

      {/* ── 7. Detailed Customer Collection Ledger (Table or Cards View) ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No Customer Accounts Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No customer records match the active Area, Sales Representative, and Collection status filters.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedAreaId('ALL');
              setSelectedRepId('ALL');
              setStatusFilter('ALL');
              setBalanceFilter('ALL');
              setSearchQuery('');
            }}
            className="text-xs rounded-xl"
          >
            Clear Active Filters
          </Button>
        </Card>
      ) : viewMode === 'table' ? (
        /* ── ENTERPRISE TABLE VIEW ── */
        <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-3">Territory & Rep</th>
                  <th className="py-3 px-3 text-right">Total Outstanding</th>
                  <th className="py-3 px-3 text-right">Past Due Overdue</th>
                  <th className="py-3 px-3">Oldest Overdue</th>
                  <th className="py-3 px-3 text-center">Open Invoices</th>
                  <th className="py-3 px-3">Next Due Date</th>
                  <th className="py-3 px-3 text-center">Collection Status</th>
                  <th className="py-3 px-3 text-right">Last Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => {
                  const data = customerLedgerMap.get(customer.id);
                  const isOverdue = (data?.meta.totalOverdue || 0) > 0;
                  const isSettled = (data?.meta.totalOutstanding || 0) <= 0;
                  const isDueSoon = data?.meta.isNearDue;

                  return (
                    <tr
                      key={customer.id}
                      className={cn(
                        'hover:bg-slate-50/70 transition-colors group',
                        isOverdue && 'bg-rose-50/15'
                      )}
                    >
                      {/* Customer Code & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                            <Store className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 group-hover:text-primary transition-colors text-xs">
                                {customer.name}
                              </span>
                              <Badge variant="outline" className="font-mono text-[9.5px] bg-slate-50 text-slate-600">
                                {customer.code}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span>{customer.contactPerson}</span>
                              <span>•</span>
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Territory & Sales Rep */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-medium">
                            <MapPin className="h-2.5 w-2.5 text-slate-400" />
                            <span>{customer.areaName || 'Western'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[120px]">{customer.assignedRepName || 'Kasun W.'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Total Outstanding */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(data?.meta.totalOutstanding || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Limit: {formatCurrency(customer.commercialTerms?.creditLimit || 0)}
                        </div>
                      </td>

                      {/* Past Due Overdue */}
                      <td className="py-3.5 px-3 text-right">
                        {isOverdue ? (
                          <div className="font-mono font-bold text-rose-600 text-xs">
                            {formatCurrency(data?.meta.totalOverdue || 0)}
                          </div>
                        ) : (
                          <div className="font-mono text-slate-400 text-xs">—</div>
                        )}
                      </td>

                      {/* Oldest Overdue Invoice */}
                      <td className="py-3.5 px-3">
                        {data?.oldestOverdueInvoice ? (
                          <div className="space-y-0.5">
                            <div className="font-mono font-semibold text-rose-700 text-[11px]">
                              {data.oldestOverdueInvoice.invoiceNumber}
                            </div>
                            <div className="text-[10px] text-rose-600 font-bold">
                              {data.oldestOverdueDays} days past due
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None (Current)</span>
                        )}
                      </td>

                      {/* Open Invoices Count */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectCustomer(customer);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Click to inspect open invoices"
                        >
                          <Receipt className="h-3 w-3" />
                          <span>{data?.openInvoices.length || 0} Open</span>
                        </button>
                      </td>

                      {/* Next Due Date */}
                      <td className="py-3.5 px-3">
                        {data?.nextDueDate ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-700 font-medium text-[11px]">
                              {formatDate(data.nextDueDate)}
                            </div>
                            {isOverdue ? (
                              <span className="text-[10px] text-rose-600 font-bold">Overdue</span>
                            ) : isDueSoon ? (
                              <span className="text-[10px] text-amber-600 font-semibold">Due in 7 days</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Within Terms</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status Indicator */}
                      <td className="py-3.5 px-3 text-center">
                        {isOverdue ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px]">
                            OVERDUE
                          </Badge>
                        ) : isDueSoon ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold text-[10px]">
                            DUE SOON
                          </Badge>
                        ) : isSettled ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">
                            SETTLED
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-[10px]">
                            ACTIVE
                          </Badge>
                        )}
                      </td>

                      {/* Last Payment */}
                      <td className="py-3.5 px-3 text-right">
                        {customer.financials?.lastPaymentDate ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-800 text-[11px]">
                              {formatCurrency(customer.financials.lastPaymentAmount || 0)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatDate(customer.financials.lastPaymentDate)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No prior records</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick WhatsApp message */}
                          <button
                            type="button"
                            onClick={() => handleWhatsApp(customer, data?.meta.totalOutstanding || 0)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Phone Call */}
                          <button
                            type="button"
                            onClick={() => (window.location.href = `tel:${customer.phone}`)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                            title="Call Customer"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>

                          {/* Primary Collect Button */}
                          <Button
                            size="sm"
                            onClick={() => handleSelectCustomer(customer)}
                            className="h-7 px-2.5 text-[11px] font-bold bg-primary hover:bg-primary-hover text-white rounded-lg shadow-2xs gap-1"
                          >
                            <span>Collect</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ── EXECUTIVE CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCustomers.map((customer) => {
            const data = customerLedgerMap.get(customer.id);
            const isOverdue = (data?.meta.totalOverdue || 0) > 0;
            const isSettled = (data?.meta.totalOutstanding || 0) <= 0;
            const isDueSoon = data?.meta.isNearDue;

            return (
              <Card
                key={customer.id}
                className={cn(
                  'bg-white border rounded-2xl p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3.5',
                  isOverdue ? 'border-rose-200/90 bg-rose-50/10' : 'border-slate-200/90'
                )}
              >
                <div>
                  {/* Card Header: Code, Name, Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[9.5px] bg-slate-100 text-slate-700">
                          {customer.code}
                        </Badge>
                        <span className="text-[10px] font-medium text-slate-500 uppercase">{customer.type}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{customer.name}</h4>
                    </div>

                    <div>
                      {isOverdue ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px]">
                          OVERDUE
                        </Badge>
                      ) : isDueSoon ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold text-[10px]">
                          DUE SOON
                        </Badge>
                      ) : isSettled ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">
                          SETTLED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-[10px]">
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Territory & Rep Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {customer.areaName || 'Kelaniya'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <UserCheck className="h-3 w-3 text-slate-400" />
                      {customer.assignedRepName || 'Kasun W.'}
                    </span>
                  </div>

                  {/* Balances Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Outstanding</span>
                      <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm mt-0.5">
                        {formatCurrency(data?.meta.totalOutstanding || 0)}
                      </p>
                    </div>

                    <div className={cn('p-2 rounded-xl', isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700')}>
                      <span className="text-[10px] uppercase font-bold text-rose-500">Past Due Overdue</span>
                      <p className="font-mono font-bold text-xs sm:text-sm mt-0.5">
                        {formatCurrency(data?.meta.totalOverdue || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Invoices & Overdue notice */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectCustomer(customer);
                        setIsInvoiceModalOpen(true);
                      }}
                      className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer text-[11.5px]"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>{data?.openInvoices.length || 0} Open Invoices</span>
                    </button>

                    {data?.oldestOverdueDays ? (
                      <span className="text-[11px] text-rose-600 font-bold">
                        Oldest: {data.oldestOverdueDays}d overdue
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Next due: {data?.nextDueDate ? formatDate(data.nextDueDate) : 'None'}</span>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleWhatsApp(customer, data?.meta.totalOutstanding || 0)}
                      className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                      title="WhatsApp Reminder"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (window.location.href = `tel:${customer.phone}`)}
                      className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleSelectCustomer(customer)}
                    className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs gap-1.5"
                  >
                    <span>Collect Payment</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── 8. Quick Invoice Inspection Modal ── */}
      <CustomerInvoicesQuickModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setInspectCustomer(null);
        }}
        customer={inspectCustomer}
        invoices={invoices}
      />
    </div>
  );
}
