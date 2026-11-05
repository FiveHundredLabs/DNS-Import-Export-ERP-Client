import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Search,
  ShoppingCart,
  Send,
  MapPin,
  XCircle,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '../../components';
import { formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export function AreaManagerOrderApprovalsPage() {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { approvals, loading, error, refetch, executeAction } = useApprovals('AREA_MANAGER');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<'PENDING' | 'AUDITED'>('PENDING');

  // Filter only sales orders relevant to Area Manager
  const areaOrders = useMemo(() => {
    return approvals.filter((app) => {
      const isOrder =
        app.documentType === 'SALES_ORDER' || app.documentType === 'SPECIAL_SALES_ORDER';
      if (!isOrder) return false;

      // Pending for this area manager
      if (statusTab === 'PENDING') {
        return app.status === 'PENDING' && app.currentApproverRole === 'AREA_MANAGER';
      }

      // Audited / forwarded / approved in history
      return app.history.some(
        (h) => h.actorRole === 'AREA_MANAGER' || h.actorId === currentUser.id
      );
    });
  }, [approvals, statusTab, currentUser.id]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return areaOrders;
    const q = searchQuery.toLowerCase();
    return areaOrders.filter(
      (app) =>
        app.documentReferenceNumber.toLowerCase().includes(q) ||
        app.title.toLowerCase().includes(q) ||
        app.initiatorName.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q)
    );
  }, [areaOrders, searchQuery]);

  const pendingCount = useMemo(() => {
    return approvals.filter(
      (a) =>
        (a.documentType === 'SALES_ORDER' || a.documentType === 'SPECIAL_SALES_ORDER') &&
        a.status === 'PENDING' &&
        a.currentApproverRole === 'AREA_MANAGER'
    ).length;
  }, [approvals]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Territory Order Approvals"
        subtitle={`Sales orders submitted by field sales representatives in your assigned territory awaiting Area Manager review.`}
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-800 border border-blue-300 text-xs font-semibold select-none">
            <MapPin className="h-3.5 w-3.5 text-blue-700" />
            <span>Territory Desk: {currentUser.areaName || 'Western Province'}</span>
          </div>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusTab('PENDING')}
          className={cn(
            'p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
            statusTab === 'PENDING'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between text-amber-700">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Awaiting Area Manager Approval</span>
            </div>
            {pendingCount > 0 && (
              <Badge className="bg-amber-600 text-white font-mono text-2xs">
                {pendingCount} Active
              </Badge>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{pendingCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Orders from your assigned sales representatives ready for verification &amp; forwarding
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('AUDITED')}
          className={cn(
            'p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
            statusTab === 'AUDITED'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between text-blue-700">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Forwarded to Sales Manager</span>
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {approvals.filter(
              (a) =>
                (a.documentType === 'SALES_ORDER' || a.documentType === 'SPECIAL_SALES_ORDER') &&
                a.history.some((h) => h.actorRole === 'AREA_MANAGER')
            ).length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Orders reviewed and successfully forwarded up the commercial approval hierarchy
          </p>
        </button>
      </div>

      {/* Filter and Search */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by order #, customer, sales rep, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={statusTab === 'PENDING' ? 'No orders awaiting approval' : 'No forwarded orders in history'}
          description={
            statusTab === 'PENDING'
              ? 'All sales orders in your territory have been processed.'
              : 'You have not yet forwarded or audited any orders.'
          }
        />
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((app) => (
            <Card key={app.id} className="overflow-hidden border-slate-200 hover:border-slate-300 shadow-2xs transition-all">
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-primary">
                      {app.documentReferenceNumber}
                    </span>
                    <ApprovalBadge status={app.status} />
                    <Badge variant="outline" className="text-2xs bg-blue-50 text-blue-800 border-blue-300">
                      Territory Order
                    </Badge>
                  </div>
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">{app.title}</CardTitle>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-right text-xs text-slate-500 hidden sm:block">
                    <div className="flex items-center justify-end gap-1 font-mono text-[11px]">
                      <Clock className="h-3 w-3" /> {formatDateTime(app.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/orders/${app.documentId}`)}
                    className="text-xs gap-1.5 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    <span>Inspect Order</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  {statusTab === 'PENDING' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(app);
                        setActionDialogOpen(true);
                      }}
                      className="text-xs gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Review &amp; Approve</span>
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 text-xs">
                  <span className="font-bold text-slate-900">Initiating Sales Representative:</span>{' '}
                  {app.initiatorName}
                  <p className="mt-1 text-slate-600 leading-relaxed font-normal">
                    {app.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Approval Audit Trail &amp; Forwarding Path
                  </h4>
                  <ApprovalTimeline history={app.history} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Decision Action Modal */}
      {selectedRequest && (
        <ApprovalActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          request={selectedRequest}
          onActionComplete={async (action: ApprovalActionType, comment: string, targetRole?: UserRole) => {
            await executeAction(
              selectedRequest.id,
              action,
              currentUser.id,
              currentUser.name,
              role,
              comment,
              targetRole || 'SALES_MANAGER'
            );
            setActionDialogOpen(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}
export default AreaManagerOrderApprovalsPage;

