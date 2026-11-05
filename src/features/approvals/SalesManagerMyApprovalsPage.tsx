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
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Search,
  ShoppingCart,
  FileText,
  Building2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '../../components';
import { formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export function SalesManagerMyApprovalsPage() {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { approvals, loading, error, refetch, executeAction } = useApprovals('SALES_MANAGER');

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'ORDERS' | 'QUOTATIONS' | 'CUSTOMERS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  // Filter only pending approvals assigned to SALES_MANAGER
  const pendingApprovals = useMemo(() => {
    return approvals.filter(
      (app) => app.status === 'PENDING' && app.currentApproverRole === 'SALES_MANAGER'
    );
  }, [approvals]);

  // Category counts
  const counts = useMemo(() => {
    return {
      orders: pendingApprovals.filter(
        (a) => a.documentType === 'SPECIAL_SALES_ORDER' || a.documentType === 'SALES_ORDER'
      ).length,
      quotations: pendingApprovals.filter((a) => a.documentType === 'QUOTATION_DISCOUNT').length,
      customers: pendingApprovals.filter((a) => a.documentType === 'CUSTOMER_CREATION').length,
      total: pendingApprovals.length,
    };
  }, [pendingApprovals]);

  // Filtered by active tab and search
  const displayedApprovals = useMemo(() => {
    return pendingApprovals.filter((app) => {
      if (activeCategory === 'ORDERS') {
        if (app.documentType !== 'SPECIAL_SALES_ORDER' && app.documentType !== 'SALES_ORDER') return false;
      }
      if (activeCategory === 'QUOTATIONS') {
        if (app.documentType !== 'QUOTATION_DISCOUNT') return false;
      }
      if (activeCategory === 'CUSTOMERS') {
        if (app.documentType !== 'CUSTOMER_CREATION') return false;
      }

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
  }, [pendingApprovals, activeCategory, searchQuery]);

  const handleOpenDocument = (app: ApprovalRequest) => {
    switch (app.documentType) {
      case 'SALES_ORDER':
      case 'SPECIAL_SALES_ORDER':
        navigate(`/orders/${app.documentId}`);
        break;
      case 'QUOTATION_DISCOUNT':
        navigate(`/quotations/${app.documentId}`);
        break;
      case 'CUSTOMER_CREATION':
        navigate(`/customers/onboarding/${app.documentId}`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Manager Approvals Hub"
        subtitle="Manage pending operational sales orders, discount threshold overrides, and new dealer customer onboarding requests."
        badge={<StatusBadge status="ACTIVE" label="Commercial Desk" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* KPI Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Sales Orders */}
        <button
          type="button"
          onClick={() => setActiveCategory(activeCategory === 'ORDERS' ? 'ALL' : 'ORDERS')}
          className={cn(
            'p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
            activeCategory === 'ORDERS'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Sales Order Approvals</span>
            </div>
            {counts.orders > 0 && (
              <Badge className="bg-blue-600 text-white font-mono text-2xs">
                {counts.orders} Pending
              </Badge>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{counts.orders}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Territory and special order discount/credit validations
          </p>
        </button>

        {/* Quotations */}
        <button
          type="button"
          onClick={() => setActiveCategory(activeCategory === 'QUOTATIONS' ? 'ALL' : 'QUOTATIONS')}
          className={cn(
            'p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
            activeCategory === 'QUOTATIONS'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Quotation Approvals</span>
            </div>
            {counts.quotations > 0 && (
              <Badge className="bg-amber-600 text-white font-mono text-2xs">
                {counts.quotations} Pending
              </Badge>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{counts.quotations}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Discount matrix ceiling exceptions for proposals
          </p>
        </button>

        {/* Customer Onboarding */}
        <button
          type="button"
          onClick={() => setActiveCategory(activeCategory === 'CUSTOMERS' ? 'ALL' : 'CUSTOMERS')}
          className={cn(
            'p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden',
            activeCategory === 'CUSTOMERS'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Customer Onboarding</span>
            </div>
            {counts.customers > 0 && (
              <Badge className="bg-emerald-600 text-white font-mono text-2xs">
                {counts.customers} Pending
              </Badge>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{counts.customers}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Commercial terms &amp; loyalty tier setup authorizations
          </p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by reference #, customer, initiator, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { label: 'All Categories', value: 'ALL' },
              { label: 'Sales Orders', value: 'ORDERS' },
              { label: 'Quotations', value: 'QUOTATIONS' },
              { label: 'Customer Onboarding', value: 'CUSTOMERS' },
            ].map((tab) => (
              <Button
                key={tab.value}
                size="sm"
                variant={activeCategory === tab.value ? 'default' : 'outline'}
                onClick={() => setActiveCategory(tab.value as any)}
                className="h-7 text-xs font-medium"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List of Requests */}
      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : displayedApprovals.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="All caught up!"
          description={
            searchQuery || activeCategory !== 'ALL'
              ? 'No pending approval requests match your search filter.'
              : 'There are no pending sales approvals waiting for your review.'
          }
        />
      ) : (
        <div className="space-y-3.5">
          {displayedApprovals.map((app) => (
            <Card key={app.id} className="overflow-hidden border-slate-200 hover:border-slate-300 shadow-2xs transition-all">
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-primary">
                      {app.documentReferenceNumber}
                    </span>
                    <ApprovalBadge status={app.status} />
                    {app.documentType === 'CUSTOMER_CREATION' && (
                      <Badge variant="outline" className="text-2xs bg-emerald-50 text-emerald-800 border-emerald-300">
                        Dealer Onboarding
                      </Badge>
                    )}
                    {app.documentType === 'QUOTATION_DISCOUNT' && (
                      <Badge variant="outline" className="text-2xs bg-amber-50 text-amber-800 border-amber-300">
                        Discount Matrix Override
                      </Badge>
                    )}
                    {(app.documentType === 'SPECIAL_SALES_ORDER' || app.documentType === 'SALES_ORDER') && (
                      <Badge variant="outline" className="text-2xs bg-blue-50 text-blue-800 border-blue-300">
                        Sales Order Approval
                      </Badge>
                    )}
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
                    <div className="flex items-center justify-end gap-1 font-mono text-[11px]">
                      <Clock className="h-3 w-3" /> {formatDateTime(app.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenDocument(app)}
                    className="text-xs gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold shadow-xs cursor-pointer"
                  >
                    <span>Inspect Record</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 text-xs">
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">Initiator:</span> {app.initiatorName} ({app.initiatorRole})
                    <p className="mt-1 text-slate-600 leading-relaxed font-normal">
                      {app.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDocument(app)}
                    className="h-7 text-xs text-primary gap-1 hover:text-primary-hover"
                  >
                    <span>Open in Module</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {app.isSpecialScenario && app.specialReason && (
                  <div className="rounded-lg bg-amber-50/80 p-2.5 text-xs text-amber-800 border border-amber-200/80">
                    <span className="font-bold">Exception Notice:</span> {app.specialReason}
                  </div>
                )}

                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Approval Audit Trail
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
export default SalesManagerMyApprovalsPage;

