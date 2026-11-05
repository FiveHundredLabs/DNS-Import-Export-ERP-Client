import { StockManagerApprovalHub } from '../inventory/components/StockManagerApprovalHub';
import { PurchasingApprovalHub } from '../purchasing/components/PurchasingApprovalHub';
import { SalesManagerMyApprovalsPage } from './SalesManagerMyApprovalsPage';
import { AreaManagerOrderApprovalsPage } from './AreaManagerOrderApprovalsPage';
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
  ShieldAlert,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '../../components';
import { formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export function ApprovalsPage() {
  const { currentUser, role } = useAuth();

  // ── Role-based dispatch: each role renders its designated approval UI ──────
  // Stock Manager has dedicated physical intake & customer rejection verification workflow
  if (role === 'STOCK_MANAGER') {
    return <StockManagerApprovalHub />;
  }

  // Purchasing Manager dedicated PO Approvals & Supplier Payment Visibility Hub
  if (role === 'PURCHASING_MANAGER') {
    return <PurchasingApprovalHub />;
  }

  // Sales Manager dedicated My Approvals page (Orders, Quotations, Customers)
  if (role === 'SALES_MANAGER') {
    return <SalesManagerMyApprovalsPage />;
  }

  // Area Manager dedicated Order Approvals page (Territory Orders)
  if (role === 'AREA_MANAGER') {
    return <AreaManagerOrderApprovalsPage />;
  }

  // Central Approval Engine is exclusively for Director and Manager
  if (role !== 'DIRECTOR' && role !== 'MANAGER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <div className="p-4 rounded-full bg-rose-50 border border-rose-200">
          <ShieldCheck className="h-10 w-10 text-rose-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          The central Approval Engine is available to Directors and Managers only.
          Please use your role-specific approval page from the sidebar.
        </p>
      </div>
    );
  }

  const { approvals, loading, error, refetch, executeAction } = useApprovals(role);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'PENDING' | 'ALL'>('PENDING');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ORDERS' | 'QUOTATIONS' | 'PURCHASE_ORDERS' | 'GRN' | 'STOCK_VERIFICATIONS' | 'FINANCE_CUSTOMERS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'ESCALATED' | 'REJECTED'>('ALL');

  const canAction = (app: ApprovalRequest) => {
    if (app.status !== 'PENDING') return false;
    if (role === 'DIRECTOR') return true;
    return app.currentApproverRole === role;
  };

  const getDocumentLink = (app: ApprovalRequest): string | null => {
    if (app.documentType === 'PAYMENT_RECEIPT') return `/payments/${app.documentId}`;
    if (app.documentType === 'SALES_ORDER') return `/orders/${app.documentId}`;
    if (app.documentType === 'SPECIAL_SALES_ORDER') return `/orders/${app.documentId}`;
    if (app.documentType === 'QUOTATION_DISCOUNT') return `/quotations/${app.documentId}`;
    if (app.documentType === 'GRN_RECEIPT') return `/inventory/grn/${app.documentId}`;
    if (app.documentType === 'CUSTOMER_CREATION') return `/customers/onboarding/${app.documentId}`;
    if (app.documentType === 'PRODUCT_PRICE_CHANGE') return app.documentId ? `/products/${app.documentId}` : `/products`;
    if (app.documentType === 'PURCHASE_ORDER') return `/purchasing/orders/${app.documentId}`;
    return null;
  };

  const isDirectRecordApproval = (app: ApprovalRequest) => {
    return (
      app.documentType === 'SALES_ORDER' ||
      app.documentType === 'SPECIAL_SALES_ORDER' ||
      app.documentType === 'QUOTATION_DISCOUNT' ||
      app.documentType === 'CUSTOMER_CREATION'
    );
  };

  const filteredApprovals = useMemo(() => {
    return approvals.filter((app) => {
      // Top-level view mode (Pending / All)
      if (viewMode === 'PENDING' && app.status !== 'PENDING') return false;

      // Secondary status filter (only shown when viewMode === 'ALL')
      if (viewMode === 'ALL' && statusFilter !== 'ALL' && app.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter === 'ORDERS' &&
        app.documentType !== 'SPECIAL_SALES_ORDER' &&
        app.documentType !== 'SALES_ORDER') return false;
      if (categoryFilter === 'QUOTATIONS' && app.documentType !== 'QUOTATION_DISCOUNT') return false;
      if (categoryFilter === 'PURCHASE_ORDERS' && app.documentType !== 'PURCHASE_ORDER') return false;
      if (categoryFilter === 'GRN' && app.documentType !== 'GRN_RECEIPT') return false;
      if (
        categoryFilter === 'FINANCE_CUSTOMERS' &&
        app.documentType !== 'CUSTOMER_CREATION' &&
        app.documentType !== 'PAYMENT_RECEIPT' &&
        app.documentType !== 'EXPENSE_CLAIM'
      )
        return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = app.documentReferenceNumber.toLowerCase().includes(q);
        const matchesTitle = app.title.toLowerCase().includes(q);
        const matchesDesc = app.description.toLowerCase().includes(q);
        const matchesInit = app.initiatorName.toLowerCase().includes(q);
        if (!matchesRef && !matchesTitle && !matchesDesc && !matchesInit) return false;
      }
      return true;
    });
  }, [approvals, categoryFilter, statusFilter, viewMode, searchQuery]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enterprise Approvals Engine"
        subtitle="Centralized multi-tier approval visibility for orders, quotations, purchase orders, GRNs, and customer workflows."
        badge={<StatusBadge status="ACTIVE" label="Central Engine" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 bg-white hover:bg-slate-50 text-slate-700">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Requests</span>
          </Button>
        }
      />

      {/* Primary View Mode Toggle: Pending / All */}
      <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm w-fit">
        {([
          { label: 'Pending Approvals', value: 'PENDING' as const },
          { label: 'All Approvals', value: 'ALL' as const },
        ]).map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setViewMode(mode.value)}
            className={cn(
              'px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-xs',
              viewMode === mode.value
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {mode.value === 'PENDING' && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {mode.label}
                {approvals.filter(a => a.status === 'PENDING').length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                    {approvals.filter(a => a.status === 'PENDING').length}
                  </span>
                )}
              </span>
            )}
            {mode.value === 'ALL' && (
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {mode.label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by reference #, title, reason, or initiator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 rounded-xl"
              />
            </div>

            {/* Status Filter Tabs — only shown in All Approvals mode */}
            {viewMode === 'ALL' && (
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                {(
                  [
                    { label: 'All Statuses', value: 'ALL' },
                    { label: 'Pending', value: 'PENDING' },
                    { label: 'Approved', value: 'APPROVED' },
                    { label: 'Escalated / Rejected', value: 'ESCALATED' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setStatusFilter(st.value)}
                    className={cn(
                      'px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer text-xs',
                      statusFilter === st.value
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                >
                  {st.label}
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Unified Domain Categories Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
            {(
              [
                { label: 'All Queue Items', value: 'ALL', icon: Layers },
                { label: 'Sales Orders & Exceptions', value: 'ORDERS', icon: ShoppingCart },
                { label: 'Quotations', value: 'QUOTATIONS', icon: FileText },
                { label: 'Purchase Orders', value: 'PURCHASE_ORDERS', icon: ShoppingCart },
                { label: 'Inbound GRNs', value: 'GRN', icon: Warehouse },
                { label: 'Customers & Finance', value: 'FINANCE_CUSTOMERS', icon: Landmark },
              ] as const
            ).map((cat) => {
              const Icon = cat.icon;
              const isActive = categoryFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap cursor-pointer active:scale-95',
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : filteredApprovals.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL' ? 'No matching approvals' : 'All caught up!'}
          description={
            searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No approval requests match the current search or category filters.'
              : 'There are currently no pending approval requests assigned to your role.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((app) => {
            const hasActionAuthority = canAction(app);

            return (
              <Card key={app.id} className="overflow-hidden border-slate-200">
                <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getDocumentLink(app) ? (
                        <Link
                          to={getDocumentLink(app)!}
                          state={{ from: '/approvals' }}
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
                    {isDirectRecordApproval(app) ? (
                      getDocumentLink(app) && (
                        <Link to={getDocumentLink(app)!} state={{ from: '/approvals' }}>
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
                      hasActionAuthority && (
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
                      )
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs">
                    <div className="flex-1">
                      <span className="font-semibold text-slate-900">Initiator:</span> {app.initiatorName}
                      <p className="mt-1 text-slate-600 leading-relaxed">
                        {app.description}
                      </p>
                    </div>
                    {!isDirectRecordApproval(app) && getDocumentLink(app) && (
                      <Link
                        to={getDocumentLink(app)!}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-primary hover:bg-slate-50 font-semibold text-xs whitespace-nowrap self-start sm:self-center shadow-2xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Inspect Full Document</span>
                      </Link>
                    )}
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
