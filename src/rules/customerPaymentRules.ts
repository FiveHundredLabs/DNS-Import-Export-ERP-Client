import { Customer } from '../types/customer';
import { Invoice, InvoiceStatus } from '../types/invoice';
import { isPastDueDate } from './invoiceRules';

export type CustomerPaymentFilterType =
  | 'ALL'
  | 'OUTSTANDING'
  | 'OVERDUE'
  | 'NEARBY' // Near Due (approaching credit days due date)
  | 'NEAR_DUE'
  | 'PENDING_COLLECTION'
  | 'SETTLED'
  | 'FULLY_SETTLED';

export interface CustomerPaymentStatusMeta {
  filterStatus: 'OUTSTANDING' | 'OVERDUE' | 'PENDING_COLLECTION' | 'SETTLED';
  badgeLabel: string;
  badgeVariant: 'destructive' | 'warning' | 'default' | 'success' | 'outline';
  overdueCount: number;
  openInvoicesCount: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalNearDue: number;
  nearDueCount: number;
  nearDueLabel?: string;
  isNearDue: boolean;
  isNearby: boolean; // Alias for isNearDue (approaching credit days due date)
  pendingCollectionAmount: number;
  distanceKm?: number;
  distanceLabel?: string;
}

export interface FifoAllocationItem {
  invoiceId: string;
  invoiceNumber: string;
  orderNumber?: string;
  issueDate: string;
  dueDate: string;
  originalAmount: number;
  previouslyCollected: number;
  currentBalance: number;
  allocatedAmount: number;
  remainingBalance: number;
  currentStatus: InvoiceStatus;
  resultingStatus: 'FULLY_COLLECTED' | 'PARTIALLY_COLLECTED' | 'UNTOUCHED';
  isOverdue: boolean;
  daysOverdue?: number;
}

export interface FifoAllocationBreakdown {
  items: FifoAllocationItem[];
  totalPaymentAmount: number;
  totalAllocated: number;
  unallocatedAmount: number;
  fullySettledCount: number;
  partiallySettledCount: number;
  untouchedCount: number;
}

// Simulated coordinates for proximity calculation (Colombo Central Field Rep base)
const BASELINE_COORDS = { lat: 6.9271, lng: 79.8612 };

// Distance lookup by customer code for reliable proximity tagging
const MOCK_DISTANCES: Record<string, number> = {
  'DLR-COL-001': 0.8, // 142 First Cross St, Colombo 11 (Pettah) -> 800m
  'DLR-NEG-002': 28.5, // Negombo
  'SHW-KOT-003': 1.6, // Nawala Rd, Kotte -> 1.6 km
  'DLR-GAM-004': 22.0, // Gampaha
};

/**
 * Calculates simulated or geo-distance to a customer shop.
 */
export function getCustomerProximity(customer: Customer): { distanceKm: number; label: string; isNearby: boolean } {
  const dist = MOCK_DISTANCES[customer.code] ?? (customer.areaId === 'area-01' ? 1.4 : 15.0);
  const isNearby = dist <= 3.0; // Within 3 km is classified as Nearby
  const label = dist < 1.0 ? `${Math.round(dist * 1000)}m away` : `${dist.toFixed(1)} km away`;
  return { distanceKm: dist, label, isNearby };
}

/**
 * Calculates overdue days count from due date string (YYYY-MM-DD)
 */
