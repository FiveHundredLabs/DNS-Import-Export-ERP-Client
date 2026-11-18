import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { PageHeader } from '../../components/common/PageHeader';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../hooks/useAuth';
import { useInventory } from '../../hooks/useInventory';
import { approvalService } from '../../services/ApprovalService';
import { stockAdjustmentService, StockAdjustmentMetadata } from '../../services/StockAdjustmentService';
import { useProducts } from '../../hooks/useProducts';
import { ApprovalRequest } from '../../types/approval';
import { formatDateTime } from '../../utils/formatters';

type Direction = 'ADD' | 'REMOVE';

function statusVariant(status: ApprovalRequest['status']) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'destructive' as const;
  return 'warning' as const;
}

export function StockAdjustmentsPage() {
  const { currentUser, role } = useAuth();
  const { stockBalances, loading: inventoryLoading } = useInventory();
  const { products } = useProducts({ page: 1, pageSize: 200 });
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBalanceId, setSelectedBalanceId] = useState('');
  const [direction, setDirection] = useState<Direction>('ADD');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [processingAction, setProcessingAction] = useState(false);

  const canCreate = role === 'STOCK_MANAGER';
  const canApprove = role === 'MANAGER' || role === 'DIRECTOR';

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const requests = await approvalService.getPendingApprovals(role);
      setApprovals(requests.filter((request) => request.documentType === 'STOCK_ADJUSTMENT'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load stock adjustments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    stockAdjustmentService.initialize();
    void loadApprovals();
  }, [role]);

  const balanceRows = useMemo(() => {
    return stockBalances.map((balance: any) => {
      const product = balance.product || products.find((item) => item.id === balance.productId);
      return {
        ...balance,
        productName: product?.name ?? balance.productName ?? balance.productId,
        sku: product?.sku ?? balance.sku ?? 'N/A',
        availableQuantity: Number(balance.availableQuantity ?? 0),
      };
    });
  }, [stockBalances, products]);

  const selectedBalance = balanceRows.find((balance) => balance.id === selectedBalanceId);

  const parsedQty = Number(quantity);
  const isValidQty = Number.isInteger(parsedQty) && parsedQty > 0;
  const isOverQuantity = selectedBalance && direction === 'REMOVE' && isValidQty && parsedQty > selectedBalance.availableQuantity;
  const projectedBalance = selectedBalance && isValidQty
    ? direction === 'ADD'
      ? selectedBalance.availableQuantity + parsedQty
      : selectedBalance.availableQuantity - parsedQty
    : null;

  const visibleApprovals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return approvals;
    return approvals.filter((request) =>
      `${request.title} ${request.description} ${request.documentReferenceNumber} ${request.initiatorName}`
        .toLowerCase()
        .includes(query)
    );
  }, [approvals, search]);

  const handleSubmit = async () => {
    const parsedQuantity = Number(quantity);
    if (!selectedBalance) {
      toast.error('Select a stock item first');
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Quantity must be a whole number greater than zero');
      return;
    }
    if (direction === 'REMOVE' && parsedQuantity > selectedBalance.availableQuantity) {
      toast.error(`Cannot remove more than available quantity (${selectedBalance.availableQuantity})`);
      return;
    }
    if (reason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters');
      return;
    }

    setSubmitting(true);
    try {
      const metadata: StockAdjustmentMetadata = {
        productId: selectedBalance.productId,
        productName: selectedBalance.productName,
        locationId: selectedBalance.locationId,
        locationType: selectedBalance.locationType,
        quantity: parsedQuantity,
        direction,
        reason: reason.trim(),
        requestedById: currentUser.id,
        requestedByName: currentUser.name,
      };
      await stockAdjustmentService.submit(metadata);
      toast.success('Stock adjustment submitted to the Manager for approval');
      setQuantity('');
      setReason('');
      await loadApprovals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async () => {
    if (!selectedApproval) return;
    if (approvalComment.trim().length < 3) {
      toast.error('Add a clear comment before processing this request');
      return;
    }
    setProcessingAction(true);
    try {
      await approvalService.processAction(
        selectedApproval.id,
        action,
        currentUser.id,
        currentUser.name,
        role,
        approvalComment.trim()
      );
      toast.success(action === 'APPROVE' ? 'Adjustment approved and stock updated' : 'Adjustment rejected');
      setSelectedApproval(null);
      setApprovalComment('');
      await loadApprovals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process adjustment');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Record physical count variances and route every change through Manager approval."
        badge={<Badge variant="info">Controlled inventory workflow</Badge>}
        actions={
          <Button variant="outline" size="sm" onClick={() => void loadApprovals()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-slate-200/80 shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Requests Logged</p>
              <p className="text-xl font-bold text-slate-900">{visibleApprovals.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200/80 shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pending Review</p>
              <p className="text-xl font-bold text-amber-600">{approvals.filter((item) => item.status === 'PENDING').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200/80 shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="flex items-center gap-3.5 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Workflow Desk</p>
              <p className="text-sm font-bold text-slate-900">{canApprove ? 'Manager Approval Desk' : 'Stock Manager Request Desk'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {canCreate && (
        <Card className="rounded-2xl border-slate-200 shadow-xs overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Submit Physical Count Adjustment
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Record inventory discrepancy counts for Manager or Director sign-off.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="w-fit border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-semibold px-2.5 py-0.5">
                Two-Person Verification
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Product Selection */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Boxes className="h-3.5 w-3.5 text-slate-500" />
                    Select Stock Item
                  </label>
                  {selectedBalance && (
                    <span className="text-xs font-medium text-slate-600">
                      Currently Available: <strong className="text-slate-900">{selectedBalance.availableQuantity} units</strong>
                    </span>
                  )}
                </div>
                <select
                  value={selectedBalanceId}
                  onChange={(event) => setSelectedBalanceId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 shadow-2xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Choose a product and location from stock balances...</option>
                  {balanceRows.map((balance) => (
                    <option key={balance.id} value={balance.id}>
                      {balance.productName} · SKU: {balance.sku} · {balance.locationType} ({balance.availableQuantity} available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Direction - Custom Modern Card Buttons */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Adjustment Direction
                  </label>
                  <span className="text-xs font-medium text-slate-500">
                    {direction === 'ADD' ? 'Adding surplus stock to system' : 'Deducting missing or damaged stock'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Increase Button */}
                  <button
                    type="button"
                    onClick={() => setDirection('ADD')}
                    className={`group relative flex items-start gap-3.5 rounded-xl border-2 p-3.5 text-left transition-all duration-150 cursor-pointer ${
                      direction === 'ADD'
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        direction === 'ADD'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
                      }`}
                    >
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${direction === 'ADD' ? 'text-emerald-950' : 'text-slate-800'}`}>
                          + Increase Stock
                        </span>
                        {direction === 'ADD' && (
                          <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${direction === 'ADD' ? 'text-emerald-800' : 'text-slate-500'}`}>
                        Physical count is higher than recorded (Surplus found)
                      </p>
                    </div>
                  </button>

                  {/* Decrease Button */}
                  <button
                    type="button"
                    onClick={() => setDirection('REMOVE')}
                    className={`group relative flex items-start gap-3.5 rounded-xl border-2 p-3.5 text-left transition-all duration-150 cursor-pointer ${
                      direction === 'REMOVE'
                        ? 'border-rose-500 bg-rose-50/60 shadow-xs ring-2 ring-rose-500/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        direction === 'REMOVE'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-100 text-rose-700 group-hover:bg-rose-200'
                      }`}
                    >
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${direction === 'REMOVE' ? 'text-rose-950' : 'text-slate-800'}`}>
                          - Decrease Stock
                        </span>
                        {direction === 'REMOVE' && (
                          <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${direction === 'REMOVE' ? 'text-rose-800' : 'text-slate-500'}`}>
                        Physical count is lower (Shrinkage, loss, or count shortage)
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantity Field & Projected Impact */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Adjustment Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="e.g. 5"
                  className="h-11 rounded-xl"
                />
                {/* Live projected balance preview */}
                {selectedBalance && isValidQty && (
                  <div
                    className={`mt-2 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium ${
                      isOverQuantity
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>Projected available after approval:</span>
                    <span className="font-bold">
                      {isOverQuantity ? (
                        <span className="text-rose-700">Exceeds available ({selectedBalance.availableQuantity})</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          {selectedBalance.availableQuantity}
                          <ArrowRight className="h-3 w-3 inline text-slate-400" />
                          <strong className={direction === 'ADD' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            {projectedBalance} units
                          </strong>
                          <span className={direction === 'ADD' ? 'text-emerald-600 text-[11px]' : 'text-rose-600 text-[11px]'}>
                            ({direction === 'ADD' ? '+' : '-'}{parsedQty})
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Adjustment Reason & Audit Justification
                </label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why this count discrepancy occurred (e.g. quarterly audit count variance, unrecorded damage)..."
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Bottom Governance Note & Submit Button */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-xs text-amber-900 max-w-xl">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Strict Governance Rule:</strong> Physical stock balances will not change until this request is formally approved by a Manager or Director.
                </span>
              </div>
              <Button
                onClick={() => void handleSubmit()}
                disabled={submitting || Boolean(isOverQuantity)}
                className="h-11 px-5 gap-2 shrink-0 font-semibold shadow-xs"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit for Approval
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Adjustment requests</CardTitle>
          <div className="relative w-full max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests..." className="pl-8" /></div>
        </CardHeader>
        <CardContent className="p-0">
          {loading || inventoryLoading ? (
            <div className="p-4"><TableLoadingSkeleton rows={4} cols={5} /></div>
          ) : visibleApprovals.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No stock adjustment requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Request</th><th className="px-4 py-3">Variance</th><th className="px-4 py-3">Requested by</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleApprovals.map((request) => {
                    const metadata = request.metadata as Partial<StockAdjustmentMetadata> | undefined;
                    return <tr key={request.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3"><p className="font-semibold text-slate-800">{request.documentReferenceNumber}</p><p className="text-xs text-slate-500">{request.title}</p><p className="text-[11px] text-slate-400">{formatDateTime(request.createdAt)}</p></td>
                      <td className="px-4 py-3"><span className={metadata?.direction === 'ADD' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{metadata?.direction === 'ADD' ? '+' : '-'}{metadata?.quantity ?? 0}</span><p className="text-xs text-slate-500">{metadata?.locationType} · {metadata?.locationId}</p></td>
                      <td className="px-4 py-3">{request.initiatorName}<p className="text-xs text-slate-500">{metadata?.reason}</p></td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(request.status)}>{request.status}</Badge></td>
                      <td className="px-4 py-3 text-right">{canApprove && request.status === 'PENDING' ? <Button size="sm" onClick={() => { setSelectedApproval(request); setAction('APPROVE'); }} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Review</Button> : <span className="text-xs text-slate-400">View only</span>}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedApproval)} onOpenChange={(open) => { if (!open) setSelectedApproval(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Stock Adjustment</DialogTitle>
            <DialogDescription>{selectedApproval?.title} · {selectedApproval?.documentReferenceNumber}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm">
            <p className="font-medium text-slate-800">{selectedApproval?.description}</p>
            <p className="mt-1 text-xs text-slate-500">Requested by: <strong className="text-slate-700">{selectedApproval?.initiatorName}</strong></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction('APPROVE')}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-4 font-semibold text-sm transition-all cursor-pointer ${
                action === 'APPROVE'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs ring-2 ring-emerald-500/15'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Approve Adjustment
            </button>
            <button
              type="button"
              onClick={() => setAction('REJECT')}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-4 font-semibold text-sm transition-all cursor-pointer ${
                action === 'REJECT'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-xs ring-2 ring-rose-500/15'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <XCircle className="h-4 w-4 text-rose-600" />
              Reject Adjustment
            </button>
          </div>
          <Textarea
            value={approvalComment}
            onChange={(event) => setApprovalComment(event.target.value)}
            placeholder="Add approval or rejection remarks..."
            rows={3}
            className="rounded-xl"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedApproval(null)}>Cancel</Button>
            <Button
              variant={action === 'APPROVE' ? 'success' : 'destructive'}
              onClick={() => void handleAction()}
              disabled={processingAction}
            >
              {processingAction ? 'Processing...' : action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
