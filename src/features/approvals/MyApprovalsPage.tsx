import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { approvalsApi } from '../../api/approvals/approvals.api';
import type {
  ApprovalItem,
  ApprovalCounts,
  ApprovalQueryParams,
  ApprovalActionPayload,
} from '../../api/approvals/approvals.types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components';
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
  Lock,
  Landmark,
  ArrowRight,
  Info,
  Check,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function MyApprovalsPage() {
  const { currentUser, role } = useAuth();

  const isDirectorOrManager = role === 'DIRECTOR' || role === 'MANAGER';

  const [counts, setCounts] = useState<ApprovalCounts | null>(null);
  const [requests, setRequests] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  // Action Dialog State
  const [activeItem, setActiveItem] = useState<ApprovalItem | null>(null);
  const [dialogAction, setDialogAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
      const params: ApprovalQueryParams = {
        page,
        limit: pageSize,
        search: search.trim() || undefined,
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
  }, [page, pageSize, search, entityFilter]);

  useEffect(() => {
    fetchCounts();
    fetchRequests();
  }, [fetchCounts, fetchRequests]);

  const handleOpenAction = (item: ApprovalItem, action: 'APPROVE' | 'REJECT') => {
    setActiveItem(item);
    setDialogAction(action);
    setActionComment('');
    setActionError(null);
  };

  const handleConfirmAction = async () => {
    if (!activeItem || !dialogAction) return;
    if (!actionComment.trim() || actionComment.trim().length < 3) {
      setActionError('An explanatory comment of at least 3 characters is required.');
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);
      const payload: ApprovalActionPayload = {
        action: dialogAction,
        comment: actionComment.trim(),
        rejectionReason: dialogAction === 'REJECT' ? actionComment.trim() : undefined,
      };

      await approvalsApi.executeRoleAction(activeItem.entityType, activeItem.id, payload);

      setActiveItem(null);
      setDialogAction(null);
      fetchCounts();
      fetchRequests();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to process approval action');
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Approvals</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5">
              Role: {role || 'USER'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tasks specifically assigned to you or your role requiring review and decision.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pending For You</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-2">
              {counts?.total ?? '-'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Action required</p>
          </CardContent>
        </Card>

        {counts?.byModule && Object.entries(counts.byModule).map(([mod, cnt]) => (
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
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reference, title..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Entity Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
              {['ALL', 'CUSTOMER', 'PURCHASE_ORDER', 'GRN'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setEntityFilter(tab);
                    setPage(1);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-md transition capitalize',
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

      {/* Pending Items Table */}
      <Card className="border border-slate-200 shadow-sm bg-white flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <TableLoadingSkeleton rows={6} />
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
              {error}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="You're all caught up!"
              description="There are currently no pending approval requests assigned to your role."
              icon={CheckCircle}
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Entity & Reference</th>
                  <th className="py-3 px-4">Title & Context</th>
                  <th className="py-3 px-4">Stage / Required Action</th>
                  <th className="py-3 px-4">Submitted By & Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {requests.map((item) => (
                  <tr key={`${item.entityType}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                    {/* Entity & Ref */}
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-100 border border-slate-200">
                          {getEntityIcon(item.entityType)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 hover:text-blue-600 transition flex items-center gap-1">
                            <Link to={getDocumentLink(item)}>
                              {item.referenceNumber}
                            </Link>
                            <ExternalLink className="h-3 w-3 text-slate-400" />
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {item.entityType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Title & Summary */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-medium text-slate-800 truncate" title={item.title}>
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate" title={item.summary}>
                        {item.summary}
                      </div>
                      {item.amount !== undefined && item.amount > 0 && (
                        <div className="text-[11px] font-semibold text-slate-900 mt-0.5">
                          Value: {item.amount.toLocaleString()} {item.currency || 'LKR'}
                        </div>
                      )}
                    </td>

                    {/* Stage & Assigned Role */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 text-[11px]">
                        {item.currentStage}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Stage {item.stageNumber} of {item.totalStages}
                      </span>
                    </td>

                    {/* Initiator & Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div className="text-[11px] font-medium text-slate-800">
                        {item.requestedBy.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDateTime(item.requestedAt)}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAction(item, 'APPROVE')}
                          className="h-7 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 gap-1 shadow-xs"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAction(item, 'REJECT')}
                          className="h-7 px-3 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 gap-1"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-white text-xs text-slate-500">
          <div>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total items)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation & Comment Modal */}
      {activeItem && dialogAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    dialogAction === 'APPROVE'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600',
                  )}
                >
                  {dialogAction === 'APPROVE' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Confirm {dialogAction === 'APPROVE' ? 'Approval' : 'Rejection'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeItem.referenceNumber} - {activeItem.currentStage}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Title:</span>
                <span className="font-semibold text-slate-800">{activeItem.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold text-slate-800">{activeItem.department}</span>
              </div>
              {activeItem.amount !== undefined && activeItem.amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Value:</span>
                  <span className="font-bold text-slate-900">
                    {activeItem.amount.toLocaleString()} {activeItem.currency || 'LKR'}
                  </span>
                </div>
              )}
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Comment / Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  dialogAction === 'APPROVE'
                    ? 'Enter approval notes...'
                    : 'Enter reason for rejection...'
                }
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveItem(null)}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAction}
                disabled={submitting || actionComment.trim().length < 3}
                className={cn(
                  'text-xs font-semibold text-white',
                  dialogAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700',
                )}
              >
                {submitting ? 'Processing...' : `Confirm ${dialogAction === 'APPROVE' ? 'Approval' : 'Rejection'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
