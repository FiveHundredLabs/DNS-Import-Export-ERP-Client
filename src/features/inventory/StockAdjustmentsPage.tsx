import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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
import { useAuth } from '../../hooks/useAuth';
import { useInventory } from '../../hooks/useInventory';
import { approvalService } from '../../services/ApprovalService';
import { stockAdjustmentService, StockAdjustmentMetadata } from '../../services/StockAdjustmentService';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
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
      const product = MOCK_PRODUCTS.find((item) => item.id === balance.productId);
      return {
        ...balance,
        productName: product?.name ?? balance.productId,
        sku: product?.sku ?? 'N/A',
        availableQuantity: Number(balance.availableQuantity ?? 0),
      };
    });
  }, [stockBalances]);

  const selectedBalance = balanceRows.find((balance) => balance.id === selectedBalanceId);

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
        <Card><CardContent className="flex items-center gap-3 p-4"><ClipboardCheck className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-slate-500">Requests shown</p><p className="text-xl font-bold">{visibleApprovals.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Clock3 className="h-5 w-5 text-amber-600" /><div><p className="text-xs text-slate-500">Pending approval</p><p className="text-xl font-bold">{approvals.filter((item) => item.status === 'PENDING').length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><PackageCheck className="h-5 w-5 text-emerald-600" /><div><p className="text-xs text-slate-500">Workflow</p><p className="text-sm font-bold">{canApprove ? 'Manager approval desk' : 'Stock Manager request desk'}</p></div></CardContent></Card>
      </div>

      {canCreate && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" />Submit physical count adjustment</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Stock item
              <select value={selectedBalanceId} onChange={(event) => setSelectedBalanceId(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">
                <option value="">Select product and location</option>
                {balanceRows.map((balance) => <option key={balance.id} value={balance.id}>{balance.productName} · {balance.sku} · {balance.locationType} ({balance.availableQuantity} available)</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Adjustment direction
              <div className="flex gap-2">
                <Button type="button" variant={direction === 'ADD' ? 'success' : 'outline'} onClick={() => setDirection('ADD')} className="gap-1.5"><Plus className="h-4 w-4" /> Increase</Button>
                <Button type="button" variant={direction === 'REMOVE' ? 'destructive' : 'outline'} onClick={() => setDirection('REMOVE')} className="gap-1.5"><Minus className="h-4 w-4" /> Decrease</Button>
              </div>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Quantity
              <Input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Enter counted variance" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Reason
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the physical count variance..." rows={3} />
            </label>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 md:col-span-2">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />Stock is not changed until a Manager approves this request.</span>
              <Button onClick={() => void handleSubmit()} disabled={submitting} className="shrink-0">{submitting ? 'Submitting...' : 'Submit for approval'}</Button>
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
          {loading || inventoryLoading ? <div className="p-6 text-sm text-slate-500">Loading adjustment workflow...</div> : visibleApprovals.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No stock adjustment requests found.</div> : (
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

      <p className="text-xs text-slate-500">Need the stock ledger? <Link to="/inventory/stock" className="font-medium text-primary hover:underline">Open Stock Balance</Link></p>

      <Dialog open={Boolean(selectedApproval)} onOpenChange={(open) => { if (!open) setSelectedApproval(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review stock adjustment</DialogTitle><DialogDescription>{selectedApproval?.title} · {selectedApproval?.documentReferenceNumber}</DialogDescription></DialogHeader>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><p>{selectedApproval?.description}</p><p className="mt-1 text-xs text-slate-500">Requested by {selectedApproval?.initiatorName}</p></div>
          <div className="flex gap-2"><Button type="button" variant={action === 'APPROVE' ? 'success' : 'outline'} onClick={() => setAction('APPROVE')} className="gap-1.5"><CheckCircle2 className="h-4 w-4" />Approve</Button><Button type="button" variant={action === 'REJECT' ? 'destructive' : 'outline'} onClick={() => setAction('REJECT')} className="gap-1.5"><XCircle className="h-4 w-4" />Reject</Button></div>
          <Textarea value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} placeholder="Add approval or rejection remarks..." rows={4} />
          <DialogFooter><Button variant="outline" onClick={() => setSelectedApproval(null)}>Cancel</Button><Button variant={action === 'APPROVE' ? 'success' : 'destructive'} onClick={() => void handleAction()} disabled={processingAction}>{processingAction ? 'Processing...' : action === 'APPROVE' ? 'Approve adjustment' : 'Reject adjustment'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
