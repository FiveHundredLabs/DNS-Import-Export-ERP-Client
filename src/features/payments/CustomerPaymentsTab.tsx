import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { Invoice } from '../../types/invoice';
import { customerService } from '../../services/CustomerService';
import { invoiceService } from '../../services/InvoiceService';
import { useAuth } from '../../hooks/useAuth';
import { useAreas } from '../../hooks/useAreas';
import { MOCK_USERS } from '../../mock/mockUsers';
import { MOCK_AREAS } from '../../mock/mockAreas';
import {
  evaluateCustomerPaymentStatus,
  getDaysOverdue,
  CustomerPaymentStatusMeta,
} from '../../rules/customerPaymentRules';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
  ArrowRight,
  Receipt,
  Download,
  LayoutGrid,
  Table as TableIcon,
  X,
  Percent,
  ShieldCheck,
  Target,
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
  const allAreas = useMemo(() => (areas && areas.length > 0 ? areas : MOCK_AREAS), [areas]);

  const isAreaManager = role === 'AREA_MANAGER';
  const isRep = role === 'SALES_REP';

  // Area Manager's assigned territory
  const userAssignedAreaId = useMemo(() => {
    if (currentUser?.areaId) return currentUser.areaId;
    const matched = allAreas.find((a) => a.areaManagerId === currentUser?.id);
    if (matched) return matched.id;
    return 'area-01'; // Default fallback to Kelaniya
  }, [currentUser, allAreas]);

  // Primary data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Management Filter states
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (role === 'AREA_MANAGER') {
      return currentUser?.areaId || 'area-01';
    }
    return 'ALL';
  });
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
      const [custRes, invRes] = await Promise.all([
        customerService.listCustomers({
          pageSize: 200,
          assignedRepId: isRep ? currentUser.id : undefined,
          areaId: isAreaManager ? userAssignedAreaId : undefined,
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
  }, [role, currentUser.id, userAssignedAreaId]);

  // If user is an Area Manager, strictly default and lock to their assigned territory
  useEffect(() => {
    if (isAreaManager && userAssignedAreaId && selectedAreaId !== userAssignedAreaId) {
      setSelectedAreaId(userAssignedAreaId);
    }
  }, [isAreaManager, userAssignedAreaId, selectedAreaId]);

  // When area changes, if current selectedRepId does not belong to the newly selected area, reset rep
  useEffect(() => {
    if (selectedAreaId !== 'ALL' && selectedRepId !== 'ALL') {
      const rep = MOCK_USERS.find((u) => u.id === selectedRepId);
      if (rep && rep.areaId !== selectedAreaId) {
        setSelectedRepId('ALL');
      }
    }
  }, [selectedAreaId, selectedRepId]);

  // Visible areas: For Area Manager, strictly only their territory
  const visibleAreas = useMemo(() => {
    if (isAreaManager) {
      const matched = allAreas.filter((a) => a.id === userAssignedAreaId);
      return matched.length > 0 ? matched : allAreas.slice(0, 1);
    }
    return allAreas;
  }, [isAreaManager, allAreas, userAssignedAreaId]);

  // Derived scoped customers (strictly ensures Area Manager only sees their territory)
  const scopedCustomers = useMemo(() => {
    if (isAreaManager) {
      return customers.filter((c) => c.areaId === userAssignedAreaId);
    }
    return customers;
  }, [isAreaManager, customers, userAssignedAreaId]);

  // Derived list of all sales reps in system
  const salesReps = useMemo(() => {
    return MOCK_USERS.filter((u) => u.role === 'SALES_REP' && u.isActive);
  }, []);

  const effectiveAreaId = isAreaManager ? userAssignedAreaId : selectedAreaId;

  // Filtered sales reps based on selected area or Area Manager role
  const availableRepsForSelectedArea = useMemo(() => {
    if (effectiveAreaId === 'ALL') return salesReps;
    return salesReps.filter((r) => r.areaId === effectiveAreaId);
  }, [salesReps, effectiveAreaId]);

  // Selected Area details
  const selectedAreaObj = useMemo(() => {
    if (effectiveAreaId === 'ALL') return null;
    return allAreas.find((a) => a.id === effectiveAreaId) || null;
  }, [allAreas, effectiveAreaId]);

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

  // Compute rich ledger metadata for every customer in active scope
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

    scopedCustomers.forEach((c) => {
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
  }, [scopedCustomers, invoices]);

  // Top Management Dashboard Overall KPIs
  const globalKPIs = useMemo(() => {
    let totalReceivables = 0;
    let totalOverdue = 0;
    let totalDueSoon = 0;
    let debtorCount = 0;

    scopedCustomers.forEach((c) => {
      const data = customerLedgerMap.get(c.id);
      if (data) {
        totalReceivables += data.meta.totalOutstanding;
        totalOverdue += data.meta.totalOverdue;
        totalDueSoon += data.meta.totalNearDue;
        if (data.meta.totalOutstanding > 0) debtorCount++;
      }
    });

    // Collected amount this month from scoped customers' paid/partially paid invoices
    const scopedCustIds = new Set(scopedCustomers.map((c) => c.id));
    const scopedInvoices = invoices.filter((i) => scopedCustIds.has(i.customerId));
    const collectedThisMonth = scopedInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalTarget = totalReceivables + collectedThisMonth;
    const recoveryRate = totalTarget > 0 ? Math.round((collectedThisMonth / totalTarget) * 100) : 100;

    return {
      totalCustomers: scopedCustomers.length,
      debtorCount,
      totalReceivables,
      totalOverdue,
      totalDueSoon,
      collectedThisMonth,
      recoveryRate,
    };
  }, [scopedCustomers, invoices, customerLedgerMap]);

  // Selected Area Metrics
  const areaSpecificKPIs = useMemo(() => {
    if (!selectedAreaObj) return null;

    const areaCustomers = scopedCustomers.filter((c) => c.areaId === selectedAreaObj.id);
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
  }, [selectedAreaObj, scopedCustomers, invoices, customerLedgerMap]);

  // Active Scope KPIs (Adapts when user is Area Manager or specific territory is selected)
  const activeScopeKPIs = useMemo(() => {
    if ((isAreaManager || selectedAreaId !== 'ALL') && areaSpecificKPIs) {
      return {
        totalReceivables: areaSpecificKPIs.receivables,
        totalOverdue: areaSpecificKPIs.overdue,
        totalDueSoon: areaSpecificKPIs.dueSoon,
        collectedThisMonth: areaSpecificKPIs.collected,
        recoveryRate: areaSpecificKPIs.rate,
        totalCustomers: areaSpecificKPIs.totalCustomers,
        debtorCount: areaSpecificKPIs.debtorCount,
        scopeTitle: isAreaManager
          ? `${selectedAreaObj?.name || 'Kelaniya'} Territory Portfolio`
          : `${selectedAreaObj?.name || 'Area'} Territory`,
        scopeSubtitle: isAreaManager ? 'Your assigned territory' : 'Active territory focus',
      };
    }

    return {
      totalReceivables: globalKPIs.totalReceivables,
      totalOverdue: globalKPIs.totalOverdue,
      totalDueSoon: globalKPIs.totalDueSoon,
      collectedThisMonth: globalKPIs.collectedThisMonth,
      recoveryRate: globalKPIs.recoveryRate,
      totalCustomers: globalKPIs.totalCustomers,
      debtorCount: globalKPIs.debtorCount,
      scopeTitle: 'Across all territories',
      scopeSubtitle: 'Company-wide active portfolio',
    };
  }, [isAreaManager, selectedAreaId, areaSpecificKPIs, globalKPIs, selectedAreaObj]);

  // Selected Sales Rep Metrics
  const repSpecificKPIs = useMemo(() => {
    if (!selectedRepObj) return null;

    const repCustomers = scopedCustomers.filter((c) => c.assignedRepId === selectedRepObj.id);
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
  }, [selectedRepObj, scopedCustomers, invoices, customerLedgerMap]);

  // Main Filtering Logic
  const filteredCustomers = useMemo(() => {
    return scopedCustomers.filter((customer) => {
      const ledger = customerLedgerMap.get(customer.id);
      if (!ledger) return false;

      // 1. Area Filter (if not Area Manager who is already scoped)
      if (!isAreaManager && selectedAreaId !== 'ALL' && customer.areaId !== selectedAreaId) {
        return false;
      }

      // 2. Sales Rep Filter
      if (selectedRepId !== 'ALL' && customer.assignedRepId !== selectedRepId) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter === 'OVERDUE' && ledger.meta.totalOverdue <= 0) return false;
      if (statusFilter === 'DUE_SOON' && !ledger.meta.isNearDue) return false;
      if (statusFilter === 'DUE_24H' && !ledger.meta.isDueNext24h) return false;
      if (statusFilter === 'PENDING' && ledger.meta.pendingCollectionAmount <= 0) return false;
      if (statusFilter === 'SETTLED' && ledger.meta.totalOutstanding > 0) return false;

      // 4. Balance Filter
      if (balanceFilter === 'OUTSTANDING_ONLY' && ledger.meta.totalOutstanding <= 0) return false;
      if (balanceFilter === 'OVERDUE_ONLY' && ledger.meta.totalOverdue <= 0) return false;
      if (balanceFilter === 'SETTLED_ONLY' && ledger.meta.totalOutstanding > 0) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = customer.name.toLowerCase().includes(q);
        const matchCode = customer.code.toLowerCase().includes(q);
        const matchArea = (customer.areaName || '').toLowerCase().includes(q);
        const matchRep = (customer.assignedRepName || '').toLowerCase().includes(q);
        const matchContact = (customer.contactPerson || '').toLowerCase().includes(q);
        const matchPhone = (customer.phone || '').toLowerCase().includes(q);

        if (!matchName && !matchCode && !matchArea && !matchRep && !matchContact && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [scopedCustomers, customerLedgerMap, isAreaManager, selectedAreaId, selectedRepId, statusFilter, balanceFilter, searchQuery]);

  // Dynamic counts for status pills
  const statusCounts = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let due24h = 0;
    let pending = 0;
    let settled = 0;
    let outstanding = 0;

    scopedCustomers.forEach((c) => {
      // Respect area and rep filters when computing badge counts
      if (!isAreaManager && selectedAreaId !== 'ALL' && c.areaId !== selectedAreaId) return;
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
      all: scopedCustomers.filter((c) => {
        if (!isAreaManager && selectedAreaId !== 'ALL' && c.areaId !== selectedAreaId) return false;
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
  }, [scopedCustomers, customerLedgerMap, isAreaManager, selectedAreaId, selectedRepId]);

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

  const handleResetFilters = () => {
    if (!isAreaManager) {
      setSelectedAreaId('ALL');
    }
    setSelectedRepId('ALL');
    setStatusFilter('ALL');
    setBalanceFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    (!isAreaManager && selectedAreaId !== 'ALL') ||
    selectedRepId !== 'ALL' ||
    statusFilter !== 'ALL' ||
    balanceFilter !== 'ALL' ||
    Boolean(searchQuery);

  return (
    <div className={cn('space-y-5 max-w-[1600px] mx-auto pb-8', className)}>
      {/* ── 1. Page Header & Global Management Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700 border border-slate-200">
              <CreditCard className="h-3 w-3 text-slate-500" /> Area & Field Float Management
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Customer Ledger Hub</span>
            {isAreaManager ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10.5px] font-semibold gap-1">
                <ShieldCheck className="h-3 w-3" /> Area Scoped: {selectedAreaObj?.name || 'Kelaniya'}
              </Badge>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Clock className="h-2.5 w-2.5" /> FIFO Auto-Allocation
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Customer Collections & Receivables Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAreaManager
              ? `Debt monitoring, sales representative collection accountability, and dealer settlements for ${selectedAreaObj?.name || 'your assigned territory'}.`
              : 'Area-wise debt monitoring, sales representative collection accountability, and customer ledger settlements.'}
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
            className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-slate-500', loading && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {/* ── 2. Top Management Dashboard KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Total Receivables */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Receivables</span>
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <DollarSign className="h-3.5 w-3.5 text-slate-700" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {formatCurrency(activeScopeKPIs.totalReceivables)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate" title={activeScopeKPIs.scopeTitle}>
              {activeScopeKPIs.scopeTitle}
            </div>
          </div>
        </div>

        {/* KPI 2: Total Overdue */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-600 font-semibold">
            <span>Total Overdue</span>
            <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200/60">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold font-mono text-rose-600">
              {formatCurrency(activeScopeKPIs.totalOverdue)}
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-0.5">High priority recovery</div>
          </div>
        </div>

        {/* KPI 3: Due in 7 Days */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Due in 7 Days</span>
            <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/60">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {formatCurrency(activeScopeKPIs.totalDueSoon)}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">Upcoming collections</div>
          </div>
        </div>

        {/* KPI 4: Collected This Month */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Collected Month</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700">
              {formatCurrency(activeScopeKPIs.collectedThisMonth)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified settlements</div>
          </div>
        </div>

        {/* KPI 5: Recovery Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Collection Rate</span>
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <Percent className="h-3.5 w-3.5 text-slate-700" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {activeScopeKPIs.recoveryRate}%
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-slate-800 rounded-full transition-all"
                style={{ width: `${Math.min(100, activeScopeKPIs.recoveryRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 6: Accounts Affected */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Accounts Managed</span>
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
              <Users className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {activeScopeKPIs.totalCustomers} Accounts
            </div>
            <div className="text-[11px] text-rose-500 font-medium mt-0.5">
              {activeScopeKPIs.debtorCount} with active debt
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Area-Wise Performance Overview (Only for Multi-Area Management Roles) ── */}
      {(!isAreaManager || visibleAreas.length > 1) && (
        <AreaPerformanceOverviewCard
          areas={visibleAreas}
          customers={scopedCustomers}
          invoices={invoices}
          selectedAreaId={selectedAreaId}
          onSelectArea={(id) => {
            if (isAreaManager) return;
            setSelectedAreaId(id);
          }}
        />
      )}

      {/* ── 4. Dedicated Territory Command Desk (Balanced, Relaxed, No Free Space Gap or Duplicated Boxes) ── */}
      {selectedAreaObj && areaSpecificKPIs && (
        <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          {/* Header Strip */}
          <div className="bg-slate-50/70 border-b border-slate-200/80 px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-primary flex items-center justify-center shadow-2xs shrink-0">
                <MapPin className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {selectedAreaObj.name} Territory Command Desk
                  </h3>
                  {isAreaManager ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10.5px] font-semibold gap-1">
                      <ShieldCheck className="h-3 w-3" /> Managed Territory
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10.5px] font-semibold gap-1">
                      <MapPin className="h-3 w-3" /> Active Area Focus
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                  {selectedAreaObj.region} • Regional Debt & Field Float Oversight
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
              <div className="text-xs text-slate-500 hidden md:flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200/70">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>Area Manager: <strong className="text-slate-800">{selectedAreaObj.areaManagerName || 'Nimal Bandara'}</strong></span>
                <span className="text-slate-400">• +94 77 567 8901</span>
              </div>
              {!isAreaManager && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAreaId('ALL');
                    setSelectedRepId('ALL');
                  }}
                  className="h-8 px-2.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-1 rounded-xl cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Area Focus</span>
                </Button>
              )}
            </div>
          </div>

          {/* Body: Proportional 2-Column Responsive Layout (Eliminating the empty hole & duplicated 6 cards) */}
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left: Rep Assignment & Route Control (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>Assigned Field Sales Representatives in {selectedAreaObj.name}:</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {availableRepsForSelectedArea.length} Rep{availableRepsForSelectedArea.length === 1 ? '' : 's'} on Route
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedRepId('ALL')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
                    selectedRepId === 'ALL'
                      ? 'bg-primary text-white border-primary shadow-2xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  )}
                >
                  All Reps ({availableRepsForSelectedArea.length})
                </button>

                {availableRepsForSelectedArea.map((rep) => {
                  const isRepActive = selectedRepId === rep.id;
                  const repCustsCount = scopedCustomers.filter(
                    (c) => c.areaId === selectedAreaObj.id && c.assignedRepId === rep.id
                  ).length;

                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setSelectedRepId(isRepActive ? 'ALL' : rep.id)}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
                        isRepActive
                          ? 'bg-primary text-white border-primary shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                      )}
                    >
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>{rep.name}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                          isRepActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {repCustsCount} Accounts
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Area Manager Info */}
              <div className="md:hidden text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>AM: <strong>{selectedAreaObj.areaManagerName || 'Nimal Bandara'}</strong> • +94 77 567 8901</span>
              </div>
            </div>

            {/* Right: Territory Float Health & Recovery Progress Bar (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/80 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span>Territory Collection Recovery Target</span>
                </div>
                <span className="font-bold font-mono text-primary text-sm">{areaSpecificKPIs.rate}%</span>
              </div>

              <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    areaSpecificKPIs.rate >= 75 ? 'bg-emerald-500' : areaSpecificKPIs.rate >= 50 ? 'bg-amber-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(100, areaSpecificKPIs.rate)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-200/60">
                <div className="space-y-0.5">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400">Total Outstanding</span>
                  <p className="font-mono font-bold text-slate-900">{formatCurrency(areaSpecificKPIs.receivables)}</p>
                </div>
                <div className="space-y-0.5 text-right sm:text-left">
                  <span className="text-[10.5px] uppercase font-bold text-rose-500">Overdue Recovery</span>
                  <p className="font-mono font-bold text-rose-600">{formatCurrency(areaSpecificKPIs.overdue)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── 5. Dedicated Sales Representative Detail Card (When Rep is Selected) ── */}
      {selectedRepObj && repSpecificKPIs && (
        <Card className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs border-l-4 border-l-primary">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-800 font-bold text-base flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                {selectedRepObj.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{selectedRepObj.name}</h3>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold">
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
                <div className="text-sm font-bold font-mono text-primary">{repSpecificKPIs.rate}% of Target</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRepId('ALL')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear Rep Focus"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Rep KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3 pt-3 border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
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

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Accounts Managed</span>
              <p className="text-xs sm:text-sm font-bold font-mono text-slate-800 mt-0.5">
                {repSpecificKPIs.totalCustomers} Accounts
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── 6. Comprehensive Management Filter Bar & Quick Status Chips (Relaxed Proportions, No Truncation) ── */}
      <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-4 sm:p-4.5 space-y-3.5">
        {/* Row 1: Search Box & Dropdowns (Flexible Flexbox Layout) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAreaManager ? "Search customer, code, contact or rep..." : "Search code, customer, area, rep..."}
              className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-medium placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Area Selector (Generous width to prevent awkward truncation) */}
          <div className="relative w-full md:w-64 lg:w-72 shrink-0">
            <select
              value={effectiveAreaId}
              onChange={(e) => {
                if (isAreaManager) return;
                setSelectedAreaId(e.target.value);
                setSelectedRepId('ALL');
              }}
              disabled={isAreaManager}
              className={cn(
                "w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-semibold text-slate-800",
                isAreaManager && "cursor-not-allowed bg-slate-100 text-slate-600 opacity-90"
              )}
            >
              {!isAreaManager && (
                <option value="ALL">All Operational Areas ({allAreas.length})</option>
              )}
              {visibleAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.region}){isAreaManager ? ' — Assigned Territory' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Sales Representative Selector */}
          <div className="relative w-full md:w-48 lg:w-56 shrink-0">
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-semibold text-slate-800"
            >
              <option value="ALL">
                {effectiveAreaId !== 'ALL'
                  ? `All Reps in Area (${availableRepsForSelectedArea.length})`
                  : `All Sales Reps (${salesReps.length})`}
              </option>
              {availableRepsForSelectedArea.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Balance Filter Selector */}
          <div className="relative w-full md:w-48 lg:w-52 shrink-0">
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-colors font-semibold text-slate-800"
            >
              <option value="ALL">All Ledger Accounts</option>
              <option value="OUTSTANDING_ONLY">With Outstanding Only</option>
              <option value="OVERDUE_ONLY">Past Due Overdue Only</option>
              <option value="SETTLED_ONLY">Fully Settled (Zero Balance)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Quick Filter Pills */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Status:
            </span>

            {[
              { id: 'ALL' as CollectionStatusFilter, label: 'All Customers', count: statusCounts.all },
              { id: 'OVERDUE' as CollectionStatusFilter, label: 'Past Due / Overdue', count: statusCounts.overdue },
              { id: 'DUE_SOON' as CollectionStatusFilter, label: 'Due in 7 Days', count: statusCounts.dueSoon },
              { id: 'DUE_24H' as CollectionStatusFilter, label: 'Due in 24h', count: statusCounts.due24h },
              { id: 'PENDING' as CollectionStatusFilter, label: 'Pending Collection', count: statusCounts.pending },
              { id: 'SETTLED' as CollectionStatusFilter, label: 'Fully Settled', count: statusCounts.settled },
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
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 ml-auto shrink-0 cursor-pointer"
            >
              Reset Filters
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
              {isAreaManager
                ? `No customer accounts in ${selectedAreaObj?.name || 'your area'} match the active sales representative or status filters.`
                : 'No customer records match the active Area, Sales Representative, and Collection status filters.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs rounded-xl cursor-pointer"
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
                  <th className="py-3.5 px-4">Customer Account</th>
                  <th className="py-3.5 px-3">Territory & Rep</th>
                  <th className="py-3.5 px-3 text-right">Total Outstanding</th>
                  <th className="py-3.5 px-3 text-right">Past Due Overdue</th>
                  <th className="py-3.5 px-3">Oldest Overdue</th>
                  <th className="py-3.5 px-3 text-center">Open Invoices</th>
                  <th className="py-3.5 px-3">Next Due Date</th>
                  <th className="py-3.5 px-3 text-center">Collection Status</th>
                  <th className="py-3.5 px-3 text-right">Last Payment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
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
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Phone Call */}
                          <button
                            type="button"
                            onClick={() => (window.location.href = `tel:${customer.phone}`)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            title="Call Customer"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>

                          {/* Primary Collect Button */}
                          <Button
                            size="sm"
                            onClick={() => handleSelectCustomer(customer)}
                            className="h-7 px-2.5 text-[11px] font-bold bg-primary hover:bg-primary-hover text-white rounded-lg shadow-2xs gap-1 cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const data = customerLedgerMap.get(customer.id);
            const isOverdue = (data?.meta.totalOverdue || 0) > 0;
            const isSettled = (data?.meta.totalOutstanding || 0) <= 0;
            const isDueSoon = data?.meta.isNearDue;

            return (
              <Card
                key={customer.id}
                className={cn(
                  'bg-white border rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3.5',
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
                      className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
                      title="WhatsApp Reminder"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => (window.location.href = `tel:${customer.phone}`)}
                      className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                      title="Call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleSelectCustomer(customer)}
                    className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs gap-1.5 cursor-pointer"
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
