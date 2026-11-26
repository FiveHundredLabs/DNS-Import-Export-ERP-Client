import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { approvalsApi } from '../../api/approvals/approvals.api';
import type {
  ApprovalItem,
  ApprovalEngineOverview,
  ApprovalQueryParams,
  ApprovalActionPayload,
  ApprovalPipeline,
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
  ShieldAlert,
  ShieldCheck,
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  User,
  MessageSquare,
  History,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { buildEntryNavigationState } from '../../utils/navigationContext';

export function ApprovalEnginePage() {
  const { currentUser, role } = useAuth();
  const location = useLocation();

  const isAuthorized = role === 'DIRECTOR' || role === 'MANAGER';

  const [overview, setOverview] = useState<ApprovalEngineOverview | null>(null);
  const [requests, setRequests] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');

  // Action Dialog State
  const [activeItem, setActiveItem] = useState<ApprovalItem | null>(null);
  const [dialogAction, setDialogAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Expanded Pipeline State
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [pipelines, setPipelines] = useState<Record<string, ApprovalPipeline>>({});
  const [pipelineLoading, setPipelineLoading] = useState<Record<string, boolean>>({});
  const [pipelineErrors, setPipelineErrors] = useState<Record<string, string>>({});

  const toggleExpand = async (item: ApprovalItem) => {
    const key = `${item.entityType}:${item.id}`;
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (!pipelines[key]) {
      try {
        setPipelineLoading((prev) => ({ ...prev, [key]: true }));
        setPipelineErrors((prev) => ({ ...prev, [key]: '' }));
        const data = await approvalsApi.getEnginePipeline(item.entityType, item.id);
        setPipelines((prev) => ({ ...prev, [key]: data }));
      } catch (err: any) {
        setPipelineErrors((prev) => ({
          ...prev,
          [key]: err?.message || 'Failed to load approval pipeline history',
        }));
      } finally {
        setPipelineLoading((prev) => ({ ...prev, [key]: false }));
      }
    }
  };

  const fetchOverview = useCallback(async () => {
    try {
      const data = await approvalsApi.getEngineOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to fetch approval engine overview:', err);
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
        urgency: urgencyFilter !== 'ALL' ? urgencyFilter : undefined,
        sortBy: 'requestedAt',
        sortOrder: 'desc',
      };
      const res = await approvalsApi.getEngineRequests(params);
      setRequests(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.meta?.total ?? 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, entityFilter, urgencyFilter]);

  useEffect(() => {
    if (isAuthorized) {
      fetchOverview();
      fetchRequests();
    }
  }, [isAuthorized, fetchOverview, fetchRequests]);

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

      await approvalsApi.executeAdminAction(activeItem.entityType, activeItem.id, payload);

      const actedKey = `${activeItem.entityType}:${activeItem.id}`;
      setPipelines((prev) => {
        const next = { ...prev };
        delete next[actedKey];
        return next;
      });
      if (expandedKey === actedKey) {
        setExpandedKey(null);
      }

      setActiveItem(null);
      setDialogAction(null);
      // Refresh overview and feed
      fetchOverview();
      fetchRequests();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to execute administrative action');
    } finally {
      setSubmitting(false);
    }
  };

  // Access denied screen for non-authorized roles
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-4">
        <div className="p-4 rounded-full bg-rose-50 border border-rose-200 shadow-sm">
          <ShieldAlert className="h-12 w-12 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted: Directors & Managers Only</h2>
        <p className="text-sm text-slate-500 max-w-md">
          The Centralized Approval Engine provides administrative-level governance and overrides across the ERP system.
          Your current role (<strong>{role}</strong>) does not have administrative override authority.
        </p>
        <Link
          to="/approvals/my-approvals"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Go to My Approvals <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

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

  const renderPipelinePanel = (item: ApprovalItem) => {
    const key = `${item.entityType}:${item.id}`;
    const pipeline = pipelines[key];
    const isLoading = pipelineLoading[key];
    const errMsg = pipelineErrors[key];

    if (isLoading) {
      return (
        <div className="p-4 text-xs text-slate-500 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-600" />
          Loading complete approval pipeline...
        </div>
      );
    }

    if (errMsg) {
      return (
        <div className="p-4 text-xs text-rose-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errMsg}</span>
        </div>
      );
    }

    if (!pipeline || !pipeline.stages || pipeline.stages.length === 0) {
      return (
        <div className="p-4 text-xs text-slate-500">
          No approval pipeline history recorded yet.
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-5 bg-slate-50/90 border-t border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-purple-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Complete Approval Pipeline — {pipeline.referenceNumber}
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Stage {pipeline.currentStageNumber} of {pipeline.totalStages} • {pipeline.stages.length} total step(s)
          </span>
        </div>

        <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {pipeline.stages.map((stage) => {
            const isCompleted = stage.status === 'COMPLETED';
            const isCurrent = stage.status === 'CURRENT';
            const isRejected = stage.status === 'REJECTED';

            return (
              <div key={`${key}-stage-${stage.sequence}`} className="relative">
                {/* Timeline Node Dot */}
                <div
                  className={cn(
                    'absolute -left-6 top-1.5 h-5 w-5 rounded-full flex items-center justify-center border-2 bg-white',
                    isCompleted && 'border-emerald-500 text-emerald-600',
                    isCurrent && 'border-blue-600 text-blue-600 ring-4 ring-blue-100',
                    isRejected && 'border-rose-500 text-rose-600',
                    !isCompleted && !isCurrent && !isRejected && 'border-slate-300 text-slate-400',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : isCurrent ? (
                    <Clock className="h-3 w-3" />
                  ) : isRejected ? (
                    <X className="h-3 w-3" />
                  ) : (
                    <span className="text-[9px] font-bold">{stage.sequence}</span>
                  )}
                </div>

                {/* Stage Card */}
                <div
                  className={cn(
                    'rounded-lg border p-3 text-xs transition-colors',
                    isCompleted && 'bg-white border-slate-200',
                    isCurrent && 'bg-blue-50/60 border-blue-200 shadow-2xs',
                    isRejected && 'bg-rose-50/60 border-rose-200',
                    !isCompleted && !isCurrent && !isRejected && 'bg-white/60 border-dashed border-slate-200 text-slate-500',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">#{stage.sequence}</span>
                      <span className="font-semibold text-slate-900">{stage.stageName}</span>
                      {stage.decision && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-1.5 py-0 font-semibold',
                            isCompleted && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            isCurrent && 'bg-blue-100 text-blue-800 border-blue-300',
                            isRejected && 'bg-rose-100 text-rose-800 border-rose-300',
                            !isCompleted && !isCurrent && !isRejected && 'bg-slate-100 text-slate-500 border-slate-200',
                          )}
                        >
                          {stage.decision}
                        </Badge>
                      )}
                      {stage.isFinanceRestricted && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 gap-1">
                          <Lock className="h-2.5 w-2.5" /> Finance Exclusive
                        </Badge>
                      )}
                    </div>

                    {stage.timestamp && (
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(stage.timestamp)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    {stage.actorName ? (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <strong className="text-slate-800">{stage.actorName}</strong>
                      </span>
                    ) : stage.assignedRole ? (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        Awaiting:{' '}
                        <strong className="text-slate-800">
                          {stage.assignedRole
                            .split('/')
                            .map((r) =>
                              r
                                .trim()
                                .toLowerCase()
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (c) => c.toUpperCase()),
                            )
                            .join(' / ')}
                        </strong>
                      </span>
                    ) : null}
                  </div>

                  {stage.comment && (
                    <div className="mt-2 p-2 rounded-md bg-slate-100/80 border border-slate-200/70 text-[11px] text-slate-700 flex items-start gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="break-words">{stage.comment}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Approval Engine</h1>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold px-2.5 py-0.5">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Administrative Governance
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized administrative pipeline control and executive override authority for Directors and Managers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/approvals/my-approvals"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition"
          >
            Switch to My Approvals <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOverview();
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

      {/* Macro Pipeline Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Active</span>
              <Layers className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {overview?.totalActivePipeline ?? '-'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across all departments</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Customer Credit</span>
              <Landmark className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-2">
              {overview?.customerCreditQueue ?? '-'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Onboarding credit terms</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Purchase Orders</span>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-2">
              {overview?.purchaseOrderQueue ?? '-'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Stage 1 & Stage 2</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Stock Intake (GRN)</span>
              <Boxes className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-2">
              {overview?.stockIntakeQueue ?? '-'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Stage 1 Physical intake</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Finance Sign-Off</span>
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              {overview?.financeSignOffQueue ?? '-'}
            </div>
            <p className="text-[11px] text-amber-600 font-medium mt-1">🔒 Finance Exclusive</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Overdue (&gt;48h)</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-2">
              {overview?.overdueCount ?? '-'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">SLA bottleneck warning</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex-1 w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reference, title, initiator..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Entity Filter Tabs */}
            <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
              {['ALL', 'CUSTOMER', 'PURCHASE_ORDER', 'GRN'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setEntityFilter(tab);
                    setPage(1);
                  }}
                  className={cn(
                    'px-2.5 sm:px-3 py-1.5 rounded-md transition capitalize whitespace-nowrap',
                    entityFilter === tab
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'hover:text-slate-900 text-slate-500',
                  )}
                >
                  {tab === 'ALL' ? 'All Pipelines' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 w-full sm:w-auto"
            >
              <option value="ALL">All Urgencies</option>
              <option value="NORMAL">Normal Urgency</option>
              <option value="HIGH">High Urgency</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 shrink-0">
            Showing {requests.length} of {total} request(s)
          </div>
        </CardContent>
      </Card>

      {/* Requests Table (Desktop) & Cards (Mobile/Tablet) */}
      <Card className="border border-slate-200 shadow-sm bg-white flex flex-col">
        {loading ? (
          <div className="p-4">
            <TableLoadingSkeleton rows={8} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No active approval requests"
              description="All approval pipelines across the system are currently clear."
              icon={CheckCircle}
            />
          </div>
        ) : (
          <>
            {/* Mobile & Tablet Card Layout (< lg) */}
            <div className="divide-y divide-slate-200 lg:hidden">
              {requests.map((item) => {
                const isFinanceRestricted = item.isFinanceRestricted;

                return (
                  <div
                    key={`card-${item.entityType}-${item.id}`}
                    className={cn(
                      'p-4 space-y-3',
                      isFinanceRestricted && 'bg-amber-50/25',
                    )}
                  >
                    {/* Card Header: Entity Icon, Ref, Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                          {getEntityIcon(item.entityType)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={getDocumentLink(item)}
                            state={buildEntryNavigationState(location, 'Approval Engine')}
                            className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1"
                          >
                            <span className="truncate">{item.referenceNumber}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                              {item.entityType.replace('_', ' ')}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-600">{item.department}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {item.urgency === 'HIGH' && (
                          <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] px-1.5 py-0.5 font-bold">
                            HIGH
                          </Badge>
                        )}
                        {item.urgency === 'CRITICAL' && (
                          <Badge className="bg-rose-100 text-rose-800 border-none text-[10px] px-1.5 py-0.5 font-bold">
                            CRITICAL
                          </Badge>
                        )}
                        {item.amount !== undefined && item.amount > 0 && (
                          <span className="text-xs font-bold text-slate-900">
                            {item.amount.toLocaleString()} {item.currency || 'LKR'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Summary */}
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-800 break-words">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 break-words">
                        {item.summary}
                      </div>
                    </div>

                    {/* Stage & Initiator */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                          Current Stage
                        </span>
                        <span className="font-medium text-slate-800">{item.currentStage}</span>
                        <span className="text-[11px] text-slate-500 block">
                          Assigned to: <strong className="text-slate-700">{item.assignedRole}</strong>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                          Initiated By
                        </span>
                        <span className="font-medium text-slate-800">{item.requestedBy.name}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {formatDateTime(item.requestedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpand(item)}
                        className="h-8 px-2.5 text-xs font-medium text-purple-700 hover:bg-purple-50 gap-1"
                      >
                        {expandedKey === `${item.entityType}:${item.id}` ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" /> Hide Pipeline
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" /> View Pipeline
                          </>
                        )}
                      </Button>

                      <div className="flex flex-wrap items-center gap-2">
                        {isFinanceRestricted ? (
                          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                            <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>Finance Manager Exclusive</span>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAction(item, 'APPROVE')}
                              className="h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Admin Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAction(item, 'REJECT')}
                              className="h-8 px-3 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 gap-1"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {expandedKey === `${item.entityType}:${item.id}` && (
                      <div className="pt-2 -mx-4 -mb-4">
                        {renderPipelinePanel(item)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout (>= lg) */}
            <div className="hidden lg:block w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[18%]">Entity & Reference</th>
                    <th className="py-3 px-4 w-[24%]">Title & Description</th>
                    <th className="py-3 px-4 w-[15%] hidden xl:table-cell">Department / Value</th>
                    <th className="py-3 px-4 w-[21%]">Current Stage</th>
                    <th className="py-3 px-4 w-[16%] hidden 2xl:table-cell">Initiator & Date</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {requests.map((item) => {
                    const isFinanceRestricted = item.isFinanceRestricted;

                    return (
                      <React.Fragment key={`${item.entityType}-${item.id}`}>
                        <tr
                          className={cn(
                            'hover:bg-slate-50/80 transition-colors align-top',
                            isFinanceRestricted && 'bg-amber-50/20',
                          )}
                        >
                        {/* Reference & Entity Badge */}
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-md bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                              {getEntityIcon(item.entityType)}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={getDocumentLink(item)}
                                state={buildEntryNavigationState(location, 'Approval Engine')}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1 break-all"
                              >
                                <span>{item.referenceNumber}</span>
                                <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                              </Link>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                                {item.entityType.replace('_', ' ')}
                              </div>
                              {/* Compact department & value on lg screens before xl */}
                              <div className="xl:hidden mt-1 space-y-0.5">
                                <div className="text-[11px] text-slate-600">{item.department}</div>
                                {item.amount !== undefined && item.amount > 0 && (
                                  <div className="text-[11px] font-semibold text-slate-900">
                                    {item.amount.toLocaleString()} {item.currency || 'LKR'}
                                  </div>
                                )}
                              </div>
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
                          {/* Compact initiator & date below 2xl */}
                          <div className="2xl:hidden mt-1.5 text-[10px] text-slate-400">
                            By <span className="text-slate-600 font-medium">{item.requestedBy.name}</span> • {formatDateTime(item.requestedAt)}
                          </div>
                        </td>

                        {/* Department & Financial Value (xl+) */}
                        <td className="py-3.5 px-4 hidden xl:table-cell">
                          <div className="text-slate-700 font-medium">
                            {item.department}
                          </div>
                          {item.amount !== undefined && item.amount > 0 && (
                            <div className="text-[11px] font-semibold text-slate-900 mt-0.5">
                              {item.amount.toLocaleString()} {item.currency || 'LKR'}
                            </div>
                          )}
                        </td>

                        {/* Stage & Assigned Role */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-slate-800 text-[11px] leading-snug">
                              {item.currentStage}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">
                                Assigned: <strong className="text-slate-600">{item.assignedRole}</strong>
                              </span>
                              {item.urgency === 'HIGH' && (
                                <Badge className="bg-amber-100 text-amber-800 border-none text-[9px] px-1.5 py-0 font-bold">
                                  HIGH
                                </Badge>
                              )}
                              {item.urgency === 'CRITICAL' && (
                                <Badge className="bg-rose-100 text-rose-800 border-none text-[9px] px-1.5 py-0 font-bold">
                                  CRITICAL
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Initiator & Requested At (2xl+) */}
                        <td className="py-3.5 px-4 text-slate-600 hidden 2xl:table-cell">
                          <div className="text-[11px] font-medium text-slate-800 break-all">
                            {item.requestedBy.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatDateTime(item.requestedAt)}
                          </div>
                        </td>

                        {/* Administrative Action Column */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleExpand(item)}
                              title="Expand complete approval pipeline"
                              className="h-7 px-2 text-xs font-medium text-purple-700 hover:bg-purple-50 gap-1"
                            >
                              {expandedKey === `${item.entityType}:${item.id}` ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                              Pipeline
                            </Button>

                            {isFinanceRestricted ? (
                              <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium"
                                title="Commercial and financial approvals are strictly reserved for the Finance Manager."
                              >
                                <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span>Finance Exclusive</span>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAction(item, 'APPROVE')}
                                  className="h-7 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAction(item, 'REJECT')}
                                  className="h-7 px-2.5 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 gap-1"
                                >
                                  <X className="h-3 w-3" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedKey === `${item.entityType}:${item.id}` && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            {renderPipelinePanel(item)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
                    Administrative {dialogAction === 'APPROVE' ? 'Approval Override' : 'Rejection'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target: <strong>{activeItem.referenceNumber}</strong> ({activeItem.entityType})
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
                <span className="text-slate-500">Normally Assigned To:</span>
                <span className="font-semibold text-slate-800">{activeItem.assignedRole}</span>
              </div>
              {activeItem.amount !== undefined && activeItem.amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Financial Impact:</span>
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
                Administrative Reason / Comment <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  dialogAction === 'APPROVE'
                    ? 'Enter reason for administrative executive approval...'
                    : 'Enter explicit reason for rejection...'
                }
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                This comment will be permanently recorded in the system audit log under your director/manager identity.
              </p>
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
                {submitting ? 'Executing...' : `Confirm ${dialogAction === 'APPROVE' ? 'Approval' : 'Rejection'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
