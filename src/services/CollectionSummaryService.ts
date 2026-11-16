import { Payment } from '../types/payment';
import { User } from '../types/auth';
import { paymentService, PaymentService } from './PaymentService';
import { MOCK_USERS } from '../mock/mockUsers';

export interface CollectionKpiSummary {
  totalCollected: number;
  cashCollected: number;
  chequeCollected: number;
  bankTransferCollected: number;
  cashHeld: number;
  chequeHeld: number;
  totalHeld: number;
  totalReceipts: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface CollectorSummaryRow {
  collectorId: string;
  collectorName: string;
  collectorRole: string; // 'AREA_MANAGER' | 'SALES_REP'
  areaId?: string;
  areaName?: string;
  totalCollected: number;
  cashCollected: number;
  chequeCollected: number;
  bankTransferCollected: number;
  cashHeld: number;
  chequeHeld: number;
  totalHeld: number;
  receiptCount: number;
}

export interface DateWiseCollectionRow {
  date: string; // YYYY-MM-DD
  collectorId: string;
  collectorName: string;
  collectorRole: string;
  areaName?: string;
  totalCollected: number;
  cashAmount: number;
  chequeAmount: number;
  bankTransferAmount: number;
  receiptCount: number;
}

export interface CollectionSummaryFilterOptions {
  startDate?: string;
  endDate?: string;
  datePreset?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all' | 'custom';
  areaId?: string;
  collectorId?: string;
  actorRole: string;
  actorUserId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CollectionSummaryResult {
  kpi: CollectionKpiSummary;
  areaManagerSummary?: CollectorSummaryRow | null; // AM's personal collections
  teamSummary: CollectorSummaryRow[]; // Assigned Sales Reps in area
  allCollectorsSummary: CollectorSummaryRow[]; // For Managers/Directors/Finance
  dateWiseSummary: DateWiseCollectionRow[];
  detailedPayments: {
    data: Payment[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export class CollectionSummaryService {
  private paymentSvc: PaymentService;

  constructor(paymentSvc?: PaymentService) {
    this.paymentSvc = paymentSvc || paymentService;
  }

  /**
   * Resolves date boundaries based on preset or custom range.
   */
  resolveDateRange(preset?: string, start?: string, end?: string): { startDate?: string; endDate?: string } {
    if (preset === 'custom' || (!preset && (start || end))) {
      return { startDate: start, endDate: end };
    }

    const now = new Date();
    const toYmd = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (preset) {
      case 'today': {
        const todayStr = toYmd(now);
        return { startDate: todayStr, endDate: todayStr };
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yestStr = toYmd(yesterday);
        return { startDate: yestStr, endDate: yestStr };
      }
      case 'this_week': {
        const dayOfWeek = now.getDay() || 7; // Sunday = 7
        const monday = new Date(now);
        monday.setDate(now.getDate() - dayOfWeek + 1);
        return { startDate: toYmd(monday), endDate: toYmd(now) };
      }
      case 'this_month': {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: toYmd(firstOfMonth), endDate: toYmd(now) };
      }
      case 'all':
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }

  /**
   * Computes the complete Sales Collection Summary with:
   * - Separation of Area Manager personal vs Sales Rep team collections
   * - Date-wise grouping by collectedAt date
   * - Separate Cash Held and Cheque Held tracking
   * - Retention of rejected payments in held totals
   * - Server-side / paginated detailed payment records
   */
  async getCollectionSummary(options: CollectionSummaryFilterOptions): Promise<CollectionSummaryResult> {
    const { startDate, endDate } = this.resolveDateRange(options.datePreset, options.startDate, options.endDate);

    // Fetch all payments matching criteria from repository
    const result = await this.paymentSvc.getPayments({
      startDate,
      endDate,
      pageSize: 1000, // Fetch full set for aggregation
    });

    const allPayments = result.data;
    const allUsers = MOCK_USERS;

    // Find current actor user details
    const actorUser = allUsers.find((u) => u.id === options.actorUserId) || {
      id: options.actorUserId,
      name: 'Current User',
      role: options.actorRole as any,
      areaId: options.areaId,
    };

    // Determine authorized visibility scope
    let scopedPayments: Payment[] = [];
    let scopedUsers: User[] = [];

    if (options.actorRole === 'SALES_REP') {
      scopedPayments = allPayments.filter((p) => p.salesRepId === options.actorUserId);
      scopedUsers = allUsers.filter((u) => u.id === options.actorUserId);
    } else if (options.actorRole === 'AREA_MANAGER') {
      const amAreaId = actorUser.areaId;
      // Area Manager sees their own collections + sales reps assigned to their area
      const areaReps = allUsers.filter((u) => (u.areaId === amAreaId || u.id === options.actorUserId) && u.isActive);
      const allowedUserIds = new Set(areaReps.map((u) => u.id));

      scopedPayments = allPayments.filter((p) => allowedUserIds.has(p.salesRepId));
      scopedUsers = areaReps;

      // If specific collector filter is selected, further filter
      if (options.collectorId) {
        scopedPayments = scopedPayments.filter((p) => p.salesRepId === options.collectorId);
      }
    } else {
      // SALES_MANAGER, MANAGER, DIRECTOR, FINANCE_OFFICER, FINANCE_MANAGER
      scopedPayments = [...allPayments];
      scopedUsers = allUsers.filter((u) => u.role === 'SALES_REP' || u.role === 'AREA_MANAGER');

      if (options.areaId && options.areaId !== 'ALL') {
        const areaUserIds = new Set(allUsers.filter((u) => u.areaId === options.areaId).map((u) => u.id));
        scopedPayments = scopedPayments.filter((p) => areaUserIds.has(p.salesRepId));
      }

      if (options.collectorId && options.collectorId !== 'ALL') {
        scopedPayments = scopedPayments.filter((p) => p.salesRepId === options.collectorId);
      }
    }

    // Apply search filter if provided
    if (options.search?.trim()) {
      const q = options.search.toLowerCase();
      scopedPayments = scopedPayments.filter(
        (p) =>
          p.receiptNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.salesRepName.toLowerCase().includes(q)
      );
    }

    // Compute Overall KPI Summary across the entire filtered dataset
    const kpi: CollectionKpiSummary = {
      totalCollected: 0,
      cashCollected: 0,
      chequeCollected: 0,
      bankTransferCollected: 0,
      cashHeld: 0,
      chequeHeld: 0,
      totalHeld: 0,
      totalReceipts: scopedPayments.length,
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    };

    for (const p of scopedPayments) {
      // Exclude REVERSED payments from total collected revenue
      if (p.status !== 'REJECTED' && p.status !== ('REVERSED' as any)) {
        kpi.totalCollected += p.amount;
      }

      if (p.paymentMethod === 'CASH') kpi.cashCollected += p.amount;
      else if (p.paymentMethod === 'CHEQUE') kpi.chequeCollected += p.amount;
      else if (p.paymentMethod === 'BANK_TRANSFER') kpi.bankTransferCollected += p.amount;

      if (p.status === 'APPROVED') {
        kpi.approvedCount++;
      } else if (p.status === 'PENDING_APPROVAL') {
        kpi.pendingCount++;
      } else if (p.status === 'REJECTED') {
        kpi.rejectedCount++;
      }

      // Money Held Calculation (Business Rule: PENDING or REJECTED without Finance acceptance)
      const isHeld = (p.status === 'PENDING_APPROVAL' || p.status === 'REJECTED') && p.status !== 'APPROVED';
      if (isHeld) {
        if (p.paymentMethod === 'CASH') {
          kpi.cashHeld += p.amount;
        } else if (p.paymentMethod === 'CHEQUE') {
          kpi.chequeHeld += p.amount;
        }
      }
    }
    kpi.totalHeld = kpi.cashHeld + kpi.chequeHeld;

    // Per-Collector Summary Aggregation
    const collectorMap = new Map<string, CollectorSummaryRow>();

    // Pre-populate with all known scoped users so zero-collection reps still display
    for (const u of scopedUsers) {
      collectorMap.set(u.id, {
        collectorId: u.id,
        collectorName: u.name,
        collectorRole: u.role,
        areaId: u.areaId,
        areaName: u.areaName,
        totalCollected: 0,
        cashCollected: 0,
        chequeCollected: 0,
        bankTransferCollected: 0,
        cashHeld: 0,
        chequeHeld: 0,
        totalHeld: 0,
        receiptCount: 0,
      });
    }

    for (const p of scopedPayments) {
      if (!collectorMap.has(p.salesRepId)) {
        collectorMap.set(p.salesRepId, {
          collectorId: p.salesRepId,
          collectorName: p.salesRepName,
          collectorRole: 'SALES_REP',
          totalCollected: 0,
          cashCollected: 0,
          chequeCollected: 0,
          bankTransferCollected: 0,
          cashHeld: 0,
          chequeHeld: 0,
          totalHeld: 0,
          receiptCount: 0,
        });
      }

      const row = collectorMap.get(p.salesRepId)!;
      row.receiptCount++;

      if (p.status !== 'REJECTED' && p.status !== ('REVERSED' as any)) {
        row.totalCollected += p.amount;
      }
      if (p.paymentMethod === 'CASH') row.cashCollected += p.amount;
      else if (p.paymentMethod === 'CHEQUE') row.chequeCollected += p.amount;
      else if (p.paymentMethod === 'BANK_TRANSFER') row.bankTransferCollected += p.amount;

      const isHeld = (p.status === 'PENDING_APPROVAL' || p.status === 'REJECTED') && p.status !== 'APPROVED';
      if (isHeld) {
        if (p.paymentMethod === 'CASH') {
          row.cashHeld += p.amount;
        } else if (p.paymentMethod === 'CHEQUE') {
          row.chequeHeld += p.amount;
        }
      }
      row.totalHeld = row.cashHeld + row.chequeHeld;
    }

    const allCollectorsSummary = Array.from(collectorMap.values()).sort((a, b) => b.totalCollected - a.totalCollected);

    // Area Manager Specific Separation (Requirement 2):
    // AM's personal collections vs Assigned Sales Reps collections
    let areaManagerSummary: CollectorSummaryRow | null = null;
    let teamSummary: CollectorSummaryRow[] = [];

    if (options.actorRole === 'AREA_MANAGER') {
      areaManagerSummary = allCollectorsSummary.find((c) => c.collectorId === options.actorUserId) || null;
      teamSummary = allCollectorsSummary.filter(
        (c) => c.collectorId !== options.actorUserId && c.collectorRole === 'SALES_REP'
      );
    } else {
      teamSummary = allCollectorsSummary.filter((c) => c.collectorRole === 'SALES_REP');
    }

    // Date-Wise Summary Grouped by collectedAt date (Requirement 3)
    const dateMap = new Map<string, DateWiseCollectionRow>();

    for (const p of scopedPayments) {
      const dateStr = (p.collectedAt || p.createdAt || '').slice(0, 10);
      if (!dateStr) continue;

      const key = `${dateStr}_${p.salesRepId}`;
      if (!dateMap.has(key)) {
        const u = allUsers.find((usr) => usr.id === p.salesRepId);
        dateMap.set(key, {
          date: dateStr,
          collectorId: p.salesRepId,
          collectorName: p.salesRepName,
          collectorRole: u?.role || 'SALES_REP',
          areaName: u?.areaName,
          totalCollected: 0,
          cashAmount: 0,
          chequeAmount: 0,
          bankTransferAmount: 0,
          receiptCount: 0,
        });
      }

      const item = dateMap.get(key)!;
      item.receiptCount++;

      if (p.status !== 'REJECTED' && p.status !== ('REVERSED' as any)) {
        item.totalCollected += p.amount;
      }
      if (p.paymentMethod === 'CASH') item.cashAmount += p.amount;
      else if (p.paymentMethod === 'CHEQUE') item.chequeAmount += p.amount;
      else if (p.paymentMethod === 'BANK_TRANSFER') item.bankTransferAmount += p.amount;
    }

    const dateWiseSummary = Array.from(dateMap.values()).sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return a.collectorName.localeCompare(b.collectorName);
    });

    // Detailed Payments (Server-side / in-memory pagination)
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25;
    const sortedPayments = [...scopedPayments].sort(
      (a, b) => new Date(b.collectedAt || b.createdAt).getTime() - new Date(a.collectedAt || a.createdAt).getTime()
    );

    const paginatedData = sortedPayments.slice((page - 1) * pageSize, page * pageSize);

    return {
      kpi,
      areaManagerSummary,
      teamSummary,
      allCollectorsSummary,
      dateWiseSummary,
      detailedPayments: {
        data: paginatedData,
        meta: {
          page,
          pageSize,
          total: sortedPayments.length,
          totalPages: Math.ceil(sortedPayments.length / pageSize),
        },
      },
    };
  }
}

export const collectionSummaryService = new CollectionSummaryService();
