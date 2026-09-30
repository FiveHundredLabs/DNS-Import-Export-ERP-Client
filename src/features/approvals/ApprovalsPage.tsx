import { useState } from 'react';
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
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { CheckCircle, Clock, AlertTriangle, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export function ApprovalsPage() {
  const { currentUser, role } = useAuth();
  const { approvals, loading, error, refetch, executeAction } = useApprovals(role);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const canAction = (app: ApprovalRequest) => {
    if (app.status !== 'PENDING') return false;
    if (role === 'DIRECTOR') return true;
    return app.currentApproverRole === role;
  };

  const getDocumentLink = (app: ApprovalRequest): string | null => {
    if (app.documentType === 'PAYMENT_RECEIPT') return `/payments/${app.documentId}`;
    if (app.documentType === 'SPECIAL_SALES_ORDER') return `/orders/${app.documentId}`;
    if (app.documentType === 'QUOTATION_DISCOUNT') return `/quotations/${app.documentId}`;
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Enterprise Approvals Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-tier hierarchical decision workflows with traceable audit history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Requests
        </Button>
      </div>

      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="All caught up!"
          description="There are currently no pending approval requests assigned to your role."
        />
      ) : (
        <div className="space-y-4">
          {approvals.map((app) => {
            const hasActionAuthority = canAction(app);

            return (
              <Card key={app.id} className="overflow-hidden border-slate-200">
                <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getDocumentLink(app) ? (
                        <Link
                          to={getDocumentLink(app)!}
                          className="font-mono font-semibold text-[13px] text-primary hover:underline flex items-center gap-1"
                        >
                          {app.documentReferenceNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-mono font-semibold text-[13px] text-primary">
                          {app.documentReferenceNumber}
                        </span>
                      )}
                      <ApprovalBadge status={app.status} />
                      {app.isSpecialScenario && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> Special Scenario
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base font-semibold">{app.title}</CardTitle>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-slate-500 hidden sm:block">
                      <div>Current Approver: <span className="font-semibold text-slate-800">{app.currentApproverRole}</span></div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
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
                        className="text-xs gap-1.5"
                      >
                        <ShieldCheck className="h-4 w-4" /> Take Action
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">Initiator:</span> {app.initiatorName}
                    <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {app.description}
                    </p>
                  </div>

                  {app.isSpecialScenario && app.specialReason && (
                    <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                      <span className="font-bold">Exception Notice:</span> {app.specialReason}
                    </div>
                  )}

                  {/* Multi-step Approval Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Approval Journey & History
                    </h4>
                    <ApprovalTimeline history={app.history} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Dialog */}
      <ApprovalActionDialog
        request={selectedRequest}
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        onActionComplete={async (action, comment, targetRole) => {
          if (!selectedRequest) return;
          await executeAction(
            selectedRequest.id,
            action,
            currentUser.id,
            currentUser.name,
            role,
            comment,
            targetRole
          );
        }}
      />
    </div>
  );
}
