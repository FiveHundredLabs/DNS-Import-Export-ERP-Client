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
  Building2,
  Lock,
  Layers,
  ArrowRight,
  Info,
  Check,
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
  const [activeTab, setActiveTab] = useState<'ACTION_REQUIRED' | 'MY_HISTORY'>('ACTION_REQUIRED');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ORDERS' | 'QUOTATIONS' | 'PURCHASE_ORDERS' | 'CUSTOMERS'>('ALL');

  const isDirector = role === 'DIRECTOR';
  const isManager = role === 'MANAGER';

  // Strict User/Role Level Assigned Requests:
  // ONLY requests requiring THIS specific Director/Manager's approval decision right now
  const pendingActionRequests = useMemo(() => {
    return approvals.filter((app) => {
      if (app.status !== 'PENDING') return false;
      return app.currentApproverRole === role;
    });
  }, [approvals, role]);

  // Decision Audit History:
  // Historical requests where this specific user made an approval/rejection decision
  const historicalRequests = useMemo(() => {
    return approvals.filter((app) => {
      return app.history.some(
        (h) => (h.actorId === currentUser.id || h.actorRole === role) && h.action !== 'APPROVE'
      ) || (app.status !== 'PENDING' && app.history.some((h) => h.actorRole === role));
    });
  }, [approvals, role, currentUser.id]);

  // Dynamic relevant categories based on what's actually waiting in queue
  const queueByCategories = useMemo(() => {
    const list = activeTab === 'ACTION_REQUIRED' ? pendingActionRequests : historicalRequests;
    return {
      orders: list.filter((a) => a.documentType === 'SPECIAL_SALES_ORDER' || a.documentType === 'SALES_ORDER').length,
      quotations: list.filter((a) => a.documentType === 'QUOTATION_DISCOUNT').length,
      purchaseOrders: list.filter((a) => a.documentType === 'PURCHASE_ORDER').length,
      customers: list.filter((a) => a.documentType === 'CUSTOMER_CREATION').length,
    };
  }, [activeTab, pendingActionRequests, historicalRequests]);

  // Filtered requests for display
  const displayRequests = useMemo(() => {
    const sourceList = activeTab === 'ACTION_REQUIRED' ? pendingActionRequests : historicalRequests;

    return sourceList.filter((app) => {
      // Category filter
      if (categoryFilter === 'ORDERS' && app.documentType !== 'SPECIAL_SALES_ORDER' && app.documentType !== 'SALES_ORDER') return false;
      if (categoryFilter === 'QUOTATIONS' && app.documentType !== 'QUOTATION_DISCOUNT') return false;
      if (categoryFilter === 'PURCHASE_ORDERS' && app.documentType !== 'PURCHASE_ORDER') return false;
      if (categoryFilter === 'CUSTOMERS' && app.documentType !== 'CUSTOMER_CREATION') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          app.documentReferenceNumber.toLowerCase().includes(q) ||
          app.title.toLowerCase().includes(q) ||
          app.initiatorName.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          (app.specialReason && app.specialReason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeTab, pendingActionRequests, historicalRequests, categoryFilter, searchQuery]);

  const getDocumentLink = (app: ApprovalRequest): string | null => {
    switch (app.documentType) {
      case 'SALES_ORDER':
      case 'SPECIAL_SALES_ORDER':
        return `/orders/${app.documentId}`;
      case 'QUOTATION_DISCOUNT':
        return `/quotations/${app.documentId}`;
      case 'CUSTOMER_CREATION':
        return `/customers/onboarding/${app.documentId}`;
      case 'PURCHASE_ORDER':
        return `/purchasing/orders/${app.documentId}`;
      default:
        return null;
    }
  };

  const isDirectRecordApproval = (app: ApprovalRequest) => {
    return (
      app.documentType === 'SALES_ORDER' ||
      app.documentType === 'SPECIAL_SALES_ORDER' ||
      app.documentType === 'QUOTATION_DISCOUNT' ||
      app.documentType === 'CUSTOMER_CREATION'
    );
  };

  // Explanation helper: why this request reached Director or Manager
  const getExecutiveReason = (app: ApprovalRequest): { title: string; badge: string; color: string } => {
    if (app.documentType === 'PURCHASE_ORDER') {
      return {
        title: 'Stage-2 Final PO Authorization',
        badge: isDirector ? 'Director Procurement Threshold' : 'Manager Operations Authorization',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    if (app.documentType === 'SPECIAL_SALES_ORDER') {
      return {
        title: 'Sales Order Policy Breach',
        badge: isDirector ? 'Director Tier Credit/Discount Override' : 'Manager Commercial Exception Sign-off',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    if (app.documentType === 'QUOTATION_DISCOUNT') {
      return {
        title: 'Discount Threshold Override',
        badge: isDirector ? 'Director Pricing Authority' : 'Manager Discount Matrix Override',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    }
    if (app.documentType === 'CUSTOMER_CREATION') {
      return {
        title: 'Commercial Terms Sign-off',
        badge: 'High Credit Limit / Credit Days Exception',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    return {
      title: 'Direct Approval Assignment',
      badge: `${role} Authority Required`,
      color: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={isDirector ? "Director's Personal Approval Queue" : "Manager's Action Required Approvals"}
        subtitle={`Focused queue showing only requests assigned directly to you (${currentUser.name || role}) that require your executive decision.`}
        badge={<StatusBadge status="ACTIVE" label={isDirector ? "Director Desk" : "Manager Desk"} />}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/approvals">
              <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900 gap-1">
                <span>View Full Approval Engine</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Focus Indicator Banner */}
      <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong>Focused Executive View:</strong> This page only shows requests addressed directly to{' '}
            <span className="font-semibold underline">{role}</span>. Unrelated operational queues (such as Stock Keeper physical checks or Sales Rep order drafts) are automatically filtered out.
          </span>
        </div>
        <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 font-mono shrink-0">
          Role: {role}
        </Badge>
      </div>

      {/* Quick Status View Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('ACTION_REQUIRED')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'ACTION_REQUIRED'
              ? 'border-primary text-primary bg-primary-light/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          )}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span>Requires My Decision Now</span>
          {pendingActionRequests.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-2xs font-black bg-amber-500 text-white shadow-2xs">
              {pendingActionRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MY_HISTORY')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'MY_HISTORY'
              ? 'border-primary text-primary bg-primary-light/30'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          )}
        >
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          <span>My Decided / Audited Requests</span>
          <span className="text-2xs text-slate-400 font-mono">({historicalRequests.length})</span>
        </button>
      </div>

      {/* Search & Relevant Category Filter Pills */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Filter by reference #, customer, initiator, or policy reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <Button
              size="sm"
              variant={categoryFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('ALL')}
              className="h-7 text-xs font-medium"
            >
              All My Queue ({activeTab === 'ACTION_REQUIRED' ? pendingActionRequests.length : historicalRequests.length})
            </Button>

            {queueByCategories.orders > 0 && (
              <Button
                size="sm"
                variant={categoryFilter === 'ORDERS' ? 'default' : 'outline'}
                onClick={() => setCategoryFilter('ORDERS')}
                className="h-7 text-xs font-medium gap-1"
              >
                <ShoppingCart className="h-3 w-3" />
                <span>Orders ({queueByCategories.orders})</span>
              </Button>
            )}

            {queueByCategories.purchaseOrders > 0 && (
              <Button
                size="sm"
                variant={categoryFilter === 'PURCHASE_ORDERS' ? 'default' : 'outline'}
                onClick={() => setCategoryFilter('PURCHASE_ORDERS')}
                className="h-7 text-xs font-medium gap-1"
              >
                <ShoppingCart className="h-3 w-3" />
                <span>Purchase Orders ({queueByCategories.purchaseOrders})</span>
              </Button>
            )}

            {queueByCategories.quotations > 0 && (
              <Button
                size="sm"
                variant={categoryFilter === 'QUOTATIONS' ? 'default' : 'outline'}
                onClick={() => setCategoryFilter('QUOTATIONS')}
                className="h-7 text-xs font-medium gap-1"
              >
                <FileText className="h-3 w-3" />
                <span>Quotations ({queueByCategories.quotations})</span>
              </Button>
            )}

            {queueByCategories.customers > 0 && (
              <Button
                size="sm"
                variant={categoryFilter === 'CUSTOMERS' ? 'default' : 'outline'}
                onClick={() => setCategoryFilter('CUSTOMERS')}
                className="h-7 text-xs font-medium gap-1"
              >
                <Building2 className="h-3 w-3" />
                <span>Customers ({queueByCategories.customers})</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Approval Cards */}
      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : displayRequests.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={activeTab === 'ACTION_REQUIRED' ? "You're all caught up!" : "No historical decisions recorded"}
          description={
            activeTab === 'ACTION_REQUIRED'
              ? `There are currently no approval requests waiting for ${role} action. Any new requests assigned to you will appear here immediately.`
              : 'You have not yet made any approval or rejection decisions in this session.'
          }
        />
      ) : (
        <div className="space-y-3.5">
          {displayRequests.map((app) => {
            const executiveContext = getExecutiveReason(app);
            const isPendingDecision = app.status === 'PENDING' && app.currentApproverRole === role;

            return (
              <Card key={app.id} className="overflow-hidden border-slate-200 hover:border-slate-300 shadow-2xs transition-all">
                <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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

                      {/* Explicit Scope Badge */}
                      <Badge variant="outline" className={cn("text-2xs font-semibold", executiveContext.color)}>
                        {executiveContext.badge}
                      </Badge>
                    </div>

                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                      {app.title}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right text-xs text-slate-500 hidden sm:block">
                      <div className="font-semibold text-slate-800">
                        {isPendingDecision ? 'Awaiting Your Decision' : `Status: ${app.status}`}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5 font-mono text-[11px]">
                        <Clock className="h-3 w-3" /> {formatDateTime(app.createdAt)}
                      </div>
                    </div>

                    {isDirectRecordApproval(app) ? (
                      getDocumentLink(app) && (
                        <Link to={getDocumentLink(app)!}>
                          <Button
                            size="sm"
                            className="text-xs gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold shadow-xs cursor-pointer"
                          >
                            <span>Inspect Record</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )
                    ) : (
                      <>
                        {getDocumentLink(app) && (
                          <Link to={getDocumentLink(app)!}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                            >
                              <span>Inspect Document</span>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}

                        {isPendingDecision && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(app);
                              setActionDialogOpen(true);
                            }}
                            className="text-xs gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold shadow-xs"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Decide Request</span>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5">
                  {/* Context and Why it Reached This User */}
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>
                        <strong className="text-slate-900">Initiator:</strong> {app.initiatorName} ({app.initiatorRole})
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        Assigned To: <strong className="text-slate-800">{app.currentApproverRole}</strong>
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed font-normal">
                      {app.description}
                    </p>

                    {/* Prominent Exception Notice */}
                    {app.specialReason && (
                      <div className="mt-2 rounded-lg bg-amber-50/90 p-2.5 text-xs text-amber-900 border border-amber-200">
                        <span className="font-bold">Why your approval is mandated:</span> {app.specialReason}
                      </div>
                    )}
                  </div>

                  {/* Audit Trail Timeline */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Approval Journey &amp; Decision History
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
          onActionComplete={async (action: ApprovalActionType, comment: string, targetRole?: UserRole) => {
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
            await refetch();
          }}
        />
      )}
    </div>
  );
}
export default MyApprovalsPage;
