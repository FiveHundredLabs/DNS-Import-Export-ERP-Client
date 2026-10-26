import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { Invoice } from '../../types/invoice';
import { customerService } from '../../services/CustomerService';
import { invoiceService } from '../../services/InvoiceService';
import { useAuth } from '../../hooks/useAuth';
import {
  CustomerPaymentFilterType,
  filterCustomersByPaymentStatus,
  evaluateCustomerPaymentStatus,
} from '../../rules/customerPaymentRules';
import { CustomerPaymentCard } from './components/CustomerPaymentCard';
import { CustomerPaymentFilters } from './components/CustomerPaymentFilters';
import { StatCard } from '../../components/common/StatCard';
import { formatCurrency } from '../../utils/formatters';
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../utils/cn';

interface CustomerPaymentsTabProps {
  onSelectCustomer?: (customer: Customer) => void;
  className?: string;
}

export function CustomerPaymentsTab({ onSelectCustomer, className }: CustomerPaymentsTabProps) {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CustomerPaymentFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const isRep = role === 'SALES_REP';
      const [custRes, invRes] = await Promise.all([
        customerService.listCustomers({
          pageSize: 100,
          assignedRepId: isRep ? currentUser.id : undefined,
        }),
        invoiceService.getInvoices({
          pageSize: 200,
          salesRepId: isRep ? currentUser.id : undefined,
        }),
      ]);

      setCustomers(custRes.data);
      setInvoices(invRes.data);
    } catch (err) {
      console.error('Failed to load customers or invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, currentUser.id]);

  // Handle navigating to dedicated payment details screen
  const handleSelectCustomer = (customer: Customer) => {
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    } else {
      navigate(`/payments/collect/${customer.id}`);
    }
  };

  // Compute filter counts
  const counts = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let nearby = 0;
    let pendingCollection = 0;
    let settled = 0;

    for (const c of customers) {
      const meta = evaluateCustomerPaymentStatus(c, invoices);
      if (meta.totalOutstanding > 0 || meta.openInvoicesCount > 0) outstanding++;
      if (meta.overdueCount > 0 || meta.totalOverdue > 0) overdue++;
      if (meta.isNearby) nearby++;
      if (meta.pendingCollectionAmount > 0 || meta.filterStatus === 'PENDING_COLLECTION') pendingCollection++;
      if (meta.totalOutstanding <= 0 && meta.openInvoicesCount === 0) settled++;
    }

    return {
      all: customers.length,
      outstanding,
      overdue,
      nearby,
      pendingCollection,
      settled,
    };
  }, [customers, invoices]);

  // Overall territory financials
  const territoryTotals = useMemo(() => {
    let totalOutstanding = 0;
    let totalOverdue = 0;

    for (const c of customers) {
      const meta = evaluateCustomerPaymentStatus(c, invoices);
      totalOutstanding += meta.totalOutstanding;
      totalOverdue += meta.totalOverdue;
    }

    return { totalOutstanding, totalOverdue };
  }, [customers, invoices]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return filterCustomersByPaymentStatus(customers, invoices, activeFilter, searchQuery);
  }, [customers, invoices, activeFilter, searchQuery]);

  return (
    <div className={cn('space-y-4 sm:space-y-5', className)}>
      {/* 1. Header Banner & Quick Action (Mobile-First) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-primary-light text-primary-text border border-primary-border">
              <CreditCard className="h-3 w-3" /> Field Collections
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Customer Ledger Hub</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Customer Payments & Balances
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify outstanding accounts, view open invoices, and collect multi-invoice bulk payments via FIFO.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl"
            title="Refresh Ledger"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
          </Button>

          {customers.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                const firstOutstanding = customers.find((c) => {
                  const m = evaluateCustomerPaymentStatus(c, invoices);
                  return m.totalOutstanding > 0;
                });
                if (firstOutstanding) {
                  handleSelectCustomer(firstOutstanding);
                } else if (customers[0]) {
                  handleSelectCustomer(customers[0]);
                }
              }}
              className="h-9 px-3.5 gap-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl shadow-xs"
            >
              <DollarSign className="h-3.5 w-3.5" /> Instant Pay
            </Button>
          )}
        </div>
      </div>

      {/* 2. KPI Cards Row (Using the unified Sales Rep Dashboard KPI styling) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Receivables"
          value={formatCurrency(territoryTotals.totalOutstanding)}
          subtitle="Portfolio outstanding"
          variant="warning"
          icon={DollarSign}
        />

        <StatCard
          title="Past Due Debt"
          value={formatCurrency(territoryTotals.totalOverdue)}
          subtitle={`${counts.overdue} Dealers overdue`}
          variant="danger"
          icon={AlertCircle}
        />

        <StatCard
          title="Assigned Accounts"
          value={`${counts.all} Dealers`}
          subtitle={`${counts.outstanding} With active balances`}
          variant="indigo"
          icon={Users}
        />

        <StatCard
          title="Settled Accounts"
          value={`${counts.settled} Dealers`}
          subtitle="Zero balance on record"
          variant="success"
          icon={CheckCircle2}
        />
      </div>

      {/* 3. Filter Chips & Search Bar */}
      <CustomerPaymentFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        counts={counts}
      />

      {/* 4. Customer Cards List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No Customers Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No assigned customers matched your search query "${searchQuery}".`
                : `No customers match the active "${activeFilter.replace('_', ' ')}" filter.`}
            </p>
          </div>
          {(searchQuery || activeFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('ALL');
              }}
              className="text-xs rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <CustomerPaymentCard
              key={customer.id}
              customer={customer}
              invoices={invoices}
              onSelectCustomer={handleSelectCustomer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
