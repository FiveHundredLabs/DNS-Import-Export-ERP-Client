import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { arService, ARReceiptItem } from '../../services/arService';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { formatCurrency } from '../../../../utils/formatters';
import {
  Search,
  ExternalLink,
  ChevronRight,
  X,
  ShieldCheck,
  Image as ImageIcon,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function ReceiptApprovalQueuePage() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ARReceiptItem[]>(() => arService.getReceipts());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING_APPROVAL');

  // Selected item for Side Sheet Detail View
  const [selectedReceipt, setSelectedReceipt] = useState<ARReceiptItem | null>(null);

  // Reject Modal State
  const [rejectingItem, setRejectingItem] = useState<ARReceiptItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Processing state
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refreshReceipts = () => {
    setReceipts(arService.getReceipts());
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.receiptNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.collectorName.toLowerCase().includes(q) ||
        r.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [receipts, statusFilter, search]);

  const pendingCount = receipts.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const approvedCount = receipts.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = receipts.filter((r) => r.status === 'REJECTED').length;

  const handleApprove = async (receipt: ARReceiptItem) => {
    try {
      setProcessingId(receipt.id);
      await arService.approveReceipt(receipt.id);
      toast.success(
        `Receipt ${receipt.receiptNumber} approved! Posted Dr Bank / Cr A/R and restored ${receipt.customerName}'s available credit limit.`
      );
      refreshReceipts();
      if (selectedReceipt?.id === receipt.id) {
        setSelectedReceipt(arService.getReceiptById(receipt.id));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (receipt: ARReceiptItem) => {
    setRejectingItem(receipt);
    setRejectionReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectingItem) return;
    if (!rejectionReason.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }

    try {
      arService.rejectReceipt(rejectingItem.id, rejectionReason);
      toast.info(`Receipt ${rejectingItem.receiptNumber} rejected and returned to sales representative.`);
      refreshReceipts();
      if (selectedReceipt?.id === rejectingItem.id) {
        setSelectedReceipt(arService.getReceiptById(rejectingItem.id));
      }
      setRejectingItem(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Receipt Approval Queue
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              AR Collections & Credit Control
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Finance verification of field collections by sales representatives before ledger commitment and customer credit restoration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/finance/ar/allocate')}
            className="text-xs gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Batch Invoice Allocation</span>
          </Button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-200/80 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Approval</span>
            <span className="rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Approved</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Rejected</span>
            <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[10px] font-bold">
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Receipts
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt, customer, rep..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Receipts Table / List */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Receipt Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Sales Rep</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                    No receipts found in this category.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => {
                  const isPending = receipt.status === 'PENDING_APPROVAL';

                  return (
                    <tr
                      key={receipt.id}
                      onClick={() => setSelectedReceipt(receipt)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        {receipt.receiptNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{receipt.customerName}</div>
                        <span className="font-mono text-[11px] text-slate-400">{receipt.customerCode}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {receipt.collectorName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {receipt.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {receipt.status === 'PENDING_APPROVAL' && (
                          <Badge variant="warning" className="text-[10px]">Pending Approval</Badge>
                        )}
                        {receipt.status === 'APPROVED' && (
                          <Badge variant="success" className="text-[10px]">Approved</Badge>
                        )}
                        {receipt.status === 'REJECTED' && (
                          <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1 justify-end">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(receipt)}
                                className="h-7 px-2 text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(receipt)}
                                disabled={processingId === receipt.id}
                                className="h-7 px-2.5 bg-primary hover:bg-primary-hover text-white text-xs"
                              >
                                Approve
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedReceipt(receipt)}
                            className="h-7 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Details <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail View Side Sheet */}
      {selectedReceipt && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Side Sheet Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">{selectedReceipt.receiptNumber}</span>
                <Badge variant={selectedReceipt.status === 'APPROVED' ? 'success' : selectedReceipt.status === 'REJECTED' ? 'destructive' : 'warning'} className="text-[10px]">
                  {selectedReceipt.status}
                </Badge>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                Receipt Verification Detail
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedReceipt(null)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Side Sheet Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Customer & Amount Banner */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Customer</span>
                  <span className="text-sm font-bold text-slate-900">{selectedReceipt.customerName}</span>
                  <span className="text-slate-500 block font-mono">{selectedReceipt.customerCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">Collection Amount</span>
                  <span className="text-lg font-bold font-mono text-primary tabular-nums">
                    {formatCurrency(selectedReceipt.amount)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Payment Method</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedReceipt.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase">Sales Representative</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.collectorName}</span>
                </div>
              </div>
            </div>

            {/* Attached Deposit Slip / Cheque Image Preview */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                Physical Bank Deposit Slip / Cheque Attachment:
              </span>

              {selectedReceipt.attachmentUrl ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-900/5 group relative">
                  <img
                    src={selectedReceipt.attachmentUrl}
                    alt="Deposit slip or cheque proof"
                    className="w-full h-52 object-cover transition-transform group-hover:scale-105 duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a
                      href={selectedReceipt.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white text-slate-900 px-3 py-1.5 rounded-md font-semibold text-xs shadow-md flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> View Full Slip
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
                  No image proof attached
                </div>
              )}
            </div>

            {/* Rejection Note (if rejected) */}
            {selectedReceipt.status === 'REJECTED' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                <span className="font-bold block">Rejection Reason:</span>
                <p className="text-xs">{selectedReceipt.rejectionReason}</p>
              </div>
            )}

            {/* Allocation Link */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full justify-between text-xs"
                onClick={() => {
                  setSelectedReceipt(null);
                  navigate(`/finance/ar/allocate?receiptId=${selectedReceipt.id}`);
                }}
              >
                <span>Allocate Collection to Customer Invoices</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Side Sheet Footer Actions */}
          {selectedReceipt.status === 'PENDING_APPROVAL' && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => handleOpenReject(selectedReceipt)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
              >
                Reject Receipt
              </Button>

              <Button
                onClick={() => handleApprove(selectedReceipt)}
                disabled={processingId === selectedReceipt.id}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Confirm Bank Clearing & Restore Credit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Reject Reason Modal */}
      <Dialog open={Boolean(rejectingItem)} onOpenChange={(open) => !open && setRejectingItem(null)}>
        <DialogHeader>
          <DialogTitle>Reject Customer Payment Receipt</DialogTitle>
          <DialogDescription>
            Specify the operational or banking discrepancy. This note will be returned to {rejectingItem?.collectorName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="block text-xs font-semibold text-slate-700">
            Rejection Reason & Explanation <span className="text-rose-500">*</span>
          </label>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Bank deposit slip seal is illegible, or cheque date has expired..."
            rows={3}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setRejectingItem(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmReject}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            Confirm Rejection
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
