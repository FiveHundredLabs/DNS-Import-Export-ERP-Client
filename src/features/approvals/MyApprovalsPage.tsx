import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApprovals } from '../../hooks/useApprovals';
import { useAuth } from '../../hooks/useAuth';
import { ApprovalRequest, ApprovalActionType } from '../../types/approval';
import { UserRole } from '../../types/auth';
import { ApprovalTimeline } from '../../components/approval/ApprovalTimeline';
import { ApprovalBadge } from '../../components/approval/ApprovalBadge';
import { ApprovalActionDialog } from '../../components/approval/ApprovalActionDialog';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Search,
  ShoppingCart,
  FileText,
  Warehouse,
  Landmark,
  Layers,
  XCircle,
  UserCheck,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '../../components';
import { formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export function MyApprovalsPage() {
  const { currentUser, role } = useAuth();
  const { approvals, loading, error, refetch, executeAction } = useApprovals(role);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ORDERS' | 'QUOTATIONS' | 'GRN' | 'FINANCE_CUSTOMERS'>('ALL');

  // Filter requests specifically assigned to or actionable by this user / role
  const myAssignedApprovals = useMemo(() => {
    return approvals.filter((app) => {
      if (role === 'DIRECTOR') return true;
      return (
        app.currentApproverRole === role ||
        app.history.some((h) => h.actorId === currentUser.id || h.actorRole === role)
      );
    });
  }, [approvals, role, currentUser.id]);

  const canAction = (app: ApprovalRequest) => {
    if (app.status !== 'PENDING') return false;
    if (role === 'DIRECTOR') return true;
    return app.currentApproverRole === role;
  };

  const getDocumentLink = (app: ApprovalRequest): string | null => {
    switch (app.documentType) {
      case 'SPECIAL_SALES_ORDER':
        return `/orders/${app.documentId}`;
      case 'QUOTATION_DISCOUNT':
        return `/quotations/${app.documentId}`;
      case 'CUSTOMER_CREATION':
        return `/customers/${app.documentId}`;
      case 'GRN_RECEIPT':
        return `/inventory/grn/${app.documentId}`;
      case 'PAYMENT_RECEIPT':
        return `/payments`;
      case 'PURCHASE_ORDER':
        return `/purchasing/orders/${app.documentId}`;
      default:
        return null;
    }
  };

  const counts = useMemo(() => {
    return {
      pending: myAssignedApprovals.filter((a) => a.status === 'PENDING').length,
      approved: myAssignedApprovals.filter((a) => a.status === 'APPROVED').length,
      rejected: myAssignedApprovals.filter((a) => a.status === 'REJECTED' || a.status === 'ESCALATED').length,
      total: myAssignedApprovals.length,
    };
  }, [myAssignedApprovals]);

  const filteredApprovals = useMemo(() => {
    return myAssignedApprovals.filter((app) => {
      // Status filter
      if (statusFilter === 'PENDING' && app.status !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && app.status !== 'APPROVED') return false;
      if (statusFilter === 'REJECTED' && app.status !== 'REJECTED' && app.status !== 'ESCALATED') return false;

      // Category filter
      if (categoryFilter === 'ORDERS' && app.documentType !== 'SPECIAL_SALES_ORDER') return false;
      if (categoryFilter === 'QUOTATIONS' && app.documentType !== 'QUOTATION_DISCOUNT') return false;
      if (categoryFilter === 'GRN' && app.documentType !== 'GRN_RECEIPT') return false;
      if (
        categoryFilter === 'FINANCE_CUSTOMERS' &&
        app.documentType !== 'CUSTOMER_CREATION' &&
        app.documentType !== 'PAYMENT_RECEIPT'
      )
        return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          app.documentReferenceNumber.toLowerCase().includes(q) ||
          app.title.toLowerCase().includes(q) ||
          app.initiatorName.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myAssignedApprovals, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Assigned Approvals"
        subtitle={`Approval requests requiring executive action or previously audited by ${currentUser.name || 'Director'}.`}
        badge={<StatusBadge status="ACTIVE" label="Executive Desk" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            statusFilter === 'PENDING'
              ? 'bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Action</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{counts.pending}</div>
          <span className="text-[11px] text-slate-400">Awaiting your approval</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('APPROVED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            statusFilter === 'APPROVED'
              ? 'bg-emerald-500/10 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">{counts.approved}</div>
          <span className="text-[11px] text-slate-400">Granted requests</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('REJECTED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            statusFilter === 'REJECTED'
              ? 'bg-rose-500/10 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1 font-mono">{counts.rejected}</div>
          <span className="text-[11px] text-slate-400">Declined / Escalated</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div className={cn('flex items-center justify-between', statusFilter === 'ALL' ? 'text-white/80' : 'text-slate-600')}>
            <span className="text-xs font-bold uppercase tracking-wider">Total Audited</span>
            <Layers className="h-4 w-4" />
          </div>
          <div className={cn('text-2xl font-black mt-1 font-mono', statusFilter === 'ALL' ? 'text-white' : 'text-slate-900')}>{counts.total}</div>
          <span className={cn('text-[11px]', statusFilter === 'ALL' ? 'text-white/60' : 'text-slate-400')}>All assigned items</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search reference #, title, or initiator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:thin] pb-1 md:pb-0">
            {[
              { label: 'All Modules', value: 'ALL', icon: Layers },
              { label: 'Special Orders', value: 'ORDERS', icon: ShoppingCart },
              { label: 'Discount Quotes', value: 'QUOTATIONS', icon: FileText },
              { label: 'Inward GRN', value: 'GRN', icon: Warehouse },
              { label: 'Finance & Accounts', value: 'FINANCE_CUSTOMERS', icon: Landmark },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = categoryFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value as any)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Approval List */}
      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filteredApprovals.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title={searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No matching approvals' : 'All caught up!'}
          description={
            searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No assigned approval requests match the current filters.'
              : 'There are currently no approval requests waiting for your decision.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((app) => {
            const hasActionAuthority = canAction(app);

            return (
              <Card key={app.id} className="overflow-hidden border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getDocumentLink(app) ? (
                        <Link
                          to={getDocumentLink(app)!}
                          className="font-mono font-bold text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {app.documentReferenceNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-mono font-bold text-xs text-primary">
                          {app.documentReferenceNumber}
                        </span>
                      )}
                      <ApprovalBadge status={app.status} />
                      {app.isSpecialScenario && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                          <AlertTriangle className="h-3 w-3" /> Special Override
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900">{app.title}</CardTitle>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right text-xs text-slate-500 hidden sm:block">
                      <div>Role: <span className="font-semibold text-slate-800">{app.currentApproverRole}</span></div>
                      <div className="flex items-center justify-end gap-1 mt-0.5 font-mono text-[11px]">
                        <Clock className="h-3 w-3" /> {formatDateTime(app.createdAt)}
                      </div>
                    </div>
                    {hasActionAuthority && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(app);
                          setActionDialogOpen(true);
                        }}
                        className="text-xs gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg shadow-xs"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Decide
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 text-xs">
                    <div className="flex-1">
                      <span className="font-bold text-slate-900">Initiated By:</span> {app.initiatorName} ({app.initiatorRole})
                      <p className="mt-1 text-slate-600 leading-relaxed font-normal">
                        {app.description}
                      </p>
                    </div>
                    {getDocumentLink(app) && (
                      <Link
                        to={getDocumentLink(app)!}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-primary hover:bg-slate-50 font-semibold text-xs whitespace-nowrap self-start sm:self-center shadow-2xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Document</span>
                      </Link>
                    )}
                  </div>

                  {app.isSpecialScenario && app.specialReason && (
                    <div className="rounded-lg bg-amber-50/80 p-2.5 text-xs text-amber-800 border border-amber-200/80">
                      <span className="font-bold">Exception Notice:</span> {app.specialReason}
                    </div>
                  )}

                  {/* Journey History */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Approval Audit Trail
                    </h4>
                    <ApprovalTimeline history={app.history} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Decision Action Modal */}
      {selectedRequest && (
        <ApprovalActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          request={selectedRequest}
          onActionSubmitted={async (action: ApprovalActionType, comment: string, targetRole?: UserRole) => {
            await executeAction(
              selectedRequest.id,
              action,
              currentUser.id,
              currentUser.name,
              role,
              comment,
              targetRole
            );
            setActionDialogOpen(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