export function getDaysOverdue(dueDate: string, referenceDate: Date = new Date()): number {
  if (!dueDate) return 0;
  const [year, month, day] = dueDate.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  const diffTime = referenceDate.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Derives real-time payment status and overdue summary for a customer.
 */
export function evaluateCustomerPaymentStatus(
  customer: Customer,
  invoices: Invoice[] = []
): CustomerPaymentStatusMeta {
  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const proximity = getCustomerProximity(customer);

  let openInvoicesCount = 0;
  let overdueCount = 0;
  let totalOverdue = 0;
  let totalOutstanding = 0;
  let totalNearDue = 0;
  let nearDueCount = 0;
  let pendingCollectionAmount = 0;
  let shortestNearDueDays: number | null = null;

  const now = new Date();
  const nowTime = now.getTime();
  const sevenDaysAheadTime = nowTime + 7 * 24 * 60 * 60 * 1000;

  if (customerInvoices.length > 0) {
    for (const inv of customerInvoices) {
      if (inv.status === 'CANCELLED' || inv.status === 'DRAFT') continue;

      const uncollected = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
      if (inv.balanceAmount > 0) {
        totalOutstanding += inv.balanceAmount;
      }

      if (inv.collectedAmount && inv.collectedAmount > 0 && inv.status !== 'PAID') {
        pendingCollectionAmount += inv.collectedAmount;
      }

      if (uncollected > 0) {
        openInvoicesCount++;
        const pastDue = isPastDueDate(inv.dueDate, now);
        if (pastDue || inv.status === 'OVERDUE') {
          overdueCount++;
          totalOverdue += uncollected;
        } else {
          // Check if invoice due date is approaching (within 7 days based on credit terms)
          const [y, m, d] = inv.dueDate.split('-').map(Number);
          const dueTime = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
          if (dueTime <= sevenDaysAheadTime) {
            nearDueCount++;
            totalNearDue += uncollected;
            const daysLeft = Math.max(1, Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24)));
            if (shortestNearDueDays === null || daysLeft < shortestNearDueDays) {
              shortestNearDueDays = daysLeft;
            }
          }
        }
      }
    }
  } else {
    totalOutstanding = customer.financials?.totalOutstanding ?? customer.outstandingBalance ?? 0;
    totalOverdue = customer.financials?.overdue ?? customer.overdueAmount ?? 0;
    totalNearDue = customer.financials?.nearDue ?? 0;
    openInvoicesCount = totalOutstanding > 0 ? 1 : 0;
    overdueCount = totalOverdue > 0 ? 1 : 0;
    nearDueCount = totalNearDue > 0 ? 1 : 0;
  }

  // Also factor in customer financial ledger nearDue if available
  if (customer.financials?.nearDue && customer.financials.nearDue > 0 && totalNearDue === 0) {
    totalNearDue = customer.financials.nearDue;
    nearDueCount = 1;
  }

  const isNearDue = nearDueCount > 0 || totalNearDue > 0;
  const isNearby = isNearDue; // "Nearby" = Near Due Date according to credit terms

  const nearDueLabel = shortestNearDueDays !== null
    ? `Due in ${shortestNearDueDays}d`
    : isNearDue
    ? 'Near Due Date'
    : undefined;

  let filterStatus: 'OUTSTANDING' | 'OVERDUE' | 'PENDING_COLLECTION' | 'SETTLED' = 'SETTLED';
  let badgeLabel = 'Fully Settled';
  let badgeVariant: 'destructive' | 'warning' | 'default' | 'success' | 'outline' = 'success';

  if (overdueCount > 0 || totalOverdue > 0) {
    filterStatus = 'OVERDUE';
    badgeLabel = overdueCount > 1 ? `${overdueCount} Invoices Overdue` : 'Overdue Balance';
    badgeVariant = 'destructive';
  } else if (pendingCollectionAmount > 0) {
    filterStatus = 'PENDING_COLLECTION';
    badgeLabel = 'Collection Awaiting Clearance';
    badgeVariant = 'warning';
  } else if (isNearDue) {
    filterStatus = 'OUTSTANDING';
    badgeLabel = nearDueLabel || 'Near Due Date';
    badgeVariant = 'warning';
  } else if (totalOutstanding > 0 || openInvoicesCount > 0) {
    filterStatus = 'OUTSTANDING';
    badgeLabel = 'Outstanding (Within Terms)';
    badgeVariant = 'default';
  }

  return {
    filterStatus,
    badgeLabel,
    badgeVariant,
    overdueCount,
    openInvoicesCount,
    totalOutstanding,
    totalOverdue,
    totalNearDue,
    nearDueCount,
    nearDueLabel,
    isNearDue,
    isNearby,
    pendingCollectionAmount,
    distanceKm: proximity.distanceKm,
    distanceLabel: proximity.label,
  };
}

/**
 * Filter customers based on the Sales Rep Customer Payment tab filters.
 */
export function filterCustomersByPaymentStatus(
  customers: Customer[],
  invoices: Invoice[],
  filterType: CustomerPaymentFilterType,
  searchQuery: string = ''
): Customer[] {
  let list = customers;

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }

  if (filterType === 'ALL') {
    return list;
  }

  return list.filter((c) => {
    const meta = evaluateCustomerPaymentStatus(c, invoices);

    switch (filterType) {
      case 'OUTSTANDING':
        return meta.totalOutstanding > 0 || meta.openInvoicesCount > 0;
      case 'OVERDUE':
        return meta.overdueCount > 0 || meta.totalOverdue > 0;
      case 'NEARBY':
      case 'NEAR_DUE':
        return meta.isNearDue || meta.isNearby || meta.totalNearDue > 0;
      case 'PENDING_COLLECTION':
        return meta.pendingCollectionAmount > 0 || meta.filterStatus === 'PENDING_COLLECTION';
      case 'SETTLED':
      case 'FULLY_SETTLED':
        return meta.totalOutstanding <= 0 && meta.openInvoicesCount === 0;
      default:
        return true;
    }
  });
}

