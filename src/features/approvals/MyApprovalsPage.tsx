import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { approvalsApi } from '../../api/approvals/approvals.api';
import type {
  ApprovalItem,
  ApprovalCounts,
  ApprovalQueryParams,
} from '../../api/approvals/approvals.types';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  ShoppingCart,
  FileText,
  Boxes,
  Landmark,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const SCROLL_STORAGE_KEY = 'my_approvals_scroll_top';

export function MyApprovalsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isDirectorOrManager = role === 'DIRECTOR' || role === 'MANAGER';

  // Restore initial filters & pagination from URL search params
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') || '');
  const debouncedSearch = useDebounce(searchInput, 300);
  const entityFilter = searchParams.get('type') || 'ALL';
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const pageSize = 15;

  const [counts, setCounts] = useState<ApprovalCounts | null>(null);
  const [requests, setRequests] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync debounced search into URL query params
  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    const nextQ = debouncedSearch.trim();
    if (currentQ !== nextQ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextQ) {
            next.set('q', nextQ);
          } else {
            next.delete('q');
          }
          next.set('page', '1');
          return next;
        },
        { replace: true },
      );
    }
  }, [debouncedSearch, searchParams, setSearchParams]);

  const setEntityFilter = (nextType: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextType && nextType !== 'ALL') {
          next.set('type', nextType);
        } else {
          next.delete('type');
        }
        next.set('page', '1');
        return next;
      },
      { replace: true },
    );
  };

  const setPage = (nextPage: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(Math.max(1, nextPage)));
        return next;
      },
      { replace: true },
    );
  };

  const fetchCounts = useCallback(async () => {
    try {
      const data = await approvalsApi.getMyApprovalCounts();
      setCounts(data);
    } catch (err: any) {
      console.error('Failed to fetch approval counts:', err);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = (searchParams.get('q') || '').trim();
      const params: ApprovalQueryParams = {
        page,
        limit: pageSize,
        search: q || undefined,
        entityType: entityFilter !== 'ALL' ? entityFilter : undefined,
        sortBy: 'requestedAt',
        sortOrder: 'desc',
      };
      const res = await approvalsApi.getMyPendingApprovals(params);
      setRequests(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.meta?.total ?? 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchParams, entityFilter]);

  useEffect(() => {
    fetchCounts();
    fetchRequests();
  }, [fetchCounts, fetchRequests]);

  // Restore scroll position after data finishes loading
  useEffect(() => {
    if (loading) return;
    const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved && scrollContainerRef.current) {
      const top = Number(saved);
      if (!Number.isNaN(top)) {
        scrollContainerRef.current.scrollTop = top;
      }
      sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    }
  }, [loading]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'CUSTOMER':
        return <Landmark className="h-4 w-4 text-emerald-600" />;
      case 'PURCHASE_ORDER':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'GRN':
        return <Boxes className="h-4 w-4 text-amber-600" />;
      default:
        return <FileText className="h-4 w-4 text-slate-600" />;
    }
  };

  const getDocumentLink = (item: ApprovalItem): string => {
    switch (item.entityType) {
      case 'CUSTOMER':
        return `/customers/${item.id}`;
      case 'PURCHASE_ORDER':
        return `/purchasing/orders/${item.id}`;
      case 'GRN':
        return `/inventory/grn/${item.id}`;
      default:
        return '#';
    }
  };

  const handleOpenItem = (item: ApprovalItem) => {
    const target = getDocumentLink(item);
    if (target === '#') return;
    if (scrollContainerRef.current) {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(scrollContainerRef.current.scrollTop));
    }
    navigate(target, {
      state: {
        from: `${location.pathname}${location.search}`,
        fromMyApprovals: true,
      },
    });
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 space-y-5"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              My Approvals
            </h1>
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5"
            >
              Role: {role || 'USER'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pending approvals assigned to your role. Select an item to review full details and take action in its module.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {isDirectorOrManager && (
            <Link
              to="/admin/approval-engine"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 shadow-sm transition"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrative Approval Engine
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCounts();
              fetchRequests();
            }}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Role-Specific Metric Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pending For You</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-2">{counts?.total ?? '-'}</div>
            <p className="text-[11px] text-slate-400 mt-1">Action required</p>
          </CardContent>
        </Card>

        {counts?.byModule &&
          Object.entries(counts.byModule).map(([mod, cnt]) => (
            <Card key={mod} className="border border-slate-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 capitalize">
                    {mod.replace('_', ' ')}
                  </span>
                  {getEntityIcon(mod)}
                </div>
                <div className="text-2xl font-bold text-slate-800 mt-2">{cnt}</div>
                <p className="text-[11px] text-slate-400 mt-1">In your queue</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex-1 w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reference, title..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Entity Tabs */}
            <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
              {['ALL', 'CUSTOMER', 'PURCHASE_ORDER', 'GRN'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEntityFilter(tab)}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 rounded-md transition capitalize whitespace-nowrap',
                    entityFilter === tab
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'hover:text-slate-900 text-slate-500',
                  )}
                >
                  {tab === 'ALL' ? 'All Assigned' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 shrink-0">
            {total} item(s) awaiting your decision
          </div>
        </CardContent>
      </Card>

      {/* Pending Items: Responsive Cards (< lg) & Desktop Table (>= lg) */}
      <Card className="border border-slate-200 shadow-sm bg-white flex flex-col">
        {loading ? (
          <div className="p-4">
            <TableLoadingSkeleton rows={6} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="You're all caught up!"
              description="There are currently no pending approval requests assigned to your role."
              icon={CheckCircle}
            />
          </div>
        ) : (
          <>
            {/* Mobile & Tablet Card Layout (< lg) */}
            <div className="divide-y divide-slate-200 lg:hidden">
              {requests.map((item) => (
                <div
                  key={`card-${item.entityType}-${item.id}`}
                  onClick={() => handleOpenItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenItem(item);
                    }
                  }}
                  className="p-4 space-y-3 hover:bg-slate-50/80 active:bg-slate-100/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                        {getEntityIcon(item.entityType)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">
                          {item.referenceNumber}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                          {item.entityType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {item.amount !== undefined && item.amount > 0 && (
                      <span className="text-xs font-bold text-slate-900 shrink-0">
                        {item.amount.toLocaleString()} {item.currency || 'LKR'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-800 break-words">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 break-words">{item.summary}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Stage
                      </span>
                      <span className="font-medium text-slate-800">{item.currentStage}</span>
                      <span className="text-[11px] text-slate-400 block">
                        Stage {item.stageNumber} of {item.totalStages}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                        Submitted By
                      </span>
                      <span className="font-medium text-slate-800">{item.requestedBy.name}</span>
                      <span className="text-[11px] text-slate-500 block">
                        {formatDateTime(item.requestedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenItem(item);
                      }}
                      className="w-full sm:w-auto h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                      Review & Decide <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout (>= lg) */}
            <div className="hidden lg:block w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[20%]">Entity & Reference</th>
                    <th className="py-3 px-4 w-[32%]">Title & Summary</th>
                    <th className="py-3 px-4 w-[20%]">Stage</th>
                    <th className="py-3 px-4 w-[16%] hidden xl:table-cell">Submitted By & Date</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {requests.map((item) => (
                    <tr
                      key={`${item.entityType}-${item.id}`}
                      onClick={() => handleOpenItem(item)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer align-top"
                    >
                      {/* Entity & Ref */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-md bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                            {getEntityIcon(item.entityType)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 hover:text-blue-600 transition break-all">
                              {item.referenceNumber}
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                              {item.entityType.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Title & Summary */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 line-clamp-2" title={item.title}>
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5" title={item.summary}>
                          {item.summary}
                        </div>
                        {item.amount !== undefined && item.amount > 0 && (
                          <div className="text-[11px] font-semibold text-slate-900 mt-1">
                            Value: {item.amount.toLocaleString()} {item.currency || 'LKR'}
                          </div>
                        )}
                        <div className="xl:hidden mt-1 text-[10px] text-slate-400">
                          By <span className="text-slate-600 font-medium">{item.requestedBy.name}</span> •{' '}
                          {formatDateTime(item.requestedAt)}
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 text-[11px] leading-snug">
                          {item.currentStage}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Stage {item.stageNumber} of {item.totalStages}
                        </span>
                      </td>

                      {/* Initiator & Date (xl+) */}
                      <td className="py-3.5 px-4 text-slate-600 hidden xl:table-cell">
                        <div className="text-[11px] font-medium text-slate-800">
                          {item.requestedBy.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatDateTime(item.requestedAt)}
                        </div>
                      </td>

                      {/* Review & Decide Navigation */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenItem(item);
                          }}
                          className="h-7 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 gap-1.5 shadow-xs"
                        >
                          Review & Decide
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Bar */}
        <div className="border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white text-xs text-slate-500">
          <div>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total items)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="h-7 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
              className="h-7 text-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