/**
 * Automatic FIFO Payment Allocation Calculator.
 *
 * Rules:
 * 1. Invoices are sorted by oldest due date first (FIFO).
 * 2. If selectedInvoiceIds is provided, only those invoices are allocated against.
 * 3. Payment amount is allocated sequentially to fully settle the oldest invoice before moving to the next.
 * 4. Produces a real-time allocation breakdown for the Sales Rep before submission.
 */
export function calculateFifoAllocation(
  paymentAmountOrInvoices: number | Invoice[],
  invoicesOrPaymentAmount: Invoice[] | number,
  selectedInvoiceIds?: string[]
): FifoAllocationBreakdown {
  let paymentAmount: number;
  let invoices: Invoice[];

  if (typeof paymentAmountOrInvoices === 'number') {
    paymentAmount = paymentAmountOrInvoices;
    invoices = (invoicesOrPaymentAmount as Invoice[]) || [];
  } else {
    invoices = (paymentAmountOrInvoices as Invoice[]) || [];
    paymentAmount = (invoicesOrPaymentAmount as number) || 0;
  }

  const safeAmount = Math.max(0, paymentAmount || 0);

  // Filter valid outstanding invoices
  let eligibleInvoices = invoices.filter((inv) => {
    if (inv.status === 'CANCELLED' || inv.status === 'DRAFT' || inv.status === 'PAID') {
      return false;
    }
    const uncollectedBalance = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
    return uncollectedBalance > 0;
  });

  // If specific invoices were selected by the sales rep, restrict to them
  if (selectedInvoiceIds && selectedInvoiceIds.length > 0) {
    const selectedSet = new Set(selectedInvoiceIds);
    eligibleInvoices = eligibleInvoices.filter((inv) => selectedSet.has(inv.id));
  }

  // Sort FIFO: oldest due date first, then oldest issue date, then invoiceNumber
  const sortedInvoices = [...eligibleInvoices].sort((a, b) => {
    const dueA = new Date(a.dueDate).getTime() || 0;
    const dueB = new Date(b.dueDate).getTime() || 0;
    if (dueA !== dueB) return dueA - dueB;

    const issueA = new Date(a.issueDate).getTime() || 0;
    const issueB = new Date(b.issueDate).getTime() || 0;
    if (issueA !== issueB) return issueA - issueB;

    return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
  });

  let remainingPayment = safeAmount;
  let totalAllocated = 0;
  let fullySettledCount = 0;
  let partiallySettledCount = 0;
  let untouchedCount = 0;

  const items: FifoAllocationItem[] = sortedInvoices.map((inv) => {
    const uncollectedBalance = Math.max(0, inv.balanceAmount - (inv.collectedAmount || 0));
    const allocAmount = Math.min(uncollectedBalance, remainingPayment);

    remainingPayment = Math.max(0, remainingPayment - allocAmount);
    totalAllocated += allocAmount;

    const remainingBal = Math.max(0, uncollectedBalance - allocAmount);
    const pastDue = isPastDueDate(inv.dueDate);
    const daysOverdue = pastDue ? getDaysOverdue(inv.dueDate) : undefined;

    let resultingStatus: 'FULLY_COLLECTED' | 'PARTIALLY_COLLECTED' | 'UNTOUCHED' = 'UNTOUCHED';
    if (allocAmount >= uncollectedBalance && allocAmount > 0) {
      resultingStatus = 'FULLY_COLLECTED';
      fullySettledCount++;
    } else if (allocAmount > 0) {
      resultingStatus = 'PARTIALLY_COLLECTED';
      partiallySettledCount++;
    } else {
      resultingStatus = 'UNTOUCHED';
      untouchedCount++;
    }

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.orderNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      originalAmount: inv.totalAmount,
      previouslyCollected: inv.collectedAmount || 0,
      currentBalance: uncollectedBalance,
      allocatedAmount: allocAmount,
      remainingBalance: remainingBal,
      currentStatus: inv.status,
      resultingStatus,
      isOverdue: pastDue || inv.status === 'OVERDUE',
      daysOverdue,
    };
  });

  return {
    items,
    totalPaymentAmount: safeAmount,
    totalAllocated,
    unallocatedAmount: remainingPayment,
    fullySettledCount,
    partiallySettledCount,
    untouchedCount,
  };
}
